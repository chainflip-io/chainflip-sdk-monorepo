import express from 'express';
import type { Server } from 'socket.io';
import { Asset, Assets, Chain, Chains, getInternalAsset } from '@/shared/enums';
import { bigintMin } from '@/shared/functions';
import { quoteQuerySchema, SwapFee } from '@/shared/schemas';
import {
  calculateIncludedSwapFees,
  estimateIngressEgressFeeAssetAmount,
} from '@/swap/utils/fees';
import { getPools } from '@/swap/utils/pools';
import { asyncHandler } from './common';
import getConnectionHandler from '../quoting/getConnectionHandler';
import {
  findBestQuote,
  buildQuoteRequest,
  collectMakerQuotes,
  subtractFeesFromMakerQuote,
} from '../quoting/quotes';
import logger from '../utils/logger';
import {
  getMinimumEgressAmount,
  getNativeEgressFee,
  getNativeIngressFee,
  validateSwapAmount,
} from '../utils/rpc';
import ServiceError from '../utils/ServiceError';
import { getBrokerQuote } from '../utils/statechain';

const fallbackChains = {
  [Assets.ETH]: Chains.Ethereum,
  [Assets.USDC]: Chains.Ethereum,
  [Assets.FLIP]: Chains.Ethereum,
  [Assets.BTC]: Chains.Bitcoin,
  [Assets.DOT]: Chains.Polkadot,
} satisfies Record<Asset, Chain>;

const quote = (io: Server) => {
  const router = express.Router();

  const { handler, quotes$ } = getConnectionHandler();

  io.on('connection', handler);

  router.get(
    '/',
    asyncHandler(async (req, res) => {
      // this api did not require the srcChain and destChain param initially
      // to keep it compatible with clients that do not include these params, we fall back to set them based on the asset
      req.query.srcChain ??= fallbackChains[req.query.srcAsset as Asset];
      req.query.destChain ??= fallbackChains[req.query.destAsset as Asset];
      const queryResult = quoteQuerySchema.safeParse(req.query);

      if (!queryResult.success) {
        logger.info('received invalid quote request', {
          query: req.query,
          error: queryResult.error,
        });
        throw ServiceError.badRequest('invalid request');
      }

      const query = queryResult.data;
      const srcAssetChain = { asset: query.srcAsset, chain: query.srcChain };
      const destAssetChain = { asset: query.destAsset, chain: query.destChain };

      const amountResult = await validateSwapAmount(
        srcAssetChain,
        BigInt(query.amount),
      );

      if (!amountResult.success) {
        throw ServiceError.badRequest(amountResult.reason);
      }

      const includedFees: SwapFee[] = [];
      const ingressFee = await estimateIngressEgressFeeAssetAmount(
        await getNativeIngressFee(srcAssetChain),
        getInternalAsset(srcAssetChain),
      );
      includedFees.push({
        type: 'INGRESS',
        chain: srcAssetChain.chain,
        asset: srcAssetChain.asset,
        amount: ingressFee.toString(),
      });

      let swapInputAmount = BigInt(query.amount) - ingressFee;
      if (swapInputAmount <= 0n) {
        throw ServiceError.badRequest(
          `amount is lower than estimated ingress fee (${ingressFee})`,
        );
      }

      if (query.brokerCommissionBps) {
        const brokerFee =
          (swapInputAmount * BigInt(query.brokerCommissionBps)) / 10000n;
        includedFees.push({
          type: 'BROKER',
          chain: srcAssetChain.chain,
          asset: srcAssetChain.asset,
          amount: brokerFee.toString(),
        });
        swapInputAmount -= brokerFee;
      }

      const quotePools = await getPools(
        getInternalAsset(srcAssetChain),
        getInternalAsset(destAssetChain),
      );

      const quoteRequest = buildQuoteRequest({
        ...query,
        amount: String(swapInputAmount),
      });
      io.emit('quote_request', quoteRequest);

      try {
        const [rawMarketMakerQuotes, brokerQuote] = await Promise.all([
          collectMakerQuotes(quoteRequest.id, io.sockets.sockets.size, quotes$),
          getBrokerQuote(
            { ...query, amount: String(swapInputAmount) },
            quoteRequest.id,
          ),
        ]);

        // market maker quotes do not include liquidity pool fee and network fee
        const marketMakerQuotes = rawMarketMakerQuotes.map((makerQuote) =>
          subtractFeesFromMakerQuote(makerQuote, quotePools),
        );

        const bestQuote = findBestQuote(marketMakerQuotes, brokerQuote);

        const quoteSwapFees = await calculateIncludedSwapFees(
          getInternalAsset(srcAssetChain),
          getInternalAsset(destAssetChain),
          String(swapInputAmount),
          'intermediateAmount' in bestQuote
            ? bestQuote.intermediateAmount
            : undefined,
          bestQuote.outputAmount,
        );
        includedFees.push(...quoteSwapFees);

        const egressFee = bigintMin(
          await estimateIngressEgressFeeAssetAmount(
            await getNativeEgressFee(destAssetChain),
            getInternalAsset(destAssetChain),
          ),
          BigInt(bestQuote.outputAmount),
        );
        includedFees.push({
          type: 'EGRESS',
          chain: destAssetChain.chain,
          asset: destAssetChain.asset,
          amount: egressFee.toString(),
        });

        const egressAmount = BigInt(bestQuote.outputAmount) - egressFee;

        const minimumEgressAmount =
          await getMinimumEgressAmount(destAssetChain);

        if (egressAmount < minimumEgressAmount) {
          throw ServiceError.badRequest(
            `egress amount (${egressAmount}) is lower than minimum egress amount (${minimumEgressAmount})`,
          );
        }

        // remove the id and output amount from the final response body as it is internal information
        const {
          id = undefined, // eslint-disable-line @typescript-eslint/no-unused-vars
          outputAmount,
          ...response
        } = {
          ...bestQuote,
          egressAmount: egressAmount.toString(),
          includedFees,
        };

        res.json(response);
      } catch (err) {
        if (err instanceof ServiceError) throw err;

        const message =
          err instanceof Error
            ? err.message
            : 'unknown error (possibly no liquidity)';

        logger.error('error while collecting quotes:', err);

        res.status(500).json({ error: message });
      }
    }),
  );

  return router;
};

export default quote;

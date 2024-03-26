import express from 'express';
import type { Server } from 'socket.io';
import { Asset, Assets, Chain, Chains, getInternalAsset } from '@/shared/enums';
import { bigintMin, getPipAmountFromAmount } from '@/shared/functions';
import { RpcClientError } from '@/shared/node-apis/RpcClient';
import { quoteQuerySchema, SwapFee } from '@/shared/schemas';
import { calculateIncludedSwapFees, estimateIngressEgressFeeAssetAmount } from '@/swap/utils/fees';
import { getPools } from '@/swap/utils/pools';
import { estimateSwapDuration } from '@/swap/utils/swap';
import { asyncHandler } from './common';
import { checkPriceWarning } from '../pricing/checkPriceWarning';
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
  getEgressFee,
  getIngressFee,
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
  [Assets.USDT]: Chains.Ethereum,
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
        throw ServiceError.badRequest('bad-request', `the quote request parameters are invalid`);
      }

      logger.info('received a quote request', { query: req.query });

      // detect if ingress and egress fees are exposed as gas asset amount or fee asset amount
      // https://github.com/chainflip-io/chainflip-backend/pull/4497
      // TODO: remove this once all networks are upgraded to 1.3
      const ingressEgressFeeIsGasAssetAmount =
        (await getIngressFee({ chain: 'Ethereum', asset: 'FLIP' })) ===
        (await getIngressFee({ chain: 'Ethereum', asset: 'USDC' }));

      const query = queryResult.data;
      const srcChainAsset = { asset: query.srcAsset, chain: query.srcChain };
      const destChainAsset = { asset: query.destAsset, chain: query.destChain };

      const amountResult = await validateSwapAmount(srcChainAsset, BigInt(query.amount));

      if (!amountResult.success) {
        throw ServiceError.badRequest('invalid-amount', amountResult.reason);
      }

      const includedFees: SwapFee[] = [];

      let swapInputAmount = BigInt(query.amount);

      if (query.boostFeeBps) {
        const boostFee = getPipAmountFromAmount(swapInputAmount, query.boostFeeBps);
        includedFees.push({
          type: 'BOOST',
          chain: srcChainAsset.chain,
          asset: srcChainAsset.asset,
          amount: boostFee.toString(),
        });
        swapInputAmount -= boostFee;
      }

      let ingressFee = await getIngressFee(srcChainAsset);
      if (ingressFee == null) {
        throw ServiceError.internalError(
          'rpc-error',
          `could not determine ingress fee for ${getInternalAsset(srcChainAsset)}`,
        );
      }
      if (ingressEgressFeeIsGasAssetAmount) {
        ingressFee = await estimateIngressEgressFeeAssetAmount(
          ingressFee,
          getInternalAsset(srcChainAsset),
        );
      }
      includedFees.push({
        type: 'INGRESS',
        chain: srcChainAsset.chain,
        asset: srcChainAsset.asset,
        amount: ingressFee.toString(),
      });
      swapInputAmount -= ingressFee;
      if (swapInputAmount <= 0n) {
        throw ServiceError.badRequest(
          'invalid-amount',
          `deposit amount (${query.amount}) is lower than estimated ingress fee (${ingressFee})`,
        );
      }

      if (query.brokerCommissionBps) {
        const brokerFee = getPipAmountFromAmount(swapInputAmount, query.brokerCommissionBps);
        includedFees.push({
          type: 'BROKER',
          chain: srcChainAsset.chain,
          asset: srcChainAsset.asset,
          amount: brokerFee.toString(),
        });
        swapInputAmount -= brokerFee;
      }

      const quotePools = await getPools(
        getInternalAsset(srcChainAsset),
        getInternalAsset(destChainAsset),
      );

      const quoteRequest = buildQuoteRequest({
        ...query,
        amount: String(swapInputAmount),
      });
      io.emit('quote_request', quoteRequest);

      try {
        const start = performance.now();

        const [rawMarketMakerQuotes, brokerQuote] = await Promise.all([
          collectMakerQuotes(quoteRequest.id, io.sockets.sockets.size, quotes$),
          getBrokerQuote({ ...query, amount: String(swapInputAmount) }, quoteRequest.id),
        ]);

        // market maker quotes do not include liquidity pool fee and network fee
        const marketMakerQuotes = rawMarketMakerQuotes.map((makerQuote) =>
          subtractFeesFromMakerQuote(makerQuote, quotePools),
        );

        const bestQuote = findBestQuote(marketMakerQuotes, brokerQuote);
        const lowLiquidityWarning = await checkPriceWarning({
          srcAsset: getInternalAsset(srcChainAsset),
          destAsset: getInternalAsset(destChainAsset),
          srcAmount: swapInputAmount,
          destAmount: BigInt(bestQuote.outputAmount),
        });

        const quoteSwapFees = await calculateIncludedSwapFees(
          getInternalAsset(srcChainAsset),
          getInternalAsset(destChainAsset),
          String(swapInputAmount),
          'intermediateAmount' in bestQuote ? bestQuote.intermediateAmount : undefined,
          bestQuote.outputAmount,
        );
        includedFees.push(...quoteSwapFees);

        let egressFee = await getEgressFee(destChainAsset);
        if (egressFee == null) {
          throw ServiceError.internalError(
            'rpc-error',
            `could not determine egress fee for ${getInternalAsset(destChainAsset)}`,
          );
        }
        if (ingressEgressFeeIsGasAssetAmount) {
          egressFee = await estimateIngressEgressFeeAssetAmount(
            egressFee,
            getInternalAsset(destChainAsset),
          );
        }
        egressFee = bigintMin(egressFee, BigInt(bestQuote.outputAmount));
        includedFees.push({
          type: 'EGRESS',
          chain: destChainAsset.chain,
          asset: destChainAsset.asset,
          amount: egressFee.toString(),
        });

        const egressAmount = BigInt(bestQuote.outputAmount) - egressFee;

        const minimumEgressAmount = await getMinimumEgressAmount(destChainAsset);

        if (egressAmount < minimumEgressAmount) {
          throw ServiceError.badRequest(
            'invalid-amount',
            `expected egress amount (${egressAmount}) is lower than minimum egress amount (${minimumEgressAmount})`,
          );
        }

        const {
          id = undefined,
          outputAmount,
          quoteType,
          ...response
        } = {
          ...bestQuote,
          egressAmount: egressAmount.toString(),
          includedFees,
          lowLiquidityWarning,
          estimatedDurationSeconds: await estimateSwapDuration(
            srcChainAsset.chain,
            destChainAsset.chain,
          ),
        };
        logger.info('sending response for quote request', {
          id,
          quoteType,
          response,
          performance: `${(performance.now() - start).toFixed(2)} ms`,
        });

        res.json(response);
      } catch (err) {
        if (err instanceof ServiceError) throw err;

        let httpCode = 500;
        let errorPayload;
        if (err instanceof RpcClientError) {
          if (err.message.includes('InsufficientLiquidity')) {
            httpCode = 400;
            errorPayload = {
              code: 'invalid-amount',
              message: `insufficient liquidity for swapping deposit amount (${query.amount})`,
              error: err.message,
            };
          } else {
            errorPayload = { code: 'rpc-error', message: err.message, error: err.message };
          }
        } else {
          const message =
            err instanceof Error ? err.message : 'an unexpected internal error occurred';
          errorPayload = { code: 'rpc-error', message, error: message };
        }

        logger.error('error while collecting quotes:', err);

        // DEPRECATED(1.3): remove `error`, return ServiceError.internalError instead
        res.status(httpCode).json(errorPayload);
      }
    }),
  );

  return router;
};

export default quote;

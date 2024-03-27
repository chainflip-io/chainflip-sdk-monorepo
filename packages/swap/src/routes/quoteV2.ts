import BigNumber from 'bignumber.js';
import { randomUUID } from 'crypto';
import express from 'express';
import type { Server } from 'socket.io';
import { findPrice } from '@/amm-addon';
import {
  Asset,
  Assets,
  Chain,
  Chains,
  InternalAsset,
  getAssetAndChain,
  getInternalAsset,
  getInternalAssets,
} from '@/shared/enums';
import {
  bigintMin,
  getHundredthPipAmountFromAmount,
  getPipAmountFromAmount,
} from '@/shared/functions';
import { ParsedQuoteParams, QuoteQueryResponse, quoteQuerySchema, SwapFee } from '@/shared/schemas';
import { calculateIncludedSwapFees, estimateIngressEgressFeeAssetAmount } from '@/swap/utils/fees';
import { estimateSwapDuration } from '@/swap/utils/swap';
import { asyncHandler } from './common';
import env from '../config/env';
import { getPoolsNetworkFeeHundredthPips } from '../consts';
import { getAssetPrice } from '../pricing';
import { checkPriceWarning } from '../pricing/checkPriceWarning';
import getConnectionHandler from '../quoting/getConnectionHandler';
import { collectMakerQuotes } from '../quoting/quotes';
import logger from '../utils/logger';
import { getPools } from '../utils/pools';
import {
  getMinimumEgressAmount,
  getEgressFee,
  getIngressFee,
  validateSwapAmount,
} from '../utils/rpc';
import ServiceError from '../utils/ServiceError';
// import { getBrokerQuote } from '../utils/statechain';

const fallbackChains = {
  [Assets.ETH]: Chains.Ethereum,
  [Assets.USDC]: Chains.Ethereum,
  [Assets.FLIP]: Chains.Ethereum,
  [Assets.BTC]: Chains.Bitcoin,
  [Assets.DOT]: Chains.Polkadot,
  [Assets.USDT]: Chains.Ethereum,
} satisfies Record<Asset, Chain>;

const quote = (io: Server) => {
  const { handler, quotes$ } = getConnectionHandler();

  io.on('connection', handler);

  const approximateIntermediateOutput = async (asset: InternalAsset, amount: string) => {
    const price = await getAssetPrice(asset);

    if (typeof price !== 'number') return null;

    return BigInt(new BigNumber(amount).times(price).toFixed(0));
  };

  async function quoteLeg(
    [baseAsset, quoteAsset]: readonly [InternalAsset, InternalAsset],
    amount: null,
  ): Promise<null>;
  async function quoteLeg(
    [baseAsset, quoteAsset]: readonly [InternalAsset, InternalAsset],
    amount: bigint,
  ): Promise<bigint>;
  async function quoteLeg(
    [baseAsset, quoteAsset]: readonly [InternalAsset, InternalAsset],
    amount: bigint | null,
  ): Promise<bigint | null>;
  async function quoteLeg(
    [baseAsset, quoteAsset]: readonly [InternalAsset, InternalAsset],
    amount: bigint | null,
  ): Promise<bigint | null> {
    if (!amount) return null;

    const id = randomUUID();

    io.emit('quote_request', {
      request_id: id,
      amount: String(amount),
      base_asset: getAssetAndChain(baseAsset),
      quote_asset: getAssetAndChain(quoteAsset),
    });

    const quotes = await collectMakerQuotes(id, io.sockets.sockets.size, quotes$);

    const { swappedAmount, remainingAmount } = await findPrice({
      poolFee: 0,
      amount: BigInt(amount),
      limitOrders: quotes.flatMap(({ limitOrders }) =>
        limitOrders.map(([tick, amt]) => ({ tick, amount: amt })),
      ),
    });

    if (remainingAmount !== 0n) {
      // TODO: handle remaining amount with the pool
    }

    return swappedAmount;
  }

  const getBestQuote = async (quoteRequest: ParsedQuoteParams & { amount: bigint }) => {
    const { srcAsset, destAsset } = getInternalAssets(quoteRequest);
    const networkFee = getPoolsNetworkFeeHundredthPips(env.CHAINFLIP_NETWORK);

    const pools = await getPools(srcAsset, destAsset);

    let intermediateAmount: bigint | null = null;
    let outputAmount: bigint;
    let networkFeeUsdc: bigint | null = null;
    const firstLegPoolFee = getHundredthPipAmountFromAmount(
      quoteRequest.amount,
      pools[0].liquidityFeeHundredthPips,
    );

    const swapInputAmount = quoteRequest.amount - firstLegPoolFee;

    const fees: SwapFee[] = [
      {
        type: 'LIQUIDITY',
        amount: firstLegPoolFee.toString(),
        ...getAssetAndChain(srcAsset),
      },
    ];

    if (srcAsset !== 'Usdc' && destAsset !== 'Usdc') {
      const leg1 = [srcAsset, 'Usdc'] as const;
      const leg2 = ['Usdc', destAsset] as const;

      let approximateUsdcAmount = await approximateIntermediateOutput(
        srcAsset,
        swapInputAmount.toString(),
      );

      networkFeeUsdc =
        approximateUsdcAmount && getHundredthPipAmountFromAmount(approximateUsdcAmount, networkFee);

      if (networkFeeUsdc && approximateUsdcAmount) {
        approximateUsdcAmount -= networkFeeUsdc;
      }

      const quotes = await Promise.all([
        quoteLeg(leg1, swapInputAmount),
        quoteLeg(leg1, approximateUsdcAmount),
      ]);

      // TODO: check if approximated value is close enough or we need to get a second quote
      if (quotes[1] === null) {
        networkFeeUsdc = getHundredthPipAmountFromAmount(quotes[0], networkFee);
        quotes[0] -= networkFeeUsdc;
        quotes[1] = await quoteLeg(leg2, quotes[0]);
      }

      const secondLegPoolFee = getHundredthPipAmountFromAmount(
        quotes[1],
        pools[1].liquidityFeeHundredthPips,
      );
      quotes[1] -= secondLegPoolFee;

      fees.push({
        type: 'LIQUIDITY',
        amount: secondLegPoolFee.toString(),
        ...getAssetAndChain(destAsset),
      });

      [intermediateAmount, outputAmount] = quotes;
    } else {
      const leg = [srcAsset, destAsset] as const;
      outputAmount = await quoteLeg(leg, swapInputAmount);
    }

    fees.push({
      type: 'NETWORK',
      amount: networkFeeUsdc!.toString(),
      chain: 'Ethereum',
      asset: 'USDC',
    });

    return { intermediateAmount, outputAmount, fees };
  };

  const router = express.Router();

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

      logger.info('received a quote request', { query: req.query });

      // detect if ingress and egress fees are exposed as gas asset amount or fee asset amount
      // https://github.com/chainflip-io/chainflip-backend/pull/4497
      // TODO: remove this once all networks are upraded to 1.3
      const ingressEgressFeeIsGasAssetAmount =
        (await getIngressFee({ chain: 'Ethereum', asset: 'FLIP' })) ===
        (await getIngressFee({ chain: 'Ethereum', asset: 'USDC' }));

      const query = queryResult.data;
      const srcChainAsset = { asset: query.srcAsset, chain: query.srcChain };
      const destChainAsset = { asset: query.destAsset, chain: query.destChain };

      const amountResult = await validateSwapAmount(srcChainAsset, BigInt(query.amount));

      if (!amountResult.success) {
        throw ServiceError.badRequest(amountResult.reason);
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
        throw ServiceError.badRequest(`amount is lower than estimated ingress fee (${ingressFee})`);
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

      try {
        const start = performance.now();

        const bestQuote = await getBestQuote({ ...query, amount: swapInputAmount });

        const lowLiquidityWarning = await checkPriceWarning({
          srcAsset: getInternalAsset(srcChainAsset),
          destAsset: getInternalAsset(destChainAsset),
          srcAmount: swapInputAmount,
          destAmount: bestQuote.outputAmount,
        });

        const quoteSwapFees = await calculateIncludedSwapFees(
          getInternalAsset(srcChainAsset),
          getInternalAsset(destChainAsset),
          swapInputAmount,
          bestQuote.intermediateAmount,
          bestQuote.outputAmount,
        );
        includedFees.push(...quoteSwapFees);

        let egressFee = await getEgressFee(destChainAsset);
        if (egressFee == null) {
          throw ServiceError.internalError(
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
            `egress amount (${egressAmount}) is lower than minimum egress amount (${minimumEgressAmount})`,
          );
        }

        const {
          id = undefined,
          outputAmount,
          ...response
        } = {
          ...bestQuote,
          egressAmount: egressAmount.toString(),
          intermediateAmount: bestQuote.intermediateAmount?.toString(),
          includedFees,
          lowLiquidityWarning,
          estimatedDurationSeconds: await estimateSwapDuration(
            srcChainAsset.chain,
            destChainAsset.chain,
          ),
        };
        logger.info('sending response for quote request', {
          id,
          response,
          performance: `${(performance.now() - start).toFixed(2)} ms`,
        });

        res.json(response as QuoteQueryResponse);
      } catch (err) {
        if (err instanceof ServiceError) throw err;

        const message =
          err instanceof Error ? err.message : 'unknown error (possibly no liquidity)';

        logger.error('error while collecting quotes:', err);

        // DEPRECATED(1.3): remove `error`
        res.status(500).json({ message, error: message });
      }
    }),
  );

  return router;
};

export default quote;

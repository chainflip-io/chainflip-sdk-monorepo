import BigNumber from 'bignumber.js';
import express from 'express';
import type { Server } from 'socket.io';
import { Asset, assetConstants, Assets, Chain, Chains, InternalAsset } from '@/shared/enums';
import { quoteQuerySchema, QuoteQueryResponse } from '@/shared/schemas';
import { asyncHandler } from './common';
import env from '../config/env';
import { getBoostSafeMode } from '../polkadot/api';
import { getUsdValue } from '../pricing/checkPriceWarning';
import Quoter from '../quoting/Quoter';
import { getBoostFeeBpsForAmount } from '../utils/boost';
import getPoolQuote from '../utils/getPoolQuote';
import logger from '../utils/logger';
import { getPools } from '../utils/pools';
import { getIngressFee, validateSwapAmount } from '../utils/rpc';
import ServiceError from '../utils/ServiceError';

type AdditionalInfo = {
  srcAsset: InternalAsset;
  destAsset: InternalAsset;
  amount: string;
  usdValue: string | undefined;
  limitOrdersReceived: Awaited<ReturnType<Quoter['getLimitOrders']>> | undefined;
};

const handleQuotingError = (res: express.Response, err: unknown, info: AdditionalInfo) => {
  if (err instanceof ServiceError) throw err;

  const message = err instanceof Error ? err.message : 'unknown error (possibly no liquidity)';

  if (message.includes('InsufficientLiquidity')) {
    logger.info('insufficient liquidity received', info);
    throw ServiceError.badRequest('insufficient liquidity for requested amount');
  }

  logger.error('error while collecting quotes:', err);

  res.status(500).json({ message });
};

export const getDcaQuoteParams = async (asset: InternalAsset, amount: bigint) => {
  const usdChunkSize = env.DCA_USD_CHUNK_SIZE;

  const usdValue = await getUsdValue(amount, asset).catch(() => undefined);
  if (usdValue) {
    if (Number(usdValue) < usdChunkSize) {
      return {
        chunkSize: amount,
        lastChunkAmount: amount,
        numberOfChunks: 1,
        addedDurationSeconds: 0,
      };
    }
    const numberOfChunksPrecise = Number(usdValue) / usdChunkSize;
    const chunkSize = BigNumber(amount.toString()).dividedBy(numberOfChunksPrecise);

    const numberOfChunks =
      numberOfChunksPrecise - Math.floor(numberOfChunksPrecise) < 0.05
        ? Math.floor(numberOfChunksPrecise)
        : Math.ceil(numberOfChunksPrecise);

    const lastChunkAmount = BigInt(
      new BigNumber(amount.toString()).minus(chunkSize.multipliedBy(numberOfChunks - 1)).toFixed(0),
    );

    return {
      chunkSize: BigInt(chunkSize.toFixed(0)),
      lastChunkAmount,
      numberOfChunks,
      addedDurationSeconds: Math.ceil(env.DCA_CHUNK_INTERVAL_SECONDS * (numberOfChunks - 1)), // we deduct 1 chunk because the first one is already accounted for in the regular quote
    };
  }
  return null;
};

const addDcaToQuote = ({
  quote,
  dcaQuoteParams,
  dcaQuote,
  dcaQuoteLastChunk,
  dcaBoostedQuote,
  dcaBoostedQuoteLastChunk,
  estimatedBoostFeeBps,
}: {
  quote: QuoteQueryResponse;
  dcaQuoteParams: Awaited<ReturnType<typeof getDcaQuoteParams>>;
  dcaQuote: QuoteQueryResponse | null;
  dcaQuoteLastChunk: QuoteQueryResponse | null;
  dcaBoostedQuote?: QuoteQueryResponse | null | 0;
  dcaBoostedQuoteLastChunk?: QuoteQueryResponse | null | 0;
  estimatedBoostFeeBps?: number;
}) => {
  if (dcaQuoteParams && dcaQuoteLastChunk && dcaQuote) {
    const netWorkFee = dcaQuote.includedFees.find((fee) => fee.type === 'NETWORK');
    const lastChunkNetWorkFee = dcaQuoteLastChunk.includedFees.find(
      (fee) => fee.type === 'NETWORK',
    );
    if (netWorkFee) {
      netWorkFee.amount = new BigNumber(netWorkFee.amount)
        .multipliedBy(dcaQuoteParams.numberOfChunks - 1)
        .plus(lastChunkNetWorkFee!.amount)
        .toFixed();
    }
    quote.dcaQuote = {
      ...dcaQuote,
      egressAmount: BigNumber(dcaQuote.egressAmount)
        .multipliedBy(dcaQuoteParams.numberOfChunks - 1)
        .plus(dcaQuoteLastChunk.egressAmount)
        .toString(),
      estimatedDurationSeconds:
        dcaQuote.estimatedDurationSeconds + dcaQuoteParams.addedDurationSeconds,
    };
  }
  if (dcaQuoteParams && dcaBoostedQuote && dcaBoostedQuoteLastChunk && estimatedBoostFeeBps) {
    const netWorkFee = dcaBoostedQuote.includedFees.find((fee) => fee.type === 'NETWORK');
    const lastChunkNetWorkFee = dcaBoostedQuoteLastChunk.includedFees.find(
      (fee) => fee.type === 'NETWORK',
    );
    if (netWorkFee) {
      netWorkFee.amount = new BigNumber(netWorkFee.amount)
        .multipliedBy(dcaQuoteParams.numberOfChunks - 1)
        .plus(lastChunkNetWorkFee!.amount)
        .toFixed();
    }

    const boostFee = dcaBoostedQuote.includedFees.find((fee) => fee.type === 'BOOST');
    const lastChunkBoostFee = dcaBoostedQuoteLastChunk.includedFees.find(
      (fee) => fee.type === 'BOOST',
    );
    if (boostFee) {
      boostFee.amount = new BigNumber(boostFee.amount)
        .multipliedBy(dcaQuoteParams.numberOfChunks - 1)
        .plus(lastChunkBoostFee!.amount)
        .toFixed();
    }

    quote.dcaBoostedQuote = {
      ...dcaBoostedQuote,
      estimatedBoostFeeBps,
      egressAmount: BigNumber(dcaBoostedQuote.egressAmount)
        .multipliedBy(dcaQuoteParams.numberOfChunks - 1)
        .plus(dcaBoostedQuoteLastChunk.egressAmount)
        .toString(),
      estimatedDurationSeconds:
        dcaBoostedQuote.estimatedDurationSeconds + dcaQuoteParams.addedDurationSeconds,
    };
  }
};

const fallbackChains = {
  [Assets.ETH]: Chains.Ethereum,
  [Assets.USDC]: Chains.Ethereum,
  [Assets.FLIP]: Chains.Ethereum,
  [Assets.BTC]: Chains.Bitcoin,
  [Assets.DOT]: Chains.Polkadot,
  [Assets.USDT]: Chains.Ethereum,
  [Assets.SOL]: Chains.Solana,
} satisfies Record<Asset, Chain>;

const quoteRouter = (io: Server) => {
  const quoter = new Quoter(io);

  const router = express.Router().use((req, res, next) => {
    if (env.DISABLE_QUOTING) {
      next(ServiceError.unavailable('Quoting is currently unavailable due to maintenance'));

      return;
    }

    next();
  });

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

      const start = performance.now();

      logger.info('received a quote request', { query: req.query });
      const query = queryResult.data;

      const { srcAsset, destAsset, amount, brokerCommissionBps } = queryResult.data;
      const boostDepositsEnabled = getBoostSafeMode(srcAsset).catch(() => true);

      if (env.DISABLED_INTERNAL_ASSETS.includes(srcAsset)) {
        throw ServiceError.unavailable(`Asset ${srcAsset} is disabled`);
      }
      if (env.DISABLED_INTERNAL_ASSETS.includes(destAsset)) {
        throw ServiceError.unavailable(`Asset ${destAsset} is disabled`);
      }

      const amountResult = await validateSwapAmount(srcAsset, BigInt(query.amount));

      if (!amountResult.success) {
        throw ServiceError.badRequest(amountResult.reason);
      }

      const ingressFee = await getIngressFee(srcAsset);

      if (ingressFee === null) {
        throw ServiceError.internalError(`could not determine ingress fee for ${srcAsset}`);
      }

      if (ingressFee > amount) {
        throw ServiceError.badRequest(`amount is lower than estimated ingress fee (${ingressFee})`);
      }

      let limitOrdersReceived;
      try {
        const [limitOrders, estimatedBoostFeeBps, pools] = await Promise.all([
          quoter.getLimitOrders(srcAsset, destAsset, amount),
          env.DISABLE_BOOST_QUOTING || !(await boostDepositsEnabled)
            ? undefined
            : getBoostFeeBpsForAmount({ amount, asset: srcAsset }),
          getPools(srcAsset, destAsset),
        ]);
        limitOrdersReceived = limitOrders;

        const dcaQuoteParams = await getDcaQuoteParams(srcAsset, amount);
        console.log('dcaQuoteParams', dcaQuoteParams);

        const quoteArgs = {
          srcAsset,
          destAsset,
          swapInputAmount: amount,
          limitOrders,
          brokerCommissionBps,
          pools,
        };

        const [
          quote,
          boostedQuote,
          dcaQuote,
          dcaQuoteLastChunk,
          dcaBoostedQuote,
          dcaBoostedQuoteLastChunk,
        ] = await Promise.all([
          getPoolQuote(quoteArgs),
          estimatedBoostFeeBps &&
            getPoolQuote({ ...quoteArgs, boostFeeBps: estimatedBoostFeeBps }).catch(() => null),
          dcaQuoteParams &&
            getPoolQuote({
              ...quoteArgs,
              swapInputAmount: dcaQuoteParams.chunkSize,
            }),
          dcaQuoteParams &&
            getPoolQuote({
              ...quoteArgs,
              swapInputAmount: dcaQuoteParams.lastChunkAmount,
            }),
          dcaQuoteParams &&
            estimatedBoostFeeBps &&
            getPoolQuote({
              ...quoteArgs,
              boostFeeBps: estimatedBoostFeeBps,
              swapInputAmount: dcaQuoteParams.chunkSize,
            }).catch(() => null),
          dcaQuoteParams &&
            estimatedBoostFeeBps &&
            getPoolQuote({
              ...quoteArgs,
              boostFeeBps: estimatedBoostFeeBps,
              swapInputAmount: dcaQuoteParams.lastChunkAmount,
            }).catch(() => null),
        ]);

        if (boostedQuote && estimatedBoostFeeBps) {
          quote.boostQuote = { ...boostedQuote, estimatedBoostFeeBps };
        }
        addDcaToQuote({
          quote,
          dcaQuoteParams,
          dcaQuote,
          dcaQuoteLastChunk,
          dcaBoostedQuote,
          dcaBoostedQuoteLastChunk,
          estimatedBoostFeeBps,
        });

        const duration = performance.now() - start;

        res.json(quote);

        logger.info('quote request completed', {
          duration: duration.toFixed(2),
          quote,
          srcAsset,
          destAsset,
          ...(quote.lowLiquidityWarning && {
            inputAmount: new BigNumber(amount.toString())
              .shiftedBy(-assetConstants[srcAsset].decimals)
              .toFixed(),
            usdValue: await getUsdValue(amount, srcAsset).catch(() => undefined),
          }),
        });
      } catch (err) {
        handleQuotingError(res, err, {
          srcAsset,
          destAsset,
          amount: new BigNumber(amount.toString())
            .shiftedBy(-assetConstants[srcAsset].decimals)
            .toFixed(),
          limitOrdersReceived,
          usdValue: await getUsdValue(amount, srcAsset).catch(() => undefined),
        });
      }
    }),
  );

  return router;
};

export default quoteRouter;

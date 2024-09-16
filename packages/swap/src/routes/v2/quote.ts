import BigNumber from 'bignumber.js';
import express from 'express';
import type { Server } from 'socket.io';
import { Asset, assetConstants, InternalAsset } from '@/shared/enums';
import { quoteQuerySchema, QuoteQueryResponse } from '@/shared/schemas';
import env from '../../config/env';
import { getBoostSafeMode } from '../../polkadot/api';
import { getUsdValue } from '../../pricing/checkPriceWarning';
import Quoter from '../../quoting/Quoter';
import { getBoostFeeBpsForAmount } from '../../utils/boost';
import getPoolQuote from '../../utils/getPoolQuote';
import logger from '../../utils/logger';
import { getPools, getTotalLiquidity } from '../../utils/pools';
import { getIngressFee, validateSwapAmount } from '../../utils/rpc';
import ServiceError from '../../utils/ServiceError';
import { asyncHandler } from '../common';
import { fallbackChains } from '../quote';

type AdditionalInfo = {
  srcAsset: InternalAsset;
  destAsset: InternalAsset;
  amount: string;
  usdValue: string | undefined;
  limitOrdersReceived: Awaited<ReturnType<Quoter['getLimitOrders']>> | undefined;
};

const handleQuotingError = (err: unknown, info: AdditionalInfo) => {
  if (err instanceof ServiceError) throw err;

  const message = err instanceof Error ? err.message : 'unknown error (possibly no liquidity)';

  if (message.includes('InsufficientLiquidity')) {
    logger.info('insufficient liquidity received', info);
    throw ServiceError.badRequest('insufficient liquidity for requested amount');
  }

  logger.error('error while collecting quotes:', err);

  return message;
};

export const getDcaQuoteParams = async (asset: InternalAsset, amount: bigint) => {
  const usdChunkSize = env.DCA_CHUNK_SIZE_USD?.[asset] ?? env.DCA_DEFAULT_CHUNK_SIZE_USD;

  const usdValue = await getUsdValue(amount, asset).catch(() => undefined);
  if (!usdValue) {
    logger.error(
      `could not get usd value for DCA quote calculation. asset: ${asset} , amount: ${amount}`,
    );
    return null;
  }
  if (Number(usdValue) < usdChunkSize) {
    return {
      chunkSize: amount,
      numberOfChunks: 1,
      addedDurationSeconds: 0,
    };
  }
  const numberOfChunks = Math.ceil(Number(usdValue) / usdChunkSize);

  return {
    chunkSize: BigInt(new BigNumber(amount.toString()).dividedBy(numberOfChunks).toFixed(0)),
    numberOfChunks,
    addedDurationSeconds: Math.ceil(env.DCA_CHUNK_INTERVAL_BLOCKS * 6 * (numberOfChunks - 1)), // we deduct 1 chunk because the first one is already accounted for in the regular quote
  };
};

const adjustDcaQuote = ({
  dcaQuoteParams,
  dcaQuote,
  dcaBoostedQuote,
  estimatedBoostFeeBps,
}: {
  dcaQuoteParams: NonNullable<Awaited<ReturnType<typeof getDcaQuoteParams>>>;
  dcaQuote: QuoteQueryResponse;
  dcaBoostedQuote?: QuoteQueryResponse | null | 0;
  estimatedBoostFeeBps?: number;
}) => {
  // eslint-disable-next-line no-param-reassign
  dcaQuote.dcaParams = {
    chunkInterval: env.DCA_CHUNK_INTERVAL_BLOCKS,
    numberOfChunks: dcaQuoteParams.numberOfChunks,
  };
  if (dcaQuoteParams && dcaQuote) {
    const netWorkFee = dcaQuote.includedFees.find((fee) => fee.type === 'NETWORK');
    if (netWorkFee) {
      netWorkFee.amount = new BigNumber(netWorkFee.amount)
        .multipliedBy(dcaQuoteParams.numberOfChunks)
        .toFixed(0);
    }

    const brokerFee = dcaQuote.includedFees.find((fee) => fee.type === 'BROKER');
    if (brokerFee) {
      brokerFee.amount = new BigNumber(brokerFee.amount)
        .multipliedBy(dcaQuoteParams.numberOfChunks)
        .toFixed(0);
    }

    // eslint-disable-next-line no-param-reassign
    dcaQuote.egressAmount = new BigNumber(dcaQuote.egressAmount)
      .multipliedBy(dcaQuoteParams.numberOfChunks)
      .toFixed(0);
    // eslint-disable-next-line no-param-reassign
    dcaQuote.estimatedDurationSeconds += dcaQuoteParams.addedDurationSeconds;
  }
  if (dcaQuoteParams && dcaBoostedQuote && estimatedBoostFeeBps) {
    const netWorkFee = dcaBoostedQuote.includedFees.find((fee) => fee.type === 'NETWORK');
    if (netWorkFee) {
      netWorkFee.amount = new BigNumber(netWorkFee.amount)
        .multipliedBy(dcaQuoteParams.numberOfChunks)
        .toFixed(0);
    }

    const brokerFee = dcaBoostedQuote.includedFees.find((fee) => fee.type === 'BROKER');
    if (brokerFee) {
      brokerFee.amount = new BigNumber(brokerFee.amount)
        .multipliedBy(dcaQuoteParams.numberOfChunks)
        .toFixed(0);
    }

    const boostFee = dcaBoostedQuote.includedFees.find((fee) => fee.type === 'BOOST');
    if (boostFee) {
      boostFee.amount = new BigNumber(boostFee.amount)
        .multipliedBy(dcaQuoteParams.numberOfChunks)
        .toFixed(0);
    }

    // eslint-disable-next-line no-param-reassign
    dcaQuote.boostQuote = {
      ...dcaBoostedQuote,
      estimatedBoostFeeBps,
      egressAmount: BigNumber(dcaBoostedQuote.egressAmount)
        .multipliedBy(dcaQuoteParams.numberOfChunks)
        .toFixed(0),
      estimatedDurationSeconds:
        dcaBoostedQuote.estimatedDurationSeconds + dcaQuoteParams.addedDurationSeconds,
    };
  }
};

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

      let limitOrdersReceived: Awaited<ReturnType<Quoter['getLimitOrders']>> | undefined;
      try {
        const usdValue = await getUsdValue(amount, srcAsset).catch(() => undefined);

        const [limitOrders, estimatedBoostFeeBps, pools] = await Promise.all([
          quoter.getLimitOrders(srcAsset, destAsset, amount),
          env.DISABLE_BOOST_QUOTING || !(await boostDepositsEnabled)
            ? undefined
            : getBoostFeeBpsForAmount({ amount, asset: srcAsset }),
          getPools(srcAsset, destAsset),
        ]);
        limitOrdersReceived = limitOrders;

        const dcaQuoteParams = await getDcaQuoteParams(srcAsset, amount);

        const quoteArgs = {
          srcAsset,
          destAsset,
          swapInputAmount: amount,
          limitOrders,
          brokerCommissionBps,
          pools,
        };

        const [quote, boostedQuote, dcaQuote, dcaBoostedQuote] = await Promise.all([
          getPoolQuote(quoteArgs).catch((error) => {
            if (dcaQuoteParams) {
              return undefined;
            }
            throw error;
          }),
          estimatedBoostFeeBps &&
            getPoolQuote({ ...quoteArgs, boostFeeBps: estimatedBoostFeeBps }).catch(
              () => undefined,
            ),
          dcaQuoteParams &&
            getPoolQuote({
              ...quoteArgs,
              swapInputAmount: dcaQuoteParams.chunkSize,
            }),
          dcaQuoteParams &&
            estimatedBoostFeeBps &&
            getPoolQuote({
              ...quoteArgs,
              boostFeeBps: estimatedBoostFeeBps,
              swapInputAmount: dcaQuoteParams.chunkSize,
            }).catch(() => undefined),
        ]);

        if (dcaQuoteParams && dcaQuote) {
          // Check liquidity for DCA
          if (srcAsset === 'Usdc' || destAsset === 'Usdc') {
            const totalLiquidity = await getTotalLiquidity(srcAsset, destAsset);
            if (
              totalLiquidity <
              BigInt(dcaQuote.egressAmount) * BigInt(dcaQuoteParams.numberOfChunks)
            ) {
              throw ServiceError.badRequest(`Insufficient liquidity for the requested amount`);
            }
          } else {
            const totalLiquidityLeg1 = await getTotalLiquidity(srcAsset, 'Usdc');
            const totalLiquidityLeg2 = await getTotalLiquidity('Usdc', destAsset);
            if (
              totalLiquidityLeg1 <
                BigInt(dcaQuote.intermediateAmount!) * BigInt(dcaQuoteParams.numberOfChunks) ||
              totalLiquidityLeg2 <
                BigInt(dcaQuote.egressAmount) * BigInt(dcaQuoteParams.numberOfChunks)
            ) {
              throw ServiceError.badRequest(`Insufficient liquidity for the requested amount`);
            }
          }
          // The received quotes are for a single chunk, we need to extrapolate them to the full amount
          adjustDcaQuote({
            dcaQuoteParams,
            dcaQuote,
            dcaBoostedQuote,
            estimatedBoostFeeBps,
          });
        }

        if (boostedQuote && estimatedBoostFeeBps && quote && boostedQuote) {
          quote.boostQuote = { ...boostedQuote, estimatedBoostFeeBps };
        }

        const duration = performance.now() - start;

        const result = [];
        if (quote) result.push(quote);
        if (dcaQuote) result.push(dcaQuote);
        res.json(result);

        logger.info('quote request completed', {
          duration: duration.toFixed(2),
          quote,
          srcAsset,
          destAsset,
          ...(quote?.lowLiquidityWarning && {
            inputAmount: new BigNumber(amount.toString())
              .shiftedBy(-assetConstants[srcAsset].decimals)
              .toFixed(),
            usdValue,
          }),
        });
      } catch (err) {
        handleQuotingError(err, {
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

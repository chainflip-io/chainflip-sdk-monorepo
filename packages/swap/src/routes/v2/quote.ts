import BigNumber from 'bignumber.js';
import express from 'express';
import { Query } from 'express-serve-static-core';
import { Asset, assetConstants, InternalAsset } from '@/shared/enums';
import { getFulfilledResult } from '@/shared/promises';
import { quoteQuerySchema, DCABoostQuote, DCAQuote } from '@/shared/schemas';
import env from '../../config/env';
import { getBoostSafeMode } from '../../polkadot/api';
import { getUsdValue } from '../../pricing/checkPriceWarning';
import Quoter, { type QuotingServer } from '../../quoting/Quoter';
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
  if (Number(usdValue) <= usdChunkSize) {
    return null;
  }
  const numberOfChunks = Math.ceil(Number(usdValue) / usdChunkSize);

  return {
    chunkSize: BigInt(new BigNumber(amount.toString()).dividedBy(numberOfChunks).toFixed(0)),
    numberOfChunks,
    addedDurationSeconds: Math.ceil(env.DCA_CHUNK_INTERVAL_BLOCKS * 6 * (numberOfChunks - 1)), // we deduct 1 chunk because the first one is already accounted for in the regular quote
  };
};

/* eslint-disable no-param-reassign */
const adjustDcaQuote = ({
  dcaQuoteParams,
  dcaQuote,
  dcaBoostedQuote,
  estimatedBoostFeeBps,
  maxBoostFeeBps,
  originalDepositAmount,
}: {
  dcaQuoteParams: NonNullable<Awaited<ReturnType<typeof getDcaQuoteParams>>>;
  dcaQuote: DCAQuote;
  dcaBoostedQuote?: DCABoostQuote | null;
  estimatedBoostFeeBps?: number;
  maxBoostFeeBps: number | undefined;
  originalDepositAmount: bigint;
}) => {
  dcaQuote.dcaParams = {
    chunkIntervalBlocks: env.DCA_CHUNK_INTERVAL_BLOCKS,
    numberOfChunks: dcaQuoteParams.numberOfChunks,
  };

  dcaQuote.depositAmount = originalDepositAmount.toString();

  const egressFee = dcaQuote.includedFees.find((fee) => fee.type === 'EGRESS');
  // when multiplying the egressAmount with numberOfChunks, we will deduct the egressFee multiple times.
  // so we should add this fee back to the egress amount
  const duplicatedEgressFeeAmount = dcaQuoteParams
    ? BigInt(
        new BigNumber(egressFee?.amount ?? 0)
          .multipliedBy(dcaQuoteParams.numberOfChunks - 1)
          .toFixed(0),
      )
    : 0n;

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

  dcaQuote.egressAmount = new BigNumber(dcaQuote.egressAmount)
    .multipliedBy(dcaQuoteParams.numberOfChunks)
    .plus(duplicatedEgressFeeAmount.toString())
    .toFixed(0);

  dcaQuote.estimatedDurationSeconds += dcaQuoteParams.addedDurationSeconds;

  if (dcaQuoteParams && dcaBoostedQuote && estimatedBoostFeeBps && maxBoostFeeBps) {
    const boostNetWorkFee = dcaBoostedQuote.includedFees.find((fee) => fee.type === 'NETWORK');
    if (boostNetWorkFee) {
      boostNetWorkFee.amount = new BigNumber(boostNetWorkFee.amount)
        .multipliedBy(dcaQuoteParams.numberOfChunks)
        .toFixed(0);
    }

    const boostBrokerFee = dcaBoostedQuote.includedFees.find((fee) => fee.type === 'BROKER');
    if (boostBrokerFee) {
      boostBrokerFee.amount = new BigNumber(boostBrokerFee.amount)
        .multipliedBy(dcaQuoteParams.numberOfChunks)
        .toFixed(0);
    }

    const boostFee = dcaBoostedQuote.includedFees.find((fee) => fee.type === 'BOOST');
    if (boostFee) {
      boostFee.amount = new BigNumber(boostFee.amount)
        .multipliedBy(dcaQuoteParams.numberOfChunks)
        .toFixed(0);
    }

    dcaQuote.boostQuote = {
      ...dcaBoostedQuote,
      estimatedBoostFeeBps,
      egressAmount: BigNumber(dcaBoostedQuote.egressAmount)
        .multipliedBy(dcaQuoteParams.numberOfChunks)
        .plus(duplicatedEgressFeeAmount.toString())
        .toFixed(0),
      estimatedDurationSeconds:
        dcaBoostedQuote.estimatedDurationSeconds + dcaQuoteParams.addedDurationSeconds,
      dcaParams: dcaQuote.dcaParams,
      maxBoostFeeBps,
      depositAmount: dcaQuote.depositAmount,
    };
  }
};
/* eslint-enable no-param-reassign */

export const validateQuoteQuery = async (query: Query) => {
  // this api did not require the srcChain and destChain param initially
  // to keep it compatible with clients that do not include these params, we fall back to set them based on the asset
  // eslint-disable-next-line no-param-reassign
  query.srcChain ??= fallbackChains[query.srcAsset as Asset];
  // eslint-disable-next-line no-param-reassign
  query.destChain ??= fallbackChains[query.destAsset as Asset];
  const queryResult = quoteQuerySchema.safeParse({ dcaEnabled: 'false', ...query });

  if (!queryResult.success) {
    logger.info('received invalid quote request', {
      query,
      error: queryResult.error,
    });
    throw ServiceError.badRequest('invalid request');
  }

  logger.info('received a quote request', { query });
  const parsedQuery = queryResult.data;

  const { srcAsset, destAsset, amount, brokerCommissionBps } = queryResult.data;
  const boostDepositsEnabled = await getBoostSafeMode(srcAsset).catch(() => true);

  if (env.DISABLED_INTERNAL_ASSETS.includes(srcAsset)) {
    throw ServiceError.unavailable(`Asset ${srcAsset} is disabled`);
  }
  if (env.DISABLED_INTERNAL_ASSETS.includes(destAsset)) {
    throw ServiceError.unavailable(`Asset ${destAsset} is disabled`);
  }

  const amountResult = await validateSwapAmount(srcAsset, BigInt(parsedQuery.amount));

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

  return {
    srcAsset,
    destAsset,
    amount,
    brokerCommissionBps,
    boostDepositsEnabled,
    dcaEnabled: queryResult.data.dcaEnabled,
  };
};

export const generateQuotes = async ({
  dcaQuoteParams,
  amount,
  srcAsset,
  destAsset,
  brokerCommissionBps,
  boostDepositsEnabled,
  quoter,
}: {
  dcaQuoteParams?: Awaited<ReturnType<typeof getDcaQuoteParams>>;
  srcAsset: InternalAsset;
  amount: bigint;
  destAsset: InternalAsset;
  brokerCommissionBps?: number;
  boostDepositsEnabled: boolean;
  quoter: Quoter;
}) => {
  const [limitOrders, { estimatedBoostFeeBps, maxBoostFeeBps }, pools] = await Promise.all([
    quoter.getLimitOrders(srcAsset, destAsset, amount),
    env.DISABLE_BOOST_QUOTING || !boostDepositsEnabled
      ? { estimatedBoostFeeBps: undefined, maxBoostFeeBps: undefined }
      : getBoostFeeBpsForAmount({ amount, asset: srcAsset }),
    getPools(srcAsset, destAsset),
  ]);

  const quoteArgs = {
    srcAsset,
    destAsset,
    depositAmount: amount,
    limitOrders,
    brokerCommissionBps,
    pools,
    quoteType: 'REGULAR' as const,
  };

  const [quoteResult, boostedQuoteResult] = await Promise.allSettled([
    getPoolQuote(quoteArgs),
    estimatedBoostFeeBps && getPoolQuote({ ...quoteArgs, boostFeeBps: estimatedBoostFeeBps }),
  ]);
  const ingressFee = getFulfilledResult(quoteResult, undefined)?.includedFees.find(
    (fee) => fee.type === 'INGRESS',
  );

  // the swap_rate rpc will deduct the full ingress fee before simulating the swap
  // as we quote a single chunk, we add a surcharge so that the effective deducted amount is 1/numberOfChunks
  const ingressFeeSurcharge = dcaQuoteParams
    ? BigInt(
        new BigNumber(ingressFee?.amount ?? 0)
          .multipliedBy((dcaQuoteParams.numberOfChunks - 1) / dcaQuoteParams.numberOfChunks)
          .toFixed(0),
      )
    : 0n;

  const [dcaQuoteResult, dcaBoostedQuoteResult] = await Promise.allSettled([
    dcaQuoteParams &&
      getPoolQuote({
        ...quoteArgs,
        depositAmount: dcaQuoteParams.chunkSize + ingressFeeSurcharge,
        quoteType: 'DCA',
      }),
    dcaQuoteParams && estimatedBoostFeeBps
      ? getPoolQuote({
          ...quoteArgs,
          boostFeeBps: estimatedBoostFeeBps,
          depositAmount: dcaQuoteParams.chunkSize + ingressFeeSurcharge,
          quoteType: 'DCA',
        })
      : null,
  ]);

  if (dcaQuoteResult.status === 'rejected') {
    throw dcaQuoteResult.reason;
  }
  if (!dcaQuoteParams && quoteResult.status === 'rejected') {
    throw quoteResult.reason;
  }

  const dcaQuote = dcaQuoteResult.value;
  const quote = getFulfilledResult(quoteResult, null);
  const boostedQuote = getFulfilledResult(boostedQuoteResult, null);
  const dcaBoostedQuote = getFulfilledResult(dcaBoostedQuoteResult, null) as DCABoostQuote | null;

  if (dcaQuoteParams && dcaQuote) {
    // Check liquidity for DCA
    if (srcAsset === 'Usdc' || destAsset === 'Usdc') {
      const totalLiquidity = await getTotalLiquidity(srcAsset, destAsset);
      if (totalLiquidity < BigInt(dcaQuote.egressAmount) * BigInt(dcaQuoteParams.numberOfChunks)) {
        throw ServiceError.badRequest(`Insufficient liquidity for the requested amount`);
      }
    } else {
      const totalLiquidityLeg1 = await getTotalLiquidity(srcAsset, 'Usdc');
      const totalLiquidityLeg2 = await getTotalLiquidity('Usdc', destAsset);
      if (
        totalLiquidityLeg1 <
          BigInt(dcaQuote.intermediateAmount!) * BigInt(dcaQuoteParams.numberOfChunks) ||
        totalLiquidityLeg2 < BigInt(dcaQuote.egressAmount) * BigInt(dcaQuoteParams.numberOfChunks)
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
      maxBoostFeeBps,
      originalDepositAmount: amount,
    });
  }

  if (boostedQuote && estimatedBoostFeeBps && quote && boostedQuote && maxBoostFeeBps) {
    quote.boostQuote = { ...boostedQuote, estimatedBoostFeeBps, maxBoostFeeBps };
  }

  const result = [];
  if (quote) result.push(quote);
  if (dcaQuote) result.push(dcaQuote);
  return { quotes: result, limitOrders };
};

const quoteRouter = (io: QuotingServer) => {
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
      const start = performance.now();

      const { srcAsset, destAsset, amount, brokerCommissionBps, boostDepositsEnabled, dcaEnabled } =
        await validateQuoteQuery(req.query);

      let limitOrdersReceived: Awaited<ReturnType<Quoter['getLimitOrders']>> | undefined;
      try {
        const dcaQuoteParams =
          env.DISABLE_DCA_QUOTING || !dcaEnabled
            ? undefined
            : await getDcaQuoteParams(srcAsset, amount);

        const { quotes, limitOrders } = await generateQuotes({
          dcaQuoteParams,
          srcAsset,
          amount,
          destAsset,
          brokerCommissionBps,
          boostDepositsEnabled,
          quoter,
        });
        const quote = quotes[0];
        limitOrdersReceived = limitOrders;

        const duration = performance.now() - start;

        res.json(quotes);

        logger.info('quote request completed', {
          duration: duration.toFixed(2),
          quote,
          srcAsset,
          destAsset,
          ...(quote?.lowLiquidityWarning && {
            inputAmount: new BigNumber(amount.toString())
              .shiftedBy(-assetConstants[srcAsset].decimals)
              .toFixed(),
            usdValue: await getUsdValue(amount, srcAsset).catch(() => undefined),
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

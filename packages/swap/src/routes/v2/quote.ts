import BigNumber from 'bignumber.js';
import express from 'express';
import { Query } from 'express-serve-static-core';
import { CHAINFLIP_STATECHAIN_BLOCK_TIME_SECONDS } from '@/shared/consts';
import { Asset, assetConstants, InternalAsset } from '@/shared/enums';
import { getFulfilledResult } from '@/shared/promises';
import { quoteQuerySchema, DCABoostQuote, DCAQuote } from '@/shared/schemas';
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
import { asyncHandler, handleQuotingError } from '../common';
import { fallbackChains } from '../quote';

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
    additionalSwapDurationSeconds: Math.ceil(
      env.DCA_CHUNK_INTERVAL_BLOCKS *
        CHAINFLIP_STATECHAIN_BLOCK_TIME_SECONDS *
        (numberOfChunks - 1), // we deduct 1 chunk because the first one is already accounted for in the regular quote
    ),
  };
};

/* eslint-disable no-param-reassign */
const adjustDcaQuote = ({
  dcaQuoteParams,
  dcaQuote,
  originalDepositAmount,
}: {
  dcaQuoteParams: NonNullable<Awaited<ReturnType<typeof getDcaQuoteParams>>>;
  dcaQuote: DCAQuote | DCABoostQuote;
  originalDepositAmount: bigint;
}) => {
  dcaQuote.dcaParams = {
    chunkIntervalBlocks: env.DCA_CHUNK_INTERVAL_BLOCKS,
    numberOfChunks: dcaQuoteParams.numberOfChunks,
  };

  dcaQuote.depositAmount = originalDepositAmount.toString();
  if (dcaQuote.intermediateAmount) {
    dcaQuote.intermediateAmount = new BigNumber(dcaQuote.intermediateAmount)
      .multipliedBy(dcaQuoteParams.numberOfChunks)
      .toFixed(0);
  }

  // when multiplying the egressAmount with numberOfChunks, we will deduct the egressFee multiple times.
  // so we should add this fee back to the egress amount
  const egressFee = dcaQuote.includedFees.find((fee) => fee.type === 'EGRESS');
  const duplicatedEgressFeeAmount = dcaQuoteParams
    ? BigInt(
        new BigNumber(egressFee?.amount ?? 0)
          .multipliedBy(dcaQuoteParams.numberOfChunks - 1)
          .toFixed(0),
      )
    : 0n;
  dcaQuote.egressAmount = new BigNumber(dcaQuote.egressAmount)
    .multipliedBy(dcaQuoteParams.numberOfChunks)
    .plus(duplicatedEgressFeeAmount.toString())
    .toFixed(0);

  for (const feeType of ['NETWORK', 'BROKER', 'BOOST']) {
    const fee = dcaQuote.includedFees.find(({ type }) => type === feeType);
    if (fee) {
      fee.amount = new BigNumber(fee.amount).multipliedBy(dcaQuoteParams.numberOfChunks).toFixed(0);
    }
  }

  dcaQuote.estimatedDurationsSeconds.swap += dcaQuoteParams.additionalSwapDurationSeconds;
  dcaQuote.estimatedDurationSeconds += dcaQuoteParams.additionalSwapDurationSeconds;
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

export const eagerLiquidityExists = async (
  srcAsset: InternalAsset,
  destAsset: InternalAsset,
  egressAmount: string,
  intermediateAmount?: string,
) => {
  if (srcAsset === 'Usdc' || destAsset === 'Usdc') {
    const totalLiquidity = await getTotalLiquidity(srcAsset, destAsset);
    return BigInt(totalLiquidity) > BigInt(egressAmount);
  }
  const totalLiquidityLeg1 = await getTotalLiquidity(srcAsset, 'Usdc');
  const totalLiquidityLeg2 = await getTotalLiquidity('Usdc', destAsset);
  return (
    BigInt(totalLiquidityLeg1) > BigInt(intermediateAmount!) &&
    BigInt(totalLiquidityLeg2) > BigInt(egressAmount)
  );
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
  let regularEagerLiquidityExists;
  let dcaEagerLiquidityExists;

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
    dcaChunks: 1,
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
        dcaChunks: dcaQuoteParams.numberOfChunks,
      }),
    dcaQuoteParams && estimatedBoostFeeBps
      ? getPoolQuote({
          ...quoteArgs,
          boostFeeBps: estimatedBoostFeeBps,
          depositAmount: dcaQuoteParams.chunkSize + ingressFeeSurcharge,
          quoteType: 'DCA',
          dcaChunks: dcaQuoteParams.numberOfChunks,
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
    // The received quotes are for a single chunk, we need to extrapolate them to the full amount
    adjustDcaQuote({ dcaQuoteParams, dcaQuote, originalDepositAmount: amount });
    if (dcaBoostedQuote) {
      adjustDcaQuote({ dcaQuoteParams, dcaQuote: dcaBoostedQuote, originalDepositAmount: amount });
    }
    dcaEagerLiquidityExists = await eagerLiquidityExists(
      srcAsset,
      destAsset,
      dcaQuote.egressAmount,
      dcaQuote.intermediateAmount,
    );
  }
  if (quote) {
    regularEagerLiquidityExists = await eagerLiquidityExists(
      srcAsset,
      destAsset,
      quote.egressAmount,
      quote.intermediateAmount,
    );
  }

  if (!regularEagerLiquidityExists && !dcaEagerLiquidityExists)
    throw ServiceError.badRequest(`Insufficient liquidity for the requested amount`);

  if (quote && boostedQuote && estimatedBoostFeeBps && maxBoostFeeBps) {
    quote.boostQuote = { ...boostedQuote, estimatedBoostFeeBps, maxBoostFeeBps };
  }
  if (dcaQuote && dcaBoostedQuote && estimatedBoostFeeBps && maxBoostFeeBps) {
    dcaQuote.boostQuote = { ...dcaBoostedQuote, estimatedBoostFeeBps, maxBoostFeeBps };
  }

  const result = [];
  if (quote && regularEagerLiquidityExists) result.push(quote);
  if (dcaQuote && dcaEagerLiquidityExists) result.push(dcaQuote);
  return { quotes: result, limitOrders };
};

const quoteRouter = (quoter: Quoter) => {
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

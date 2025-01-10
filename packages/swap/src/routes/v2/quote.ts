import BigNumber from 'bignumber.js';
import express from 'express';
import { Query } from 'express-serve-static-core';
import { CHAINFLIP_STATECHAIN_BLOCK_TIME_SECONDS } from '@/shared/consts';
import { Asset, assetConstants, InternalAsset } from '@/shared/enums';
import { getFulfilledResult } from '@/shared/promises';
import { quoteQuerySchema, DCABoostQuote, DcaParams, DCAQuote } from '@/shared/schemas';
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

const router = express.Router();

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

export const validateQuoteQuery = async (query: Query) => {
  // this api did not require the srcChain and destChain param initially
  // to keep it compatible with clients that do not include these params, we fall back to set them based on the asset
  // eslint-disable-next-line no-param-reassign
  query.srcChain ??= fallbackChains[query.srcAsset as Asset];
  // eslint-disable-next-line no-param-reassign
  query.destChain ??= fallbackChains[query.destAsset as Asset];
  const queryResult = quoteQuerySchema.safeParse(query);

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

  const ingressFee = (await getIngressFee(srcAsset)) ?? 0n; // when the protocol can't estimate the fee, that means they won't charge one so we fallback to 0

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
  depositAmount,
  srcAsset,
  destAsset,
  brokerCommissionBps,
  boostDepositsEnabled,
  quoter,
}: {
  dcaQuoteParams?: Awaited<ReturnType<typeof getDcaQuoteParams>>;
  srcAsset: InternalAsset;
  depositAmount: bigint;
  destAsset: InternalAsset;
  brokerCommissionBps?: number;
  boostDepositsEnabled: boolean;
  quoter: Quoter;
}) => {
  let regularEagerLiquidityExists = false;
  let dcaEagerLiquidityExists = false;

  const [limitOrders, { estimatedBoostFeeBps, maxBoostFeeBps }, pools] = await Promise.all([
    quoter.getLimitOrders(srcAsset, destAsset, depositAmount),
    env.DISABLE_BOOST_QUOTING || !boostDepositsEnabled
      ? { estimatedBoostFeeBps: undefined, maxBoostFeeBps: undefined }
      : getBoostFeeBpsForAmount({ amount: depositAmount, asset: srcAsset }),
    getPools(srcAsset, destAsset),
  ]);

  const dcaParams = dcaQuoteParams
    ? ({
        numberOfChunks: dcaQuoteParams.numberOfChunks,
        chunkIntervalBlocks: env.DCA_CHUNK_INTERVAL_BLOCKS,
      } as DcaParams)
    : undefined;

  const quoteArgs = {
    srcAsset,
    destAsset,
    depositAmount,
    limitOrders,
    brokerCommissionBps,
    pools,
  };
  const dcaQuoteArgs = { dcaParams, ...quoteArgs };
  const queryDca = dcaParams && dcaParams.numberOfChunks > 1;

  const [quoteResult, boostedQuoteResult, dcaQuoteResult, dcaBoostedQuoteResult] =
    await Promise.allSettled([
      getPoolQuote(quoteArgs),
      estimatedBoostFeeBps && getPoolQuote({ ...quoteArgs, boostFeeBps: estimatedBoostFeeBps }),
      queryDca && getPoolQuote(dcaQuoteArgs),
      queryDca &&
        estimatedBoostFeeBps &&
        getPoolQuote({ ...dcaQuoteArgs, boostFeeBps: estimatedBoostFeeBps }),
    ]);

  if (dcaQuoteResult.status === 'rejected') {
    throw dcaQuoteResult.reason;
  }
  if (!dcaQuoteParams && quoteResult.status === 'rejected') {
    throw quoteResult.reason;
  }

  const quote = getFulfilledResult(quoteResult, null);
  const boostedQuote = getFulfilledResult(boostedQuoteResult, null);
  const dcaQuote = getFulfilledResult(dcaQuoteResult, null) as DCAQuote | null;
  const dcaBoostedQuote = getFulfilledResult(dcaBoostedQuoteResult, null) as DCABoostQuote | null;

  if (dcaQuote && dcaQuoteParams) {
    // include dcaParams in dca quote
    dcaQuote.dcaParams = dcaParams!;

    // adjust time for DCA
    dcaQuote.estimatedDurationsSeconds.swap += dcaQuoteParams.additionalSwapDurationSeconds;
    dcaQuote.estimatedDurationSeconds += dcaQuoteParams.additionalSwapDurationSeconds;
    if (dcaBoostedQuote) {
      dcaBoostedQuote.dcaParams = dcaParams!;
      dcaBoostedQuote.estimatedDurationsSeconds.swap +=
        dcaQuoteParams.additionalSwapDurationSeconds;
      dcaBoostedQuote.estimatedDurationSeconds += dcaQuoteParams.additionalSwapDurationSeconds;
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
    dcaQuote.boostQuote = {
      ...dcaBoostedQuote,
      estimatedBoostFeeBps,
      maxBoostFeeBps,
    };
  }

  const result = [];
  if (quote && regularEagerLiquidityExists) result.push(quote);
  if (dcaQuote && dcaEagerLiquidityExists) result.push(dcaQuote);
  return { quotes: result, limitOrders };
};

const quoteRouter = (quoter: Quoter) => {
  router.get(
    '/',
    asyncHandler(async (req, res) => {
      const start = performance.now();

      const {
        srcAsset,
        destAsset,
        amount: depositAmount,
        brokerCommissionBps,
        boostDepositsEnabled,
        dcaEnabled,
      } = await validateQuoteQuery(req.query);

      let limitOrdersReceived: Awaited<ReturnType<Quoter['getLimitOrders']>> | undefined;
      try {
        const dcaQuoteParams =
          env.DISABLE_DCA_QUOTING || !dcaEnabled
            ? undefined
            : await getDcaQuoteParams(srcAsset, depositAmount);

        const { quotes, limitOrders } = await generateQuotes({
          srcAsset,
          depositAmount,
          destAsset,
          brokerCommissionBps,
          boostDepositsEnabled,
          quoter,
          dcaQuoteParams,
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
            inputAmount: new BigNumber(depositAmount.toString())
              .shiftedBy(-assetConstants[srcAsset].decimals)
              .toFixed(),
            usdValue: await getUsdValue(depositAmount, srcAsset).catch(() => undefined),
          }),
        });
      } catch (err) {
        handleQuotingError(res, err, {
          srcAsset,
          destAsset,
          amount: new BigNumber(depositAmount.toString())
            .shiftedBy(-assetConstants[srcAsset].decimals)
            .toFixed(),
          limitOrdersReceived,
          usdValue: await getUsdValue(depositAmount, srcAsset).catch(() => undefined),
        });
      }
    }),
  );
  return router;
};

export default quoteRouter;

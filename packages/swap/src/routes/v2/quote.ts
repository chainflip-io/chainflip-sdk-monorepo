import { assetConstants, AssetSymbol, ChainflipAsset } from '@chainflip/utils/chainflip';
import BigNumber from 'bignumber.js';
import express from 'express';
import { Query } from 'express-serve-static-core';
import { CHAINFLIP_STATECHAIN_BLOCK_TIME_SECONDS } from '@/shared/consts.js';
import { getFulfilledResult } from '@/shared/promises.js';
import {
  quoteQuerySchema,
  DCABoostQuote,
  DCAQuote,
  Quote,
  RegularQuote,
} from '@/shared/schemas.js';
import type { Pool } from '../../client.js';
import env from '../../config/env.js';
import { getBoostSafeMode } from '../../polkadot/api.js';
import { getUsdValue } from '../../pricing/checkPriceWarning.js';
import Quoter, { RpcLimitOrder } from '../../quoting/Quoter.js';
import { getBoostFeeBpsForAmount } from '../../utils/boost.js';
import { assertRouteEnabled } from '../../utils/env.js';
import getPoolQuote from '../../utils/getPoolQuote.js';
import logger from '../../utils/logger.js';
import { getPools, getTotalLiquidity } from '../../utils/pools.js';
import { getIngressFee, validateSwapAmount } from '../../utils/rpc.js';
import ServiceError from '../../utils/ServiceError.js';
import { QuoteCcmParams } from '../../utils/statechain.js';
import { asyncHandler, handleQuotingError } from '../common.js';
import { fallbackChains } from '../quote.js';

const MAX_DCA_DURATION_SECONDS = 24 * 60 * 60;
export const MAX_NUMBER_OF_CHUNKS = Math.ceil(
  MAX_DCA_DURATION_SECONDS /
    CHAINFLIP_STATECHAIN_BLOCK_TIME_SECONDS /
    env.DCA_CHUNK_INTERVAL_BLOCKS,
);

const router = express.Router();

export const getDcaQuoteParams = async (asset: ChainflipAsset, amount: bigint) => {
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

  if (numberOfChunks > MAX_NUMBER_OF_CHUNKS) {
    logger.info('number of chunks is bigger than max', { numberOfChunks, MAX_NUMBER_OF_CHUNKS });
    return null;
  }

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
  query.srcChain ??= fallbackChains[query.srcAsset as AssetSymbol];
  // eslint-disable-next-line no-param-reassign
  query.destChain ??= fallbackChains[query.destAsset as AssetSymbol];
  const queryResult = quoteQuerySchema.safeParse(query);

  if (!queryResult.success) {
    logger.info('received invalid quote request', {
      query,
      error: queryResult.error.message,
    });
    throw ServiceError.badRequest('invalid request');
  }

  logger.info('received a quote request', { query });
  const parsedQuery = queryResult.data;

  const { srcAsset, destAsset, amount } = queryResult.data;
  const boostDepositsEnabled = await getBoostSafeMode(srcAsset).catch(() => true);

  assertRouteEnabled({ srcAsset, destAsset });

  const amountResult = await validateSwapAmount(srcAsset, BigInt(parsedQuery.amount));

  if (!amountResult.success) {
    throw ServiceError.badRequest(amountResult.reason);
  }

  if (parsedQuery.isVaultSwap && assetConstants[parsedQuery.srcAsset].chain === 'Polkadot') {
    throw ServiceError.badRequest(`Polkadot does not support vault swaps`);
  }

  const ingressFee = (await getIngressFee(srcAsset)) ?? 0n; // when the protocol can't estimate the fee, that means they won't charge one so we fallback to 0

  if (ingressFee > amount) {
    throw ServiceError.badRequest(`amount is lower than estimated ingress fee (${ingressFee})`);
  }

  const pools = await getPools(srcAsset, destAsset).catch(() => {
    logger.warn('could not find pool(s)', { srcAsset, destAsset });
    return null;
  });

  if (!pools) {
    throw ServiceError.badRequest('Requested assets cannot be swapped');
  }

  return {
    srcAsset,
    destAsset,
    amount,
    boostDepositsEnabled,
    brokerCommissionBps: queryResult.data.brokerCommissionBps,
    ccmParams: queryResult.data.ccmParams,
    dcaEnabled: queryResult.data.dcaEnabled,
    isVaultSwap: queryResult.data.isVaultSwap,
    pools,
  };
};

export const eagerLiquidityExists = async (
  srcAsset: ChainflipAsset,
  destAsset: ChainflipAsset,
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
  ccmParams,
  isVaultSwap,
  limitOrders,
  pools,
  estimatedBoostFeeBps,
  maxBoostFeeBps,
}: {
  dcaQuoteParams?: Awaited<ReturnType<typeof getDcaQuoteParams>>;
  srcAsset: ChainflipAsset;
  depositAmount: bigint;
  destAsset: ChainflipAsset;
  brokerCommissionBps: number | undefined;
  ccmParams: QuoteCcmParams | undefined;
  isVaultSwap: boolean;
  limitOrders: RpcLimitOrder[];
  pools: Pool[];
  estimatedBoostFeeBps: number | undefined;
  maxBoostFeeBps: number | undefined;
}): Promise<Quote[]> => {
  let regularEagerLiquidityExists = false;
  let dcaEagerLiquidityExists = false;

  const dcaParams = dcaQuoteParams
    ? {
        numberOfChunks: dcaQuoteParams.numberOfChunks,
        chunkIntervalBlocks: env.DCA_CHUNK_INTERVAL_BLOCKS,
      }
    : undefined;

  const quoteArgs = {
    srcAsset,
    destAsset,
    depositAmount,
    limitOrders,
    brokerCommissionBps,
    ccmParams,
    pools,
    isVaultSwap,
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
  return result;
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
        ccmParams,
        boostDepositsEnabled,
        dcaEnabled,
        isVaultSwap,
        pools,
      } = await validateQuoteQuery(req.query);

      const dcaQuoteParams =
        env.DISABLE_DCA_QUOTING || !dcaEnabled
          ? undefined
          : await getDcaQuoteParams(srcAsset, depositAmount);

      const logInfo = {
        srcAsset,
        destAsset,
        inputUsdValue: null as string | null,
        inputAmount: new BigNumber(depositAmount.toString())
          .shiftedBy(-assetConstants[srcAsset].decimals)
          .toFixed(),
        duration: '',
        dcaQuoteParams,
        brokerCommissionBps,
        estimatedBoostFeeBps: null as number | null,
        maxBoostFeeBps: null as number | null,
        limitOrders: [] as RpcLimitOrder[],
        success: false,
        regularQuote: null as RegularQuote | null,
        dcaQuote: null as DCAQuote | null,
      };
      try {
        const [limitOrders, { estimatedBoostFeeBps, maxBoostFeeBps }, inputUsdValue] =
          await Promise.all([
            quoter.getLimitOrders(srcAsset, destAsset, depositAmount),
            env.DISABLE_BOOST_QUOTING || !boostDepositsEnabled
              ? { estimatedBoostFeeBps: undefined, maxBoostFeeBps: undefined }
              : getBoostFeeBpsForAmount({ amount: depositAmount, asset: srcAsset }),
            getUsdValue(depositAmount, srcAsset).catch(() => undefined),
          ]);

        logInfo.limitOrders = limitOrders;
        logInfo.inputUsdValue = inputUsdValue ?? null;
        logInfo.estimatedBoostFeeBps = estimatedBoostFeeBps ?? null;
        logInfo.maxBoostFeeBps = maxBoostFeeBps ?? null;

        const result = await generateQuotes({
          dcaQuoteParams,
          srcAsset,
          depositAmount,
          destAsset,
          brokerCommissionBps,
          ccmParams,
          isVaultSwap,
          estimatedBoostFeeBps,
          maxBoostFeeBps,
          limitOrders,
          pools,
        }).then(
          (qs) => ({ status: 'fulfilled' as const, value: qs }),
          (err) => ({ status: 'rejected' as const, reason: err as Error }),
        );

        logInfo.duration = (performance.now() - start).toFixed(2);

        if (result.status === 'fulfilled') {
          res.json(result.value);
          logInfo.regularQuote = result.value.find((q) => q.type === 'REGULAR') ?? null;
          logInfo.dcaQuote = result.value.find((q) => q.type === 'DCA') ?? null;
          logInfo.success = true;
        } else {
          throw result.reason;
        }
      } catch (err) {
        handleQuotingError(res, err);
      } finally {
        logger.info('quote request completed', logInfo);
      }
    }),
  );
  return router;
};

export default quoteRouter;

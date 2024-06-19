import express from 'express';
import type { Server } from 'socket.io';
import { inspect } from 'util';
import { Asset, Assets, Chain, Chains, InternalAsset } from '@/shared/enums';
import {
  bigintMin,
  getHundredthPipAmountFromAmount,
  getPipAmountFromAmount,
} from '@/shared/functions';
import { ParsedQuoteParams, QuoteQueryResponse, quoteQuerySchema, SwapFee } from '@/shared/schemas';
import { asyncHandler } from './common';
import prisma from '../client';
import env from '../config/env';
import { checkPriceWarning } from '../pricing/checkPriceWarning';
import Quoter, { type QuoteType } from '../quoting/Quoter';
import { getBoostFeeBpsForAmount } from '../utils/boost';
import { isLocalnet } from '../utils/env';
import { buildFee, tryExtractFeesFromIngressAmount } from '../utils/fees';
import { isAfterSpecVersion } from '../utils/function';
import getPoolQuote from '../utils/getPoolQuote';
import logger from '../utils/logger';
import { getPools } from '../utils/pools';
import { resultify } from '../utils/promise';
import {
  getMinimumEgressAmount,
  getEgressFee,
  validateSwapAmount,
  getBoostPoolsDepth,
} from '../utils/rpc';
import ServiceError from '../utils/ServiceError';
import { estimateSwapDuration } from '../utils/swap';

const getPoolQuoteResult = resultify(getPoolQuote);

export const getBoostedPoolQuoteResult = async (query: ParsedQuoteParams) => {
  const { srcAsset, destAsset, brokerCommissionBps, amount } = query;
  const fees: SwapFee[] = [];

  const assetBoostPoolsDepth = await getBoostPoolsDepth({ asset: srcAsset });

  const estimatedBoostFeeBps = await getBoostFeeBpsForAmount({
    amount: BigInt(amount),
    assetBoostPoolsDepth,
  });

  if (estimatedBoostFeeBps === undefined) return undefined;

  const boostFee = getPipAmountFromAmount(amount, estimatedBoostFeeBps);
  fees.push(buildFee(srcAsset, 'BOOST', boostFee));
  const amountAfterBoostFees = amount - boostFee;

  try {
    const { fees: includedFees, amountAfterFees } = await tryExtractFeesFromIngressAmount({
      ingressAmount: amountAfterBoostFees,
      srcAsset,
      brokerCommissionBps,
    });
    const swapInputAmount = amountAfterFees;
    fees.push(...includedFees);

    const boostedPoolQuote = await getPoolQuoteResult(
      srcAsset,
      destAsset,
      swapInputAmount,
      fees,
      Date.now(),
    );

    if (!boostedPoolQuote.success) {
      return undefined;
    }

    return {
      ...boostedPoolQuote.data.response,
      estimatedBoostFeeBps,
      estimatedDurationSeconds: await estimateSwapDuration({ srcAsset, destAsset, boosted: true }),
      quoteType: undefined,
    };
  } catch (e) {
    logger.warn('Fetching boosted pool quote failed');
    // Amount after boost fee insufficient to pay for other fees
    return undefined;
  }
};

const saveResult = async ({
  depositAmount,
  srcAsset,
  destAsset,
  poolInfo,
  quoterInfo,
}: {
  srcAsset: InternalAsset;
  destAsset: InternalAsset;
  depositAmount: bigint;
  poolInfo: { response: QuoteQueryResponse; duration: number } | null;
  quoterInfo: { response: QuoteQueryResponse; duration: number };
}) => {
  if (poolInfo === null) return;

  const { response: poolResult, duration: poolDuration } = poolInfo;
  const { response: quoterResult, duration: quoterDuration } = quoterInfo;

  await prisma.quoteResult
    .create({
      data: {
        srcAsset,
        destAsset,
        depositAmount: depositAmount.toString(),
        quoterIntermediate: quoterResult.intermediateAmount,
        quoterOutput: quoterResult.egressAmount,
        quoterFees: quoterResult.includedFees,
        quoterDuration,
        poolIntermediate: poolResult.intermediateAmount,
        poolOutput: poolResult.egressAmount,
        poolFees: poolResult.includedFees,
        poolDuration,
        version: 2,
      },
    })
    .catch((error) => {
      logger.error('failed to save quote result', { error });
    });
};

const handleQuotingError = async (res: express.Response, err: unknown) => {
  if (err instanceof ServiceError) throw err;

  const message = err instanceof Error ? err.message : 'unknown error (possibly no liquidity)';

  let level: 'error' | 'warn' = 'error';
  if (message.includes('InsufficientLiquidity')) {
    if (await isAfterSpecVersion(140)) {
      throw ServiceError.badRequest('insufficient liquidity for requested amount');
    }

    level = 'warn';
  }

  logger[level]('error while collecting quotes:', err);

  // DEPRECATED(1.3): remove `error`
  res.status(500).json({ message, error: message });
};

const fallbackChains = {
  [Assets.ETH]: Chains.Ethereum,
  [Assets.USDC]: Chains.Ethereum,
  [Assets.FLIP]: Chains.Ethereum,
  [Assets.BTC]: Chains.Bitcoin,
  [Assets.DOT]: Chains.Polkadot,
  [Assets.USDT]: Chains.Ethereum,
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

      const { fees: includedFees, amountAfterFees } = await tryExtractFeesFromIngressAmount({
        srcAsset,
        ingressAmount: amount,
        brokerCommissionBps,
      });
      let swapInputAmount = amountAfterFees;

      const poolQuotePromise = getPoolQuoteResult(
        srcAsset,
        destAsset,
        swapInputAmount,
        includedFees,
        start,
      );

      const state = quoter.getQuotingState(srcAsset, destAsset).catch((error) => {
        logger.error('error while checking if route is quotable', { error });
        return { quotingActive: false, pairEnabled: false };
      });

      let responseSent = false;

      const sendPoolQuote =
        env.STEALTH_MODE || !(await state).quotingActive || !(await state).pairEnabled;

      // for stealth mode always send the pool quote
      if (sendPoolQuote) {
        const result = await poolQuotePromise;

        logger.info('sending pool quote', {
          USE_JIT_QUOTING: env.USE_JIT_QUOTING,
          connectedSockets: io.sockets.sockets.size,
          success: result.success,
          response: result.success ? result.data : result.reason,
        });

        if (result.success) {
          res.json({
            ...result.data.response,
            quoteType: undefined,
            boostQuote: isLocalnet() ? await getBoostedPoolQuoteResult(query) : undefined,
          });
        } else {
          await handleQuotingError(res, result.reason);
        }

        if (!(await state).quotingActive) return;
        responseSent = true;
      }

      const pools = await getPools(srcAsset, destAsset);

      const firstLegPoolFee = getHundredthPipAmountFromAmount(
        swapInputAmount,
        pools[0].liquidityFeeHundredthPips,
      );

      includedFees.push(buildFee(srcAsset, 'LIQUIDITY', firstLegPoolFee));

      swapInputAmount -= firstLegPoolFee;

      try {
        const bestQuote = await quoter.getQuote(srcAsset, destAsset, swapInputAmount, pools);

        const lowLiquidityWarning = await checkPriceWarning({
          srcAsset,
          destAsset,
          srcAmount: swapInputAmount,
          destAmount: bestQuote.outputAmount,
        });

        let egressFee = await getEgressFee(destAsset);
        if (egressFee == null) {
          throw ServiceError.internalError(`could not determine egress fee for ${destAsset}`);
        }
        egressFee = bigintMin(egressFee, BigInt(bestQuote.outputAmount));
        includedFees.push(buildFee(destAsset, 'EGRESS', egressFee));

        const egressAmount = BigInt(bestQuote.outputAmount) - egressFee;

        const [minimumEgressAmount, poolQuoteResult] = await Promise.all([
          getMinimumEgressAmount(destAsset),
          poolQuotePromise,
        ]);

        const { outputAmount, ...response } = {
          ...bestQuote,
          egressAmount: egressAmount.toString(),
          intermediateAmount: bestQuote.intermediateAmount?.toString(),
          includedFees: [...includedFees, ...bestQuote.includedFees],
          lowLiquidityWarning,
          estimatedDurationSeconds: await estimateSwapDuration({ srcAsset, destAsset }),
        };

        if (BigInt(response.egressAmount) < minimumEgressAmount) {
          throw ServiceError.badRequest(
            `egress amount (${egressAmount}) is lower than minimum egress amount (${minimumEgressAmount})`,
          );
        }

        const duration = performance.now() - start;

        let bestResponse: QuoteQueryResponse & { quoteType: QuoteType } = response;

        if (poolQuoteResult.success) {
          const poolQuote = poolQuoteResult.data.response;

          logger.info('quote results', {
            new: { response, duration },
            old: poolQuoteResult.data,
          });

          if (BigInt(poolQuote.egressAmount) > egressAmount) {
            bestResponse = poolQuote;
          }
        } else {
          throw poolQuoteResult.reason;
        }

        const { quoteType, ...quote } = bestResponse;

        logger.info('sending response for quote request', { quoteType, quote, duration });

        if (!responseSent) res.json(quote);

        saveResult({
          srcAsset,
          destAsset,
          depositAmount: query.amount,
          poolInfo: poolQuoteResult.success ? poolQuoteResult.data : null,
          quoterInfo: { response, duration },
        });
      } catch (error) {
        logger.error('error while collecting quotes:', { error: inspect(error) });
        const poolQuoteResult = await poolQuotePromise;

        if (poolQuoteResult.success) {
          if (!responseSent) res.json({ ...poolQuoteResult.data.response, quoteType: undefined });
          return;
        }

        if (!responseSent) await handleQuotingError(res, poolQuoteResult.reason);
      }
    }),
  );

  return router;
};

export default quoteRouter;

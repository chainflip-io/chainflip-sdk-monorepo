import express from 'express';
import type { Server } from 'socket.io';
import { Asset, Assets, Chain, Chains, InternalAsset } from '@/shared/enums';
import {
  bigintMin,
  getHundredthPipAmountFromAmount,
  getPipAmountFromAmount,
} from '@/shared/functions';
import { QuoteQueryResponse, quoteQuerySchema, SwapFee } from '@/shared/schemas';
import { asyncHandler } from './common';
import prisma from '../client';
import env from '../config/env';
import { checkPriceWarning } from '../pricing/checkPriceWarning';
import Quoter, { type QuoteType } from '../quoting/Quoter';
import { buildFee } from '../utils/fees';
import { isAfterSpecVersion } from '../utils/function';
import getPoolQuote from '../utils/getPoolQuote';
import logger from '../utils/logger';
import { getPools } from '../utils/pools';
import { resultify } from '../utils/promise';
import {
  getMinimumEgressAmount,
  getEgressFee,
  getIngressFee,
  validateSwapAmount,
} from '../utils/rpc';
import ServiceError from '../utils/ServiceError';
import { estimateSwapDuration } from '../utils/swap';

const getPoolQuoteResult = resultify(getPoolQuote);

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
      },
    })
    .catch(() => null);
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

      if (queryResult.data.srcAsset === 'Dot' || queryResult.data.destAsset === 'Dot') {
        throw ServiceError.unavailable('Polkadot is disabled');
      }

      const start = performance.now();

      logger.info('received a quote request', { query: req.query });
      const query = queryResult.data;
      const { srcAsset, destAsset } = queryResult.data;

      const amountResult = await validateSwapAmount(srcAsset, BigInt(query.amount));

      if (!amountResult.success) {
        throw ServiceError.badRequest(amountResult.reason);
      }

      const includedFees: SwapFee[] = [];

      let swapInputAmount = BigInt(query.amount);

      if (query.boostFeeBps) {
        const boostFee = getPipAmountFromAmount(swapInputAmount, query.boostFeeBps);
        includedFees.push(buildFee(srcAsset, 'BOOST', boostFee));
        swapInputAmount -= boostFee;
      }

      const ingressFee = await getIngressFee(srcAsset);
      if (ingressFee == null) {
        throw ServiceError.internalError(`could not determine ingress fee for ${srcAsset}`);
      }
      includedFees.push(buildFee(srcAsset, 'INGRESS', ingressFee));
      swapInputAmount -= ingressFee;
      if (swapInputAmount <= 0n) {
        throw ServiceError.badRequest(`amount is lower than estimated ingress fee (${ingressFee})`);
      }

      if (query.brokerCommissionBps) {
        const brokerFee = getPipAmountFromAmount(swapInputAmount, query.brokerCommissionBps);
        includedFees.push(buildFee(srcAsset, 'BROKER', brokerFee));
        swapInputAmount -= brokerFee;
      }

      const poolQuotePromise = getPoolQuoteResult(
        srcAsset,
        destAsset,
        swapInputAmount,
        includedFees,
        start,
      );

      const pools = await getPools(srcAsset, destAsset);

      const firstLegPoolFee = getHundredthPipAmountFromAmount(
        swapInputAmount,
        pools[0].liquidityFeeHundredthPips,
      );

      includedFees.push(buildFee(srcAsset, 'LIQUIDITY', firstLegPoolFee));

      const canGetQuote = quoter.canQuote();
      let responseSent = false;

      // for stealth mode always send the pool quote
      if (env.STEALTH_MODE || !canGetQuote) {
        const result = await poolQuotePromise;

        logger.info('sending pool quote', {
          USE_JIT_QUOTING: env.USE_JIT_QUOTING,
          connectedSockets: io.sockets.sockets.size,
          success: result.success,
          response: result.success ? result.data : result.reason,
        });

        if (result.success) {
          res.json({ ...result.data.response, quoteType: undefined });
        } else {
          await handleQuotingError(res, result.reason);
        }

        if (!canGetQuote) return;
        responseSent = true;
      }

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
          estimatedDurationSeconds: await estimateSwapDuration(srcAsset, destAsset),
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
      } catch (err) {
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

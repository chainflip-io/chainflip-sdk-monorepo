import express from 'express';
import type { Server } from 'socket.io';
import { Asset, Assets, Chain, Chains } from '@/shared/enums';
import {
  bigintMin,
  getHundredthPipAmountFromAmount,
  getPipAmountFromAmount,
} from '@/shared/functions';
import { QuoteQueryResponse, quoteQuerySchema, SwapFee } from '@/shared/schemas';
import { asyncHandler } from './common';
import env from '../config/env';
import { checkPriceWarning } from '../pricing/checkPriceWarning';
import Quoter, { type QuoteType } from '../quoting/Quoter';
import { buildFee, estimateIngressEgressFeeAssetAmount } from '../utils/fees';
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

      logger.info('received a quote request', { query: req.query });
      const query = queryResult.data;
      const { srcAsset, destAsset } = queryResult.data;

      // detect if ingress and egress fees are exposed as gas asset amount or fee asset amount
      // https://github.com/chainflip-io/chainflip-backend/pull/4497
      // TODO: remove this once all networks are upraded to 1.3
      const ingressEgressFeeIsGasAssetAmount =
        (await getIngressFee('Flip')) === (await getIngressFee('Usdc'));

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

      let ingressFee = await getIngressFee(srcAsset);
      if (ingressFee == null) {
        throw ServiceError.internalError(`could not determine ingress fee for ${srcAsset}`);
      }
      if (ingressEgressFeeIsGasAssetAmount) {
        ingressFee = await estimateIngressEgressFeeAssetAmount(ingressFee, srcAsset);
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

      const poolQuote = getPoolQuoteResult(
        srcAsset,
        destAsset,
        swapInputAmount,
        ingressEgressFeeIsGasAssetAmount,
        includedFees,
      );

      const pools = await getPools(srcAsset, destAsset);

      const firstLegPoolFee = getHundredthPipAmountFromAmount(
        swapInputAmount,
        pools[0].liquidityFeeHundredthPips,
      );

      includedFees.push(buildFee(srcAsset, 'LIQUIDITY', firstLegPoolFee));

      swapInputAmount -= firstLegPoolFee;

      if (!env.USE_JIT_QUOTING || io.sockets.sockets.size === 0) {
        const result = await poolQuote;

        logger.info('sending pool quote', {
          USE_JIT_QUOTING: env.USE_JIT_QUOTING,
          connectedSockets: io.sockets.sockets.size,
          success: result.success,
          response: result.success ? result.data : result.reason,
        });

        if (result.success) {
          res.json({ ...result.data, quoteType: undefined });
        } else {
          await handleQuotingError(res, result.reason);
        }

        return;
      }

      try {
        const start = performance.now();

        const bestQuote = await quoter.getBestQuote(
          { ...query, amount: swapInputAmount },
          srcAsset,
          destAsset,
          pools,
        );

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
        if (ingressEgressFeeIsGasAssetAmount) {
          egressFee = await estimateIngressEgressFeeAssetAmount(egressFee, destAsset);
        }
        egressFee = bigintMin(egressFee, BigInt(bestQuote.outputAmount));
        includedFees.push(buildFee(destAsset, 'EGRESS', egressFee));

        const egressAmount = BigInt(bestQuote.outputAmount) - egressFee;

        const [minimumEgressAmount, poolQuoteResult] = await Promise.all([
          getMinimumEgressAmount(destAsset),
          poolQuote,
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

        let bestResponse: QuoteQueryResponse & { quoteType: QuoteType } = response;

        if (poolQuoteResult.success) {
          logger.info('quote results', {
            new: response,
            old: poolQuoteResult.data,
          });

          if (BigInt(poolQuoteResult.data.egressAmount) > egressAmount) {
            bestResponse = poolQuoteResult.data;
          }
        }

        const { quoteType, ...quote } = bestResponse;

        logger.info('sending response for quote request', {
          quoteType,
          quote,
          performance: `${(performance.now() - start).toFixed(2)} ms`,
        });

        res.json(quote);
      } catch (err) {
        const poolQuoteResult = await poolQuote;

        if (poolQuoteResult.success) {
          res.json(poolQuoteResult.data);
          return;
        }

        await handleQuotingError(res, err);
      }
    }),
  );

  return router;
};

export default quoteRouter;

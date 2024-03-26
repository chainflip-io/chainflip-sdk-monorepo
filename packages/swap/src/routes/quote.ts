import express from 'express';
import { Asset, Assets, Chain, Chains, getInternalAsset } from '@/shared/enums';
import { bigintMin, getPipAmountFromAmount } from '@/shared/functions';
import { QuoteQueryResponse, quoteQuerySchema, SwapFee } from '@/shared/schemas';
import { calculateIncludedSwapFees, estimateIngressEgressFeeAssetAmount } from '@/swap/utils/fees';
import { estimateSwapDuration } from '@/swap/utils/swap';
import { asyncHandler } from './common';
import { checkPriceWarning } from '../pricing/checkPriceWarning';
import { isAfterSpecVersion } from '../utils/function';
import logger from '../utils/logger';
import {
  getMinimumEgressAmount,
  getEgressFee,
  getIngressFee,
  validateSwapAmount,
} from '../utils/rpc';
import ServiceError from '../utils/ServiceError';
import { getBrokerQuote } from '../utils/statechain';

const fallbackChains = {
  [Assets.ETH]: Chains.Ethereum,
  [Assets.USDC]: Chains.Ethereum,
  [Assets.FLIP]: Chains.Ethereum,
  [Assets.BTC]: Chains.Bitcoin,
  [Assets.DOT]: Chains.Polkadot,
  [Assets.USDT]: Chains.Ethereum,
} satisfies Record<Asset, Chain>;

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

      const bestQuote = await getBrokerQuote({ ...query, amount: String(swapInputAmount) });

      const lowLiquidityWarning = await checkPriceWarning({
        srcAsset: getInternalAsset(srcChainAsset),
        destAsset: getInternalAsset(destChainAsset),
        srcAmount: swapInputAmount,
        destAmount: BigInt(bestQuote.outputAmount),
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
        quoteType,
        ...response
      } = {
        ...bestQuote,
        intermediateAmount: bestQuote.intermediateAmount?.toString(),
        egressAmount: egressAmount.toString(),
        includedFees,
        lowLiquidityWarning,
        estimatedDurationSeconds: await estimateSwapDuration(
          srcChainAsset.chain,
          destChainAsset.chain,
        ),
      };
      logger.info('sending response for quote request', {
        id,
        quoteType,
        response,
        performance: `${(performance.now() - start).toFixed(2)} ms`,
      });

      res.json(response as QuoteQueryResponse);
    } catch (err) {
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
    }
  }),
);

export default router;

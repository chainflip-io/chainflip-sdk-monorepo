import BigNumber from 'bignumber.js';
import express from 'express';
import type { Server } from 'socket.io';
import { Asset, assetConstants, Assets, Chain, Chains, InternalAsset } from '@/shared/enums';
import { quoteQuerySchema } from '@/shared/schemas';
import { asyncHandler } from './common';
import env from '../config/env';
import { getBoostSafeMode } from '../polkadot/api';
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

        const quoteArgs = {
          srcAsset,
          destAsset,
          swapInputAmount: amount,
          limitOrders,
          brokerCommissionBps,
          pools,
        };

        const [quote, boostedQuote] = await Promise.all([
          getPoolQuote(quoteArgs),
          estimatedBoostFeeBps &&
            getPoolQuote({ ...quoteArgs, boostFeeBps: estimatedBoostFeeBps }).catch(() => null),
        ]);

        if (boostedQuote && estimatedBoostFeeBps) {
          quote.boostQuote = { ...boostedQuote, estimatedBoostFeeBps };
        }

        const duration = performance.now() - start;

        logger.info('quote request completed', {
          duration: duration.toFixed(2),
          quote,
          srcAsset,
          destAsset,
          inputAmount: quote.lowLiquidityWarning
            ? new BigNumber(amount.toString())
                .shiftedBy(-assetConstants[srcAsset].decimals)
                .toFixed()
            : undefined,
        });

        res.json(quote);
      } catch (err) {
        handleQuotingError(res, err, {
          srcAsset,
          destAsset,
          amount: new BigNumber(amount.toString())
            .shiftedBy(-assetConstants[srcAsset].decimals)
            .toFixed(),
          limitOrdersReceived,
        });
      }
    }),
  );

  return router;
};

export default quoteRouter;

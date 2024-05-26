import express from 'express';
import type { Server } from 'socket.io';
import { Asset, Assets, Chain, Chains } from '@/shared/enums';
import { quoteQuerySchema } from '@/shared/schemas';
import { asyncHandler } from './common';
import env from '../config/env';
import { getPipAmountFromAmount } from '../functions';
import Quoter from '../quoting/Quoter';
import { buildFee } from '../utils/fees';
import getPoolQuote from '../utils/getPoolQuote';
import logger from '../utils/logger';
import { validateSwapAmount } from '../utils/rpc';
import ServiceError from '../utils/ServiceError';

const handleQuotingError = async (res: express.Response, err: unknown) => {
  if (err instanceof ServiceError) throw err;

  const message = err instanceof Error ? err.message : 'unknown error (possibly no liquidity)';

  if (message.includes('InsufficientLiquidity')) {
    throw ServiceError.badRequest('insufficient liquidity for requested amount');
  }

  logger.error('error while collecting quotes:', err);

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

      try {
        const limitOrders = await quoter.getLimitOrders(srcAsset, destAsset, amount);

        // TODO: estimate
        const estimatedBoostFeeBps = 30;
        const boostFee = getPipAmountFromAmount(amount, estimatedBoostFeeBps);

        const brokerCommission = getPipAmountFromAmount(amount, brokerCommissionBps ?? 0);

        const swapInputAmount = amount - brokerCommission;
        const [quote, boostedQuote] = await Promise.all([
          getPoolQuote(srcAsset, destAsset, swapInputAmount, limitOrders),
          getPoolQuote(srcAsset, destAsset, swapInputAmount - boostFee, limitOrders).catch(
            () => null,
          ),
        ]);

        // TODO: estimate LP fees
        if (brokerCommission !== 0n) {
          quote.includedFees.push(buildFee(srcAsset, 'BROKER', brokerCommission));
          if (boostedQuote) {
            boostedQuote.includedFees.push(buildFee(srcAsset, 'BROKER', brokerCommission));
          }
        }

        if (boostedQuote) {
          boostedQuote.includedFees.push(buildFee(srcAsset, 'BOOST', boostFee));

          quote.boostQuote = { ...boostedQuote, estimatedBoostFeeBps };
        }

        const duration = performance.now() - start;

        logger.info('quote request completed', { duration: duration.toFixed(2), quote });

        res.json(quote);
      } catch (err) {
        handleQuotingError(res, err);
      }
    }),
  );

  return router;
};

export default quoteRouter;

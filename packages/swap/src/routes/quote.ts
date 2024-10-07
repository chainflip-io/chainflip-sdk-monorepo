import BigNumber from 'bignumber.js';
import express from 'express';
import { Asset, assetConstants, Assets, Chain, Chains, InternalAsset } from '@/shared/enums';
import { asyncHandler } from './common';
import env from '../config/env';
import { getUsdValue } from '../pricing/checkPriceWarning';
import Quoter, { type QuotingServer } from '../quoting/Quoter';
import logger from '../utils/logger';
import ServiceError from '../utils/ServiceError';
import { generateQuotes, validateQuoteQuery } from './v2/quote';

type AdditionalInfo = {
  srcAsset: InternalAsset;
  destAsset: InternalAsset;
  amount: string;
  usdValue: string | undefined;
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

export const fallbackChains = {
  [Assets.ETH]: Chains.Ethereum,
  [Assets.USDC]: Chains.Ethereum,
  [Assets.FLIP]: Chains.Ethereum,
  [Assets.BTC]: Chains.Bitcoin,
  [Assets.DOT]: Chains.Polkadot,
  [Assets.USDT]: Chains.Ethereum,
  [Assets.SOL]: Chains.Solana,
} satisfies Record<Asset, Chain>;

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

      const { srcAsset, destAsset, amount, brokerCommissionBps, boostDepositsEnabled } =
        await validateQuoteQuery(req.query);

      let limitOrdersReceived;
      try {
        const { quotes, limitOrders } = await generateQuotes({
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

        res.json(quote);

        logger.info('quote request completed', {
          duration: duration.toFixed(2),
          quote,
          srcAsset,
          destAsset,
          ...(quote.lowLiquidityWarning && {
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

import BigNumber from 'bignumber.js';
import express from 'express';
import { Asset, assetConstants, Assets, Chain, Chains } from '@/shared/enums';
import { asyncHandler, handleQuotingError } from './common';
import env from '../config/env';
import { getUsdValue } from '../pricing/checkPriceWarning';
import Quoter from '../quoting/Quoter';
import baseLogger from '../utils/logger';
import ServiceError from '../utils/ServiceError';
import { generateQuotes, validateQuoteQuery } from './v2/quote';

const logger = baseLogger.child({ module: 'quoter' });

export const fallbackChains = {
  [Assets.ETH]: Chains.Ethereum,
  [Assets.USDC]: Chains.Ethereum,
  [Assets.FLIP]: Chains.Ethereum,
  [Assets.BTC]: Chains.Bitcoin,
  [Assets.DOT]: Chains.Polkadot,
  [Assets.USDT]: Chains.Ethereum,
  [Assets.SOL]: Chains.Solana,
} satisfies Record<Asset, Chain>;

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

      const {
        srcAsset,
        destAsset,
        amount,
        brokerCommissionBps,
        boostDepositsEnabled,
        isVaultSwap,
      } = await validateQuoteQuery(req.query);

      let limitOrdersReceived;
      try {
        const { quotes, limitOrders } = await generateQuotes({
          srcAsset,
          depositAmount: amount,
          destAsset,
          brokerCommissionBps,
          boostDepositsEnabled,
          isVaultSwap,
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

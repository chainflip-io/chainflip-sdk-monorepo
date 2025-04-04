import { assetConstants, AssetSymbol, ChainflipChain } from '@chainflip/utils/chainflip';
import BigNumber from 'bignumber.js';
import express from 'express';
import { asyncHandler, handleQuotingError } from './common';
import env from '../config/env';
import { getUsdValue } from '../pricing/checkPriceWarning';
import Quoter from '../quoting/Quoter';
import baseLogger from '../utils/logger';
import ServiceError from '../utils/ServiceError';
import { generateQuotes, validateQuoteQuery } from './v2/quote';

const logger = baseLogger.child({ module: 'quoter' });

export const fallbackChains = {
  ETH: 'Ethereum',
  USDC: 'Ethereum',
  FLIP: 'Ethereum',
  BTC: 'Bitcoin',
  DOT: 'Polkadot',
  USDT: 'Ethereum',
  SOL: 'Solana',
} satisfies Record<AssetSymbol, ChainflipChain>;

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
        ccmParams,
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
          ccmParams,
          boostDepositsEnabled,
          quoter,
          isVaultSwap,
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

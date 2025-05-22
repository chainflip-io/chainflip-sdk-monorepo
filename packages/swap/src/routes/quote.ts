import { assetConstants, AssetSymbol, ChainflipChain } from '@chainflip/utils/chainflip';
import BigNumber from 'bignumber.js';
import express from 'express';
import { asyncHandler, handleQuotingError } from './common.js';
import env from '../config/env.js';
import { getUsdValue } from '../pricing/checkPriceWarning.js';
import Quoter from '../quoting/Quoter.js';
import { getBoostFeeBpsForAmount } from '../utils/boost.js';
import baseLogger from '../utils/logger.js';
import ServiceError from '../utils/ServiceError.js';
import { generateQuotes, validateQuoteQuery } from './v2/quote.js';

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
        amount: depositAmount,
        brokerCommissionBps,
        ccmParams,
        boostDepositsEnabled,
        isVaultSwap,
        isOnChain,
        pools,
      } = await validateQuoteQuery(req.query);

      try {
        const [limitOrders, { estimatedBoostFeeBps, maxBoostFeeBps }] = await Promise.all([
          quoter.getLimitOrders(srcAsset, destAsset, depositAmount),
          env.DISABLE_BOOST_QUOTING || !boostDepositsEnabled
            ? { estimatedBoostFeeBps: undefined, maxBoostFeeBps: undefined }
            : getBoostFeeBpsForAmount({ amount: depositAmount, asset: srcAsset }),
        ]);
        const quotes = await generateQuotes({
          srcAsset,
          depositAmount,
          destAsset,
          brokerCommissionBps,
          ccmParams,
          isVaultSwap,
          isOnChain,
          limitOrders,
          estimatedBoostFeeBps,
          maxBoostFeeBps,
          pools,
        });
        const quote = quotes[0];

        const duration = performance.now() - start;

        res.json(quote);

        logger.info('quote request completed', {
          duration: duration.toFixed(2),
          quote,
          srcAsset,
          destAsset,
          ...(quote.lowLiquidityWarning && {
            inputAmount: new BigNumber(depositAmount.toString())
              .shiftedBy(-assetConstants[srcAsset].decimals)
              .toFixed(),
            usdValue: await getUsdValue(depositAmount, srcAsset).catch(() => undefined),
          }),
        });
      } catch (err) {
        handleQuotingError(res, err);
      }
    }),
  );

  return router;
};

export default quoteRouter;

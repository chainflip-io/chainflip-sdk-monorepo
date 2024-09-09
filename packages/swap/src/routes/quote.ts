import BigNumber from 'bignumber.js';
import express from 'express';
import type { Server } from 'socket.io';
import {
  Asset,
  assetConstants,
  Assets,
  Chain,
  Chains,
  InternalAsset,
  InternalAssetMap,
} from '@/shared/enums';
import { quoteQuerySchema } from '@/shared/schemas';
import { asyncHandler } from './common';
import env from '../config/env';
import { getBoostSafeMode } from '../polkadot/api';
import { getUsdValue } from '../pricing/checkPriceWarning';
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

const getDcaQuoteParams = (asset: InternalAsset, amount: bigint) => {
  const chunkSizeMap: InternalAssetMap<bigint> = {
    Usdc: BigInt(2000 * 10 ** assetConstants['Usdc'].decimals),
    Flip: BigInt(1500 * 10 ** assetConstants['Flip'].decimals),
    Eth: BigInt(0.5 * 10 ** assetConstants['Eth'].decimals),
    Usdt: BigInt(2000 * 10 ** assetConstants['Usdt'].decimals),
    Btc: BigInt(0.04 * 10 ** assetConstants['Btc'].decimals),
    Dot: BigInt(500 * 10 ** assetConstants['Dot'].decimals),
    ArbUsdc: BigInt(2000 * 10 ** assetConstants['ArbUsdc'].decimals),
    ArbEth: BigInt(0.5 * 10 ** assetConstants['ArbEth'].decimals),
    Sol: BigInt(15 * 10 ** assetConstants['Sol'].decimals),
    SolUsdc: BigInt(2000 * 10 ** assetConstants['SolUsdc'].decimals),
  };
  const chunkSize = chunkSizeMap[asset];

  // const minChunkSize = BigNumber(chunkSize.toString()).dividedBy(20);

  // let numberOfChunks = Math.ceil(
  //   BigNumber(amount.toString()).dividedBy(chunkSize.toString()).toNumber(),
  // );
  // let lastChunkAmount = BigNumber(amount.toString()).mod(chunkSize.toString());

  // if (lastChunkAmount.lt(minChunkSize)) {
  //   numberOfChunks -= 1;
  //   lastChunkAmount = BigNumber(chunkSize.toString()).plus(lastChunkAmount);
  // }

  // return {
  //   chunkSize,
  //   numberOfChunks,
  //   lastChunkAmount,
  // };

  let extrapolationCoef = BigNumber(amount.toString()).dividedBy(chunkSize.toString()).toNumber();

  return {
    chunkSize,
    extrapolationCoef,
    addedDurationSeconds: Math.ceil(3 * extrapolationCoef),
  };
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

        const dcaQuoteParams = getDcaQuoteParams(srcAsset, amount);
        console.log('dcaQuoteParams', dcaQuoteParams);

        const quoteArgs = {
          srcAsset,
          destAsset,
          swapInputAmount: amount,
          limitOrders,
          brokerCommissionBps,
          pools,
        };

        const [quote, boostedQuote, dcaQuote, dcaBoostedQuote] = await Promise.all([
          getPoolQuote(quoteArgs),
          estimatedBoostFeeBps &&
            getPoolQuote({ ...quoteArgs, boostFeeBps: estimatedBoostFeeBps }).catch(() => null),
          getPoolQuote({ ...quoteArgs, swapInputAmount: dcaQuoteParams.chunkSize }),
          estimatedBoostFeeBps &&
            getPoolQuote({
              ...quoteArgs,
              boostFeeBps: estimatedBoostFeeBps,
              swapInputAmount: dcaQuoteParams.chunkSize,
            }).catch(() => null),
        ]);

        if (boostedQuote && estimatedBoostFeeBps) {
          quote.boostQuote = { ...boostedQuote, estimatedBoostFeeBps };
        }
        quote.dcaQuote = {
          ...dcaQuote,
          egressAmount: BigNumber(dcaQuote.egressAmount)
            .multipliedBy(dcaQuoteParams.extrapolationCoef)
            .toString(),
          estimatedDurationSeconds:
            dcaQuote.estimatedDurationSeconds + dcaQuoteParams.addedDurationSeconds,
        };
        if (dcaBoostedQuote && estimatedBoostFeeBps) {
          quote.dcaBoostedQuote = {
            ...dcaBoostedQuote,
            estimatedBoostFeeBps,
            egressAmount: BigNumber(dcaBoostedQuote.egressAmount)
              .multipliedBy(dcaQuoteParams.extrapolationCoef)
              .toString(),
            estimatedDurationSeconds:
              dcaBoostedQuote.estimatedDurationSeconds + dcaQuoteParams.addedDurationSeconds,
          };
        }

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

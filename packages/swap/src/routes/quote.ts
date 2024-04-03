import assert from 'assert';
import BigNumber from 'bignumber.js';
import { randomUUID } from 'crypto';
import express from 'express';
import type { Server } from 'socket.io';
import { Side, findPrice } from '@/amm-addon';
import { getPoolsNetworkFeeHundredthPips } from '@/shared/consts';
import {
  Asset,
  Assets,
  Chain,
  Chains,
  InternalAsset,
  getAssetAndChain,
  getInternalAssets,
} from '@/shared/enums';
import {
  bigintMin,
  getHundredthPipAmountFromAmount,
  getPipAmountFromAmount,
} from '@/shared/functions';
import { ParsedQuoteParams, QuoteQueryResponse, quoteQuerySchema, SwapFee } from '@/shared/schemas';
import { asyncHandler } from './common';
import { Pool } from '../client';
import env from '../config/env';
import { getAssetPrice } from '../pricing';
import { checkPriceWarning } from '../pricing/checkPriceWarning';
import getConnectionHandler from '../quoting/getConnectionHandler';
import { QuoteType, collectMakerQuotes } from '../quoting/quotes';
import { MarketMakerQuoteRequest } from '../quoting/schemas';
import { buildFee, estimateIngressEgressFeeAssetAmount } from '../utils/fees';
import { assertUnreachable } from '../utils/function';
import getPoolQuote from '../utils/getPoolQuote';
import logger from '../utils/logger';
import { percentDiff } from '../utils/math';
import { getPools } from '../utils/pools';
import { resultify } from '../utils/promise';
import {
  getMinimumEgressAmount,
  getEgressFee,
  getIngressFee,
  validateSwapAmount,
} from '../utils/rpc';
import ServiceError from '../utils/ServiceError';
import { getSwapRate } from '../utils/statechain';
import { estimateSwapDuration } from '../utils/swap';

const getPoolQuoteResult = resultify(getPoolQuote);

type BaseAsset = Exclude<InternalAsset, 'Usdc'>;

const handleQuotingError = (res: express.Response, err: unknown) => {
  if (err instanceof ServiceError) throw err;

  const message = err instanceof Error ? err.message : 'unknown error (possibly no liquidity)';

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

class Leg {
  static of(baseAsset: InternalAsset, quoteAsset: InternalAsset) {
    assert(baseAsset !== quoteAsset, 'baseAsset and quoteAsset must be different');
    assert(baseAsset === 'Usdc' || quoteAsset === 'Usdc', 'one of the assets must be USDC');
    return new Leg(baseAsset, quoteAsset);
  }

  private constructor(
    private readonly baseAsset: InternalAsset,
    private readonly quoteAsset: InternalAsset,
  ) {}

  toPoolJSON() {
    return {
      srcAsset: this.baseAsset,
      destAsset: this.quoteAsset,
    };
  }

  toMarketMakerJSON() {
    let side: 'BUY' | 'SELL';
    let normalizedBaseAsset: BaseAsset;
    const normalizedQuoteAsset = 'Usdc';

    if (this.quoteAsset !== 'Usdc') {
      side = 'BUY';
      normalizedBaseAsset = this.quoteAsset;
    } else if (this.baseAsset !== 'Usdc') {
      side = 'SELL';
      normalizedBaseAsset = this.baseAsset;
    } else {
      return assertUnreachable('invalid leg');
    }

    return {
      base_asset: getAssetAndChain(normalizedBaseAsset),
      quote_asset: getAssetAndChain(normalizedQuoteAsset),
      side,
    };
  }
}

const quoteRouter = (io: Server) => {
  const { handler, quotes$ } = getConnectionHandler();

  io.on('connection', handler);

  const approximateIntermediateOutput = async (asset: InternalAsset, amount: string) => {
    const price = await getAssetPrice(asset);

    if (typeof price !== 'number') return null;

    return BigInt(new BigNumber(amount).times(price).toFixed(0));
  };

  async function quoteLeg(leg: Leg, amount: null): Promise<null>;
  async function quoteLeg(leg: Leg, amount: bigint): Promise<bigint>;
  async function quoteLeg(leg: Leg, amount: bigint | null): Promise<bigint | null>;
  async function quoteLeg(leg: Leg, amount: bigint | null): Promise<bigint | null> {
    if (!amount) return null;

    const id = randomUUID();

    const quoteRequest: MarketMakerQuoteRequest = {
      request_id: id,
      amount: String(amount),
      ...leg.toMarketMakerJSON(),
    };

    io.emit('quote_request', quoteRequest);

    const quotes = await collectMakerQuotes(id, io.sockets.sockets.size, quotes$);

    const { swappedAmount, remainingAmount } = await findPrice({
      amount: BigInt(amount),
      limitOrders: quotes.flatMap(({ limit_orders: limitOrders }) =>
        limitOrders.map(([tick, amt]) => ({ tick, amount: amt })),
      ),
      side: quoteRequest.side === 'BUY' ? Side.Buy : Side.Sell,
    });

    if (remainingAmount !== 0n) {
      const { outputAmount } = await getSwapRate({
        ...leg.toPoolJSON(),
        amount: remainingAmount,
      });

      return remainingAmount + outputAmount;
    }

    return swappedAmount;
  }

  const getBestQuote = async (
    quoteRequest: ParsedQuoteParams & { amount: bigint },
    srcAsset: InternalAsset,
    destAsset: InternalAsset,
    pools: Pool[],
  ) => {
    const networkFee = getPoolsNetworkFeeHundredthPips(env.CHAINFLIP_NETWORK);

    let intermediateAmount: bigint | null = null;
    let outputAmount: bigint;
    let networkFeeUsdc: bigint | null = null;

    const swapInputAmount = quoteRequest.amount;

    const fees: SwapFee[] = [];

    if (srcAsset === 'Usdc' || destAsset === 'Usdc') {
      if (srcAsset === 'Usdc') {
        networkFeeUsdc = getHundredthPipAmountFromAmount(swapInputAmount, networkFee);
      }

      const leg = Leg.of(srcAsset, destAsset);
      outputAmount = await quoteLeg(leg, swapInputAmount - (networkFeeUsdc ?? 0n));

      if (destAsset === 'Usdc') {
        networkFeeUsdc = getHundredthPipAmountFromAmount(outputAmount, networkFee);
      }
      outputAmount -= networkFeeUsdc!;
    } else {
      const leg1 = Leg.of(srcAsset, 'Usdc');
      const leg2 = Leg.of('Usdc', destAsset);

      let approximateUsdcAmount = await approximateIntermediateOutput(
        srcAsset,
        swapInputAmount.toString(),
      );

      networkFeeUsdc =
        approximateUsdcAmount && getHundredthPipAmountFromAmount(approximateUsdcAmount, networkFee);

      if (networkFeeUsdc && approximateUsdcAmount) {
        approximateUsdcAmount -= networkFeeUsdc;
      }

      const quotes = await Promise.all([
        quoteLeg(leg1, swapInputAmount),
        quoteLeg(leg1, approximateUsdcAmount),
      ]);

      if (
        quotes[1] === null ||
        // if there is more than a 1% difference between the two quotes
        percentDiff(approximateUsdcAmount!.toString(), quotes[0].toString()).gt(1)
      ) {
        networkFeeUsdc = getHundredthPipAmountFromAmount(quotes[0], networkFee);
        quotes[0] -= networkFeeUsdc;
        quotes[1] = await quoteLeg(leg2, quotes[0]);
      }

      const secondLegPoolFee = getHundredthPipAmountFromAmount(
        quotes[1],
        pools[1].liquidityFeeHundredthPips,
      );
      quotes[1] -= secondLegPoolFee;

      fees.push({
        type: 'LIQUIDITY',
        amount: secondLegPoolFee.toString(),
        ...getAssetAndChain(destAsset),
      });

      [intermediateAmount, outputAmount] = quotes;
    }

    fees.push({
      type: 'NETWORK',
      amount: networkFeeUsdc!.toString(),
      chain: 'Ethereum',
      asset: 'USDC',
    });

    return {
      intermediateAmount,
      outputAmount,
      includedFees: fees,
      quoteType: 'market_maker' as QuoteType,
    };
  };

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
      const { srcAsset, destAsset } = getInternalAssets(query);

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
        });

        if (result.success) {
          res.json({ ...result.data, quoteType: undefined });
        } else {
          handleQuotingError(res, result.reason);
        }

        return;
      }

      try {
        const start = performance.now();

        const bestQuote = await getBestQuote(
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

        if (BigInt(bestResponse.egressAmount) < minimumEgressAmount) {
          throw ServiceError.badRequest(
            `egress amount (${egressAmount}) is lower than minimum egress amount (${minimumEgressAmount})`,
          );
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

        handleQuotingError(res, err);
      }
    }),
  );

  return router;
};

export default quoteRouter;

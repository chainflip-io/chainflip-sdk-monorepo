import assert from 'assert';
import BigNumber from 'bignumber.js';
import { randomUUID } from 'crypto';
import express from 'express';
import type { Server } from 'socket.io';
import { Side, SwapInput, findPrice } from '@/amm-addon';
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
import { MarketMakerQuoteRequest, Leg as MarketMakerLeg } from '../quoting/schemas';
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
import { SwapRateArgs, getSwapRate } from '../utils/statechain';
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
  static of(baseAsset: InternalAsset, quoteAsset: InternalAsset, amount: bigint): Leg;
  static of(baseAsset: InternalAsset, quoteAsset: InternalAsset, amount: bigint | null): Leg | null;
  static of(baseAsset: InternalAsset, quoteAsset: InternalAsset, amount: bigint | null) {
    if (amount === null) return null;
    assert(baseAsset !== quoteAsset, 'baseAsset and quoteAsset must be different');
    assert(baseAsset === 'Usdc' || quoteAsset === 'Usdc', 'one of the assets must be USDC');
    return new Leg(baseAsset, quoteAsset, amount);
  }

  private constructor(
    private readonly baseAsset: InternalAsset,
    private readonly quoteAsset: InternalAsset,
    public amount: bigint,
  ) {}

  toPoolJSON(): SwapRateArgs {
    return {
      amount: this.amount,
      srcAsset: this.baseAsset,
      destAsset: this.quoteAsset,
    };
  }

  private getSide(): 'BUY' | 'SELL' {
    return this.quoteAsset !== 'Usdc' ? 'BUY' : 'SELL';
  }

  toMarketMakerJSON(): MarketMakerLeg {
    const side = this.getSide();
    let normalizedBaseAsset: BaseAsset;
    const normalizedQuoteAsset = 'Usdc';

    if (this.quoteAsset !== 'Usdc') {
      normalizedBaseAsset = this.quoteAsset;
    } else if (this.baseAsset !== 'Usdc') {
      normalizedBaseAsset = this.baseAsset;
    } else {
      return assertUnreachable('invalid leg');
    }

    return {
      base_asset: getAssetAndChain(normalizedBaseAsset),
      quote_asset: getAssetAndChain(normalizedQuoteAsset),
      amount: this.amount.toString(),
      side,
    };
  }

  toSwapInput(): SwapInput {
    return {
      side: this.getSide() === 'BUY' ? Side.Buy : Side.Sell,
      amount: this.amount,
      limitOrders: [],
    };
  }
}

const getPriceFromQuotesAndPool = async (leg: Leg, input: SwapInput) => {
  const { swappedAmount, remainingAmount } = await findPrice(input);

  if (remainingAmount !== 0n) {
    const { outputAmount } = await getSwapRate(leg.toPoolJSON());

    return remainingAmount + outputAmount;
  }

  return swappedAmount;
};

const quoteRouter = (io: Server) => {
  const { handler, quotes$ } = getConnectionHandler();

  io.on('connection', handler);

  const approximateIntermediateOutput = async (asset: InternalAsset, amount: string) => {
    const price = await getAssetPrice(asset);

    if (typeof price !== 'number') return null;

    return BigInt(new BigNumber(amount).times(price).toFixed(0));
  };

  async function quoteLegs(legs: [Leg]): Promise<[bigint]>;
  async function quoteLegs(legs: [Leg, Leg]): Promise<[bigint, bigint]>;
  async function quoteLegs(legs: [Leg, Leg | null]): Promise<[bigint, bigint | null]>;
  async function quoteLegs([leg1, leg2]: [Leg] | [Leg, Leg | null]): Promise<
    [bigint] | [bigint, bigint | null]
  > {
    const requestId = randomUUID();

    const requestLegs = [leg1.toMarketMakerJSON()] as
      | [MarketMakerLeg]
      | [MarketMakerLeg, MarketMakerLeg];

    if (leg2) requestLegs[1] = leg2.toMarketMakerJSON();

    const quoteRequest: MarketMakerQuoteRequest = { request_id: requestId, legs: requestLegs };

    io.emit('quote_request', quoteRequest);

    const quotes = await collectMakerQuotes(requestId, io.sockets.sockets.size, quotes$);

    const legLimitOrders = [leg1.toSwapInput()] as [SwapInput] | [SwapInput, SwapInput];

    if (leg2) legLimitOrders[1] = leg2.toSwapInput();

    for (const { legs } of quotes) {
      for (let i = 0; i < legs.length; i += 1) {
        legLimitOrders[i].limitOrders.push(...legs[i].map(([tick, amount]) => ({ tick, amount })));
      }
    }

    const results = [getPriceFromQuotesAndPool(leg1, legLimitOrders[0])] as
      | [Promise<bigint>]
      | [Promise<bigint>, Promise<bigint> | null];

    results[1] =
      leg2 && legLimitOrders[1] ? getPriceFromQuotesAndPool(leg2, legLimitOrders[1]) : null;

    return Promise.all(results);
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

      const leg = Leg.of(srcAsset, destAsset, swapInputAmount - (networkFeeUsdc ?? 0n));
      [outputAmount] = await quoteLegs([leg]);

      if (destAsset === 'Usdc') {
        networkFeeUsdc = getHundredthPipAmountFromAmount(outputAmount, networkFee);
      }
      outputAmount -= networkFeeUsdc!;
    } else {
      let approximateUsdcAmount = await approximateIntermediateOutput(
        srcAsset,
        swapInputAmount.toString(),
      );

      networkFeeUsdc =
        approximateUsdcAmount && getHundredthPipAmountFromAmount(approximateUsdcAmount, networkFee);

      if (networkFeeUsdc && approximateUsdcAmount) {
        approximateUsdcAmount -= networkFeeUsdc;
      }

      const leg1 = Leg.of(srcAsset, 'Usdc', swapInputAmount);
      let leg2 = Leg.of('Usdc', destAsset, approximateUsdcAmount);

      const quotes = await quoteLegs([leg1, leg2]);

      if (
        quotes[1] === null ||
        // if there is more than a 1% difference between the two quotes
        percentDiff(approximateUsdcAmount!.toString(), quotes[0].toString()).gt(1)
      ) {
        networkFeeUsdc = getHundredthPipAmountFromAmount(quotes[0], networkFee);
        quotes[0] -= networkFeeUsdc;
        leg2 = Leg.of('Usdc', destAsset, quotes[0]);
        [quotes[1]] = await quoteLegs([leg2]);
      }

      const secondLegPoolFee = getHundredthPipAmountFromAmount(
        quotes[1],
        pools[1].liquidityFeeHundredthPips,
      );
      quotes[1] -= secondLegPoolFee;

      fees.push(buildFee(destAsset, 'LIQUIDITY', secondLegPoolFee));

      [intermediateAmount, outputAmount] = quotes;
    }

    fees.push(buildFee('Usdc', 'NETWORK', networkFeeUsdc!));

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

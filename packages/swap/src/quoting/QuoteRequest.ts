/* eslint-disable @typescript-eslint/lines-between-class-members */
import {
  assetConstants,
  ChainflipAsset,
  internalAssetToRpcAsset,
} from '@chainflip/utils/chainflip';
import assert from 'assert';
import BigNumber from 'bignumber.js';
import { Query } from 'express-serve-static-core';
import { CHAINFLIP_STATECHAIN_BLOCK_TIME_SECONDS } from '@/shared/consts.js';
import { getPipAmountFromAmount, ONE_IN_PIP } from '@/shared/functions.js';
import { ensure } from '@/shared/guards.js';
import { getFulfilledResult } from '@/shared/promises.js';
import {
  quoteQuerySchema,
  DCABoostQuote,
  DCAQuote,
  Quote,
  SwapFeeType,
  DcaParams,
  ParsedQuoteParams,
  RegularQuote,
  RegularBoostQuote,
} from '@/shared/schemas.js';
import type Quoter from './Quoter.js';
import { Pool } from '../client.js';
import { RpcLimitOrder } from './Quoter.js';
import env from '../config/env.js';
import { getBoostSafeMode } from '../polkadot/api.js';
import { getUsdValue, checkPriceWarning } from '../pricing/checkPriceWarning.js';
import { getAssetPrice } from '../pricing/index.js';
import {
  calculateRecommendedLivePriceSlippage,
  calculateRecommendedSlippage,
} from '../utils/autoSlippage.js';
import { getBoostFeeBpsForAmount } from '../utils/boost.js';
import { assertRouteEnabled } from '../utils/env.js';
import { getPoolFees } from '../utils/fees.js';
import baseLogger from '../utils/logger.js';
import { getPools, getTotalLiquidity } from '../utils/pools.js';
import {
  getEgressFee,
  getMinimumEgressAmount,
  getIngressFee,
  validateSwapAmount,
} from '../utils/rpc.js';
import ServiceError from '../utils/ServiceError.js';
import { getSwapRateV3, SwapRateResult } from '../utils/statechain.js';
import { estimateSwapDuration, getSwapPrice } from '../utils/swap.js';

const logger = baseLogger.child({ module: 'quoting' });

const MAX_DCA_DURATION_SECONDS = 24 * 60 * 60;
export const MAX_NUMBER_OF_CHUNKS = Math.ceil(
  MAX_DCA_DURATION_SECONDS /
    CHAINFLIP_STATECHAIN_BLOCK_TIME_SECONDS /
    env.DCA_CHUNK_INTERVAL_BLOCKS,
);

const isDcaV2Available = ({ srcAsset, destAsset, dcaV2Enabled }: ParsedQuoteParams) =>
  dcaV2Enabled &&
  !env.DISABLE_DCA_QUOTING &&
  env.QUOTER_DCA_V2_MAX_USD_VALUE !== undefined &&
  (srcAsset === 'Usdc' || env.QUOTER_DCA_V2_DEPOSIT_ASSETS.has(srcAsset)) &&
  (destAsset === 'Usdc' || env.QUOTER_DCA_V2_DESTINATION_ASSETS.has(destAsset));

export default class QuoteRequest {
  static async create(quoter: Quoter, query: Query) {
    const queryResult = quoteQuerySchema.safeParse(query);

    if (!queryResult.success) {
      logger.info('received invalid quote request', {
        query,
        error: queryResult.error.message,
      });
      throw ServiceError.badRequest('invalid request');
    }

    logger.info('received a quote request', { query });
    const parsedQuery = queryResult.data;

    const { srcAsset, destAsset, amount } = queryResult.data;

    assertRouteEnabled({ srcAsset, destAsset });

    const amountResult = await validateSwapAmount(srcAsset, BigInt(parsedQuery.amount));

    if (!amountResult.success) {
      throw ServiceError.badRequest(amountResult.reason);
    }

    const ingressFee = (await getIngressFee(srcAsset)) ?? 0n; // when the protocol can't estimate the fee, that means they won't charge one so we fallback to 0

    if (ingressFee > amount) {
      throw ServiceError.badRequest(`amount is lower than estimated ingress fee (${ingressFee})`);
    }

    const pools = await getPools(srcAsset, destAsset).catch(() => {
      logger.warn('could not find pool(s)', { srcAsset, destAsset });
      return null;
    });

    if (!pools) {
      throw ServiceError.badRequest('Requested assets cannot be swapped');
    }

    return new QuoteRequest(quoter, { pools, ...queryResult.data });
  }

  private readonly srcAsset: ChainflipAsset;
  private readonly destAsset: ChainflipAsset;
  private readonly depositAmount: bigint;
  private readonly dcaEnabled: boolean;
  private readonly dcaV2Available: boolean;
  private readonly isVaultSwap: boolean;
  private readonly isOnChain: boolean;
  private readonly pools: Pool[];
  private readonly ccmParams: ParsedQuoteParams['ccmParams'] | undefined;
  private readonly brokerCommissionBps: number | undefined;
  private dcaQuoteParams:
    | (DcaParams & { chunkSize: bigint; additionalSwapDurationSeconds: number })
    | null = null;
  private estimatedBoostFeeBps: number | undefined;
  private maxBoostFeeBps: number | undefined;
  private success = false;
  private srcAssetIndexPrice?: number;
  private destAssetIndexPrice?: number;

  private regularLimitOrders: RpcLimitOrder[] | null = null;
  private dcaLimitOrders: RpcLimitOrder[] | null = null;

  private quote: RegularQuote | null = null;
  private dcaQuote: DCAQuote | null = null;

  private error: Error | null = null;

  private readonly start = performance.now();

  constructor(
    private readonly quoter: Quoter,
    params: ParsedQuoteParams & { pools: Pool[] },
  ) {
    this.srcAsset = params.srcAsset;
    this.destAsset = params.destAsset;
    this.depositAmount = params.amount;
    this.dcaV2Available = isDcaV2Available(params);
    this.dcaEnabled = this.dcaV2Available || (params.dcaEnabled && !env.DISABLE_DCA_QUOTING);
    this.isVaultSwap = params.isVaultSwap ?? false;
    this.isOnChain = params.isOnChain ?? false;
    this.pools = params.pools;
    this.ccmParams = params.ccmParams;
    this.brokerCommissionBps = params.brokerCommissionBps;
  }

  private async setDcaQuoteParams() {
    if (
      !this.dcaEnabled ||
      env.DCA_DISABLED_INTERNAL_ASSETS.has(this.srcAsset) ||
      env.DCA_DISABLED_INTERNAL_ASSETS.has(this.destAsset)
    ) {
      return;
    }

    const usdChunkSize =
      // if we have a chunk size for the destination asset, use that first
      env.DCA_BUY_CHUNK_SIZE_USD?.[this.destAsset] ??
      // otherwise, if we have a chunk size for the source asset, use that next
      env.DCA_SELL_CHUNK_SIZE_USD?.[this.srcAsset] ??
      // otherwise, use the default chunk size
      env.DCA_DEFAULT_SELL_CHUNK_SIZE_USD;

    const usdValue = await getUsdValue(this.depositAmount, this.srcAsset).catch(() => undefined);

    if (!usdValue) {
      logger.error('could not get usd value for DCA quote calculation', {
        srcAsset: this.srcAsset,
        destAsset: this.destAsset,
        amount: this.depositAmount,
        usdChunkSize,
      });
      return;
    }

    if (Number(usdValue) <= usdChunkSize) return;

    const numberOfChunks = Math.ceil(Number(usdValue) / usdChunkSize);

    if (numberOfChunks > MAX_NUMBER_OF_CHUNKS) {
      logger.info('number of chunks is bigger than max', { numberOfChunks, MAX_NUMBER_OF_CHUNKS });
      return;
    }

    this.dcaQuoteParams = {
      chunkSize: BigInt(
        new BigNumber(this.depositAmount.toString()).dividedBy(numberOfChunks).toFixed(0),
      ),
      numberOfChunks,
      additionalSwapDurationSeconds: Math.ceil(
        env.DCA_CHUNK_INTERVAL_BLOCKS *
          CHAINFLIP_STATECHAIN_BLOCK_TIME_SECONDS *
          (numberOfChunks - 1), // we deduct 1 chunk because the first one is already accounted for in the regular quote
      ),
      chunkIntervalBlocks: env.DCA_CHUNK_INTERVAL_BLOCKS,
    };
    await this.setLimitOrders(this.dcaQuoteParams);
  }

  private async setLimitOrders(dcaParams?: typeof this.dcaQuoteParams) {
    if (dcaParams) {
      this.dcaLimitOrders ??= await this.quoter.getLimitOrders(
        this.srcAsset,
        this.destAsset,
        dcaParams.chunkSize,
      );
    } else {
      this.regularLimitOrders ??= await this.quoter.getLimitOrders(
        this.srcAsset,
        this.destAsset,
        this.depositAmount,
      );
    }
  }

  private async setBoostQuoteParams() {
    const boostDepositsEnabled = await getBoostSafeMode(this.srcAsset).catch(() => true);
    if (!boostDepositsEnabled) return;

    const { estimatedBoostFeeBps, maxBoostFeeBps } = await getBoostFeeBpsForAmount({
      amount: this.depositAmount,
      asset: this.srcAsset,
    });
    this.estimatedBoostFeeBps = estimatedBoostFeeBps;
    this.maxBoostFeeBps = maxBoostFeeBps;
  }

  private async setIndexPrices() {
    [this.srcAssetIndexPrice, this.destAssetIndexPrice] = await Promise.all([
      getAssetPrice(this.srcAsset).catch(() => undefined),
      getAssetPrice(this.destAsset).catch(() => undefined),
    ]);
  }

  private async getPoolQuote(): Promise<RegularQuote>;
  private async getPoolQuote(opts: { boostFeeBps: number }): Promise<RegularBoostQuote>;
  private async getPoolQuote(opts: { dcaParams: DcaParams }): Promise<DCAQuote>;
  private async getPoolQuote(opts: {
    boostFeeBps: number;
    dcaParams: DcaParams;
  }): Promise<DCABoostQuote>;
  private async getPoolQuote({
    boostFeeBps,
    dcaParams,
  }: { boostFeeBps?: number; dcaParams?: DcaParams } = {}) {
    const includedFees = [];
    const excludeFees: SwapFeeType[] = [];
    let cfRateInputAmount = this.depositAmount;

    // After this ticket, boost fee should be included in the response so dont have to calculate it ourselves
    // https://linear.app/chainflip/issue/PRO-1370/include-boost-fees-in-quote-from-cf-swap-rate-v2
    if (boostFeeBps) {
      const boostFee = getPipAmountFromAmount(this.depositAmount, boostFeeBps);
      includedFees.push({
        type: 'BOOST',
        amount: boostFee,
        ...internalAssetToRpcAsset[this.srcAsset],
      } as const);
      cfRateInputAmount -= boostFee;
    }

    if (this.isVaultSwap) {
      excludeFees.push('IngressDepositChannel');
    }

    if (this.isOnChain) {
      excludeFees.push('Egress');
      excludeFees.push('IngressDepositChannel');
      excludeFees.push('IngressVaultSwap');
    }

    let swapRateResult = await getSwapRateV3({
      srcAsset: this.srcAsset,
      destAsset: this.destAsset,
      depositAmount: cfRateInputAmount,
      limitOrders: ensure(
        dcaParams ? this.dcaLimitOrders : this.regularLimitOrders,
        'Limit orders must be fetched before calling getPoolQuote',
      ),
      brokerCommissionBps: this.brokerCommissionBps,
      ccmParams: this.ccmParams,
      dcaParams,
      excludeFees,
      isInternal: this.isOnChain,
    });
    if (dcaParams && dcaParams?.numberOfChunks > 1) {
      // the dca quote assumes that all chunks of the swap will be executed at the same price
      // this assumption is wrong for assets with limited global liquidity like the flip token
      // therefore we want to factor in the estimated price change into the quote
      swapRateResult = await this.applyDcaPriceImpact(swapRateResult);
    }
    const { egressFee, ingressFee, networkFee, intermediateAmount, brokerFee, egressAmount } =
      swapRateResult;

    const swapInputAmount = cfRateInputAmount - ingressFee.amount;
    const swapOutputAmount = egressAmount + egressFee.amount;

    if (egressAmount === 0n) {
      if (networkFee.amount === 0n) {
        // this shouldn't happen because we check before but i'll keep it here anyway
        throw ServiceError.badRequest('swap amount is lower than ingress fee');
      }

      const rpcEgressFee = await getEgressFee(this.destAsset);
      throw ServiceError.badRequest(
        `swap output amount is lower than the egress fee (${rpcEgressFee})`,
      );
    }

    const minimumEgressAmount = this.isOnChain ? 0n : await getMinimumEgressAmount(this.destAsset);
    if (egressAmount < minimumEgressAmount) {
      throw ServiceError.badRequest(
        `egress amount (${egressAmount}) is lower than minimum egress amount (${minimumEgressAmount})`,
      );
    }

    const lowLiquidityWarning = await checkPriceWarning({
      srcAsset: this.srcAsset,
      destAsset: this.destAsset,
      srcAmount: swapInputAmount,
      destAmount: swapOutputAmount,
    });

    includedFees.push({ ...ingressFee, type: 'INGRESS' });
    includedFees.push({ ...networkFee, type: 'NETWORK' });

    if (brokerFee.amount > 0n) {
      includedFees.push({ ...brokerFee, type: 'BROKER' });
    }

    includedFees.push({ ...egressFee, type: 'EGRESS' });

    const poolInfo = getPoolFees(this.srcAsset, this.destAsset).map(({ type, ...fee }, i) => ({
      baseAsset: internalAssetToRpcAsset[this.pools[i].baseAsset as ChainflipAsset],
      quoteAsset: internalAssetToRpcAsset[this.pools[i].quoteAsset as ChainflipAsset],
      fee,
    }));

    const estimatedDurations = await estimateSwapDuration({
      srcAsset: this.srcAsset,
      destAsset: this.destAsset,
      boosted: Boolean(boostFeeBps),
      isExternal: !this.isOnChain,
    });

    const dcaChunks = dcaParams?.numberOfChunks ?? 1;
    const quoteType = dcaChunks > 1 ? 'DCA' : 'REGULAR';

    const estimatedPrice = getSwapPrice(
      this.srcAsset,
      String(swapInputAmount),
      this.destAsset,
      String(swapOutputAmount),
    );

    const recommendedSlippageTolerancePercent = await calculateRecommendedSlippage({
      srcAsset: this.srcAsset,
      destAsset: this.destAsset,
      boostFeeBps,
      intermediateAmount,
      egressAmount,
      dcaChunks,
      estimatedPrice,
      isOnChain: this.isOnChain,
    });

    const recommendedLivePriceSlippageTolerancePercent =
      await calculateRecommendedLivePriceSlippage({
        srcAsset: this.srcAsset,
        destAsset: this.destAsset,
        brokerCommissionBps: this.brokerCommissionBps ?? 0,
        isInternal: this.isOnChain,
      });

    return {
      intermediateAmount: intermediateAmount?.toString(),
      egressAmount: egressAmount.toString(),
      recommendedSlippageTolerancePercent,
      recommendedLivePriceSlippageTolerancePercent,
      includedFees: includedFees.map((fee) => ({ ...fee, amount: fee.amount.toString() })),
      lowLiquidityWarning,
      poolInfo,
      estimatedDurationsSeconds: estimatedDurations.durations,
      estimatedDurationSeconds: estimatedDurations.total,
      estimatedPrice: estimatedPrice.toFixed(),
      type: quoteType,
      srcAsset: internalAssetToRpcAsset[this.srcAsset],
      destAsset: internalAssetToRpcAsset[this.destAsset],
      depositAmount: this.depositAmount.toString(),
      isVaultSwap: this.isVaultSwap || undefined,
      isOnChain: this.isOnChain || undefined,
      ccmParams: this.ccmParams && {
        gasBudget: String(this.ccmParams.gasBudget),
        messageLengthBytes: this.ccmParams.messageLengthBytes,
      },
      recommendedRetryDurationMinutes: this.srcAsset === 'Btc' || this.destAsset === 'Btc' ? 30 : 5,
    } as Quote;
  }

  private async getTotalLiquidity(
    from: ChainflipAsset,
    to: ChainflipAsset,
    type: Quote['type'],
  ): Promise<bigint> {
    assert(from === 'Usdc' || to === 'Usdc', 'one asset must be USDC');
    if (from === 'Usdc' && to === 'Usdc') return 0n;
    const liquidty = await getTotalLiquidity(from, to);
    if (type === 'REGULAR') return liquidty;
    const [numerator, denominator] = this.quoter.getReplenishmentFactor(to);
    return (liquidty * numerator) / denominator;
  }

  private async eagerLiquidityExists(
    quote: Pick<Quote, 'egressAmount' | 'intermediateAmount' | 'type'>,
  ) {
    if (this.srcAsset === 'Usdc' || this.destAsset === 'Usdc') {
      const totalLiquidity = await this.getTotalLiquidity(
        this.srcAsset,
        this.destAsset,
        quote.type,
      );
      return totalLiquidity > BigInt(quote.egressAmount);
    }
    const [totalLiquidityLeg1, totalLiquidityLeg2] = await Promise.all([
      this.getTotalLiquidity(this.srcAsset, 'Usdc', quote.type),
      this.getTotalLiquidity('Usdc', this.destAsset, quote.type),
    ]);
    return (
      totalLiquidityLeg1 > BigInt(quote.intermediateAmount!) &&
      totalLiquidityLeg2 > BigInt(quote.egressAmount)
    );
  }

  private async applyDcaPriceImpact(swapRateResult: SwapRateResult): Promise<SwapRateResult> {
    const leg1BaseAsset = this.srcAsset === 'Usdc' ? this.destAsset : this.srcAsset;
    const leg1PriceImpact100kPercent = env.DCA_100K_USD_PRICE_IMPACT_PERCENT[leg1BaseAsset] ?? 0;

    const leg2BaseAsset = swapRateResult.intermediateAmount ? this.destAsset : undefined;
    const leg2PriceImpact100kPercent =
      (leg2BaseAsset && env.DCA_100K_USD_PRICE_IMPACT_PERCENT[leg2BaseAsset]) ?? 0;

    if (!leg1PriceImpact100kPercent && !leg2PriceImpact100kPercent) {
      return swapRateResult;
    }

    const leg1UsdValue = await getUsdValue(this.depositAmount, this.srcAsset).catch(
      () => undefined,
    );
    const leg2UsdValue =
      swapRateResult.intermediateAmount &&
      (await getUsdValue(swapRateResult.intermediateAmount, 'Usdc').catch(() => undefined));
    if (!leg1UsdValue || (swapRateResult.intermediateAmount && !leg2UsdValue)) {
      logger.error('could not get usd value for applying price impact', {
        srcAsset: this.srcAsset,
        destAsset: this.destAsset,
        depositAmount: this.depositAmount,
        quote: swapRateResult,
      });
      return swapRateResult;
    }

    const leg1PriceImpactBps = Math.round(
      (leg1PriceImpact100kPercent * 100 * Number(leg1UsdValue)) / 100_000,
    );
    const leg2PriceImpactBps = Math.round(
      (leg2PriceImpact100kPercent * 100 * Number(leg2UsdValue)) / 100_000,
    );

    const adjustedResult = structuredClone(swapRateResult);
    adjustedResult.networkFee.amount = getPipAmountFromAmount(
      adjustedResult.networkFee.amount,
      ONE_IN_PIP - leg1PriceImpactBps,
    );
    adjustedResult.brokerFee.amount = getPipAmountFromAmount(
      adjustedResult.brokerFee.amount,
      ONE_IN_PIP - leg1PriceImpactBps,
    );
    adjustedResult.egressFee.amount = getPipAmountFromAmount(
      adjustedResult.egressFee.amount,
      ONE_IN_PIP - leg1PriceImpactBps - leg2PriceImpactBps,
    );
    adjustedResult.intermediateAmount =
      adjustedResult.intermediateAmount &&
      getPipAmountFromAmount(adjustedResult.intermediateAmount, ONE_IN_PIP - leg1PriceImpactBps);
    adjustedResult.egressAmount = getPipAmountFromAmount(
      adjustedResult.egressAmount,
      ONE_IN_PIP - leg1PriceImpactBps - leg2PriceImpactBps,
    );

    return adjustedResult;
  }

  async canUseDcaV2(): Promise<boolean> {
    if (!env.QUOTER_DCA_V2_MAX_USD_VALUE) return false;
    // lpp is a requirement for dca v2
    if (env.DISABLE_RECOMMENDED_LIVE_PRICE_SLIPPAGE) return false;
    if (!this.dcaV2Available) return false;

    const depositValueUsd = await getUsdValue(this.depositAmount, this.srcAsset).catch(
      () => undefined,
    );

    if (depositValueUsd === undefined) {
      logger.warn('deposit value usd is undefined when checking DCA v2 eligibility');
      return false;
    }

    return Number(depositValueUsd) <= env.QUOTER_DCA_V2_MAX_USD_VALUE;
  }

  private async generateQuotes() {
    await Promise.all([
      this.setBoostQuoteParams(),
      this.setDcaQuoteParams(),
      this.setLimitOrders(),
      this.setIndexPrices(),
    ]);

    const [quoteResult, boostedQuoteResult, dcaQuoteResult, dcaBoostedQuoteResult] =
      await Promise.allSettled([
        this.getPoolQuote(),
        this.estimatedBoostFeeBps && this.getPoolQuote({ boostFeeBps: this.estimatedBoostFeeBps }),
        this.dcaQuoteParams && this.getPoolQuote({ dcaParams: this.dcaQuoteParams }),
        this.dcaQuoteParams &&
          this.estimatedBoostFeeBps &&
          this.getPoolQuote({
            dcaParams: this.dcaQuoteParams,
            boostFeeBps: this.estimatedBoostFeeBps,
          }),
      ]);

    if (dcaQuoteResult.status === 'rejected') {
      throw dcaQuoteResult.reason;
    }
    if (!this.dcaQuoteParams && quoteResult.status === 'rejected') {
      throw quoteResult.reason;
    }

    this.quote = getFulfilledResult(quoteResult, null);
    const boostedQuote = getFulfilledResult(boostedQuoteResult, null);
    this.dcaQuote = getFulfilledResult(dcaQuoteResult, null);
    const dcaBoostedQuote = getFulfilledResult(dcaBoostedQuoteResult, null);

    let regularEagerLiquidityExists = false;
    let dcaEagerLiquidityExists = false;

    const { dcaQuoteParams } = this;

    if (this.dcaQuote && dcaQuoteParams) {
      // include dcaParams in dca quote
      this.dcaQuote.dcaParams = {
        numberOfChunks: dcaQuoteParams.numberOfChunks,
        chunkIntervalBlocks: dcaQuoteParams.chunkIntervalBlocks,
      };

      // adjust time for DCA
      this.dcaQuote.estimatedDurationsSeconds.swap += dcaQuoteParams.additionalSwapDurationSeconds;
      this.dcaQuote.estimatedDurationSeconds += dcaQuoteParams.additionalSwapDurationSeconds;
      if (dcaBoostedQuote) {
        dcaBoostedQuote.dcaParams = this.dcaQuote.dcaParams;
        dcaBoostedQuote.estimatedDurationsSeconds.swap +=
          dcaQuoteParams.additionalSwapDurationSeconds;
        dcaBoostedQuote.estimatedDurationSeconds += dcaQuoteParams.additionalSwapDurationSeconds;
      }

      dcaEagerLiquidityExists =
        (await this.canUseDcaV2()) || (await this.eagerLiquidityExists(this.dcaQuote));
    }
    if (this.quote) {
      regularEagerLiquidityExists = await this.eagerLiquidityExists(this.quote);
    }

    if (!regularEagerLiquidityExists && !dcaEagerLiquidityExists) {
      throw ServiceError.badRequest(`insufficient liquidity for the requested amount`);
    }

    const boostInfo = this.estimatedBoostFeeBps &&
      this.maxBoostFeeBps && {
        estimatedBoostFeeBps: this.estimatedBoostFeeBps,
        maxBoostFeeBps: this.maxBoostFeeBps,
      };
    if (this.quote && boostedQuote && boostInfo) {
      this.quote.boostQuote = { ...boostedQuote, ...boostInfo };
    }
    if (this.dcaQuote && dcaBoostedQuote && boostInfo) {
      this.dcaQuote.boostQuote = { ...dcaBoostedQuote, ...boostInfo };
    }

    const result = [];
    if (this.quote && regularEagerLiquidityExists) result.push(this.quote);
    if (this.dcaQuote && dcaEagerLiquidityExists) result.push(this.dcaQuote);
    return result;
  }

  tryGenerateQuotes(): Promise<PromiseSettledResult<Quote[]>> {
    return this.generateQuotes().then(
      (qs) => {
        this.success = true;
        return { status: 'fulfilled' as const, value: qs };
      },
      (err) => {
        this.error = err as Error;
        return { status: 'rejected' as const, reason: err as Error };
      },
    );
  }

  toLogInfo() {
    const inputAmount = new BigNumber(this.depositAmount.toString()).shiftedBy(
      -assetConstants[this.srcAsset].decimals,
    );
    return {
      srcAsset: this.srcAsset,
      destAsset: this.destAsset,
      srcAssetIndexPrice: this.srcAssetIndexPrice ?? null,
      destAssetIndexPrice: this.destAssetIndexPrice ?? null,
      inputAmount: inputAmount.toFixed(),
      inputValueUsd: inputAmount.times(this.srcAssetIndexPrice ?? 0).toFixed(2),
      duration: (performance.now() - this.start).toFixed(2),
      dcaQuoteParams: this.dcaQuoteParams,
      brokerCommissionBps: this.brokerCommissionBps,
      estimatedBoostFeeBps: this.estimatedBoostFeeBps,
      maxBoostFeeBps: this.maxBoostFeeBps,
      regularLimitOrders: this.regularLimitOrders,
      dcaLimitOrders: this.dcaLimitOrders,
      success: this.success,
      regularQuote: this.quote,
      dcaQuote: this.dcaQuote,
      isInternalSwap: this.isOnChain,
      isVaultSwap: this.isVaultSwap,
      error: this.error?.message ?? null,
    };
  }
}

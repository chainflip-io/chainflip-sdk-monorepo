import { randomUUID } from 'crypto';
import { Subject } from 'rxjs';
import { Server } from 'socket.io';
import { findPrice, type SwapInput } from '@/amm-addon';
import { getPoolsNetworkFeeHundredthPips } from '@/shared/consts';
import { InternalAsset } from '@/shared/enums';
import { getHundredthPipAmountFromAmount } from '@/shared/functions';
import { ParsedQuoteParams, SwapFee } from '@/shared/schemas';
import { QuotingSocket } from './authenticate';
import {
  Leg as MarketMakerLeg,
  MarketMakerQuote,
  MarketMakerQuoteRequest,
  marketMakerResponseSchema,
} from './schemas';
import { Leg, approximateIntermediateOutput, collectMakerQuotes } from './utils';
import { Pool } from '../client';
import env from '../config/env';
import { buildFee } from '../utils/fees';
import logger from '../utils/logger';
import { percentDiff } from '../utils/math';
import { getSwapRate } from '../utils/statechain';

export type QuoteType = 'pool' | 'market_maker';

type Quote = { marketMaker: string; quote: MarketMakerQuote };

const getPriceFromQuotesAndPool = async (leg: Leg, input: SwapInput) => {
  const { swappedAmount, remainingAmount } = await findPrice(input);

  if (remainingAmount !== 0n) {
    const { outputAmount } = await getSwapRate(leg.toPoolJSON());

    return remainingAmount + outputAmount;
  }

  return swappedAmount;
};

export default class Quoter {
  private readonly quotes$ = new Subject<Quote>();

  constructor(private readonly io: Server) {
    io.on('connection', (socket: QuotingSocket) => {
      logger.info(`market maker "${socket.data.marketMaker}" connected`);

      socket.on('disconnect', () => {
        logger.info(`market maker "${socket.data.marketMaker}" disconnected`);
      });

      socket.on('quote_response', (message) => {
        const result = marketMakerResponseSchema.safeParse(message);

        if (!result.success) {
          logger.warn(
            `received invalid quote response from "${socket.data.marketMaker}"`,
            {},
            { message },
          );
          return;
        }

        this.quotes$.next({ marketMaker: socket.data.marketMaker, quote: result.data });
      });
    });
  }

  async quoteLegs(legs: [Leg]): Promise<[bigint]>;
  async quoteLegs(legs: [Leg, Leg]): Promise<[bigint, bigint]>;
  async quoteLegs(legs: [Leg, Leg | null]): Promise<[bigint, bigint | null]>;
  async quoteLegs([leg1, leg2]: [Leg] | [Leg, Leg | null]): Promise<
    [bigint] | [bigint, bigint | null]
  > {
    const requestId = randomUUID();

    const requestLegs = [leg1.toMarketMakerJSON()] as
      | [MarketMakerLeg]
      | [MarketMakerLeg, MarketMakerLeg];

    if (leg2) requestLegs[1] = leg2.toMarketMakerJSON();

    const quoteRequest: MarketMakerQuoteRequest = { request_id: requestId, legs: requestLegs };

    this.io.emit('quote_request', quoteRequest);

    const quotes = await collectMakerQuotes(requestId, this.io.sockets.sockets.size, this.quotes$);

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

  async getBestQuote(
    quoteRequest: ParsedQuoteParams & { amount: bigint },
    srcAsset: InternalAsset,
    destAsset: InternalAsset,
    pools: Pool[],
  ) {
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
      [outputAmount] = await this.quoteLegs([leg]);

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

      const quotes = await this.quoteLegs([leg1, leg2]);

      if (
        quotes[1] === null ||
        // if there is more than a 1% difference between the two quotes
        percentDiff(approximateUsdcAmount!.toString(), quotes[0].toString()).gt(1)
      ) {
        networkFeeUsdc = getHundredthPipAmountFromAmount(quotes[0], networkFee);
        quotes[0] -= networkFeeUsdc;
        leg2 = Leg.of('Usdc', destAsset, quotes[0]);
        [quotes[1]] = await this.quoteLegs([leg2]);
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
  }
}

import BigNumber from 'bignumber.js';
import { randomUUID } from 'crypto';
import { Subject, Subscription, filter } from 'rxjs';
import { Server } from 'socket.io';
import { swap, type SwapInput } from '@/amm-addon';
import { getPoolsNetworkFeeHundredthPips } from '@/shared/consts';
import { InternalAsset, assetConstants } from '@/shared/enums';
import { getHundredthPipAmountFromAmount } from '@/shared/functions';
import { SwapFee } from '@/shared/schemas';
import { QuotingSocket } from './authenticate';
import Leg from './Leg';
import {
  Leg as MarketMakerLeg,
  MarketMakerQuote,
  MarketMakerQuoteRequest,
  marketMakerResponseSchema,
} from './schemas';
import { Pool } from '../client';
import env from '../config/env';
import { getAssetPrice } from '../pricing';
import { buildFee } from '../utils/fees';
import { handleExit } from '../utils/function';
import logger from '../utils/logger';
import { percentDifference } from '../utils/math';
import { getCachedPoolOrdersAndPrice } from '../utils/rpc';

export type QuoteType = 'pool' | 'market_maker';

type Quote = { marketMaker: string; quote: MarketMakerQuote };

const simulateSwap = async (input: SwapInput) => {
  const { swappedAmount } = await swap(input);

  return swappedAmount;
};

export const approximateIntermediateOutput = async (asset: InternalAsset, amount: string) => {
  const price = await getAssetPrice(asset);

  if (typeof price !== 'number') return null;

  return BigInt(
    new BigNumber(amount)
      .times(price)
      .shiftedBy(assetConstants.Usdc.decimals - assetConstants[asset].decimals)
      .toFixed(0),
  );
};

export const differenceExceedsThreshold = (
  a: bigint,
  b: bigint,
  tolerance = env.QUOTE_APPROXIMATION_THRESHOLD,
) => percentDifference(a.toString(), b.toString()).gt(tolerance);

export default class Quoter {
  private readonly quotes$ = new Subject<Quote>();

  constructor(
    private readonly io: Server,
    private createId: () => string = randomUUID,
  ) {
    io.on('connection', (socket: QuotingSocket) => {
      logger.info(`market maker "${socket.data.marketMaker}" connected`);

      const cleanup = handleExit(() => {
        socket.disconnect();
      });

      socket.on('disconnect', () => {
        logger.info(`market maker "${socket.data.marketMaker}" disconnected`);
        cleanup();
      });

      socket.on('quote_response', (message) => {
        const result = marketMakerResponseSchema.safeParse(message);

        if (!result.success) {
          logger.warn(`received invalid quote response from "${socket.data.marketMaker}"`, {
            message,
            reason: result.error,
          });
          return;
        }

        this.quotes$.next({ marketMaker: socket.data.marketMaker, quote: result.data });
      });
    });
  }

  canQuote() {
    return env.USE_JIT_QUOTING && this.io.sockets.sockets.size > 0;
  }

  private async collectMakerQuotes(request: MarketMakerQuoteRequest): Promise<MarketMakerQuote[]> {
    const connectedClients = this.io.sockets.sockets.size;
    if (connectedClients === 0) return Promise.resolve([]);

    this.io.emit('quote_request', request);

    const clientsReceivedQuotes = new Map<string, MarketMakerQuote>();

    return new Promise((resolve) => {
      let sub: Subscription;

      let timer: ReturnType<typeof setTimeout>;

      const complete = () => {
        resolve([...clientsReceivedQuotes.values()]);
        sub.unsubscribe();
        clearTimeout(timer);
      };

      sub = this.quotes$
        .pipe(
          filter(
            ({ quote }) =>
              quote.request_id === request.request_id && quote.legs.length === request.legs.length,
          ),
        )
        .subscribe(({ marketMaker, quote }) => {
          clientsReceivedQuotes.set(marketMaker, quote);
          if (clientsReceivedQuotes.size === connectedClients) complete();
        });

      timer = setTimeout(complete, env.QUOTE_TIMEOUT);
    });
  }

  private async quoteLegs(legs: [Leg]): Promise<[bigint]>;
  private async quoteLegs(legs: [Leg, Leg]): Promise<[bigint, bigint]>;
  private async quoteLegs(legs: [Leg, Leg | null]): Promise<[bigint, bigint | null]>;
  private async quoteLegs([leg1, leg2]: [Leg] | [Leg, Leg | null]): Promise<
    [bigint] | [bigint, bigint | null]
  > {
    const requestId = this.createId();

    const requestLegs = [leg1.toMarketMakerJSON()] as
      | [MarketMakerLeg]
      | [MarketMakerLeg, MarketMakerLeg];

    if (leg2) requestLegs[1] = leg2.toMarketMakerJSON();

    const quoteRequest: MarketMakerQuoteRequest = { request_id: requestId, legs: requestLegs };

    const [quotes, firstPoolState, secondPoolState] = await Promise.all([
      this.collectMakerQuotes(quoteRequest),
      getCachedPoolOrdersAndPrice(leg1.getBaseAsset()),
      leg2 && getCachedPoolOrdersAndPrice(leg2.getBaseAsset()),
    ]);

    if (quotes.length === 0) throw new Error('no quotes received');

    const results = [
      simulateSwap(
        leg1.toSwapInput({
          limitOrders: quotes.flatMap(({ legs }) => legs[0]),
          ...firstPoolState,
        }),
      ),
    ] as [Promise<bigint>] | [Promise<bigint>, Promise<bigint> | null];

    results[1] = leg2
      ? simulateSwap(
          leg2.toSwapInput({
            limitOrders: quotes.flatMap(({ legs }) => legs[1]!),
            ...secondPoolState,
          }),
        )
      : null;

    return Promise.all(results);
  }

  async getQuote(
    srcAsset: InternalAsset,
    destAsset: InternalAsset,
    swapInputAmount: bigint,
    pools: Pool[],
  ) {
    const networkFee = getPoolsNetworkFeeHundredthPips(env.CHAINFLIP_NETWORK);

    let intermediateAmount: bigint | null = null;
    let outputAmount: bigint;
    let networkFeeUsdc: bigint | null = null;

    const fees: SwapFee[] = [];

    if (srcAsset === 'Usdc' || destAsset === 'Usdc') {
      if (srcAsset === 'Usdc') {
        networkFeeUsdc = getHundredthPipAmountFromAmount(swapInputAmount, networkFee);
      }

      const leg = Leg.of(srcAsset, destAsset, swapInputAmount - (networkFeeUsdc ?? 0n));
      [outputAmount] = await this.quoteLegs([leg]);

      if (destAsset === 'Usdc') {
        networkFeeUsdc = getHundredthPipAmountFromAmount(outputAmount, networkFee);
        outputAmount -= networkFeeUsdc!;
      }
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
        differenceExceedsThreshold(approximateUsdcAmount! + networkFeeUsdc!, quotes[0])
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

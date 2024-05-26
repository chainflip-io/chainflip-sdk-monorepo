import { hexEncodeNumber } from '@chainflip/utils/number';
import { toLowerCase } from '@chainflip/utils/string';
import assert from 'assert';
import BigNumber from 'bignumber.js';
import { randomUUID } from 'crypto';
import { Subject, Subscription, filter } from 'rxjs';
import { Server } from 'socket.io';
import { InternalAsset, UncheckedAssetAndChain, assetConstants } from '@/shared/enums';
import { QuotingSocket } from './authenticate';
import Leg from './Leg';
import { MarketMakerQuote, MarketMakerQuoteRequest, marketMakerResponseSchema } from './schemas';
import env from '../config/env';
import { getAssetPrice } from '../pricing';
import { handleExit } from '../utils/function';
import logger from '../utils/logger';
import { percentDifference } from '../utils/math';

type Quote = { marketMaker: string; quote: MarketMakerQuote };

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

type RpcLimitOrder = {
  LimitOrder: {
    base_asset: UncheckedAssetAndChain;
    quote_asset: UncheckedAssetAndChain;
    side: 'buy' | 'sell';
    tick: number;
    sell_amount: `0x${string}`;
  };
};

const formatLimitOrders = (
  quotes?: MarketMakerQuote['legs'][number],
  leg?: MarketMakerQuoteRequest['legs'][number],
): RpcLimitOrder[] => {
  if (!quotes || !leg) return [];

  return quotes.map(([tick, amount]) => ({
    LimitOrder: {
      side: toLowerCase(leg.side),
      base_asset: leg.base_asset,
      quote_asset: leg.quote_asset,
      tick,
      sell_amount: hexEncodeNumber(amount),
    },
  }));
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
            quoteResponse: message,
            reason: result.error,
          });
          return;
        }

        this.quotes$.next({ marketMaker: socket.data.marketMaker, quote: result.data });
      });
    });
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

  async getLimitOrders(srcAsset: InternalAsset, destAsset: InternalAsset, swapInputAmount: bigint) {
    let intermediateAmount = null;

    if (destAsset !== 'Usdc') {
      intermediateAmount = await approximateIntermediateOutput(
        srcAsset,
        swapInputAmount.toString(),
      );
    }

    let legs;

    if (srcAsset !== 'Usdc' && destAsset !== 'Usdc') {
      assert(intermediateAmount !== null, 'failed to approximate intermediate output');
      legs = [
        Leg.of(srcAsset, 'Usdc', swapInputAmount).toJSON(),
        Leg.of('Usdc', destAsset, intermediateAmount).toJSON(),
      ] as const;
    } else {
      legs = [Leg.of(srcAsset, destAsset, swapInputAmount).toJSON()] as const;
    }

    const request: MarketMakerQuoteRequest = { request_id: this.createId(), legs };

    const quotes = await this.collectMakerQuotes(request);

    return [
      ...formatLimitOrders(
        quotes.flatMap((quote) => quote.legs[0]),
        legs[0],
      ),
      ...formatLimitOrders(
        quotes.flatMap((quote) => quote.legs[1] ?? []),
        legs[1],
      ),
    ];
  }
}

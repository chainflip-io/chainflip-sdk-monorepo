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

export default class Quoter {
  private readonly quotes$ = new Subject<Quote>();

  private readonly inflightRequests = new Set<string>();

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
          logger.warn('received invalid quote response', {
            quoteResponse: message,
            reason: result.error,
            marketMaker: socket.data.marketMaker,
          });
          return;
        }

        if (!this.inflightRequests.has(result.data.request_id)) {
          logger.warn('received quote for unknown request', {
            legs: result.data.legs,
            requestId: result.data.request_id,
            marketMaker: socket.data.marketMaker,
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

    this.inflightRequests.add(request.request_id);
    this.io.emit('quote_request', request);

    const clientsReceivedQuotes = new Map<string, MarketMakerQuote>();

    return new Promise((resolve) => {
      let sub: Subscription;

      let timer: ReturnType<typeof setTimeout>;

      const complete = () => {
        resolve([...clientsReceivedQuotes.values()]);
        sub.unsubscribe();
        clearTimeout(timer);
        this.inflightRequests.delete(request.request_id);
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
          logger.info('received limit orders from market maker', {
            marketMaker,
            legs: quote.legs,
            requestId: request.request_id,
          });
          if (clientsReceivedQuotes.size === connectedClients) complete();
        });

      timer = setTimeout(complete, env.QUOTE_TIMEOUT);
    });
  }

  async getLimitOrders(srcAsset: InternalAsset, destAsset: InternalAsset, swapInputAmount: bigint) {
    let legs;
    const start = performance.now();

    if (srcAsset === 'Usdc' || destAsset === 'Usdc') {
      legs = [Leg.of(srcAsset, destAsset, swapInputAmount).toJSON()] as const;
    } else {
      const intermediateAmount = await approximateIntermediateOutput(
        srcAsset,
        swapInputAmount.toString(),
      );
      assert(intermediateAmount !== null, 'failed to approximate intermediate output');
      legs = [
        Leg.of(srcAsset, 'Usdc', swapInputAmount).toJSON(),
        Leg.of('Usdc', destAsset, intermediateAmount).toJSON(),
      ] as const;
    }

    const request: MarketMakerQuoteRequest = { request_id: this.createId(), legs };

    logger.info('requesting limit orders from market makers', {
      connectedMarketMakerCount: this.io.sockets.sockets.size,
      srcAsset,
      destAsset,
      swapInputAmount: swapInputAmount.toString(),
      requestId: request.request_id,
    });

    const quotes = await this.collectMakerQuotes(request);

    const orders = [
      ...formatLimitOrders(
        quotes.flatMap((quote) => quote.legs[0]),
        legs[0],
      ),
      ...formatLimitOrders(
        quotes.flatMap((quote) => quote.legs[1] ?? []),
        legs[1],
      ),
    ];

    logger.info('received limit orders from market makers', {
      orders,
      requestId: request.request_id,
      duration: performance.now() - start,
    });

    return orders;
  }
}

import { hexEncodeNumber } from '@chainflip/utils/number';
import assert from 'assert';
import BigNumber from 'bignumber.js';
import { randomUUID } from 'crypto';
import { Subject, Subscription } from 'rxjs';
import { Server, Socket } from 'socket.io';
import {
  InternalAsset,
  InternalAssetMap,
  UncheckedAssetAndChain,
  assetConstants,
} from '@/shared/enums';
import Leg from './Leg';
import {
  LegJson,
  MarketMakerQuote,
  MarketMakerQuoteRequest,
  marketMakerResponseSchema,
  requestIdObj,
} from './schemas';
import env from '../config/env';
import { getAssetPrice } from '../pricing';
import { handleExit } from '../utils/function';
import baseLogger from '../utils/logger';

const logger = baseLogger.child({ module: 'quoter' });

type Quote = { marketMaker: string; quote: MarketMakerQuote; beta: boolean };

type BetaQuote = MarketMakerQuote & { beta: boolean };

type LegFormatter = (legs: MarketMakerQuote['legs']) => MarketMakerQuote['legs'];

const padFirstLeg: LegFormatter = ([leg]) => [[], leg];
const padSecondLeg: LegFormatter = ([leg]) => [leg, []];
const singleOrBothLegs: LegFormatter = (legs) => legs;

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

export type RpcLimitOrder = {
  LimitOrder: {
    base_asset: UncheckedAssetAndChain;
    quote_asset: UncheckedAssetAndChain;
    side: 'buy' | 'sell';
    tick: number;
    sell_amount: `0x${string}`;
  };
};

const formatLimitOrders = (
  quotes: { orders: MarketMakerQuote['legs'][number] }[],
  leg?: MarketMakerQuoteRequest<LegJson>['legs'][number],
): RpcLimitOrder[] => {
  if (!leg) return [];

  return quotes.flatMap(({ orders }) =>
    orders.map(([tick, amount]) => ({
      LimitOrder: {
        side: leg.side === 'BUY' ? 'sell' : 'buy',
        base_asset: leg.base_asset,
        quote_asset: leg.quote_asset,
        tick,
        sell_amount: hexEncodeNumber(amount),
      },
    })),
  );
};

type ClientVersion = '2';
export type SocketData = {
  marketMaker: string;
  quotedAssets: InternalAssetMap<boolean>;
  clientVersion: ClientVersion;
  beta: boolean;
};
export type ReceivedEventMap = { quote_response: (message: unknown) => void };
export type SentEventMap = {
  quote_request: (message: MarketMakerQuoteRequest<LegJson>) => void;
  quote_error: (message: { error: string; request_id: string }) => void;
};
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type QuotingServer = Server<ReceivedEventMap, SentEventMap, any, SocketData>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type QuotingSocket = Socket<ReceivedEventMap, SentEventMap, any, SocketData>;

export default class Quoter {
  private readonly quotes$ = new Subject<Quote>();

  private readonly inflightRequests = new Set<string>();

  constructor(
    private readonly io: QuotingServer,
    private createId: () => string = randomUUID,
  ) {
    io.on('connection', (socket) => {
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

          let error;
          let requestId = 'unknown';
          try {
            error = JSON.parse(result.error.message)[0].message;
            const requestIdResult = requestIdObj.safeParse(message);
            if (requestIdResult.success) requestId = requestIdResult.data.request_id;
          } catch {
            error = result.error.message;
          }
          socket.emit('quote_error', { error, request_id: requestId });

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

        this.quotes$.next({
          marketMaker: socket.data.marketMaker,
          beta: socket.data.beta,
          quote: result.data,
        });
      });
    });
  }

  private async collectMakerQuotes(
    request: MarketMakerQuoteRequest<Leg>,
  ): Promise<[string, BetaQuote][]> {
    const connectedClients = this.io.sockets.sockets.size;
    if (connectedClients === 0) return [];

    this.inflightRequests.add(request.request_id);

    let expectedResponses = 0;

    const quotedLegsMap = new Map<string, { format: LegFormatter }>();

    for (const socket of await this.io.fetchSockets()) {
      let message: MarketMakerQuoteRequest<LegJson>;

      const [first, second] = request.legs;
      const { quotedAssets, marketMaker } = socket.data;
      const quotesFirstLeg = quotedAssets[first.getBaseAsset()];
      const quotesEntireSwap = quotesFirstLeg && (!second || quotedAssets[second.getBaseAsset()]);

      if (quotesEntireSwap) {
        message = {
          ...request,
          legs: request.legs.map((leg) => leg.toJSON()) as [LegJson] | [LegJson, LegJson],
        };
        quotedLegsMap.set(marketMaker, { format: singleOrBothLegs });
      } else if (quotesFirstLeg) {
        message = { ...request, legs: [first.toJSON()] };
        quotedLegsMap.set(marketMaker, { format: padSecondLeg });
      } else if (second && quotedAssets[second.getBaseAsset()]) {
        message = { ...request, legs: [second.toJSON()] };
        quotedLegsMap.set(marketMaker, { format: padFirstLeg });
      } else {
        // eslint-disable-next-line no-continue
        continue;
      }

      expectedResponses += 1;
      socket.emit('quote_request', message);
    }

    if (expectedResponses === 0) return [];

    const clientsReceivedQuotes = new Map<string, BetaQuote>();

    return new Promise((resolve) => {
      let sub: Subscription;

      let timer: ReturnType<typeof setTimeout>;

      const complete = () => {
        resolve(clientsReceivedQuotes.entries().toArray());
        sub.unsubscribe();
        clearTimeout(timer);
        this.inflightRequests.delete(request.request_id);
      };

      sub = this.quotes$.subscribe(({ marketMaker, quote, beta }) => {
        const { format } = quotedLegsMap.get(marketMaker) ?? {};
        if (quote.request_id !== request.request_id) return;
        if (format) {
          clientsReceivedQuotes.set(marketMaker, { ...quote, beta, legs: format(quote.legs) });
        } else {
          logger.error('unexpected missing format function');
          expectedResponses -= 1;
        }
        if (clientsReceivedQuotes.size === expectedResponses) complete();
      });

      timer = setTimeout(complete, env.QUOTE_TIMEOUT);
    });
  }

  async getLimitOrders(srcAsset: InternalAsset, destAsset: InternalAsset, swapInputAmount: bigint) {
    let legs;
    const start = performance.now();

    if (srcAsset === 'Usdc' || destAsset === 'Usdc') {
      legs = [Leg.of(srcAsset, destAsset, swapInputAmount)] as const;
    } else {
      const intermediateAmount = await approximateIntermediateOutput(
        srcAsset,
        swapInputAmount.toString(),
      );
      assert(intermediateAmount !== null, 'failed to approximate intermediate output');
      legs = [
        Leg.of(srcAsset, 'Usdc', swapInputAmount),
        Leg.of('Usdc', destAsset, intermediateAmount),
      ] as const;
    }

    const request: MarketMakerQuoteRequest<Leg> = { request_id: this.createId(), legs };

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
        quotes.filter(([, q]) => !q.beta).map(([, quote]) => ({ orders: quote.legs[0] })),
        legs[0].toJSON(),
      ),
      ...formatLimitOrders(
        quotes.filter(([, q]) => !q.beta).map(([, quote]) => ({ orders: quote.legs[1] ?? [] })),
        legs[1]?.toJSON(),
      ),
    ];

    logger.info('received limit orders from market makers', {
      quotes,
      orders,
      srcAsset,
      destAsset,
      swapInputAmount: swapInputAmount.toString(),
      requestId: request.request_id,
      duration: performance.now() - start,
    });

    return orders;
  }
}

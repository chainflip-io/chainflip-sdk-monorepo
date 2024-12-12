import { hexEncodeNumber } from '@chainflip/utils/number';
import { HexString } from '@chainflip/utils/types';
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
  getInternalAsset,
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
import { assertUnreachable, handleExit } from '../utils/function';
import baseLogger from '../utils/logger';

const logger = baseLogger.child({ module: 'quoter' });

type Quote = { accountId: string; quote: MarketMakerQuote };

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

export const formatAmount = (
  tick: number,
  amount: bigint,
  baseAsset: InternalAsset,
  side: 'BUY' | 'SELL',
  clientVersion: ClientVersion,
): HexString => {
  switch (clientVersion) {
    case '1': {
      const price = 1.0001 ** tick; // quote/base
      const op = side === 'BUY' ? 'div' : 'times';
      const sellAmount = new BigNumber(amount.toString())[op](price);
      // .shiftedBy(assetConstants[baseAsset].decimals - assetConstants.Usdc.decimals);
      return `0x${sellAmount.decimalPlaces(0).toString(16)}`;
    }
    case '2':
      return hexEncodeNumber(amount);
    default:
      return assertUnreachable(clientVersion);
  }
};

const formatLimitOrders = (
  quotes: { orders: MarketMakerQuote['legs'][number]; clientVersion: ClientVersion }[],
  leg?: MarketMakerQuoteRequest<LegJson>['legs'][number],
): RpcLimitOrder[] => {
  if (!leg) return [];

  return quotes.flatMap(({ orders, clientVersion }) =>
    orders.map(([tick, amount]) => ({
      LimitOrder: {
        side: leg.side === 'BUY' ? 'sell' : 'buy',
        base_asset: leg.base_asset,
        quote_asset: leg.quote_asset,
        tick,
        sell_amount: formatAmount(
          tick,
          amount,
          getInternalAsset(leg.base_asset),
          leg.side,
          clientVersion,
        ),
      },
    })),
  );
};

type ClientVersion = '1' | '2';
export type SocketData = {
  accountId: string;
  quotedAssets: InternalAssetMap<boolean>;
  clientVersion: ClientVersion;
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

  private connectedAccounts = new Set<string>();

  constructor(
    private readonly io: QuotingServer,
    private createId: () => string = randomUUID,
  ) {
    io.on('connection', (socket) => {
      logger.info('market maker connected', { accountId: socket.data.accountId });

      if (this.connectedAccounts.has(socket.data.accountId)) {
        logger.warn('duplicate market maker connection', { accountId: socket.data.accountId });
        socket.disconnect(true);
        return;
      }

      this.connectedAccounts.add(socket.data.accountId);

      const cleanup = handleExit(() => {
        socket.disconnect(true);
      });

      socket.on('disconnect', () => {
        this.connectedAccounts.delete(socket.data.accountId);
        logger.info('market maker disconnected', { accountId: socket.data.accountId });
        cleanup();
      });

      socket.on('quote_response', (message) => {
        const result = marketMakerResponseSchema.safeParse(message);

        if (!result.success) {
          logger.warn('received invalid quote response', {
            quoteResponse: message,
            reason: result.error,
            accountId: socket.data.accountId,
          });

          if (socket.data.clientVersion === '2') {
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
          }

          return;
        }

        if (!this.inflightRequests.has(result.data.request_id)) {
          logger.warn('received quote for unknown request', {
            legs: result.data.legs,
            requestId: result.data.request_id,
            accountId: socket.data.accountId,
          });
          return;
        }

        this.quotes$.next({ accountId: socket.data.accountId, quote: result.data });
      });
    });
  }

  private async collectMakerQuotes(
    request: MarketMakerQuoteRequest<Leg>,
  ): Promise<[string, MarketMakerQuote & { clientVersion: ClientVersion }][]> {
    const connectedClients = this.io.sockets.sockets.size;
    if (connectedClients === 0) return [];

    this.inflightRequests.add(request.request_id);

    let expectedResponses = 0;

    const quotedLegsMap = new Map<string, { format: LegFormatter; clientVersion: ClientVersion }>();

    for (const socket of await this.io.fetchSockets()) {
      let message: MarketMakerQuoteRequest<LegJson>;

      const [first, second] = request.legs;
      const { quotedAssets, accountId, clientVersion } = socket.data;
      const quotesFirstLeg = quotedAssets[first.getBaseAsset()];
      const quotesEntireSwap = quotesFirstLeg && (!second || quotedAssets[second.getBaseAsset()]);

      if (quotesEntireSwap) {
        message = {
          ...request,
          legs: request.legs.map((leg) => leg.toJSON()) as [LegJson] | [LegJson, LegJson],
        };
        quotedLegsMap.set(accountId, { format: singleOrBothLegs, clientVersion });
      } else if (quotesFirstLeg) {
        message = { ...request, legs: [first.toJSON()] };
        quotedLegsMap.set(accountId, { format: padSecondLeg, clientVersion });
      } else if (second && quotedAssets[second.getBaseAsset()]) {
        message = { ...request, legs: [second.toJSON()] };
        quotedLegsMap.set(accountId, { format: padFirstLeg, clientVersion });
      } else {
        // eslint-disable-next-line no-continue
        continue;
      }

      expectedResponses += 1;
      socket.emit('quote_request', message);
    }

    if (expectedResponses === 0) return [];

    const clientsReceivedQuotes = new Map<
      string,
      MarketMakerQuote & { clientVersion: ClientVersion }
    >();

    return new Promise((resolve) => {
      let sub: Subscription;

      let timer: ReturnType<typeof setTimeout>;

      const complete = () => {
        resolve(clientsReceivedQuotes.entries().toArray());
        sub.unsubscribe();
        clearTimeout(timer);
        this.inflightRequests.delete(request.request_id);
      };

      sub = this.quotes$.subscribe(({ accountId, quote }) => {
        const { format, clientVersion } = quotedLegsMap.get(accountId) ?? {};
        if (quote.request_id !== request.request_id) return;
        if (format && clientVersion) {
          clientsReceivedQuotes.set(accountId, {
            ...quote,
            legs: format(quote.legs),
            clientVersion,
          });
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
        quotes.map(([, quote]) => ({
          orders: quote.legs[0],
          clientVersion: quote.clientVersion,
        })),
        legs[0].toJSON(),
      ),
      ...formatLimitOrders(
        quotes.map(([, quote]) => ({
          orders: quote.legs[1] ?? [],
          clientVersion: quote.clientVersion,
        })),
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

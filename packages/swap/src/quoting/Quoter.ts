import {
  AssetAndChain,
  assetConstants,
  ChainflipAsset,
  getInternalAsset,
  InternalAssetMap,
} from '@chainflip/utils/chainflip';
import { hexEncodeNumber } from '@chainflip/utils/number';
import assert from 'assert';
import BigNumber from 'bignumber.js';
import { randomUUID } from 'crypto';
import { Subject, Subscription } from 'rxjs';
import { Server, Socket } from 'socket.io';
import { createInternalAssetMap } from '@/shared/dataStructures.js';
import { isStableCoin } from '@/shared/guards.js';
import BalanceTracker from './BalanceTracker.js';
import Leg from './Leg.js';
import {
  LegJson,
  MarketMakerQuote,
  MarketMakerQuoteRequest,
  marketMakerResponseSchema,
  requestIdObj,
} from './schemas.js';
import env from '../config/env.js';
import { getAssetPrice } from '../pricing/index.js';
import { Brand } from '../utils/brands.js';
import { handleExit } from '../utils/function.js';
import baseLogger from '../utils/logger.js';

const logger = baseLogger.child({ module: 'quoter' });

type Quote = { marketMaker: AccountId; quote: MarketMakerQuote | null; beta: boolean };

type BetaQuote = MarketMakerQuote & { beta: boolean };

type LegFormatter = (legs: MarketMakerQuote['legs']) => MarketMakerQuote['legs'];

const padFirstLeg: LegFormatter = ([leg]) => [[], leg];
const padSecondLeg: LegFormatter = ([leg]) => [leg, []];
const singleOrBothLegs: LegFormatter = (legs) => legs;

export const approximateIntermediateOutput = async (asset: ChainflipAsset, amount: string) => {
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
    base_asset: AssetAndChain;
    quote_asset: AssetAndChain;
    side: 'buy' | 'sell';
    tick: number;
    sell_amount: `0x${string}`;
  };
};

const isBalanceWithinTolerance = (balance: bigint, amount: bigint) => {
  const tolerance = BigInt(env.QUOTER_BALANCE_TOLERANCE_PERCENT);
  let paddedBalance = balance;
  if (tolerance > 0n) paddedBalance += (balance * tolerance) / 100n;
  return paddedBalance >= amount;
};

type ClientVersion = '2';
export type AccountId = Brand<string, 'AccountId'>;
export type SocketData = {
  marketMaker: AccountId;
  quotedAssets: InternalAssetMap<boolean>;
  clientVersion: ClientVersion;
  beta: boolean;
  mevFactors: {
    buy: InternalAssetMap<number>;
    sell: InternalAssetMap<number>;
  };
  replenishmentFactors: Partial<InternalAssetMap<number>>;
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

  private balanceTracker = new BalanceTracker(env.QUOTER_BALANCE_TRACKER_ACTIVE);

  private accountIdToSocket = new Map<AccountId, QuotingSocket>();

  private replenishmentFactors = createInternalAssetMap([1n, 1n] as [bigint, bigint]);

  constructor(
    private readonly io: QuotingServer,
    private createId: () => string = randomUUID,
  ) {
    io.on('connection', (socket) => {
      if (this.accountIdToSocket.has(socket.data.marketMaker)) {
        logger.warn('market maker already connected', { marketMaker: socket.data.marketMaker });
        socket.disconnect();
        return;
      }

      logger.info('market maker connected', { marketMaker: socket.data.marketMaker });
      this.balanceTracker.add(socket.data.marketMaker);
      this.accountIdToSocket.set(socket.data.marketMaker, socket);
      this.updateReplenishmentFactors();

      const cleanup = handleExit(() => {
        socket.disconnect();
      });

      socket.on('disconnect', () => {
        logger.info('market maker disconnected', { marketMaker: socket.data.marketMaker });
        this.balanceTracker.remove(socket.data.marketMaker);
        this.accountIdToSocket.delete(socket.data.marketMaker);
        this.updateReplenishmentFactors();
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
        }

        if (result.success && !this.inflightRequests.has(result.data.request_id)) {
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
          quote: result.data ?? null,
        });
      });
    });
  }

  private async collectMakerQuotes(
    request: MarketMakerQuoteRequest<Leg>,
  ): Promise<[AccountId, BetaQuote][]> {
    const connectedClients = this.io.sockets.sockets.size;
    if (connectedClients === 0) return [];

    this.inflightRequests.add(request.request_id);

    let expectedResponses = 0;

    const quotedLegsMap = new Map<AccountId, { format: LegFormatter }>();

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

    const clientsReceivedQuotes = new Map<AccountId, BetaQuote>();

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
        if (!quote) {
          expectedResponses -= 1;
          return;
        }
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

  private formatLimitOrders(
    quotes: [AccountId, BetaQuote][],
    legs: readonly [Leg] | readonly [Leg, Leg],
    balances: Map<AccountId, InternalAssetMap<bigint>>,
    requestId: string,
    isStableCoinSwap: boolean,
  ): RpcLimitOrder[] {
    const orders: RpcLimitOrder[] = [];

    for (let legIndex = 0; legIndex < legs.length; legIndex += 1) {
      const leg = legs[legIndex].toJSON();

      const sellAsset = getInternalAsset(
        leg.side === 'BUY' ? leg.base_asset : leg.quote_asset,
      ) as ChainflipAsset;
      const baseAsset = getInternalAsset(leg.base_asset) as ChainflipAsset;
      const side = leg.side === 'BUY' ? 'sell' : 'buy';

      for (const [accountId, quote] of quotes) {
        // eslint-disable-next-line no-continue
        if (quote.beta) continue;
        const balance = balances.get(accountId)?.[sellAsset];
        const mevFactor =
          (isStableCoinSwap ? 0 : 1) *
          (this.accountIdToSocket.get(accountId)?.data.mevFactors[side][baseAsset] ?? 0);

        for (const [tick, amount] of quote.legs[legIndex] ?? []) {
          if (balance === undefined || isBalanceWithinTolerance(balance, amount)) {
            orders.push({
              LimitOrder: {
                side,
                base_asset: leg.base_asset,
                quote_asset: leg.quote_asset,
                tick: tick + mevFactor,
                sell_amount: hexEncodeNumber(amount),
              },
            });
          } else {
            logger.warn('insufficient balance', {
              accountId,
              balance: balance.toString(),
              amount: amount.toString(),
              requestId,
            });
            this.accountIdToSocket.get(accountId)?.emit('quote_error', {
              error: 'insufficient balance',
              request_id: requestId,
            });
          }
        }
      }
    }

    return orders;
  }

  async getLimitOrders(
    srcAsset: ChainflipAsset,
    destAsset: ChainflipAsset,
    swapInputAmount: bigint,
  ) {
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

    const [quotes, balances] = await Promise.all([
      this.collectMakerQuotes(request),
      this.balanceTracker.getBalances(),
    ]);

    const orders = this.formatLimitOrders(
      quotes,
      legs,
      balances,
      request.request_id,
      isStableCoin(srcAsset) && isStableCoin(destAsset),
    );

    logger.info('received limit orders from market makers', {
      quotes,
      srcAsset,
      destAsset,
      swapInputAmount: swapInputAmount.toString(),
      quoterRequestId: request.request_id,
      duration: performance.now() - start,
    });

    return orders;
  }

  private updateReplenishmentFactors() {
    this.replenishmentFactors = createInternalAssetMap((asset) => {
      const factor = this.accountIdToSocket
        .values()
        .reduce(
          (acc, socket) => acc.plus(socket.data.replenishmentFactors[asset] ?? 0),
          new BigNumber(0),
        );
      const [num, denom] = BigNumber.max(factor, 1).toFraction();
      return [BigInt(num.toNumber()), BigInt(denom.toNumber())];
    });
  }

  getReplenishmentFactor(sellAsset: ChainflipAsset): [bigint, bigint] {
    return this.replenishmentFactors[sellAsset];
  }
}

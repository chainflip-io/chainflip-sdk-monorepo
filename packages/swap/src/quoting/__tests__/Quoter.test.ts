/* eslint-disable dot-notation */
import {
  assetConstants,
  internalAssetToRpcAsset,
  InternalAssetMap,
  chainflipAssets,
  ChainflipAsset,
} from '@chainflip/utils/chainflip';
import BigNumber from 'bignumber.js';
import * as crypto from 'crypto';
import { Server } from 'socket.io';
import { io, Socket } from 'socket.io-client';
import { setTimeout as sleep } from 'timers/promises';
import { promisify } from 'util';
import { vi, describe, it, beforeEach, afterEach, expect } from 'vitest';
import { AddressInfo } from 'ws';
import { MAX_TICK, MIN_TICK } from '@/shared/consts.js';
import prisma, { InternalAsset } from '../../client.js';
import env from '../../config/env.js';
import { getLpBalances } from '../../utils/rpc.js';
import authenticate from '../authenticate.js';
import Quoter, { approximateIntermediateOutput, type RpcLimitOrder } from '../Quoter.js';
import { LegJson, MarketMakerQuoteRequest, MarketMakerRawQuote } from '../schemas.js';

vi.mock('../../utils/rpc', () => ({ getLpBalances: vi.fn().mockResolvedValue([]) }));

const generateKeyPairAsync = promisify(crypto.generateKeyPair);

const serializeBigInt = (k: string, v: unknown) => (typeof v === 'bigint' ? v.toString() : v);

vi.mock('../../utils/statechain', () => ({
  getSwapRate: vi.fn((args) =>
    Promise.reject(new Error(`unhandled getSwapRate(${JSON.stringify(args, serializeBigInt)})`)),
  ),
}));

function toAtomicUnits(amount: number, asset: ChainflipAsset, output?: 'string'): string;
function toAtomicUnits(amount: number, asset: ChainflipAsset, output: 'bigint'): bigint;
function toAtomicUnits(amount: number, asset: ChainflipAsset, output: string | bigint = 'string') {
  const amt = new BigNumber(amount).shiftedBy(assetConstants[asset].decimals).toFixed(0);

  return output === 'string' ? amt : BigInt(amt);
}

describe(Quoter, () => {
  let oldEnv: typeof env;
  let quoter: Quoter;
  let connectClient: (opts: {
    name: string;
    quotedAssets: ChainflipAsset[];
    beta?: boolean;
    mevFactors?: {
      buy?: Partial<InternalAssetMap<number>>;
      sell?: Partial<InternalAssetMap<number>>;
    };
    replenishmentFactors?: Partial<InternalAssetMap<number>>;
  }) => Promise<{
    sendQuote: (
      quote: MarketMakerRawQuote,
      srcAsset?: ChainflipAsset,
      destAsset?: ChainflipAsset,
    ) => RpcLimitOrder[];
    socket: Socket;
    requestCount: number;
    waitForRequest: () => Promise<MarketMakerQuoteRequest<LegJson>>;
    waitForError: () => Promise<any>;
  }>;
  let server: Server;
  const sockets: Socket[] = [];

  beforeEach(async () => {
    await prisma.$queryRaw`TRUNCATE TABLE private."MarketMaker" CASCADE`;
    oldEnv = { ...env };
    server = new Server().use(authenticate).listen(0);
    quoter = new Quoter(server);

    const cachedKeys = new Map<string, crypto.KeyObject>();

    connectClient = async ({ name, quotedAssets, beta, mevFactors, replenishmentFactors }) => {
      let privateKey = cachedKeys.get(name);
      if (!privateKey) {
        const keys = await generateKeyPairAsync('ed25519');
        privateKey = keys.privateKey;
        cachedKeys.set(name, privateKey);
        await prisma.marketMaker.create({
          data: {
            name,
            beta,
            publicKey: keys.publicKey.export({ format: 'pem', type: 'spki' }).toString(),
            factors: {
              createMany: {
                data: [
                  ...Object.keys(mevFactors ?? {}).flatMap((side) =>
                    Object.keys(mevFactors![side as keyof typeof mevFactors]).map((asset) => ({
                      side: side.toUpperCase() as 'BUY' | 'SELL',
                      asset: asset as InternalAsset,
                      factor: mevFactors![side as keyof typeof mevFactors]![asset] as number,
                      type: 'MEV' as const,
                    })),
                  ),
                  ...Object.keys(replenishmentFactors ?? {}).map((asset) => ({
                    asset: asset as InternalAsset,
                    factor: replenishmentFactors![asset as ChainflipAsset] as number,
                    type: 'REPLENISHMENT' as const,
                  })),
                ],
              },
            },
          },
        });
      }

      const { port } = server['httpServer'].address() as AddressInfo;
      const timestamp = Date.now();

      const socket = io(`http://localhost:${port}`, {
        auth: {
          client_version: '2',
          account_id: name,
          timestamp,
          signature: crypto
            .sign(null, Buffer.from(`${name}${timestamp}`, 'utf8'), privateKey)
            .toString('base64'),
          quoted_assets: quotedAssets?.map((a) => internalAssetToRpcAsset[a]),
        },
      });

      await new Promise<void>((resolve, reject) => {
        sleep(500).then(() => reject(new Error('socket did not connect')));
        socket.on('connect', resolve);
      });

      sockets.push(socket);

      let requestCount = 0;
      let onRequest = (_id: MarketMakerQuoteRequest<LegJson>) => {
        // noop
      };

      socket.on('quote_request', (quoteRequest) => {
        requestCount += 1;
        onRequest(quoteRequest);
      });

      let onError = (_msg: string) => {
        // noop
      };

      socket.on('quote_error', (msg) => {
        onError(msg);
      });

      return {
        socket,
        sendQuote(quote, srcAsset = 'Btc', destAsset = 'Usdc'): RpcLimitOrder[] {
          socket.emit('quote_response', quote);

          return quote.legs.flatMap((leg, i) =>
            leg.map(([tick, amount]) => {
              let baseAsset;
              let side;

              if (srcAsset === 'Usdc') {
                baseAsset = destAsset;
                side = 'sell';
              } else if (destAsset === 'Usdc') {
                baseAsset = srcAsset;
                side = 'buy';
              } else if (i === 0) {
                baseAsset = srcAsset;
                side = 'buy';
              } else if (i === 1) {
                baseAsset = destAsset;
                side = 'sell';
              } else {
                throw new Error('unexpected leg index');
              }

              return {
                LimitOrder: {
                  base_asset: internalAssetToRpcAsset[baseAsset],
                  quote_asset: { asset: 'USDC', chain: 'Ethereum' },
                  side,
                  sell_amount: `0x${BigInt(amount).toString(16)}`,
                  tick,
                },
              } as RpcLimitOrder;
            }),
          );
        },
        get requestCount() {
          return requestCount;
        },
        waitForRequest() {
          const { resolve, promise } = Promise.withResolvers<MarketMakerQuoteRequest<LegJson>>();
          onRequest = resolve;
          return promise;
        },
        waitForError() {
          const { resolve, promise } = Promise.withResolvers<any>();
          onError = resolve;
          return promise;
        },
      };
    };
  });

  afterEach(async () => {
    Object.assign(env, oldEnv);
    await Promise.all(
      sockets.splice(0).map(
        (socket) =>
          new Promise<unknown>((resolve) => {
            if (socket.disconnected) {
              resolve(null);
            } else {
              socket.on('disconnect', resolve);
              socket.disconnect();
            }
          }),
      ),
    );
    await server.close();
  });

  describe('constructor', () => {
    it('ignores malformed quote responses', () => {
      const fakeServer = { on: vi.fn() };

      const mockQuoter = new Quoter(fakeServer as unknown as Server);
      mockQuoter['inflightRequests'].add('string');

      expect(fakeServer.on).toHaveBeenCalledWith('connection', expect.any(Function));

      const handler = fakeServer.on.mock.calls[0][1];

      const emit = vi.fn();
      const socket = {
        on: vi.fn(),
        data: { marketMaker: 'MM', replenishmentFactors: {} },
        disconnect: vi.fn(),
        emit,
      };
      const next = vi.fn();
      mockQuoter['quotes$'].subscribe(next);

      handler(socket as any);

      const callback = socket.on.mock.calls[1][1];

      callback({ request_id: 'string', legs: [[[-1, '123456']]] });
      callback({ request_id: 'string', range_orders: [] });

      expect(next).toHaveBeenCalledTimes(2);
      expect(emit.mock.calls).toMatchInlineSnapshot(`
        [
          [
            "quote_error",
            {
              "error": "Invalid input",
              "request_id": "string",
            },
          ],
        ]
      `);
    });
  });

  describe(Quoter.prototype.getLimitOrders, () => {
    const ONE_BTC = toAtomicUnits(1, 'Btc', 'bigint');

    it('returns an empty array if expectedQuotes is 0', async () => {
      expect(await quoter.getLimitOrders('Btc', 'Usdc', ONE_BTC)).toEqual([]);
    });

    it('returns an empty array if no quotes are received', async () => {
      env.QUOTE_TIMEOUT = 10;
      await connectClient({ name: 'marketMaker', quotedAssets: ['Btc'] });

      const orders = await quoter.getLimitOrders('Btc', 'Usdc', ONE_BTC);
      expect(orders).toEqual([]);
    });

    it('returns an array of quotes if expectedQuotes is received', async () => {
      env.QUOTE_TIMEOUT = 10_000;
      const { sendQuote, waitForRequest } = await connectClient({
        name: 'marketMaker',
        quotedAssets: ['Btc'],
      });
      const limitOrders = quoter.getLimitOrders('Btc', 'Usdc', ONE_BTC);
      const request = await waitForRequest();
      const quote = sendQuote({ ...request, legs: [[[0, '100']]] });
      expect(await limitOrders).toEqual(quote);
    });

    it('accepts the most recent quote from each market maker', async () => {
      env.QUOTE_TIMEOUT = 10;
      const { sendQuote, waitForRequest } = await connectClient({
        name: 'marketMaker',
        quotedAssets: ['Btc'],
      });
      await connectClient({ name: 'marketMaker2', quotedAssets: ['Btc'] });
      const limitOrders = quoter.getLimitOrders('Btc', 'Usdc', ONE_BTC);
      const request = await waitForRequest();
      sendQuote({ ...request, legs: [[[0, '100']]] });
      const quote = sendQuote({ ...request, legs: [[[0, '200']]] });
      expect(await limitOrders).toEqual(quote);
    });

    it.each([10, 50, 100])('can be configured with QUOTE_TIMEOUT', async (timeout) => {
      env.QUOTE_TIMEOUT = timeout;
      const { sendQuote, waitForRequest } = await connectClient({
        name: 'marketMaker',
        quotedAssets: ['Btc'],
      });
      const limitOrders = quoter.getLimitOrders('Btc', 'Usdc', ONE_BTC);
      const request = await waitForRequest();
      await sleep(timeout + 1);
      sendQuote({ ...request, legs: [[[0, '100']]] });
      expect(await limitOrders).toEqual([]);
    });

    it('eagerly returns after all expected quotes are received', async () => {
      env.QUOTE_TIMEOUT = 10_000;
      const mm1 = await connectClient({ name: 'marketMaker', quotedAssets: ['Btc'] });
      const mm2 = await connectClient({ name: 'marketMaker2', quotedAssets: ['Btc'] });
      const limitOrders = quoter.getLimitOrders('Btc', 'Usdc', ONE_BTC);
      const request = await mm1.waitForRequest();
      const quote1 = mm1.sendQuote({ ...request, legs: [[[0, '100']]] });
      const quote2 = mm2.sendQuote({ ...request, legs: [[[0, '200']]] });
      // no need to advance timers because setTimeout is cleared
      expect(
        (await limitOrders).sort((a, b) =>
          a.LimitOrder.sell_amount.localeCompare(b.LimitOrder.sell_amount),
        ),
      ).toEqual([...quote1, ...quote2]);
    });

    it("respects the market makers's quoted assets", async () => {
      env.QUOTE_TIMEOUT = 10_000;
      const mm = await connectClient({ name: 'marketMaker', quotedAssets: ['Flip'] });
      const limitOrders = quoter.getLimitOrders('Btc', 'Usdc', ONE_BTC);
      expect(await limitOrders).toEqual([]);
      expect(mm.requestCount).toBe(0);
    });

    it('filters beta quotes', async () => {
      env.QUOTE_TIMEOUT = 10_000;
      const mm = await connectClient({ name: 'marketMaker', quotedAssets: ['Sol'], beta: true });
      const limitOrders = quoter.getLimitOrders('Sol', 'Flip', ONE_BTC);
      const request = await mm.waitForRequest();
      mm.sendQuote({ ...request, legs: [[[0, '100']]] }, 'Sol', 'Usdc');
      expect(await limitOrders).toEqual([]);
      expect(mm.requestCount).toBe(1);
      expect(request).toMatchSnapshot({ request_id: expect.any(String) });
    });

    it('can quote the first leg only', async () => {
      env.QUOTE_TIMEOUT = 10_000;
      const mm = await connectClient({ name: 'marketMaker', quotedAssets: ['Sol'] });
      const limitOrders = quoter.getLimitOrders('Sol', 'Flip', ONE_BTC);
      const request = await mm.waitForRequest();
      const quote = mm.sendQuote({ ...request, legs: [[[0, '100']]] }, 'Sol', 'Usdc');
      expect(await limitOrders).toEqual(quote);
      expect(mm.requestCount).toBe(1);
      expect(request).toMatchSnapshot({ request_id: expect.any(String) });
    });

    it('can quote the second leg only', async () => {
      env.QUOTE_TIMEOUT = 10_000;
      const mm = await connectClient({ name: 'marketMaker', quotedAssets: ['Flip'] });
      const limitOrders = quoter.getLimitOrders('Btc', 'Flip', ONE_BTC);
      const request = await mm.waitForRequest();
      const quote = mm.sendQuote({ ...request, legs: [[[0, '100']]] }, 'Usdc', 'Flip');
      expect(await limitOrders).toEqual(quote);
      expect(mm.requestCount).toBe(1);
    });

    it('can quote both legs', async () => {
      env.QUOTE_TIMEOUT = 10_000;
      const mm = await connectClient({ name: 'marketMaker', quotedAssets: ['Sol', 'Flip'] });
      const limitOrders = quoter.getLimitOrders('Sol', 'Flip', ONE_BTC);
      const request = await mm.waitForRequest();
      const quote = mm.sendQuote({ ...request, legs: [[[0, '100']], [[1, '200']]] }, 'Sol', 'Flip');
      expect(await limitOrders).toEqual(quote);
      expect(mm.requestCount).toBe(1);
      expect(request).toMatchSnapshot({ request_id: expect.any(String) });
    });

    it('can mix and match', async () => {
      env.QUOTE_TIMEOUT = 10_000;
      const mm1 = await connectClient({ name: 'marketMaker', quotedAssets: ['Sol'] });
      const mm2 = await connectClient({ name: 'marketMaker2', quotedAssets: ['Flip'] });
      const limitOrders = quoter.getLimitOrders('Sol', 'Flip', ONE_BTC);
      const [request1, request2] = await Promise.all([mm1.waitForRequest(), mm2.waitForRequest()]);
      const quote1 = mm1.sendQuote({ ...request1, legs: [[[0, '100']]] }, 'Sol');
      const quote2 = mm2.sendQuote({ ...request2, legs: [[[1, '200']]] }, 'Usdc', 'Flip');
      expect(await limitOrders).toEqual([...quote1, ...quote2]);
      expect(mm1.requestCount).toBe(1);
      expect(mm2.requestCount).toBe(1);
      expect(request1).toMatchSnapshot({ request_id: expect.any(String) }, 'solana');
      expect(request2).toMatchSnapshot({ request_id: expect.any(String) }, 'flip');
    });

    it('rejects quotes with 0 sell amount', async () => {
      const mm1 = await connectClient({ name: 'marketMaker', quotedAssets: ['Btc'] });
      const mm2 = await connectClient({ name: 'marketMaker2', quotedAssets: ['Btc'] });
      const limitOrders = quoter.getLimitOrders('Btc', 'Usdc', ONE_BTC);
      const [request1, request2] = await Promise.all([mm1.waitForRequest(), mm2.waitForRequest()]);
      mm1.sendQuote({ ...request1, legs: [[[0, '0']]] });
      const quote = mm2.sendQuote({ ...request2, legs: [[[0, '110']]] });
      expect(await limitOrders).toEqual(quote);
      expect(await mm1.waitForError()).toEqual({
        error: 'sell amount must be positive',
        request_id: request1.request_id,
      });
    });

    it('rejects quotes with too low ticks', async () => {
      const mm1 = await connectClient({ name: 'marketMaker', quotedAssets: ['Btc'] });
      const mm2 = await connectClient({ name: 'marketMaker2', quotedAssets: ['Btc'] });
      const limitOrders = quoter.getLimitOrders('Btc', 'Usdc', ONE_BTC);
      const [request1, request2] = await Promise.all([mm1.waitForRequest(), mm2.waitForRequest()]);
      mm1.sendQuote({ ...request1, legs: [[[MIN_TICK - 1, '100']]] });
      const quote = mm2.sendQuote({ ...request2, legs: [[[0, '200']]] });
      expect(await limitOrders).toEqual(quote);
      expect(await mm1.waitForError()).toEqual({
        error: 'tick provided is too small',
        request_id: request1.request_id,
      });
    });

    it('rejects quotes with too high ticks', async () => {
      const mm1 = await connectClient({ name: 'marketMaker', quotedAssets: ['Btc'] });
      const mm2 = await connectClient({ name: 'marketMaker2', quotedAssets: ['Btc'] });
      const limitOrders = quoter.getLimitOrders('Btc', 'Usdc', ONE_BTC);
      const [request1, request2] = await Promise.all([mm1.waitForRequest(), mm2.waitForRequest()]);
      mm1.sendQuote({ ...request1, legs: [[[MAX_TICK + 1, '100']]] });
      const quote = mm2.sendQuote({ ...request2, legs: [[[0, '200']]] });
      expect(await limitOrders).toEqual(quote);
      expect(await mm1.waitForError()).toEqual({
        error: 'tick provided is too big',
        request_id: request1.request_id,
      });
    });

    it('filters quotes with insufficient balances', async () => {
      env.QUOTER_BALANCE_TOLERANCE_PERCENT = 0;
      vi.mocked(getLpBalances).mockResolvedValue([
        ['marketMaker', { Usdc: 99n } as InternalAssetMap<bigint>],
        ['marketMaker2', { Usdc: 3000n } as InternalAssetMap<bigint>],
        // falsiness test
        ['marketMaker3', { Usdc: 0n } as InternalAssetMap<bigint>],
      ]);
      const mm1 = await connectClient({ name: 'marketMaker', quotedAssets: ['Btc'] });
      const mm2 = await connectClient({ name: 'marketMaker2', quotedAssets: ['Btc'] });
      const mm3 = await connectClient({ name: 'marketMaker3', quotedAssets: ['Btc'] });
      const limitOrders = quoter.getLimitOrders('Btc', 'Usdc', ONE_BTC);
      const [request1, request2] = await Promise.all([
        mm1.waitForRequest(),
        mm2.waitForRequest(),
        mm3.waitForRequest(),
      ]);
      mm1.sendQuote({ ...request1, legs: [[[0, '100']]] });
      const quote = mm2.sendQuote({ ...request2, legs: [[[0, '200']]] });
      mm3.sendQuote({ ...request1, legs: [[[0, '300']]] });
      expect(await limitOrders).toEqual(quote);
    });

    it('allows quotes with insufficient balances that are within the threshold', async () => {
      env.QUOTER_BALANCE_TOLERANCE_PERCENT = 10;
      vi.mocked(getLpBalances).mockResolvedValue([
        ['marketMaker', { Usdc: 99n } as InternalAssetMap<bigint>],
        ['marketMaker2', { Usdc: 3000n } as InternalAssetMap<bigint>],
        // falsiness test
        ['marketMaker3', { Usdc: 0n } as InternalAssetMap<bigint>],
      ]);
      const mm1 = await connectClient({ name: 'marketMaker', quotedAssets: ['Btc'] });
      const mm2 = await connectClient({ name: 'marketMaker2', quotedAssets: ['Btc'] });
      const mm3 = await connectClient({ name: 'marketMaker3', quotedAssets: ['Btc'] });
      const limitOrders = quoter.getLimitOrders('Btc', 'Usdc', ONE_BTC);
      const error = mm3.waitForError();
      const [request1, request2] = await Promise.all([
        mm1.waitForRequest(),
        mm2.waitForRequest(),
        mm3.waitForRequest(),
      ]);
      const quote1 = mm1.sendQuote({ ...request1, legs: [[[0, '100']]] });
      const quote2 = mm2.sendQuote({ ...request2, legs: [[[0, '200']]] });
      mm3.sendQuote({ ...request1, legs: [[[0, '300']]] });
      expect(await limitOrders).toEqual([...quote1, ...quote2]);
      await expect(error).resolves.toEqual({
        error: 'insufficient balance',
        request_id: request1.request_id,
      });
    });

    it('mev factors the ticks', async () => {
      const { sendQuote, waitForRequest } = await connectClient({
        name: 'marketMaker',
        quotedAssets: ['Btc'],
        mevFactors: { buy: { Btc: -5 } },
      });
      const limitOrders = quoter.getLimitOrders('Btc', 'Usdc', ONE_BTC);
      const request = await waitForRequest();
      sendQuote({ ...request, legs: [[[0, '100']]] });
      expect(await limitOrders).toMatchInlineSnapshot(`
        [
          {
            "LimitOrder": {
              "base_asset": {
                "asset": "BTC",
                "chain": "Bitcoin",
              },
              "quote_asset": {
                "asset": "USDC",
                "chain": "Ethereum",
              },
              "sell_amount": "0x64",
              "side": "buy",
              "tick": -5,
            },
          },
        ]
      `);
    });

    it('respects the mev factor side', async () => {
      const { sendQuote, waitForRequest } = await connectClient({
        name: 'marketMaker',
        quotedAssets: ['Btc', 'Flip'],
        mevFactors: { buy: { Btc: -5, Flip: 10 }, sell: { Flip: 3, Btc: 15 } },
      });
      const limitOrders = quoter.getLimitOrders('Btc', 'Flip', ONE_BTC);
      const request = await waitForRequest();
      sendQuote({ ...request, legs: [[[0, '100']], [[2, '2000']]] });
      expect(await limitOrders).toMatchInlineSnapshot(`
        [
          {
            "LimitOrder": {
              "base_asset": {
                "asset": "BTC",
                "chain": "Bitcoin",
              },
              "quote_asset": {
                "asset": "USDC",
                "chain": "Ethereum",
              },
              "sell_amount": "0x64",
              "side": "buy",
              "tick": -5,
            },
          },
          {
            "LimitOrder": {
              "base_asset": {
                "asset": "FLIP",
                "chain": "Ethereum",
              },
              "quote_asset": {
                "asset": "USDC",
                "chain": "Ethereum",
              },
              "sell_amount": "0x7d0",
              "side": "sell",
              "tick": -1,
            },
          },
        ]
      `);
    });

    it('returns the correct replenishment factor', async () => {
      await connectClient({
        name: 'marketMaker',
        quotedAssets: ['Btc'],
        replenishmentFactors: { Btc: 1.5, Flip: 10 },
      });
      expect(quoter.getReplenishmentFactor('Btc')).toStrictEqual([3n, 2n]);
      // ignores non-quoted assets
      chainflipAssets.forEach((asset) => {
        if (asset !== 'Btc') {
          expect(quoter.getReplenishmentFactor(asset)).toStrictEqual([1n, 1n]);
        }
      });
      await connectClient({
        name: 'marketMaker1',
        quotedAssets: ['Btc', 'Flip'],
        replenishmentFactors: { Btc: 2.82, Flip: 10 },
      });
      // 1.5 + 2.82
      expect(quoter.getReplenishmentFactor('Btc')).toStrictEqual([108n, 25n]);
      expect(quoter.getReplenishmentFactor('Flip')).toStrictEqual([10n, 1n]);
      chainflipAssets.forEach((asset) => {
        if (asset !== 'Btc' && asset !== 'Flip') {
          expect(quoter.getReplenishmentFactor(asset)).toStrictEqual([1n, 1n]);
        }
      });
    });

    it('ignores replenishment factors < 0', async () => {
      await connectClient({
        name: 'marketMaker',
        quotedAssets: ['Btc'],
        replenishmentFactors: { Btc: -1 },
      });
      expect(quoter.getReplenishmentFactor('Btc')).toStrictEqual([1n, 1n]);
    });

    it('disconnects duplicate sockets', async () => {
      const mm = await connectClient({ name: 'marketMaker', quotedAssets: ['Btc'] });
      const limitOrders = quoter.getLimitOrders('Btc', 'Usdc', ONE_BTC);
      const request = await mm.waitForRequest();
      const quote = mm.sendQuote({ ...request, legs: [[[0, '100']]] });
      expect(await limitOrders).toEqual(quote);
      const mm2 = await connectClient({ name: 'marketMaker', quotedAssets: ['Btc'] });
      expect(mm2.socket.connected).toBe(true);
      await sleep(10);
      expect(mm2.socket.connected).toBe(false);
      expect(mm.socket.connected).toBe(true);
    });
  });
});

describe('approximateIntermediateOutput', () => {
  it.each([
    ['HubDot', 6.5],
    ['Usdt', 1],
    ['Btc', 65_000],
    ['Flip', 4],
    ['Eth', 2_000],
  ] as const)('correctly approximates the USD value of %s', async (asset, price) => {
    const oneInAtomicUnits = toAtomicUnits(1, asset);

    const actual = await approximateIntermediateOutput(asset, oneInAtomicUnits);

    const expected = toAtomicUnits(price, 'Usdc', 'bigint');

    expect(actual).toEqual(expected);
  });
});

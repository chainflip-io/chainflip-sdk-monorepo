/* eslint-disable dot-notation */
import { deferredPromise } from '@chainflip/utils/async';
import BigNumber from 'bignumber.js';
import * as crypto from 'crypto';
import { Server } from 'socket.io';
import { io, Socket } from 'socket.io-client';
import { setTimeout as sleep } from 'timers/promises';
import { promisify } from 'util';
import { vi, describe, it, beforeEach, afterEach, expect } from 'vitest';
import { AddressInfo } from 'ws';
import { MAX_TICK, MIN_TICK } from '@/shared/consts';
import { assetConstants, getAssetAndChain } from '@/shared/enums';
import env from '@/swap/config/env';
import prisma, { InternalAsset } from '../../client';
import { getAssetPrice } from '../../pricing';
import authenticate from '../authenticate';
import Quoter, { approximateIntermediateOutput, type RpcLimitOrder } from '../Quoter';
import { LegJson, MarketMakerQuoteRequest, MarketMakerRawQuote } from '../schemas';

const generateKeyPairAsync = promisify(crypto.generateKeyPair);

const serializeBigInt = (k: string, v: unknown) => (typeof v === 'bigint' ? v.toString() : v);

vi.mock('../../utils/statechain', () => ({
  getSwapRate: vi.fn((args) =>
    Promise.reject(new Error(`unhandled getSwapRate(${JSON.stringify(args, serializeBigInt)})`)),
  ),
}));

vi.mock('../../pricing');

function toAtomicUnits(amount: number, asset: InternalAsset, output?: 'string'): string;
function toAtomicUnits(amount: number, asset: InternalAsset, output: 'bigint'): bigint;
function toAtomicUnits(amount: number, asset: InternalAsset, output: string | bigint = 'string') {
  const amt = new BigNumber(amount).shiftedBy(assetConstants[asset].decimals).toFixed(0);

  return output === 'string' ? amt : BigInt(amt);
}

describe(Quoter, () => {
  let oldEnv: typeof env;
  let quoter: Quoter;
  let connectClient: (
    name: string,
    quotedAssets: InternalAsset[],
    beta?: boolean,
  ) => Promise<{
    sendQuote: (
      quote: MarketMakerRawQuote,
      srcAsset?: InternalAsset,
      destAsset?: InternalAsset,
    ) => RpcLimitOrder[];
    socket: Socket;
    requestCount: number;
    waitForRequest: () => Promise<MarketMakerQuoteRequest<LegJson>>;
    errors: string[];
  }>;
  let server: Server;
  const sockets: Socket[] = [];

  beforeEach(async () => {
    await prisma.$queryRaw`TRUNCATE TABLE private."MarketMaker" CASCADE`;
    oldEnv = { ...env };
    server = new Server().use(authenticate).listen(0);
    quoter = new Quoter(server);

    vi.mocked(getAssetPrice).mockImplementation((asset) =>
      Promise.resolve(
        {
          Dot: 6.5,
          Usdt: 1,
          Usdc: 1,
          ArbUsdc: 1,
          SolUsdc: 1,
          Sol: 150,
          Btc: 65_000,
          Flip: 4,
          Eth: 2_000,
          ArbEth: 2_000,
        }[asset],
      ),
    );

    connectClient = async (name: string, quotedAssets: InternalAsset[], beta = false) => {
      const { publicKey, privateKey } = await generateKeyPairAsync('ed25519');
      await prisma.marketMaker.create({
        data: {
          name,
          beta,
          publicKey: publicKey.export({ format: 'pem', type: 'spki' }).toString(),
        },
      });

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
          quoted_assets: quotedAssets?.map((a) => getAssetAndChain(a)),
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

      const errors: string[] = [];

      socket.on('quote_error', (msg) => {
        errors.push(msg);
      });

      return {
        socket,
        errors,
        sendQuote(
          quote: MarketMakerRawQuote,
          srcAsset: InternalAsset = 'Btc',
          destAsset: InternalAsset = 'Usdc',
        ): RpcLimitOrder[] {
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
                  base_asset: getAssetAndChain(baseAsset),
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
          const { resolve, promise } = deferredPromise<MarketMakerQuoteRequest<LegJson>>();
          onRequest = resolve;
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
            socket.on('disconnect', resolve);
            socket.disconnect();
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
      const socket = { on: vi.fn(), data: { marketMaker: 'MM' }, disconnect: vi.fn(), emit };
      const next = vi.fn();
      mockQuoter['quotes$'].subscribe(next);

      handler(socket as any);

      const callback = socket.on.mock.calls[1][1];

      callback({ request_id: 'string', legs: [[[-1, '123456']]] });
      callback({ request_id: 'string', range_orders: [] });

      expect(next).toHaveBeenCalledTimes(1);
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
      await connectClient('marketMaker', ['Btc']);

      const orders = await quoter.getLimitOrders('Btc', 'Usdc', ONE_BTC);
      expect(orders).toEqual([]);
    });

    it('returns an array of quotes if expectedQuotes is received', async () => {
      env.QUOTE_TIMEOUT = 10_000;
      const { sendQuote, waitForRequest } = await connectClient('marketMaker', ['Btc']);
      const limitOrders = quoter.getLimitOrders('Btc', 'Usdc', ONE_BTC);
      const request = await waitForRequest();
      const quote = sendQuote({ ...request, legs: [[[0, '100']]] });
      expect(await limitOrders).toEqual(quote);
    });

    it('accepts the most recent quote from each market maker', async () => {
      env.QUOTE_TIMEOUT = 10;
      const { sendQuote, waitForRequest } = await connectClient('marketMaker', ['Btc']);
      await connectClient('marketMaker2', ['Btc']);
      const limitOrders = quoter.getLimitOrders('Btc', 'Usdc', ONE_BTC);
      const request = await waitForRequest();
      sendQuote({ ...request, legs: [[[0, '100']]] });
      const quote = sendQuote({ ...request, legs: [[[0, '200']]] });
      expect(await limitOrders).toEqual(quote);
    });

    it.each([10, 50, 100])('can be configured with QUOTE_TIMEOUT', async (timeout) => {
      env.QUOTE_TIMEOUT = timeout;
      const { sendQuote, waitForRequest } = await connectClient('marketMaker', ['Btc']);
      const limitOrders = quoter.getLimitOrders('Btc', 'Usdc', ONE_BTC);
      const request = await waitForRequest();
      await sleep(timeout + 1);
      sendQuote({ ...request, legs: [[[0, '100']]] });
      expect(await limitOrders).toEqual([]);
    });

    it('eagerly returns after all expected quotes are received', async () => {
      env.QUOTE_TIMEOUT = 10_000;
      const mm1 = await connectClient('marketMaker', ['Btc']);
      const mm2 = await connectClient('marketMaker2', ['Btc']);
      const limitOrders = quoter.getLimitOrders('Btc', 'Usdc', ONE_BTC);
      const request = await mm1.waitForRequest();
      const quote1 = mm1.sendQuote({ ...request, legs: [[[0, '100']]] });
      const quote2 = mm2.sendQuote({ ...request, legs: [[[0, '200']]] });
      // no need to advance timers because setTimeout is cleared
      expect(await limitOrders).toEqual([...quote2, ...quote1]);
    });

    it("respects the market makers's quoted assets", async () => {
      env.QUOTE_TIMEOUT = 10_000;
      const mm = await connectClient('marketMaker', ['Flip']);
      const limitOrders = quoter.getLimitOrders('Btc', 'Usdc', ONE_BTC);
      expect(await limitOrders).toEqual([]);
      expect(mm.requestCount).toBe(0);
    });

    it('filters beta quotes', async () => {
      env.QUOTE_TIMEOUT = 10_000;
      const mm = await connectClient('marketMaker', ['Sol'], true);
      const limitOrders = quoter.getLimitOrders('Sol', 'Flip', ONE_BTC);
      const request = await mm.waitForRequest();
      mm.sendQuote({ ...request, legs: [[[0, '100']]] }, 'Sol', 'Usdc');
      expect(await limitOrders).toEqual([]);
      expect(mm.requestCount).toBe(1);
      expect(request).toMatchSnapshot({ request_id: expect.any(String) });
    });

    it('can quote the first leg only', async () => {
      env.QUOTE_TIMEOUT = 10_000;
      const mm = await connectClient('marketMaker', ['Sol']);
      const limitOrders = quoter.getLimitOrders('Sol', 'Flip', ONE_BTC);
      const request = await mm.waitForRequest();
      const quote = mm.sendQuote({ ...request, legs: [[[0, '100']]] }, 'Sol', 'Usdc');
      expect(await limitOrders).toEqual(quote);
      expect(mm.requestCount).toBe(1);
      expect(request).toMatchSnapshot({ request_id: expect.any(String) });
    });

    it('can quote the second leg only', async () => {
      env.QUOTE_TIMEOUT = 10_000;
      const mm = await connectClient('marketMaker', ['Flip']);
      const limitOrders = quoter.getLimitOrders('Btc', 'Flip', ONE_BTC);
      const request = await mm.waitForRequest();
      const quote = mm.sendQuote({ ...request, legs: [[[0, '100']]] }, 'Usdc', 'Flip');
      expect(await limitOrders).toEqual(quote);
      expect(mm.requestCount).toBe(1);
    });

    it('can quote both legs', async () => {
      env.QUOTE_TIMEOUT = 10_000;
      const mm = await connectClient('marketMaker', ['Sol', 'Flip']);
      const limitOrders = quoter.getLimitOrders('Sol', 'Flip', ONE_BTC);
      const request = await mm.waitForRequest();
      const quote = mm.sendQuote({ ...request, legs: [[[0, '100']], [[1, '200']]] }, 'Sol', 'Flip');
      expect(await limitOrders).toEqual(quote);
      expect(mm.requestCount).toBe(1);
      expect(request).toMatchSnapshot({ request_id: expect.any(String) });
    });

    it('can mix and match', async () => {
      env.QUOTE_TIMEOUT = 10_000;
      const mm1 = await connectClient('marketMaker', ['Sol']);
      const mm2 = await connectClient('marketMaker2', ['Flip']);
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
      const mm1 = await connectClient('marketMaker', ['Btc']);
      const mm2 = await connectClient('marketMaker2', ['Btc']);
      const limitOrders = quoter.getLimitOrders('Btc', 'Usdc', ONE_BTC);
      const [request1, request2] = await Promise.all([mm1.waitForRequest(), mm2.waitForRequest()]);
      mm1.sendQuote({ ...request1, legs: [[[0, '0']]] });
      const quote = mm2.sendQuote({ ...request2, legs: [[[0, '110']]] });
      expect(await limitOrders).toEqual(quote);
      expect(mm1.errors).toEqual([
        { error: 'sell amount must be positive', request_id: request1.request_id },
      ]);
    });

    it('rejects quotes with too low ticks', async () => {
      const mm1 = await connectClient('marketMaker', ['Btc']);
      const mm2 = await connectClient('marketMaker2', ['Btc']);
      const limitOrders = quoter.getLimitOrders('Btc', 'Usdc', ONE_BTC);
      const [request1, request2] = await Promise.all([mm1.waitForRequest(), mm2.waitForRequest()]);
      mm1.sendQuote({ ...request1, legs: [[[MIN_TICK - 1, '100']]] });
      const quote = mm2.sendQuote({ ...request2, legs: [[[0, '200']]] });
      expect(await limitOrders).toEqual(quote);
      expect(mm1.errors).toEqual([
        { error: 'tick provided is too small', request_id: request1.request_id },
      ]);
    });

    it('rejects quotes with too high ticks', async () => {
      const mm1 = await connectClient('marketMaker', ['Btc']);
      const mm2 = await connectClient('marketMaker2', ['Btc']);
      const limitOrders = quoter.getLimitOrders('Btc', 'Usdc', ONE_BTC);
      const [request1, request2] = await Promise.all([mm1.waitForRequest(), mm2.waitForRequest()]);
      mm1.sendQuote({ ...request1, legs: [[[MAX_TICK + 1, '100']]] });
      const quote = mm2.sendQuote({ ...request2, legs: [[[0, '200']]] });
      expect(await limitOrders).toEqual(quote);
      expect(mm1.errors).toEqual([
        { error: 'tick provided is too big', request_id: request1.request_id },
      ]);
    });
  });
});

describe('approximateIntermediateOutput', () => {
  it.each([
    ['Dot', 6.5],
    ['Usdt', 1],
    ['Btc', 65_000],
    ['Flip', 4],
    ['Eth', 2_000],
  ] as [InternalAsset, number][])(
    'correctly approximates the USD value of %s',
    async (asset, price) => {
      vi.mocked(getAssetPrice).mockResolvedValueOnce(price);

      const oneInAtomicUnits = toAtomicUnits(1, asset);

      const actual = await approximateIntermediateOutput(asset, oneInAtomicUnits);

      const expected = toAtomicUnits(price, 'Usdc', 'bigint');

      expect(actual).toEqual(expected);
    },
  );
});

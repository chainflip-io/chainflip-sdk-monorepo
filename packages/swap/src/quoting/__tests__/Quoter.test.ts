/* eslint-disable dot-notation */
import BigNumber from 'bignumber.js';
import * as crypto from 'crypto';
import { Server } from 'socket.io';
import { io, Socket } from 'socket.io-client';
import { setTimeout as sleep } from 'timers/promises';
import { promisify } from 'util';
import { assetConstants, getAssetAndChain } from '@/shared/enums';
import env from '@/swap/config/env';
import prisma, { InternalAsset } from '../../client';
import { getAssetPrice } from '../../pricing';
import authenticate from '../authenticate';
import Quoter, { approximateIntermediateOutput, type RpcLimitOrder } from '../Quoter';
import { MarketMakerRawQuote } from '../schemas';

const generateKeyPairAsync = promisify(crypto.generateKeyPair);

const serializeBigInt = (k: string, v: unknown) => (typeof v === 'bigint' ? v.toString() : v);

jest.mock('../../utils/statechain', () => ({
  getSwapRate: jest.fn((args) =>
    Promise.reject(new Error(`unhandled getSwapRate(${JSON.stringify(args, serializeBigInt)})`)),
  ),
}));

jest.mock('../../pricing');

function toAtomicUnits(amount: number, asset: InternalAsset, output?: 'string'): string;
function toAtomicUnits(amount: number, asset: InternalAsset, output: 'bigint'): bigint;
function toAtomicUnits(amount: number, asset: InternalAsset, output: string | bigint = 'string') {
  const amt = new BigNumber(amount).shiftedBy(assetConstants[asset].decimals).toFixed(0);

  return output === 'string' ? amt : BigInt(amt);
}

describe(Quoter, () => {
  let oldEnv: typeof env;
  let quoter: Quoter;
  let connectClient: (name: string) => Promise<{
    sendQuote: (quote: MarketMakerRawQuote) => RpcLimitOrder[];
    socket: Socket;
  }>;
  let server: Server;
  const sockets: Socket[] = [];
  let ids: string[];

  beforeEach(async () => {
    await prisma.$queryRaw`TRUNCATE TABLE private."MarketMaker" CASCADE`;
    oldEnv = { ...env };
    server = new Server().use(authenticate).listen(0);
    ids = [];
    quoter = new Quoter(server, () => {
      const id = crypto.randomUUID();
      ids.push(id);
      return id;
    });

    jest.mocked(getAssetPrice).mockImplementation(
      async (asset) =>
        ({
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
        })[asset],
    );

    connectClient = async (name: string) => {
      const { publicKey, privateKey } = await generateKeyPairAsync('ed25519');
      await prisma.marketMaker.create({
        data: {
          name,
          publicKey: publicKey.export({ format: 'pem', type: 'spki' }).toString(),
        },
      });

      const { port } = server['httpServer'].address();
      const timestamp = Date.now();

      const socket = io(`http://localhost:${port}`, {
        auth: {
          client_version: '1',
          market_maker_id: name,
          timestamp,
          signature: crypto
            .sign(null, Buffer.from(`${name}${timestamp}`, 'utf8'), privateKey)
            .toString('base64'),
        },
      });

      await new Promise<void>((resolve, reject) => {
        sleep(500).then(() => reject(new Error('socket did not connect')));
        socket.on('connect', resolve);
      });

      sockets.push(socket);

      return {
        socket,
        sendQuote(
          quote: MarketMakerRawQuote,
          srcAsset: InternalAsset = 'Btc',
          destAsset: InternalAsset = 'Usdc',
        ): RpcLimitOrder[] {
          socket.emit('quote_response', quote);

          expect(socket.connected).toBe(true);

          return quote.legs.flatMap((leg, i) =>
            leg.map(([tick, amount]) => {
              const baseAsset = i === 0 ? srcAsset : destAsset;

              return {
                LimitOrder: {
                  base_asset: getAssetAndChain(baseAsset),
                  quote_asset: { asset: 'USDC', chain: 'Ethereum' },
                  side: baseAsset === 'Usdc' ? 'buy' : 'sell',
                  sell_amount: `0x${BigInt(amount).toString(16)}`,
                  tick,
                },
              } as RpcLimitOrder;
            }),
          );
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
    await promisify(server.close.bind(server))();
  });

  describe('constructor', () => {
    it('ignores malformed quote responses', () => {
      const fakeServer = { on: jest.fn() };

      const mockQuoter = new Quoter(fakeServer as unknown as Server);
      mockQuoter['inflightRequests'].add('string');

      expect(fakeServer.on).toHaveBeenCalledWith('connection', expect.any(Function));

      const handler = fakeServer.on.mock.calls[0][1];

      const socket = { on: jest.fn(), data: { marketMaker: 'MM' } };
      const next = jest.fn();
      mockQuoter['quotes$'].subscribe(next);

      handler(socket as any);

      const callback = socket.on.mock.calls[1][1];

      callback({ request_id: 'string', legs: [[[-1, '123456']]] });
      callback({ request_id: 'string', range_orders: [] });

      expect(next).toHaveBeenCalledTimes(1);
    });
  });

  describe(Quoter.prototype['collectMakerQuotes'], () => {
    const ONE_BTC = toAtomicUnits(1, 'Btc', 'bigint');

    it('returns an empty array if expectedQuotes is 0', async () => {
      expect(await quoter.getLimitOrders('Btc', 'Usdc', ONE_BTC)).toEqual([]);
    });

    it('returns an empty array if no quotes are received', async () => {
      env.QUOTE_TIMEOUT = 10;
      await connectClient('marketMaker');
      const orders = await quoter.getLimitOrders('Btc', 'Usdc', ONE_BTC);
      expect(orders).toEqual([]);
    });

    it('returns an array of quotes if expectedQuotes is received', async () => {
      env.QUOTE_TIMEOUT = 10_000;
      const { sendQuote } = await connectClient('marketMaker');
      const limitOrders = quoter.getLimitOrders('Btc', 'Usdc', ONE_BTC);
      const id = ids[0];
      const quote = sendQuote({ request_id: id, legs: [[[0, '100']]] });
      expect(await limitOrders).toEqual(quote);
    });

    it('accepts the most recent quote from each market maker', async () => {
      env.QUOTE_TIMEOUT = 10;
      const { sendQuote } = await connectClient('marketMaker');
      await connectClient('marketMaker2');
      const limitOrders = quoter.getLimitOrders('Btc', 'Usdc', ONE_BTC);
      const id = ids[0];
      sendQuote({ request_id: id, legs: [[[0, '100']]] });
      const quote = sendQuote({ request_id: id, legs: [[[0, '200']]] });
      expect(await limitOrders).toEqual(quote);
    });

    it.each([10, 50, 100])('can be configured with QUOTE_TIMEOUT', async (timeout) => {
      env.QUOTE_TIMEOUT = timeout;
      const { sendQuote } = await connectClient('marketMaker');
      const limitOrders = quoter.getLimitOrders('Btc', 'Usdc', ONE_BTC);
      await sleep(timeout + 1);
      const id = ids[0];
      sendQuote({ request_id: id, legs: [[[0, '100']]] });
      expect(await limitOrders).toEqual([]);
    });

    it('eagerly returns after all expected quotes are received', async () => {
      env.QUOTE_TIMEOUT = 10_000;
      const mm1 = await connectClient('marketMaker');
      const mm2 = await connectClient('marketMaker2');
      const limitOrders = quoter.getLimitOrders('Btc', 'Usdc', ONE_BTC);
      const id = ids[0];
      const quote1 = mm1.sendQuote({ request_id: id, legs: [[[0, '100']]] });
      const quote2 = mm2.sendQuote({ request_id: id, legs: [[[0, '200']]] });
      // no need to advance timers because setTimeout is cleared
      expect(await limitOrders).toEqual([quote2[0], quote1[0]]);
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
      jest.mocked(getAssetPrice).mockResolvedValueOnce(price);

      const oneInAtomicUnits = toAtomicUnits(1, asset);

      const actual = await approximateIntermediateOutput(asset, oneInAtomicUnits);

      const expected = toAtomicUnits(price, 'Usdc', 'bigint');

      expect(actual).toEqual(expected);
    },
  );
});

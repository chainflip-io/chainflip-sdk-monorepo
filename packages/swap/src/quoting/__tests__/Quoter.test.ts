/* eslint-disable dot-notation */
import BigNumber from 'bignumber.js';
import * as crypto from 'crypto';
import { Server } from 'socket.io';
import { io, Socket } from 'socket.io-client';
import { setTimeout as sleep } from 'timers/promises';
import { promisify } from 'util';
import { assetConstants } from '@/shared/enums';
import env from '@/swap/config/env';
import prisma, { InternalAsset } from '../../client';
import { getAssetPrice } from '../../pricing';
import authenticate from '../authenticate';
import Leg from '../Leg';
import Quoter, { approximateIntermediateOutput } from '../Quoter';
import { MarketMakerQuote, MarketMakerRawQuote } from '../schemas';

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
    sendQuote: (quote: MarketMakerRawQuote) => MarketMakerQuote;
    socket: Socket;
  }>;
  let server: Server;
  const sockets: Socket[] = [];

  beforeEach(async () => {
    await prisma.$queryRaw`TRUNCATE TABLE private."MarketMaker" CASCADE`;
    oldEnv = { ...env };
    server = new Server().use(authenticate).listen(0);

    quoter = new Quoter(server);

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
        sendQuote(quote: MarketMakerRawQuote) {
          socket.emit('quote_response', quote);

          expect(socket.connected).toBe(true);

          return {
            request_id: quote.request_id,
            legs: quote.legs.map((leg) => leg.map(([tick, amount]) => [tick, BigInt(amount)])),
          } as MarketMakerQuote;
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
    const collectQuotes = () => {
      const id = crypto.randomUUID();

      return {
        promise: quoter['collectMakerQuotes']({
          request_id: id,
          legs: [Leg.of('Flip', 'Usdc', 1000n)],
        }),
        id,
      };
    };

    it('returns an empty array if expectedQuotes is 0', async () => {
      expect(await quoter['collectMakerQuotes']({ request_id: 'id', legs: [] as any })).toEqual([]);
    });

    it('returns an empty array if no quotes are received', async () => {
      env.QUOTE_TIMEOUT = 10;
      await connectClient('marketMaker');
      const { promise } = collectQuotes();
      expect(await promise).toEqual([]);
    });

    it('returns an array of quotes if expectedQuotes is received', async () => {
      env.QUOTE_TIMEOUT = 10_000;
      const { sendQuote } = await connectClient('marketMaker');
      const { id, promise } = collectQuotes();
      const quote = sendQuote({ request_id: id, legs: [[[0, '100']]] });
      expect(await promise).toEqual([quote]);
    });

    it('accepts the most recent quote from each market maker', async () => {
      env.QUOTE_TIMEOUT = 10;
      const { sendQuote } = await connectClient('marketMaker');
      await connectClient('marketMaker2');
      const { id, promise } = collectQuotes();
      sendQuote({ request_id: id, legs: [[[0, '100']]] });
      const quote = sendQuote({ request_id: id, legs: [[[0, '200']]] });
      expect(await promise).toEqual([quote]);
    });

    it.each([10, 50, 100])('can be configured with QUOTE_TIMEOUT', async (timeout) => {
      env.QUOTE_TIMEOUT = timeout;
      const { sendQuote } = await connectClient('marketMaker');
      const { id, promise } = collectQuotes();
      await sleep(timeout + 1);
      sendQuote({ request_id: id, legs: [[[0, '100']]] });
      expect(await promise).toEqual([]);
    });

    it('eagerly returns after all expected quotes are received', async () => {
      env.QUOTE_TIMEOUT = 10_000;
      const mm1 = await connectClient('marketMaker');
      const mm2 = await connectClient('marketMaker2');
      const { id, promise } = collectQuotes();
      const quote1 = mm1.sendQuote({ request_id: id, legs: [[[0, '100']]] });
      const quote2 = mm2.sendQuote({ request_id: id, legs: [[[0, '200']]] });
      // no need to advance timers because setTimeout is cleared
      expect(await promise).toEqual([quote2, quote1]);
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

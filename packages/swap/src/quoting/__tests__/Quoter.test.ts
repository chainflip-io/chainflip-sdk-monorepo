/* eslint-disable dot-notation */
import * as crypto from 'crypto';
import { Server } from 'socket.io';
import { io, Socket } from 'socket.io-client';
import { setTimeout as sleep } from 'timers/promises';
import { promisify } from 'util';
import env from '@/swap/config/env';
import prisma, { Pool } from '../../client';
import authenticate from '../authenticate';
import Quoter from '../Quoter';
import { MarketMakerQuote, MarketMakerRawQuote } from '../schemas';

const generateKeyPairAsync = promisify(crypto.generateKeyPair);

describe(Quoter, () => {
  let oldEnv: typeof env;
  let quoter: Quoter;
  let connectClient: (name: string) => Promise<{
    sendQuote: (quote: MarketMakerRawQuote) => MarketMakerQuote;
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
    await promisify(server.close.bind(server))();
    await Promise.all(
      sockets.splice(0).map(
        (socket) =>
          new Promise<unknown>((resolve) => {
            socket.on('disconnect', resolve);
            socket.disconnect();
          }),
      ),
    );
  });

  describe('constructor', () => {
    it('ignores malformed quote responses', () => {
      const fakeServer = { on: jest.fn() };

      const mockQuoter = new Quoter(fakeServer as unknown as Server);

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
    it('returns an empty array if expectedQuotes is 0', async () => {
      expect(await quoter['collectMakerQuotes']('id')).toEqual([]);
    });

    it('returns an empty array if no quotes are received', async () => {
      env.QUOTE_TIMEOUT = 10;
      await connectClient('marketMaker');
      const promise = quoter['collectMakerQuotes']('id');
      expect(await promise).toEqual([]);
    });

    it('returns an array of quotes if expectedQuotes is received', async () => {
      const { sendQuote } = await connectClient('marketMaker');
      const id = crypto.randomUUID();
      const promise = quoter['collectMakerQuotes'](id);
      const quote = sendQuote({ request_id: id, legs: [[[0, '100']]] });
      expect(await promise).toEqual([quote]);
    });

    it('accepts the most recent quote from each market maker', async () => {
      env.QUOTE_TIMEOUT = 10;
      const { sendQuote } = await connectClient('marketMaker');
      await connectClient('marketMaker2');
      const id = crypto.randomUUID();
      const promise = quoter['collectMakerQuotes'](id);
      sendQuote({ request_id: id, legs: [[[0, '100']]] });
      const quote = sendQuote({ request_id: id, legs: [[[0, '200']]] });
      expect(await promise).toEqual([quote]);
    });

    it.each([10, 50, 100])('can be configured with QUOTE_TIMEOUT', async (timeout) => {
      env.QUOTE_TIMEOUT = timeout;
      const { sendQuote } = await connectClient('marketMaker');
      const id = crypto.randomUUID();
      const promise = quoter['collectMakerQuotes'](id);
      await sleep(timeout + 1);
      sendQuote({ request_id: id, legs: [[[0, '100']]] });
      expect(await promise).toEqual([]);
    });

    it('eagerly returns after all expected quotes are received', async () => {
      const mm1 = await connectClient('marketMaker');
      const mm2 = await connectClient('marketMaker2');
      const id = crypto.randomUUID();
      const promise = quoter['collectMakerQuotes'](id);
      const quote1 = mm1.sendQuote({ request_id: id, legs: [[[0, '100']]] });
      const quote2 = mm2.sendQuote({ request_id: id, legs: [[[0, '200']]] });
      // no need to advance timers because setTimeout is never called
      expect(await promise).toEqual([quote2, quote1]);
    });
  });

  describe(Quoter.prototype.getQuote, () => {
    it('gets the quote for a single leg', async () => {
      quoter['createId'] = () => 'id';
      const { sendQuote } = await connectClient('marketMaker');
      const quote = quoter.getQuote('Usdc', 'Flip', 1_000_000n, [
        { liquidityFeeHundredthPips: 0 } as Pool,
      ]);
      sendQuote({ request_id: 'id', legs: [[[0, (1_000_000).toString()]]] });

      expect(await quote).toEqual({
        intermediateAmount: null,
        outputAmount: 998999n,
        includedFees: [
          {
            type: 'NETWORK',
            chain: 'Ethereum',
            asset: 'USDC',
            amount: '1000',
          },
        ],
        quoteType: 'market_maker',
      });
    });
  });
});

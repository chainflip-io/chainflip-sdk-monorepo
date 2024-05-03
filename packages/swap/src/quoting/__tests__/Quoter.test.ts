/* eslint-disable dot-notation */
import BigNumber from 'bignumber.js';
import * as crypto from 'crypto';
import { Server } from 'socket.io';
import { io, Socket } from 'socket.io-client';
import { setTimeout as sleep } from 'timers/promises';
import { promisify } from 'util';
import { assetConstants, getAssetAndChain } from '@/shared/enums';
import env from '@/swap/config/env';
import prisma, { InternalAsset, Pool } from '../../client';
import { getAssetPrice } from '../../pricing';
import authenticate from '../authenticate';
import Quoter, { approximateIntermediateOutput, differenceExceedsThreshold } from '../Quoter';
import { MarketMakerQuote, MarketMakerRawQuote } from '../schemas';

const generateKeyPairAsync = promisify(crypto.generateKeyPair);

const serializeBigInt = (k: string, v: unknown) => (typeof v === 'bigint' ? v.toString() : v);

jest.mock('../../utils/statechain', () => ({
  getSwapRate: jest.fn((args) =>
    Promise.reject(new Error(`unhandled getSwapRate(${JSON.stringify(args, serializeBigInt)})`)),
  ),
}));

jest.mock('../../pricing');

jest.mock('../PoolStateCache');

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
    const collectQuotes = () => {
      const id = crypto.randomUUID();

      return {
        promise: quoter['collectMakerQuotes']({
          request_id: id,
          legs: [
            {
              base_asset: getAssetAndChain('Flip'),
              quote_asset: getAssetAndChain('Usdc'),
              amount: '1000',
              side: 'SELL',
            },
          ],
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
      // no need to advance timers because setTimeout is never called
      expect(await promise).toEqual([quote2, quote1]);
    });
  });

  describe(Quoter.prototype.getQuote, () => {
    const ONE_USDC = toAtomicUnits(1, 'Usdc', 'bigint');
    const ONE_FLIP = toAtomicUnits(1, 'Flip', 'bigint');
    const ONE_BTC = toAtomicUnits(1, 'Btc', 'bigint');
    const ONE_DOT = toAtomicUnits(1, 'Dot', 'bigint');
    const ONE_USDT = toAtomicUnits(1, 'Usdt', 'bigint');

    it('gets the quote for a single leg (USDC => FLIP)', async () => {
      quoter['createId'] = () => 'id';
      const { sendQuote } = await connectClient('marketMaker');
      const quote = quoter.getQuote('Usdc', 'Flip', ONE_USDC, [
        { liquidityFeeHundredthPips: 0 } as Pool,
      ]);
      sendQuote({ request_id: 'id', legs: [[[-260483, ONE_FLIP.toString()]]] });

      expect(await quote).toEqual({
        intermediateAmount: null,
        outputAmount: 204942885815213259n,
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

    it('gets the quote for a single leg (FLIP => USDC)', async () => {
      quoter['createId'] = () => 'id';
      const { sendQuote } = await connectClient('marketMaker');
      const quote = quoter.getQuote('Flip', 'Usdc', ONE_FLIP, [
        { liquidityFeeHundredthPips: 0 } as Pool,
      ]);
      sendQuote({ request_id: 'id', legs: [[[-260483, (ONE_USDC * 5n).toString()]]] });

      expect(await quote).toEqual({
        intermediateAmount: null,
        outputAmount: 4869653n,
        includedFees: [
          {
            type: 'NETWORK',
            chain: 'Ethereum',
            asset: 'USDC',
            amount: '4874',
          },
        ],
        quoteType: 'market_maker',
      });
    });

    it('gets the quote for a single leg (BTC => USDC)', async () => {
      quoter['createId'] = () => 'id';
      const { sendQuote } = await connectClient('marketMaker');
      const quote = quoter.getQuote('Btc', 'Usdc', ONE_BTC, [
        { liquidityFeeHundredthPips: 0 } as Pool,
      ]);
      sendQuote({ request_id: 'id', legs: [[[65636, (ONE_USDC * 75_000n).toString()]]] });

      expect(await quote).toEqual({
        intermediateAmount: null,
        outputAmount: 70787770203n,
        includedFees: [
          {
            type: 'NETWORK',
            chain: 'Ethereum',
            asset: 'USDC',
            amount: '70858628',
          },
        ],
        quoteType: 'market_maker',
      });
    });

    it('gets the quote for two legs (BTC => USDC => FLIP)', async () => {
      jest.mocked(getAssetPrice).mockResolvedValueOnce(70_000.0);
      const ids = ['id2', 'id1'];
      quoter['createId'] = () => ids.pop() as string;
      const { sendQuote, socket } = await connectClient('marketMaker');

      const quotes: Record<string, MarketMakerRawQuote> = {
        id1: {
          request_id: 'id1',
          legs: [
            [[65636, (ONE_USDC * 75_000n).toString()]], // BTC => USDC
            [[-260483, (ONE_FLIP * 15_000n).toString()]], // USDC => FLIP
          ],
        },
        id2: {
          request_id: 'id2',
          legs: [
            [[-260483, (ONE_FLIP * 15_000n).toString()]], // USDC => FLIP
          ],
        },
      };

      socket.on('quote_request', (req) => {
        sendQuote(quotes[req.request_id]);
      });

      const quote = quoter.getQuote('Btc', 'Flip', ONE_BTC, [
        { liquidityFeeHundredthPips: 0 } as Pool,
        { liquidityFeeHundredthPips: 1000 } as Pool,
      ]);

      expect(await quote).toEqual({
        intermediateAmount: 70787770203n,
        outputAmount: 14507449905826984626132n,
        includedFees: [
          {
            amount: '14521971877704689315',
            asset: 'FLIP',
            chain: 'Ethereum',
            type: 'LIQUIDITY',
          },
          {
            type: 'NETWORK',
            chain: 'Ethereum',
            asset: 'USDC',
            amount: '70858628',
          },
        ],
        quoteType: 'market_maker',
      });
    });

    it('gets the quote for two legs (DOT => USDC => USDT)', async () => {
      jest.mocked(getAssetPrice).mockResolvedValueOnce(6.5);
      const ids = ['id2', 'id1'];
      quoter['createId'] = () => ids.pop() as string;
      const { sendQuote, socket } = await connectClient('marketMaker');

      const quotes: Record<string, MarketMakerRawQuote> = {
        id1: {
          request_id: 'id1',
          legs: [
            [[-73540, (ONE_USDC * 65_000n).toString()]], // DOT => USDC
            [[0, (ONE_USDT * 65_000n).toString()]], // USDC => USDT
          ],
        },
        id2: {
          request_id: 'id2',
          legs: [
            [[0, (ONE_USDT * 65_000n).toString()]], // USDC => USDT
          ],
        },
      };

      socket.on('quote_request', (req) => {
        sendQuote(quotes[req.request_id]);
      });

      const quote = quoter.getQuote('Dot', 'Usdt', ONE_DOT * 10_000n, [
        { liquidityFeeHundredthPips: 0 } as Pool,
        { liquidityFeeHundredthPips: 0 } as Pool,
      ]);

      expect(await quote).toEqual({
        includedFees: [
          {
            amount: '0',
            asset: 'USDT',
            chain: 'Ethereum',
            type: 'LIQUIDITY',
          },
          {
            amount: '64026249',
            asset: 'USDC',
            chain: 'Ethereum',
            type: 'NETWORK',
          },
        ],
        intermediateAmount: 63962222785n,
        outputAmount: 63962222784n,
        quoteType: 'market_maker',
      });
    });

    it('gets the quote for two legs in one round trip (BTC => USDC => FLIP)', async () => {
      jest.mocked(getAssetPrice).mockResolvedValueOnce(70_787.0);
      quoter['createId'] = () => 'id';
      const { sendQuote } = await connectClient('marketMaker');
      const quote = quoter.getQuote('Btc', 'Flip', ONE_BTC, [
        { liquidityFeeHundredthPips: 0 } as Pool,
        { liquidityFeeHundredthPips: 1000 } as Pool,
      ]);
      sendQuote({
        request_id: 'id',
        legs: [
          [[65636, (ONE_USDC * 75_000n).toString()]], // BTC => USDC
          [[-260483, (ONE_FLIP * 15_000n).toString()]], // USDC => FLIP
        ],
      });

      expect(await quote).toEqual({
        intermediateAmount: 70858628831n,
        outputAmount: 14492784766143299590341n,
        includedFees: [
          {
            amount: '14507292058201501091',
            asset: 'FLIP',
            chain: 'Ethereum',
            type: 'LIQUIDITY',
          },
          {
            type: 'NETWORK',
            chain: 'Ethereum',
            asset: 'USDC',
            amount: '70787000',
          },
        ],
        quoteType: 'market_maker',
      });
    });

    it('gets the quote for two legs without a USDC estimate (BTC => USDC => FLIP)', async () => {
      jest.mocked(getAssetPrice).mockResolvedValueOnce(undefined);
      const ids = ['id2', 'id1'];
      quoter['createId'] = () => ids.pop() as string;
      const { sendQuote, socket } = await connectClient('marketMaker');

      const quotes: Record<string, MarketMakerRawQuote> = {
        id1: {
          request_id: 'id1',
          legs: [
            [[65636, (ONE_USDC * 75_000n).toString()]], // BTC => USDC
          ],
        },
        id2: {
          request_id: 'id2',
          legs: [
            [[-260483, (ONE_FLIP * 15_000n).toString()]], // USDC => FLIP
          ],
        },
      };

      socket.on('quote_request', (req) => {
        sendQuote(quotes[req.request_id]);
      });

      const quote = quoter.getQuote('Btc', 'Flip', ONE_BTC, [
        { liquidityFeeHundredthPips: 0 } as Pool,
        { liquidityFeeHundredthPips: 1000 } as Pool,
      ]);

      expect(await quote).toEqual({
        intermediateAmount: 70787770203n,
        outputAmount: 14507449905826984626132n,
        includedFees: [
          {
            amount: '14521971877704689315',
            asset: 'FLIP',
            chain: 'Ethereum',
            type: 'LIQUIDITY',
          },
          {
            type: 'NETWORK',
            chain: 'Ethereum',
            asset: 'USDC',
            amount: '70858628',
          },
        ],
        quoteType: 'market_maker',
      });
    });

    it('throws if no quotes are received', async () => {
      await connectClient('marketMaker');

      const quote = quoter.getQuote('Usdc', 'Flip', ONE_USDC, [
        { liquidityFeeHundredthPips: 0 } as Pool,
      ]);

      await expect(quote).rejects.toThrow('no quotes received');
    });
  });
});

describe(approximateIntermediateOutput, () => {
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

describe(differenceExceedsThreshold, () => {
  it('returns false if the difference does not exceed the threshold', () => {
    expect(differenceExceedsThreshold(100n, 101n, 1)).toBe(false);
  });

  it('returns false if the difference exceeds the threshold', () => {
    expect(differenceExceedsThreshold(100n, 102n, 1)).toBe(true);
  });
});

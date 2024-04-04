/* eslint-disable dot-notation */
import { Server } from 'socket.io';
import env from '@/swap/config/env';
import Quoter from '../Quoter';
import { MarketMakerQuote } from '../schemas';

describe(Quoter, () => {
  it('ignores malformed quote responses', () => {
    const fakeServer = { on: jest.fn() };

    const quoter = new Quoter(fakeServer as unknown as Server);

    expect(fakeServer.on).toHaveBeenCalledWith('connection', expect.any(Function));

    const handler = fakeServer.on.mock.calls[0][1];

    const socket = { on: jest.fn(), data: { marketMaker: 'MM' } };
    const next = jest.fn();
    quoter['quotes$'].subscribe(next);

    handler(socket as any);

    const callback = socket.on.mock.calls[1][1];

    callback({ request_id: 'string', legs: [[[-1, '123456']]] });
    callback({ request_id: 'string', range_orders: [] });

    expect(next).toHaveBeenCalledTimes(1);
  });

  describe(Quoter.prototype['collectMakerQuotes'], () => {
    let oldEnv: typeof env;
    let quoter: Quoter;
    let connectClient: (name: string) => void;
    let quotes$: (typeof Quoter)['prototype']['quotes$'];

    beforeEach(() => {
      oldEnv = { ...env };
      jest.useFakeTimers();
      const on = jest.fn();

      const sockets = new Set();

      quoter = new Quoter({ on, sockets: { sockets } } as unknown as Server);
      quotes$ = quoter['quotes$'];
      const [[, onConnect]] = on.mock.calls;

      connectClient = (name: string) => {
        const socket = { on: jest.fn(), data: { marketMaker: name } };
        sockets.add(socket);
        onConnect(socket);
      };
    });

    afterEach(() => {
      Object.assign(env, oldEnv);
      jest.useRealTimers();
      jest.resetModules();
    });

    it('returns an empty array if expectedQuotes is 0', async () => {
      expect(await quoter['collectMakerQuotes']('id')).toEqual([]);
    });

    it('returns an empty array if no quotes are received', async () => {
      connectClient('marketMaker');
      const promise = quoter['collectMakerQuotes']('id');
      jest.advanceTimersByTime(1001);
      expect(await promise).toEqual([]);
    });

    it('returns an array of quotes if expectedQuotes is received', async () => {
      connectClient('marketMaker');
      const id = crypto.randomUUID();
      const promise = quoter['collectMakerQuotes'](id);
      const quote = { request_id: id, legs: [[[0, 100n]]] } as MarketMakerQuote;
      quotes$.next({ marketMaker: 'marketMaker', quote });
      expect(await promise).toEqual([quote]);
    });

    it('accepts the most recent quote from each market maker', async () => {
      connectClient('marketMaker');
      connectClient('marketMaker2');
      const id = crypto.randomUUID();
      const promise = quoter['collectMakerQuotes'](id);
      const quote1 = { request_id: id, legs: [[[0, 100n]]] } as MarketMakerQuote;
      const quote2 = { request_id: id, legs: [[[0, 200n]]] } as MarketMakerQuote;
      quotes$.next({ marketMaker: 'marketMaker', quote: quote1 });
      quotes$.next({ marketMaker: 'marketMaker', quote: quote2 });
      jest.advanceTimersByTime(1001);
      expect(await promise).toEqual([quote2]);
    });

    it('can be configured with QUOTE_TIMEOUT', async () => {
      env.QUOTE_TIMEOUT = 100;
      connectClient('marketMaker');
      const id = crypto.randomUUID();
      const quote = { request_id: id, legs: [[[0, 100n]]] } as MarketMakerQuote;
      const promise = quoter['collectMakerQuotes'](id);
      jest.advanceTimersByTime(101);
      quotes$.next({ marketMaker: 'marketMaker', quote });
      expect(await promise).toEqual([]);
    });

    it('eagerly returns after all expected quotes are received', async () => {
      connectClient('marketMaker');
      connectClient('marketMaker2');
      const id = crypto.randomUUID();
      const promise = quoter['collectMakerQuotes'](id);
      const quote1 = { request_id: id, legs: [[[0, 100n]]] } as MarketMakerQuote;
      const quote2 = { request_id: id, legs: [[[0, 200n]]] } as MarketMakerQuote;
      quotes$.next({ marketMaker: 'marketMaker', quote: quote1 });
      quotes$.next({ marketMaker: 'marketMaker2', quote: quote2 });
      // no need to advance timers because setTimeout is never called
      expect(await promise).toEqual([quote1, quote2]);
    });
  });
});

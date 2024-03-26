import * as crypto from 'crypto';
import { Subject } from 'rxjs';
import env from '@/swap/config/env';
import { collectMakerQuotes } from '../quotes';

jest.mock('@/shared/consts', () => ({
  ...jest.requireActual('@/shared/consts'),
  getPoolsNetworkFeeHundredthPips: jest.fn().mockReturnValue(1000),
}));

describe('quotes', () => {
  describe(collectMakerQuotes, () => {
    let oldEnv: typeof env;

    beforeEach(() => {
      oldEnv = { ...env };
      jest.useFakeTimers();
    });

    afterEach(() => {
      Object.assign(env, oldEnv);
      jest.useRealTimers();
      jest.resetModules();
    });

    const quotes$ = new Subject<{ client: string; quote: any }>();

    it('returns an empty array if expectedQuotes is 0', async () => {
      expect(await collectMakerQuotes('id', 0, quotes$)).toEqual([]);
    });

    it('returns an empty array if no quotes are received', async () => {
      const promise = collectMakerQuotes('id', 1, quotes$);
      jest.advanceTimersByTime(1001);
      expect(await promise).toEqual([]);
    });

    it('returns an array of quotes if expectedQuotes is received', async () => {
      const id = crypto.randomUUID();
      const promise = collectMakerQuotes(id, 1, quotes$);
      quotes$.next({ client: 'client', quote: { id } });
      expect(await promise).toEqual([{ id }]);
    });

    it('accepts only the first quote from each client', async () => {
      const id = crypto.randomUUID();
      const promise = collectMakerQuotes(id, 2, quotes$);
      for (let i = 0; i < 2; i += 1) {
        quotes$.next({ client: 'client', quote: { id, index: i } });
      }
      jest.advanceTimersByTime(1001);
      expect(await promise).toEqual([{ id, index: 0 }]);
    });

    it('can be configured with QUOTE_TIMEOUT', async () => {
      env.QUOTE_TIMEOUT = 100;

      const id = crypto.randomUUID();
      const promise = collectMakerQuotes(id, 1, quotes$);
      jest.advanceTimersByTime(101);
      quotes$.next({ client: 'client', quote: { id } });
      expect(await promise).toEqual([]);
    });

    it('eagerly returns after all expected quotes are received', async () => {
      const id = crypto.randomUUID();
      const promise = collectMakerQuotes(id, 2, quotes$);
      quotes$.next({ client: 'client', quote: { id, value: 1 } });
      quotes$.next({ client: 'client2', quote: { id, value: 2 } });
      // no need to advance timers because setTimeout is never called
      expect(await promise).toEqual([
        { id, value: 1 },
        { id, value: 2 },
      ]);
    });
  });
});

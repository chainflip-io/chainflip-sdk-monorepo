import { Assets, Chains } from '@/shared/enums';
import { QuoteRequest } from '../../types';
import { getQuote, getStatus } from '../ApiService';

jest.mock('../../../../package.json', () => ({
  version: '1.0-test',
}));

describe('ApiService', () => {
  const mockRoute = {
    amount: '10000',
    srcChain: Chains.Bitcoin,
    srcAsset: Assets.BTC,
    destChain: Chains.Ethereum,
    destAsset: Assets.ETH,
  } satisfies QuoteRequest;

  describe(getQuote, () => {
    const mockedFetch = jest.spyOn(globalThis, 'fetch');
    beforeEach(() => {
      mockedFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            id: 'string',
            intermediateAmount: '1',
            egressAmount: '2',
          }),
      } as Response);
    });

    it('gets a quote', async () => {
      const route = await getQuote('https://swapperoo.org', mockRoute, {});

      expect(route).toMatchSnapshot();
      expect(mockedFetch.mock.lastCall).toMatchSnapshot();
    });

    it('gets a quote with a broker commission', async () => {
      const route = await getQuote(
        'https://swapperoo.org',
        {
          ...mockRoute,
          brokerCommissionBps: 15,
        },
        {},
      );

      expect(route).toMatchSnapshot();
      expect(mockedFetch.mock.lastCall).toMatchSnapshot();
    });

    it('passes the signal to axios', async () => {
      await getQuote('https://swapperoo.org', mockRoute, {
        signal: new AbortController().signal,
      });

      expect(mockedFetch.mock.lastCall?.[1]?.signal).not.toBeUndefined();
    });
  });

  describe(getStatus, () => {
    it('forwards whatever response it gets from the swap service', async () => {
      const mockedFetch = jest.mocked(fetch);
      mockedFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve('hello darkness'),
      } as Response);
      mockedFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve('my old friend'),
      } as Response);

      const statusRequest = { id: 'the id' };

      const status1 = await getStatus('https://swapperoo.org', statusRequest, {});
      expect(status1).toBe('hello darkness');
      const status2 = await getStatus('https://swapperoo.org', statusRequest, {});
      expect(status2).toBe('my old friend');
    });

    it('passes the signal to axios', async () => {
      const mockedFetch = jest.mocked(fetch);
      mockedFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(null),
      } as Response);

      await getStatus(
        'https://swapperoo.org',
        { id: '' },
        { signal: new AbortController().signal },
      );

      expect(mockedFetch.mock.lastCall?.[1]?.signal).not.toBeUndefined();
    });
  });
});

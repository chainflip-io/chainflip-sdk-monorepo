import axios from 'axios';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { Assets, Chains } from '@/shared/enums';
import { QuoteRequest } from '../../types';
import { getQuote, getQuoteV2, getStatus, getStatusV2 } from '../ApiService';

vi.mock('../../../../package.json', () => ({
  version: '1.0-test',
}));

vi.mock('axios', async () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
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
    const mockedGet = vi.mocked(axios.get);
    beforeEach(() => {
      mockedGet.mockResolvedValueOnce({
        data: {
          id: 'string',
          intermediateAmount: '1',
          egressAmount: '2',
        },
      });
    });

    it('gets a quote', async () => {
      const route = await getQuote('https://swapperoo.org', mockRoute, {});

      expect(route).toMatchSnapshot();
      expect(mockedGet.mock.lastCall).toMatchSnapshot();
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
      expect(mockedGet.mock.lastCall).toMatchSnapshot();
    });

    it('gets a quote for a vault swap', async () => {
      const route = await getQuote(
        'https://swapperoo.org',
        {
          ...mockRoute,
          isVaultSwap: true,
        },
        {},
      );

      expect(route).toMatchSnapshot();
      expect(mockedGet.mock.lastCall).toMatchSnapshot();
    });

    it('passes the signal to fetch', async () => {
      await getQuote('https://swapperoo.org', mockRoute, {
        signal: new AbortController().signal,
      });

      expect(mockedGet.mock.lastCall?.[1]?.signal).not.toBeUndefined();
    });
  });

  describe(getQuoteV2, () => {
    const mockedGet = vi.mocked(axios.get);
    beforeEach(() => {
      mockedGet.mockResolvedValueOnce({
        data: [
          {
            id: 'string',
            intermediateAmount: '1',
            egressAmount: '2',
          },
        ],
      });
    });

    it('gets a quote', async () => {
      const route = await getQuoteV2(
        'https://swapperoo.org',
        {
          ...mockRoute,
          dcaEnabled: false,
          isVaultSwap: true,
        },
        {},
      );

      expect(route).toMatchSnapshot();
      expect(mockedGet.mock.lastCall).toMatchSnapshot();
    });

    it('gets a quote with a broker commission', async () => {
      const route = await getQuoteV2(
        'https://swapperoo.org',
        {
          ...mockRoute,
          brokerCommissionBps: 15,
          dcaEnabled: false,
        },
        {},
      );

      expect(route).toMatchSnapshot();
      expect(mockedGet.mock.lastCall).toMatchSnapshot();
    });

    it('gets a quote for a vault swap', async () => {
      const route = await getQuoteV2(
        'https://swapperoo.org',
        {
          ...mockRoute,
          isVaultSwap: true,
          dcaEnabled: true,
        },
        {},
      );

      expect(route).toMatchSnapshot();
      expect(mockedGet.mock.lastCall).toMatchSnapshot();
    });

    it('passes the signal to fetch', async () => {
      await getQuoteV2(
        'https://swapperoo.org',
        {
          ...mockRoute,
          dcaEnabled: false,
        },
        {
          signal: new AbortController().signal,
        },
      );

      expect(mockedGet.mock.lastCall?.[1]?.signal).not.toBeUndefined();
    });
  });

  describe(getStatus, () => {
    it('forwards whatever response it gets from the swap service', async () => {
      const mockedGet = vi.mocked(axios.get);
      mockedGet.mockResolvedValueOnce({ data: 'hello darkness' });
      mockedGet.mockResolvedValueOnce({ data: 'my old friend' });

      const statusRequest = { id: 'the id' };

      const status1 = await getStatus('https://swapperoo.org', statusRequest, {});
      expect(status1).toBe('hello darkness');
      const status2 = await getStatus('https://swapperoo.org', statusRequest, {});
      expect(status2).toBe('my old friend');
    });

    it('passes the signal to axios', async () => {
      const mockedGet = vi.mocked(axios.get);
      mockedGet.mockResolvedValueOnce({ data: null });

      await getStatus(
        'https://swapperoo.org',
        { id: '' },
        { signal: new AbortController().signal },
      );

      expect(mockedGet.mock.lastCall?.[1]?.signal).not.toBeUndefined();
    });
  });

  describe(getStatusV2, () => {
    it('forwards whatever response it gets from the swap service', async () => {
      const mockedGet = vi.mocked(axios.get);
      mockedGet.mockResolvedValueOnce({ data: 'hello darkness' });
      mockedGet.mockResolvedValueOnce({ data: 'my old friend' });

      const statusRequest = { id: 'the id' };

      const status1 = await getStatusV2('https://swapperoo.org', statusRequest, {});
      expect(status1).toBe('hello darkness');
      const status2 = await getStatusV2('https://swapperoo.org', statusRequest, {});
      expect(status2).toBe('my old friend');
    });

    it('passes the signal to axios', async () => {
      const mockedGet = vi.mocked(axios.get);
      mockedGet.mockResolvedValueOnce({ data: null });

      await getStatusV2(
        'https://swapperoo.org',
        { id: '' },
        { signal: new AbortController().signal },
      );

      expect(mockedGet.mock.lastCall?.[1]?.signal).not.toBeUndefined();
    });
  });
});

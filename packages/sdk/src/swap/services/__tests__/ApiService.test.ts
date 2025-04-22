import axios from 'axios';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { QuoteRequest } from '../../types.js';
import { getQuoteV2, getStatusV2 } from '../ApiService.js';

vi.mock('../../../../package.json', () => ({
  default: {
    version: '1.0-test',
  },
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
    srcChain: 'Bitcoin',
    srcAsset: 'BTC',
    destChain: 'Ethereum',
    destAsset: 'ETH',
  } satisfies QuoteRequest;

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

    it('gets a quote with a broker commission and affiliate brokers', async () => {
      const route = await getQuoteV2(
        'https://swapperoo.org',
        {
          ...mockRoute,
          brokerCommissionBps: 15,
          affiliateBrokers: [
            { account: 'cFLdocJo3bjT7JbT7R46cA89QfvoitrKr9P3TsMcdkVWeeVLa', commissionBps: 10 },
            { account: 'cFLdopvNB7LaiBbJoNdNC26e9Gc1FNJKFtvNZjAmXAAVnzCk4', commissionBps: 20 },
          ],
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

    it('gets a quote with ccm params', async () => {
      const route = await getQuoteV2(
        'https://swapperoo.org',
        {
          ...mockRoute,
          ccmParams: {
            gasBudget: '12345',
            messageLengthBytes: 100,
          },
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

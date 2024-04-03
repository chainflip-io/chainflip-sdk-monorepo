import axios from 'axios';
import { Assets, Chains } from '@/shared/enums';
import { QuoteRequest } from '../../types';
import ApiService from '../ApiService';

jest.mock('axios', () => ({
  get: jest.fn(),
  post: jest.fn(),
}));

describe('ApiService', () => {
  const mockRoute = {
    amount: '10000',
    srcChain: Chains.Bitcoin,
    srcAsset: Assets.BTC,
    destChain: Chains.Ethereum,
    destAsset: Assets.ETH,
  } satisfies QuoteRequest;

  describe(ApiService.getQuote, () => {
    const mockedGet = jest.mocked(axios.get);
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
      const route = await ApiService.getQuote('https://swapperoo.org', mockRoute, {});

      expect(route).toMatchSnapshot();
      expect(mockedGet.mock.lastCall).toMatchSnapshot();
    });

    it('gets a quote with a broker commission', async () => {
      const route = await ApiService.getQuote(
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

    it('gets a quote for a boostable swap', async () => {
      const route = await ApiService.getQuote(
        'https://swapperoo.org',
        {
          ...mockRoute,
          boostFeeBps: 100,
        },
        {},
      );

      expect(route).toMatchSnapshot();
      expect(mockedGet.mock.lastCall).toMatchSnapshot();
    });

    it('passes the signal to axios', async () => {
      await ApiService.getQuote('https://swapperoo.org', mockRoute, {
        signal: new AbortController().signal,
      });

      expect(mockedGet.mock.lastCall?.[1]?.signal).not.toBeUndefined();
    });
  });

  describe(ApiService.getStatus, () => {
    it('forwards whatever response it gets from the swap service', async () => {
      const mockedGet = jest.mocked(axios.get);
      mockedGet.mockResolvedValueOnce({ data: 'hello darkness' });
      mockedGet.mockResolvedValueOnce({ data: 'my old friend' });

      const statusRequest = { id: 'the id' };

      const status1 = await ApiService.getStatus('https://swapperoo.org', statusRequest, {});
      expect(status1).toBe('hello darkness');
      const status2 = await ApiService.getStatus('https://swapperoo.org', statusRequest, {});
      expect(status2).toBe('my old friend');
    });

    it('passes the signal to axios', async () => {
      const mockedGet = jest.mocked(axios.get);
      mockedGet.mockResolvedValueOnce({ data: null });

      await ApiService.getStatus(
        'https://swapperoo.org',
        { id: '' },
        { signal: new AbortController().signal },
      );

      expect(mockedGet.mock.lastCall?.[1]?.signal).not.toBeUndefined();
    });
  });
});

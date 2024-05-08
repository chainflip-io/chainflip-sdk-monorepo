import axios from 'axios';
import { Server } from 'http';
import request from 'supertest';
import RpcClient from '@/shared/node-apis/RpcClient';
import {
  MockedBoostPoolsDepth,
  boostPoolsDepth,
  environment,
  swapRate,
} from '@/shared/tests/fixtures';
import prisma, { QuoteResult } from '../../client';
import env from '../../config/env';
import { checkPriceWarning } from '../../pricing/checkPriceWarning';
import Quoter from '../../quoting/Quoter';
import app from '../../server';
import { isAfterSpecVersion } from '../../utils/function';

jest.mock('../../utils/function', () => ({
  ...jest.requireActual('../../utils/function'),
  isAfterSpecVersion: jest.fn().mockResolvedValue(true),
}));

jest.mock('../../quoting/Quoter');

jest.mock(
  '@/shared/node-apis/RpcClient',
  () =>
    class {
      async connect() {
        return this;
      }

      sendRequest(method: string) {
        throw new Error(`unmocked request: "${method}"`);
      }
    },
);

jest.mock('@/shared/consts', () => ({
  ...jest.requireActual('@/shared/consts'),
  getPoolsNetworkFeeHundredthPips: jest.fn().mockReturnValue(1000),
}));

jest.mock('../../pricing/checkPriceWarning.ts', () => ({
  checkPriceWarning: jest.fn(),
}));

jest.mock('axios', () => ({
  post: jest.fn(),
  create() {
    return this;
  },
}));

jest.mock('../../pricing/index');

const mockRpcs = ({
  ingressFee,
  egressFee,
  mockedBoostPoolsDepth,
}: {
  ingressFee: string;
  egressFee: string;
  mockedBoostPoolsDepth?: MockedBoostPoolsDepth;
}) =>
  jest.mocked(axios.post).mockImplementation((url, data: any) => {
    if (data.method === 'cf_environment') {
      return Promise.resolve({ data: environment({ maxSwapAmount: null, ingressFee, egressFee }) });
    }

    if (data.method === 'cf_swap_rate') {
      return Promise.resolve({
        data: swapRate({ output: `0x${(BigInt(data.params[2]) * 2n).toString(16)}` }),
      });
    }

    if (data.method === 'cf_boost_pools_depth') {
      return Promise.resolve({
        data: boostPoolsDepth(mockedBoostPoolsDepth),
      });
    }

    throw new Error(`unexpected axios call to ${url}: ${JSON.stringify(data)}`);
  });

describe('server', () => {
  let server: Server;
  const oldEnv = structuredClone(env);

  beforeAll(async () => {
    await prisma.$queryRaw`TRUNCATE TABLE "Pool" CASCADE`;
    await prisma.pool.createMany({
      data: [
        {
          baseAsset: 'Flip',
          quoteAsset: 'Usdc',
          liquidityFeeHundredthPips: 1000,
        },
        {
          baseAsset: 'Eth',
          quoteAsset: 'Usdc',
          liquidityFeeHundredthPips: 2000,
        },
        {
          baseAsset: 'Btc',
          quoteAsset: 'Usdc',
          liquidityFeeHundredthPips: 2000,
        },
      ],
    });
  });

  beforeEach(async () => {
    await prisma.$queryRaw`TRUNCATE TABLE private."QuoteResult" CASCADE`;
    server = app.listen(0);
    jest.mocked(Quoter.prototype.canQuote).mockReturnValue(false);
    mockRpcs({ ingressFee: '2000000', egressFee: '50000' });
  });

  afterEach((cb) => {
    Object.assign(env, oldEnv);
    server.close(cb);
  });

  describe('GET /quote', () => {
    it('rejects malformed requests', async () => {
      const { body, status } = await request(server).get('/quote');

      expect(status).toBe(400);
      expect(body).toMatchSnapshot();
    });

    describe('with market makers', () => {
      it('returns the market maker quotes', async () => {
        jest.mocked(Quoter.prototype.canQuote).mockReturnValueOnce(true);

        const params = new URLSearchParams({
          srcChain: 'Ethereum',
          srcAsset: 'FLIP',
          destChain: 'Ethereum',
          destAsset: 'USDC',
          amount: (100e6).toString(),
        });

        jest.spyOn(RpcClient.prototype, 'sendRequest').mockResolvedValueOnce({
          outputAmount: BigInt(990000000n),
        });

        jest.mocked(Quoter.prototype.getQuote).mockResolvedValueOnce({
          outputAmount: 999000000n,
          intermediateAmount: null,
          includedFees: [
            {
              type: 'NETWORK',
              chain: 'Ethereum',
              asset: 'USDC',
              amount: '1000000',
            },
          ],
          quoteType: 'market_maker',
        });

        const { body, status } = await request(server).get(`/quote?${params.toString()}`);

        expect(status).toBe(200);
        expect(body).toMatchSnapshot();
      });

      it('saves a quote result', async () => {
        jest.mocked(Quoter.prototype.canQuote).mockReturnValueOnce(true);

        const params = new URLSearchParams({
          srcChain: 'Ethereum',
          srcAsset: 'FLIP',
          destChain: 'Ethereum',
          destAsset: 'USDC',
          amount: (100e6).toString(),
        });

        jest.spyOn(RpcClient.prototype, 'sendRequest').mockResolvedValueOnce({
          outputAmount: BigInt(990000000n),
        });

        jest.mocked(Quoter.prototype.getQuote).mockResolvedValueOnce({
          outputAmount: 999000000n,
          intermediateAmount: null,
          includedFees: [
            {
              type: 'NETWORK',
              chain: 'Ethereum',
              asset: 'USDC',
              amount: '1000000',
            },
          ],
          quoteType: 'market_maker',
        });

        await request(server).get(`/quote?${params.toString()}`);

        const quoteResult = await Array.from({ length: 10 }).reduce<Promise<QuoteResult | null>>(
          (resultPromise) =>
            resultPromise.then((result) => result ?? prisma.quoteResult.findFirst()),
          Promise.resolve(null),
        );

        expect(quoteResult).toMatchSnapshot({
          id: expect.any(Number),
          poolDuration: expect.any(Number),
          quoterDuration: expect.any(Number),
          createdAt: expect.any(Date),
        });
      });

      it('returns pool quote if market maker quote is too low', async () => {
        jest.mocked(Quoter.prototype.canQuote).mockReturnValueOnce(true);

        const params = new URLSearchParams({
          srcChain: 'Ethereum',
          srcAsset: 'FLIP',
          destChain: 'Ethereum',
          destAsset: 'USDC',
          amount: (100e6).toString(),
        });

        jest.spyOn(RpcClient.prototype, 'sendRequest').mockResolvedValueOnce({
          outputAmount: BigInt(1000000000n),
        });

        jest.mocked(Quoter.prototype.getQuote).mockResolvedValueOnce({
          outputAmount: 1n,
          intermediateAmount: null,
          includedFees: [
            {
              type: 'NETWORK',
              chain: 'Ethereum',
              asset: 'USDC',
              amount: '1000000',
            },
          ],
          quoteType: 'market_maker',
        });

        const { body, status } = await request(server).get(`/quote?${params.toString()}`);

        expect(status).toBe(200);
        expect(body).toMatchSnapshot();
      });

      it('returns the pool quote', async () => {
        jest.mocked(Quoter.prototype.canQuote).mockReturnValueOnce(true);

        const params = new URLSearchParams({
          srcChain: 'Ethereum',
          srcAsset: 'FLIP',
          destChain: 'Ethereum',
          destAsset: 'USDC',
          amount: (100e6).toString(),
        });

        jest.spyOn(RpcClient.prototype, 'sendRequest').mockResolvedValueOnce({
          outputAmount: BigInt(1000000000n),
        });

        jest.mocked(Quoter.prototype.getQuote).mockResolvedValueOnce({
          outputAmount: 999000000n,
          intermediateAmount: null,
          includedFees: [
            {
              type: 'NETWORK',
              chain: 'Ethereum',
              asset: 'USDC',
              amount: '12345678',
            },
          ],
          quoteType: 'market_maker',
        });

        const { body, status } = await request(server).get(`/quote?${params.toString()}`);

        expect(status).toBe(200);
        expect(body).toMatchSnapshot();
      });

      it('returns the pool quote if the quoter rejects', async () => {
        jest.mocked(Quoter.prototype.canQuote).mockReturnValueOnce(true);

        const params = new URLSearchParams({
          srcChain: 'Ethereum',
          srcAsset: 'FLIP',
          destChain: 'Ethereum',
          destAsset: 'USDC',
          amount: (100e6).toString(),
        });

        jest.spyOn(RpcClient.prototype, 'sendRequest').mockResolvedValueOnce({
          outputAmount: BigInt(1000000000n),
        });

        jest.mocked(Quoter.prototype.getQuote).mockRejectedValueOnce(new Error('quoter error'));

        const { body, status } = await request(server).get(`/quote?${params.toString()}`);

        expect(status).toBe(200);
        expect(body).toMatchSnapshot();
        expect(await prisma.quoteResult.count()).toEqual(0);
      });

      it('rejects if both reject (400)', async () => {
        jest.mocked(Quoter.prototype.canQuote).mockReturnValueOnce(true);

        const params = new URLSearchParams({
          srcChain: 'Ethereum',
          srcAsset: 'FLIP',
          destChain: 'Ethereum',
          destAsset: 'USDC',
          amount: (100e6).toString(),
        });

        jest
          .spyOn(RpcClient.prototype, 'sendRequest')
          .mockRejectedValueOnce(Error('InsufficientLiquidity'));

        jest.mocked(Quoter.prototype.getQuote).mockRejectedValueOnce(Error('quoter error'));

        const { body, status } = await request(server).get(`/quote?${params.toString()}`);

        expect(status).toBe(400);
        expect(body).toEqual({ message: 'insufficient liquidity for requested amount' });
      });

      it('rejects if both reject (500)', async () => {
        jest.mocked(Quoter.prototype.canQuote).mockReturnValueOnce(true);

        const params = new URLSearchParams({
          srcChain: 'Ethereum',
          srcAsset: 'FLIP',
          destChain: 'Ethereum',
          destAsset: 'USDC',
          amount: (100e6).toString(),
        });

        jest
          .spyOn(RpcClient.prototype, 'sendRequest')
          .mockRejectedValueOnce(Error('some other error'));

        jest.mocked(Quoter.prototype.getQuote).mockRejectedValueOnce(Error('quoter error'));

        const { body, status } = await request(server).get(`/quote?${params.toString()}`);

        expect(status).toBe(500);
        expect(body).toEqual({ message: 'some other error', error: 'some other error' });
      });

      it('rejects if both reject (500, <v1.4.0)', async () => {
        jest.mocked(Quoter.prototype.canQuote).mockReturnValueOnce(true);
        jest.mocked(isAfterSpecVersion).mockResolvedValueOnce(false);

        const params = new URLSearchParams({
          srcChain: 'Ethereum',
          srcAsset: 'FLIP',
          destChain: 'Ethereum',
          destAsset: 'USDC',
          amount: (100e6).toString(),
        });

        jest
          .spyOn(RpcClient.prototype, 'sendRequest')
          .mockRejectedValueOnce(Error('InsufficientLiquidity'));

        jest.mocked(Quoter.prototype.getQuote).mockRejectedValueOnce(Error('quoter error'));

        const { body, status } = await request(server).get(`/quote?${params.toString()}`);

        expect(status).toBe(500);
        expect(body).toEqual({ message: 'InsufficientLiquidity', error: 'InsufficientLiquidity' });
      });
    });

    it('rejects if source asset is disabled', async () => {
      env.DISABLED_INTERNAL_ASSETS = ['Flip', 'Btc'];

      const params = new URLSearchParams({
        srcChain: 'Ethereum',
        srcAsset: 'FLIP',
        destChain: 'Ethereum',
        destAsset: 'ETH',
        amount: '50',
      });

      const { body, status } = await request(server).get(`/quote?${params.toString()}`);

      expect(status).toBe(503);
      expect(body).toMatchObject({
        message: 'Asset Flip is disabled',
      });
    });

    it('rejects if destination asset is disabled', async () => {
      env.DISABLED_INTERNAL_ASSETS = ['Btc', 'Eth'];

      const params = new URLSearchParams({
        srcChain: 'Ethereum',
        srcAsset: 'FLIP',
        destChain: 'Ethereum',
        destAsset: 'ETH',
        amount: '50',
      });

      const { body, status } = await request(server).get(`/quote?${params.toString()}`);

      expect(status).toBe(503);
      expect(body).toMatchObject({
        message: 'Asset Eth is disabled',
      });
    });

    it('rejects if amount is lower than minimum swap amount', async () => {
      jest.mocked(axios.post).mockResolvedValue({
        data: environment({ minDepositAmount: '0xffffff' }),
      });

      const params = new URLSearchParams({
        srcChain: 'Ethereum',
        srcAsset: 'FLIP',
        destChain: 'Ethereum',
        destAsset: 'ETH',
        amount: '50',
      });

      const { body, status } = await request(server).get(`/quote?${params.toString()}`);

      expect(status).toBe(400);
      expect(body).toMatchObject({
        message: 'expected amount is below minimum swap amount (16777215)',
      });
    });

    it('rejects if amount is higher than maximum swap amount', async () => {
      jest.mocked(axios.post).mockResolvedValue({ data: environment({ maxSwapAmount: '0x1' }) });

      const params = new URLSearchParams({
        srcChain: 'Ethereum',
        srcAsset: 'USDC',
        destChain: 'Ethereum',
        destAsset: 'FLIP',
        amount: '50',
      });

      const { body, status } = await request(server).get(`/quote?${params.toString()}`);

      expect(status).toBe(400);
      expect(body).toMatchObject({
        message: 'expected amount is above maximum swap amount (1)',
      });
    });

    it('rejects when the ingress amount is smaller than the ingress fee', async () => {
      const params = new URLSearchParams({
        srcChain: 'Ethereum',
        srcAsset: 'USDC',
        destChain: 'Ethereum',
        destAsset: 'ETH',
        amount: (1000).toString(),
      });

      const { body, status } = await request(server).get(`/quote?${params.toString()}`);

      expect(status).toBe(400);
      expect(body).toMatchObject({
        message: 'amount is lower than estimated ingress fee (2000000)',
      });
    });

    it('returns an error if backend cannot estimate ingress fee', async () => {
      const rpcEnvironment = environment({ maxSwapAmount: null });
      rpcEnvironment.result.ingress_egress.ingress_fees.Ethereum.USDC = null;
      jest.mocked(axios.post).mockResolvedValue({ data: rpcEnvironment });

      const params = new URLSearchParams({
        srcChain: 'Ethereum',
        srcAsset: 'USDC',
        destChain: 'Ethereum',
        destAsset: 'ETH',
        amount: (100e6).toString(),
      });

      const { body, status } = await request(server).get(`/quote?${params.toString()}`);

      expect(status).toBe(500);
      expect(body).toMatchObject({
        message: 'could not determine ingress fee for Usdc',
      });
    });

    it('rejects when the egress amount is smaller than the egress fee', async () => {
      const sendSpy = jest.spyOn(RpcClient.prototype, 'sendRequest').mockResolvedValueOnce({
        outputAmount: (1250).toString(),
      });

      const params = new URLSearchParams({
        srcChain: 'Ethereum',
        srcAsset: 'USDC',
        destChain: 'Ethereum',
        destAsset: 'ETH',
        amount: (100e6).toString(),
      });

      const { body, status } = await request(server).get(`/quote?${params.toString()}`);

      expect(status).toBe(400);
      expect(body).toMatchObject({
        message: 'egress amount (0) is lower than minimum egress amount (1)',
      });
      expect(sendSpy).toHaveBeenCalledTimes(1);
    });

    it('returns an error if backend cannot estimate egress fee', async () => {
      jest.mocked(axios.post).mockImplementation((url, data: any) => {
        if (data.method === 'cf_environment') {
          const rpcEnvironment = environment({ maxSwapAmount: null });
          rpcEnvironment.result.ingress_egress.egress_fees.Ethereum.ETH = null;

          return Promise.resolve({ data: rpcEnvironment });
        }

        if (data.method === 'cf_swap_rate') {
          return Promise.resolve({
            data: swapRate({
              output: `0x${(BigInt(data.params[2]) * 2n).toString(16)}`,
            }),
          });
        }

        throw new Error(`unexpected axios call to ${url}: ${JSON.stringify(data)}`);
      });

      jest.spyOn(RpcClient.prototype, 'sendRequest').mockResolvedValueOnce({
        outputAmount: (1e18).toString(),
      });

      const params = new URLSearchParams({
        srcChain: 'Ethereum',
        srcAsset: 'USDC',
        destChain: 'Ethereum',
        destAsset: 'ETH',
        amount: (100e6).toString(),
      });

      const { body, status } = await request(server).get(`/quote?${params.toString()}`);

      expect(status).toBe(500);
      expect(body).toMatchObject({
        message: 'could not determine egress fee for Eth',
      });
    });

    it('gets the quote from usdc with a broker commission', async () => {
      const sendSpy = jest.spyOn(RpcClient.prototype, 'sendRequest').mockResolvedValueOnce({
        outputAmount: (1e18).toString(),
      });

      mockRpcs({ egressFee: '25000', ingressFee: '2000000' });

      const params = new URLSearchParams({
        srcChain: 'Ethereum',
        srcAsset: 'USDC',
        destChain: 'Ethereum',
        destAsset: 'ETH',
        amount: (100e6).toString(),
        brokerCommissionBps: '10',
      });

      const { body, status } = await request(server).get(`/quote?${params.toString()}`);

      expect(status).toBe(200);

      expect(sendSpy).toHaveBeenCalledWith(
        'swap_rate',
        { asset: 'USDC', chain: 'Ethereum' },
        { asset: 'ETH', chain: 'Ethereum' },
        '97902000', // deposit amount - ingress fee - broker fee
      );
      expect(body).toMatchObject({
        egressAmount: (1e18 - 25000).toString(),
        includedFees: [
          {
            amount: '2000000',
            asset: 'USDC',
            chain: 'Ethereum',
            type: 'INGRESS',
          },
          {
            amount: '98000',
            asset: 'USDC',
            chain: 'Ethereum',
            type: 'BROKER',
          },
          {
            amount: '97902',
            asset: 'USDC',
            chain: 'Ethereum',
            type: 'NETWORK',
          },
          {
            amount: '195804',
            asset: 'USDC',
            chain: 'Ethereum',
            type: 'LIQUIDITY',
          },
          {
            amount: '25000',
            asset: 'ETH',
            chain: 'Ethereum',
            type: 'EGRESS',
          },
        ],
      });
    });

    it('gets the quote from usdc with boost information', async () => {
      jest.mocked(Quoter.prototype.canQuote).mockReturnValue(false);

      const sendSpy = jest
        .spyOn(RpcClient.prototype, 'sendRequest')
        .mockResolvedValueOnce({
          intermediateAmount: BigInt(2000e6),
          outputAmount: BigInt(1e18),
        })
        .mockResolvedValueOnce({
          intermediateAmount: BigInt(2000e6 - 5e5),
          outputAmount: BigInt(1e18 - 5e10),
        });

      mockRpcs({
        ingressFee: '100000',
        egressFee: '25000',
        mockedBoostPoolsDepth: [
          {
            chain: 'Bitcoin',
            asset: 'BTC',
            tier: 5,
            available_amount: `0x${(1e8).toString(16)}`,
          },
        ],
      });

      const params = new URLSearchParams({
        srcChain: 'Bitcoin',
        srcAsset: 'BTC',
        destChain: 'Ethereum',
        destAsset: 'ETH',
        amount: (1e8).toString(),
      });

      const { body, status } = await request(server).get(`/quote?${params.toString()}`);

      expect(status).toBe(200);

      // Normal swap
      expect(sendSpy).toHaveBeenNthCalledWith(
        1,
        'swap_rate',
        { asset: 'BTC', chain: 'Bitcoin' },
        { asset: 'ETH', chain: 'Ethereum' },
        '99900000', // deposit amount - ingress fee
      );

      // Boosted swap
      expect(sendSpy).toHaveBeenNthCalledWith(
        2,
        'swap_rate',
        { asset: 'BTC', chain: 'Bitcoin' },
        { asset: 'ETH', chain: 'Ethereum' },
        '99850000', // deposit amount - boost fee - ingress fee
      );

      expect(body).toMatchSnapshot({
        boostInformation: expect.any(Object),
      });
    });
    it("doesn't include boost information inside quote when there is no liquidity to fill the provided amount", async () => {
      jest.mocked(Quoter.prototype.canQuote).mockReturnValue(false);

      const sendSpy = jest
        .spyOn(RpcClient.prototype, 'sendRequest')
        .mockResolvedValueOnce({
          intermediateAmount: BigInt(2000e6),
          outputAmount: BigInt(1e18),
        })
        .mockResolvedValueOnce({
          intermediateAmount: BigInt(2000e6 - 5e5),
          outputAmount: BigInt(1e18 - 5e10),
        });

      mockRpcs({
        ingressFee: '100000',
        egressFee: '25000',
        mockedBoostPoolsDepth: [
          {
            chain: 'Bitcoin',
            asset: 'BTC',
            tier: 5,
            available_amount: `0x${(0.1e8).toString(16)}`,
          },
        ],
      });

      const params = new URLSearchParams({
        srcChain: 'Bitcoin',
        srcAsset: 'BTC',
        destChain: 'Ethereum',
        destAsset: 'ETH',
        amount: (1e8).toString(),
      });

      const { body, status } = await request(server).get(`/quote?${params.toString()}`);

      expect(status).toBe(200);

      expect(sendSpy).toHaveBeenCalledTimes(1);
      expect(sendSpy).toHaveBeenNthCalledWith(
        1,
        'swap_rate',
        { asset: 'BTC', chain: 'Bitcoin' },
        { asset: 'ETH', chain: 'Ethereum' },
        '99900000', // deposit amount - ingress fee
      );

      expect(body.boostInformation).toBe(undefined);
    });

    it('gets the quote from usdc from the pools', async () => {
      const sendSpy = jest.spyOn(RpcClient.prototype, 'sendRequest').mockResolvedValueOnce({
        outputAmount: (1e18).toString(),
      });
      mockRpcs({ ingressFee: '2000000', egressFee: '25000' });

      const params = new URLSearchParams({
        srcChain: 'Ethereum',
        srcAsset: 'USDC',
        destChain: 'Ethereum',
        destAsset: 'ETH',
        amount: (100e6).toString(),
      });

      const { body, status } = await request(server).get(`/quote?${params.toString()}`);

      expect(status).toBe(200);
      expect(sendSpy).toHaveBeenCalledWith(
        'swap_rate',
        { asset: 'USDC', chain: 'Ethereum' },
        { asset: 'ETH', chain: 'Ethereum' },
        '98000000', // deposit amount - ingress fee
      );
      expect(body).toMatchObject({
        egressAmount: (1e18 - 25000).toString(),
        includedFees: [
          {
            amount: '2000000',
            asset: 'USDC',
            chain: 'Ethereum',
            type: 'INGRESS',
          },
          {
            amount: '98000',
            asset: 'USDC',
            chain: 'Ethereum',
            type: 'NETWORK',
          },
          {
            amount: '196000',
            asset: 'USDC',
            chain: 'Ethereum',
            type: 'LIQUIDITY',
          },
          {
            amount: '25000',
            asset: 'ETH',
            chain: 'Ethereum',
            type: 'EGRESS',
          },
        ],
      });
    });

    it('gets the quote to usdc', async () => {
      jest.mocked(axios.post).mockImplementation((url, data: any) => {
        if (data.method === 'cf_environment') {
          return Promise.resolve({
            data: environment({
              maxSwapAmount: null,
              ingressFee: '0x61A8',
              egressFee: '0x0',
            }),
          });
        }

        if (data.method === 'cf_swap_rate') {
          return Promise.resolve({
            data: swapRate({
              output: `0x${(BigInt(data.params[2]) * 2n).toString(16)}`,
            }),
          });
        }

        if (data.method === 'cf_boost_pools_depth') {
          return Promise.resolve({
            data: boostPoolsDepth(),
          });
        }

        throw new Error(`unexpected axios call to ${url}: ${JSON.stringify(data)}`);
      });

      const sendSpy = jest.spyOn(RpcClient.prototype, 'sendRequest').mockResolvedValueOnce({
        outputAmount: BigInt(100e6),
      });

      const params = new URLSearchParams({
        srcChain: 'Ethereum',
        srcAsset: 'ETH',
        destChain: 'Ethereum',
        destAsset: 'USDC',
        amount: (1e18).toString(),
      });

      const { body, status } = await request(server).get(`/quote?${params.toString()}`);

      expect(status).toBe(200);
      expect(body).toMatchObject({
        egressAmount: (100e6).toString(),
        includedFees: [
          {
            amount: '25000',
            asset: 'ETH',
            chain: 'Ethereum',
            type: 'INGRESS',
          },
          {
            amount: '100100',
            asset: 'USDC',
            chain: 'Ethereum',
            type: 'NETWORK',
          },
          {
            amount: '1999999999999950',
            asset: 'ETH',
            chain: 'Ethereum',
            type: 'LIQUIDITY',
          },
          {
            amount: '0',
            asset: 'USDC',
            chain: 'Ethereum',
            type: 'EGRESS',
          },
        ],
      });
      expect(sendSpy).toHaveBeenCalledTimes(1);
    });

    it('gets the quote with intermediate amount', async () => {
      const sendSpy = jest.spyOn(RpcClient.prototype, 'sendRequest').mockResolvedValueOnce({
        intermediateAmount: BigInt(2000e6),
        outputAmount: BigInt(1e18),
      });
      mockRpcs({ ingressFee: '2000000', egressFee: '25000' });

      const params = new URLSearchParams({
        srcChain: 'Ethereum',
        srcAsset: 'FLIP',
        destChain: 'Ethereum',
        destAsset: 'ETH',
        amount: (1e18).toString(),
      });

      const { body, status } = await request(server).get(`/quote?${params.toString()}`);

      expect(status).toBe(200);
      expect(body).toMatchObject({
        intermediateAmount: (2000e6).toString(),
        egressAmount: (1e18 - 25000).toString(),
        includedFees: [
          {
            amount: '2000000',
            asset: 'FLIP',
            chain: 'Ethereum',
            type: 'INGRESS',
          },
          {
            amount: '2000000',
            asset: 'USDC',
            chain: 'Ethereum',
            type: 'NETWORK',
          },
          {
            amount: '999999999998000',
            asset: 'FLIP',
            chain: 'Ethereum',
            type: 'LIQUIDITY',
          },
          {
            amount: '4000000',
            asset: 'USDC',
            chain: 'Ethereum',
            type: 'LIQUIDITY',
          },
          {
            amount: '25000',
            asset: 'ETH',
            chain: 'Ethereum',
            type: 'EGRESS',
          },
        ],
      });
      expect(sendSpy).toHaveBeenCalledTimes(1);
    });

    it('gets the quote with low liquidity warning', async () => {
      const sendSpy = jest.spyOn(RpcClient.prototype, 'sendRequest').mockResolvedValueOnce({
        intermediateAmount: BigInt(2994e6),
        outputAmount: BigInt(2e18),
      });

      jest.mocked(axios.post).mockImplementation((url, data: any) => {
        if (data.method === 'cf_environment') {
          return Promise.resolve({
            data: environment({
              maxSwapAmount: null,
              ingressFee: '2000000',
              egressFee: '25000',
            }),
          });
        }

        if (data.method === 'cf_swap_rate') {
          return Promise.resolve({
            data: swapRate({
              output: `0x${(BigInt(data.params[2]) * 2n).toString(16)}`,
            }),
          });
        }

        if (data.method === 'cf_boost_pools_depth') {
          return Promise.resolve({
            data: boostPoolsDepth(),
          });
        }

        throw new Error(`unexpected axios call to ${url}: ${JSON.stringify(data)}`);
      });

      const params = new URLSearchParams({
        srcChain: 'Ethereum',
        srcAsset: 'FLIP',
        destChain: 'Ethereum',
        destAsset: 'ETH',
        amount: (1e18).toString(),
      });

      jest.mocked(checkPriceWarning).mockResolvedValueOnce(true);

      const { body, status } = await request(server).get(`/quote?${params.toString()}`);

      expect(status).toBe(200);
      expect(body).toMatchSnapshot();
      expect(sendSpy).toHaveBeenCalledTimes(1);
    });

    it('is not disabled in maintenance mode', async () => {
      env.MAINTENANCE_MODE = true;
      const { status } = await request(app).get('/quote');
      expect(status).not.toBe(503);
    });

    it('is disabled by flag', async () => {
      env.DISABLE_QUOTING = true;
      const { status } = await request(app).get('/quote');
      expect(status).toBe(503);
    });

    it('gets the quote for deprecated params without the chain', async () => {
      jest.spyOn(RpcClient.prototype, 'sendRequest').mockResolvedValueOnce({
        intermediateAmount: BigInt(2000e6),
        outputAmount: BigInt(1e18),
      });

      jest.mocked(axios.post).mockImplementation((url, data: any) => {
        if (data.method === 'cf_environment') {
          return Promise.resolve({
            data: environment({
              maxSwapAmount: null,
              ingressFee: '2000000',
              egressFee: '25000',
            }),
          });
        }

        if (data.method === 'cf_swap_rate') {
          return Promise.resolve({
            data: swapRate({
              output: `0x${(BigInt(data.params[2]) * 2n).toString(16)}`,
            }),
          });
        }

        if (data.method === 'cf_boost_pools_depth') {
          return Promise.resolve({
            data: boostPoolsDepth(),
          });
        }

        throw new Error(`unexpected axios call to ${url}: ${JSON.stringify(data)}`);
      });

      const params = new URLSearchParams({
        srcAsset: 'FLIP',
        destAsset: 'ETH',
        amount: (1e18).toString(),
      });

      const { body, status } = await request(server).get(`/quote?${params.toString()}`);

      expect(status).toBe(200);
      expect(body).toMatchSnapshot();
    });

    it('gets the quote when ingress and egress fee is returned as fee asset amount', async () => {
      jest.spyOn(RpcClient.prototype, 'sendRequest').mockResolvedValueOnce({
        outputAmount: BigInt(2000e6),
      });

      const rpcEnvironment = environment();
      rpcEnvironment.result.ingress_egress.ingress_fees.Ethereum.FLIP = '0xF4240'; // 1000000
      rpcEnvironment.result.ingress_egress.ingress_fees.Ethereum.USDC = '0xB71B0'; // 750000
      rpcEnvironment.result.ingress_egress.egress_fees.Ethereum.FLIP = '0xF4240'; // 1000000
      rpcEnvironment.result.ingress_egress.egress_fees.Ethereum.USDC = '0xB71B0'; // 750000

      jest.mocked(axios.post).mockImplementation((url, data: any) => {
        if (data.method === 'cf_environment') {
          return Promise.resolve({
            data: rpcEnvironment,
          });
        }

        if (data.method === 'cf_swap_rate') {
          return Promise.resolve({
            data: swapRate({
              output: `0x${(BigInt(data.params[2]) * 5n).toString(16)}`,
            }),
          });
        }

        if (data.method === 'cf_boost_pools_depth') {
          return Promise.resolve({
            data: boostPoolsDepth(),
          });
        }

        throw new Error(`unexpected axios call to ${url}: ${JSON.stringify(data)}`);
      });

      const params = new URLSearchParams({
        srcAsset: 'FLIP',
        destAsset: 'USDC',
        amount: (1e18).toString(),
      });

      const { body, status } = await request(server).get(`/quote?${params.toString()}`);
      expect(status).toBe(200);
      expect(body).toMatchSnapshot();
    });
  });
});

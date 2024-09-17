import { CfSwapRateV2, CfSwapRateV2Response, WsClient } from '@chainflip/rpc';
import { hexEncodeNumber } from '@chainflip/utils/number';
import { Server } from 'http';
import request from 'supertest';
import { getAssetAndChain } from '@/shared/enums';
import {
  MockedBoostPoolsDepth,
  boostPoolsDepth,
  cfAccountInfo,
  cfPoolDepth,
  environment,
  mockRpcResponse,
  swapRate,
} from '@/shared/tests/fixtures';
import prisma, { InternalAsset } from '../../../client';
import env from '../../../config/env';
import { getUsdValue } from '../../../pricing/checkPriceWarning';
import Quoter from '../../../quoting/Quoter';
import app from '../../../server';
import { boostPoolsCache } from '../../../utils/boost';
import { getDcaQuoteParams } from '../../v2/quote';

jest.mock('../../../utils/function', () => ({
  ...jest.requireActual('../../../utils/function'),
  isAfterSpecVersion: jest.fn().mockResolvedValue(true),
}));

jest.mock('../../../quoting/Quoter');

jest.mock('@chainflip/rpc', () => ({
  ...jest.requireActual('@chainflip/rpc'),
  WsClient: class {
    async connect() {
      return this;
    }

    sendRequest(method: string) {
      throw new Error(`unmocked request: "${method}"`);
    }
  },
}));

jest.mock('@/shared/consts', () => ({
  ...jest.requireActual('@/shared/consts'),
  getPoolsNetworkFeeHundredthPips: jest.fn().mockReturnValue(1000),
}));
jest.mock('../../../pricing/index');
jest.mock('../../../pricing/checkPriceWarning', () => ({
  checkPriceWarning: jest.fn(),
  getUsdValue: jest.fn().mockResolvedValue(undefined),
}));

describe(getDcaQuoteParams, () => {
  beforeEach(() => {
    jest.clearAllMocks();
    env.DCA_CHUNK_SIZE_USD = { Btc: 3000 };
    env.DCA_CHUNK_INTERVAL_BLOCKS = 2;
    env.DCA_DEFAULT_CHUNK_SIZE_USD = 2000;
  });

  it('should correctly return 9060 usd worth of btc', async () => {
    jest.mocked(getUsdValue).mockResolvedValue('9060');

    const result = await getDcaQuoteParams('Btc', 27180n);
    expect(result).toMatchInlineSnapshot(`
    {
      "addedDurationSeconds": 36,
      "chunkSize": 6795n,
      "numberOfChunks": 4,
    }
    `);
  });

  it('should correctly return 9300 usd worth of btc', async () => {
    jest.mocked(getUsdValue).mockResolvedValue('9300');

    const result = await getDcaQuoteParams('Btc', 27900n);
    expect(result).toMatchInlineSnapshot(`
    {
      "addedDurationSeconds": 36,
      "chunkSize": 6975n,
      "numberOfChunks": 4,
    }
    `);
  });

  it('should correctly handle 300 usd worth of btc', async () => {
    jest.mocked(getUsdValue).mockResolvedValue('300');

    const result = await getDcaQuoteParams('Btc', 900n);
    expect(result).toMatchInlineSnapshot(`
    {
      "addedDurationSeconds": 0,
      "chunkSize": 900n,
      "numberOfChunks": 1,
    }
    `);
  });

  it('should correctly handle 30 usd worth of btc', async () => {
    jest.mocked(getUsdValue).mockResolvedValue('30');

    const result = await getDcaQuoteParams('Btc', 90n);
    expect(result).toMatchInlineSnapshot(`
    {
      "addedDurationSeconds": 0,
      "chunkSize": 90n,
      "numberOfChunks": 1,
    }
    `);
  });
});

const buildFee = (asset: InternalAsset, amount: bigint | number) => ({
  bigint: {
    amount: BigInt(amount),
    ...getAssetAndChain(asset),
  },
  string: {
    amount: hexEncodeNumber(amount),
    ...getAssetAndChain(asset),
  },
});

const mockRpcs = ({
  ingressFee,
  egressFee,
  mockedBoostPoolsDepth,
}: {
  ingressFee: string;
  egressFee: string;
  mockedBoostPoolsDepth?: MockedBoostPoolsDepth;
  swapRate?: CfSwapRateV2Response;
}) =>
  mockRpcResponse((url, data: any) => {
    if (data.method === 'cf_environment') {
      return Promise.resolve({
        data: environment({ maxSwapAmount: null, ingressFee, egressFee }),
      });
    }

    if (data.method === 'cf_swap_rate_v2') {
      return Promise.resolve({
        data: swapRate({ output: hexEncodeNumber(BigInt(data.params[2]) * 2n) }),
        ...swapRate,
      });
    }

    if (data.method === 'cf_boost_pools_depth') {
      return Promise.resolve({
        data: boostPoolsDepth(mockedBoostPoolsDepth),
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
    jest.mocked(getUsdValue).mockResolvedValue(undefined);
    await prisma.$queryRaw`TRUNCATE TABLE private."QuoteResult" CASCADE`;
    server = app.listen(0);
    jest.mocked(Quoter.prototype.getLimitOrders).mockResolvedValue([]);
    mockRpcs({ ingressFee: hexEncodeNumber(2000000), egressFee: hexEncodeNumber(50000) });
    // eslint-disable-next-line dot-notation
    boostPoolsCache['store'].clear();
  });

  afterEach((cb) => {
    Object.assign(env, oldEnv);
    server.close(cb);
  });

  describe('GET /v2/quote', () => {
    it('rejects malformed requests', async () => {
      const { body, status } = await request(server).get('/v2/quote');

      expect(status).toBe(400);
      expect(body).toMatchSnapshot();
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

      const { body, status } = await request(server).get(`/v2/quote?${params.toString()}`);

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

      const { body, status } = await request(server).get(`/v2/quote?${params.toString()}`);

      expect(status).toBe(503);
      expect(body).toMatchObject({
        message: 'Asset Eth is disabled',
      });
    });

    it('rejects if amount is lower than minimum swap amount', async () => {
      mockRpcResponse({
        data: environment({ minDepositAmount: '0xffffff' }),
      });

      const params = new URLSearchParams({
        srcChain: 'Ethereum',
        srcAsset: 'FLIP',
        destChain: 'Ethereum',
        destAsset: 'ETH',
        amount: '50',
      });

      const { body, status } = await request(server).get(`/v2/quote?${params.toString()}`);

      expect(status).toBe(400);
      expect(body).toMatchObject({
        message: 'expected amount is below minimum swap amount (16777215)',
      });
    });

    it('rejects if amount is higher than maximum swap amount', async () => {
      mockRpcResponse({ data: environment({ maxSwapAmount: '0x1' }) });

      const params = new URLSearchParams({
        srcChain: 'Ethereum',
        srcAsset: 'USDC',
        destChain: 'Ethereum',
        destAsset: 'FLIP',
        amount: '50',
      });

      const { body, status } = await request(server).get(`/v2/quote?${params.toString()}`);

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

      const { body, status } = await request(server).get(`/v2/quote?${params.toString()}`);

      expect(status).toBe(400);
      expect(body).toMatchObject({
        message: 'amount is lower than estimated ingress fee (2000000)',
      });
    });

    it('returns an error if backend cannot estimate ingress fee', async () => {
      const rpcEnvironment = environment({ maxSwapAmount: null });
      rpcEnvironment.result.ingress_egress.ingress_fees.Ethereum.USDC = null;
      mockRpcResponse({ data: rpcEnvironment });

      const params = new URLSearchParams({
        srcChain: 'Ethereum',
        srcAsset: 'USDC',
        destChain: 'Ethereum',
        destAsset: 'ETH',
        amount: (100e6).toString(),
      });

      const { body, status } = await request(server).get(`/v2/quote?${params.toString()}`);

      expect(status).toBe(500);
      expect(body).toMatchObject({
        message: 'could not determine ingress fee for Usdc',
      });
    });

    it('rejects when the egress amount is smaller than the egress fee', async () => {
      const sendSpy = jest.spyOn(WsClient.prototype, 'sendRequest').mockResolvedValueOnce({
        egress_fee: buildFee('Eth', 25000).bigint,
        network_fee: buildFee('Usdc', 2000000).bigint,
        ingress_fee: buildFee('Usdc', 2000000).bigint,
        intermediary: null,
        output: 0n,
      } as CfSwapRateV2);

      const params = new URLSearchParams({
        srcChain: 'Ethereum',
        srcAsset: 'USDC',
        destChain: 'Ethereum',
        destAsset: 'ETH',
        amount: (100e6).toString(),
      });

      const { body, status } = await request(server).get(`/v2/quote?${params.toString()}`);

      expect(status).toBe(400);
      expect(body).toMatchObject({
        message: 'swap output amount is lower than the egress fee (50000)',
      });
      expect(sendSpy).toHaveBeenCalledTimes(1);
    });

    it('gets the quote to USDC', async () => {
      mockRpcResponse((url, data: any) => {
        if (data.method === 'cf_environment') {
          return Promise.resolve({
            data: environment({
              maxSwapAmount: null,
              ingressFee: hexEncodeNumber(0x61a8),
              egressFee: hexEncodeNumber(0x0),
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

      const sendSpy = jest.spyOn(WsClient.prototype, 'sendRequest').mockResolvedValueOnce({
        ingress_fee: buildFee('Eth', 25000).bigint,
        egress_fee: buildFee('Usdc', 0).bigint,
        network_fee: buildFee('Usdc', 100100).bigint,
        intermediary: null,
        output: BigInt(100e6),
      });

      const params = new URLSearchParams({
        srcChain: 'Ethereum',
        srcAsset: 'ETH',
        destChain: 'Ethereum',
        destAsset: 'USDC',
        amount: (1e18).toString(),
      });

      const { body, status } = await request(server).get(`/v2/quote?${params.toString()}`);

      expect(status).toBe(200);
      expect(body).toMatchObject([
        {
          egressAmount: (100e6).toString(),
          estimatedDurationSeconds: 54,
          estimatedPrice: '100',
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
              amount: '0',
              asset: 'USDC',
              chain: 'Ethereum',
              type: 'EGRESS',
            },
          ],
          poolInfo: [
            {
              baseAsset: { asset: 'ETH', chain: 'Ethereum' },
              fee: {
                amount: '2000000000000000',
                asset: 'ETH',
                chain: 'Ethereum',
              },
              quoteAsset: { asset: 'USDC', chain: 'Ethereum' },
            },
          ],
        },
      ]);
      expect(sendSpy).toHaveBeenCalledTimes(1);
    });

    it('gets the DCA quote to USDC', async () => {
      env.DCA_CHUNK_SIZE_USD = { Eth: 3000 };
      env.DCA_CHUNK_INTERVAL_BLOCKS = 2;
      env.DCA_DEFAULT_CHUNK_SIZE_USD = 2000;
      jest.mocked(getUsdValue).mockResolvedValue('9800');

      mockRpcResponse((url, data: any) => {
        if (data.method === 'cf_environment') {
          return Promise.resolve({
            data: environment({
              maxSwapAmount: null,
              ingressFee: hexEncodeNumber(0x61a8),
              egressFee: hexEncodeNumber(0x0),
            }),
          });
        }

        if (data.method === 'cf_boost_pools_depth') {
          return Promise.resolve({
            data: boostPoolsDepth(),
          });
        }

        if (data.method === 'cf_accounts') {
          return Promise.resolve({
            data: {
              id: 1,
              jsonrpc: '2.0',
              result: [
                ['cFMYYJ9F1r1pRo3NBbnQDVRVRwY9tYem39gcfKZddPjvfsFfH', 'Chainflip Testnet Broker 2'],
              ],
            },
          });
        }

        if (data.method === 'cf_account_info') {
          return Promise.resolve({
            data: cfAccountInfo(),
          });
        }

        if (data.method === 'cf_pool_depth') {
          return Promise.resolve({
            data: cfPoolDepth(),
          });
        }

        throw new Error(`unexpected axios call to ${url}: ${JSON.stringify(data)}`);
      });

      const sendSpy = jest
        .spyOn(WsClient.prototype, 'sendRequest')
        .mockResolvedValueOnce({
          ingress_fee: buildFee('Eth', 25000).bigint,
          egress_fee: buildFee('Usdc', 0).bigint,
          network_fee: buildFee('Usdc', 100100).bigint,
          intermediary: null,
          output: BigInt(100e6),
        })
        .mockResolvedValueOnce({
          ingress_fee: buildFee('Eth', 25000).bigint,
          egress_fee: buildFee('Usdc', 0).bigint,
          network_fee: buildFee('Usdc', 100100).bigint,
          intermediary: null,
          output: BigInt(100e6),
        });

      const params = new URLSearchParams({
        srcChain: 'Ethereum',
        srcAsset: 'ETH',
        destChain: 'Ethereum',
        destAsset: 'USDC',
        amount: (1e18).toString(),
      });

      const { body, status } = await request(server).get(`/v2/quote?${params.toString()}`);

      expect(status).toBe(200);
      expect(body).toEqual([
        {
          egressAmount: (100e6).toString(),
          estimatedDurationSeconds: 54,
          estimatedPrice: '100',
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
              amount: '0',
              asset: 'USDC',
              chain: 'Ethereum',
              type: 'EGRESS',
            },
          ],
          poolInfo: [
            {
              baseAsset: { asset: 'ETH', chain: 'Ethereum' },
              fee: {
                amount: '2000000000000000',
                asset: 'ETH',
                chain: 'Ethereum',
              },
              quoteAsset: { asset: 'USDC', chain: 'Ethereum' },
            },
          ],
        },
        {
          egressAmount: (400000000).toString(),
          estimatedDurationSeconds: 90,
          estimatedPrice: '400',
          includedFees: [
            {
              amount: '25000',
              asset: 'ETH',
              chain: 'Ethereum',
              type: 'INGRESS',
            },
            {
              amount: '400400',
              asset: 'USDC',
              chain: 'Ethereum',
              type: 'NETWORK',
            },
            {
              amount: '0',
              asset: 'USDC',
              chain: 'Ethereum',
              type: 'EGRESS',
            },
          ],
          poolInfo: [
            {
              baseAsset: { asset: 'ETH', chain: 'Ethereum' },
              fee: {
                amount: '500000000000000',
                asset: 'ETH',
                chain: 'Ethereum',
              },
              quoteAsset: { asset: 'USDC', chain: 'Ethereum' },
            },
          ],
          dcaParams: {
            chunkInterval: 2,
            numberOfChunks: 4,
          },
        },
      ]);
      expect(sendSpy).toHaveBeenCalledTimes(2);
    });
  });
});

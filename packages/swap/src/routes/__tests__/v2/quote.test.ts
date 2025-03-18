import { CfSwapRateV3Response, CfSwapRateV3, WsClient } from '@chainflip/rpc';
import { hexEncodeNumber } from '@chainflip/utils/number';
import { Server } from 'http';
import request from 'supertest';
import { describe, it, beforeEach, beforeAll, afterEach, expect, vi } from 'vitest';
import { getAssetAndChain } from '@/shared/enums';
import {
  MockedBoostPoolsDepth,
  boostPoolsDepth,
  cfAccountInfo,
  cfPoolDepth,
  environment,
  mockRpcResponse,
} from '@/shared/tests/fixtures';
import { isAtLeastSpecVersion } from '@/swap/utils/function';
import prisma, { InternalAsset } from '../../../client';
import env from '../../../config/env';
import { getUsdValue } from '../../../pricing/checkPriceWarning';
import Quoter from '../../../quoting/Quoter';
import app from '../../../server';
import { boostPoolsCache } from '../../../utils/boost';
import { getTotalLiquidity } from '../../../utils/pools';
import { getDcaQuoteParams, MAX_NUMBER_OF_CHUNKS } from '../../v2/quote';

vi.mock('../../../utils/function', async (importOriginal) => {
  const original = (await importOriginal()) as object;
  return {
    ...original,
    isAtLeastSpecVersion: vi.fn().mockResolvedValue(true),
  };
});

vi.mock('../../../utils/pools', async (importOriginal) => {
  const original = (await importOriginal()) as object;
  return {
    ...original,
    getTotalLiquidity: vi.fn(),
  };
});

vi.mock('../../../quoting/Quoter');

vi.mock('@chainflip/rpc', async (importOriginal) => {
  const original = (await importOriginal()) as object;
  return {
    ...original,
    WsClient: class {
      async connect() {
        return this;
      }

      sendRequest(method: string) {
        throw new Error(`unmocked request: "${method}"`);
      }
    },
  };
});

vi.mock('@/shared/consts', async (importOriginal) => {
  const original = (await importOriginal()) as object;
  return {
    ...original,
    getPoolsNetworkFeeHundredthPips: vi.fn().mockReturnValue(1000),
  };
});
vi.mock('../../../pricing/index');
vi.mock('../../../pricing/checkPriceWarning', () => ({
  checkPriceWarning: vi.fn(),
  getUsdValue: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../../polkadot/api', () => ({
  getBoostSafeMode: vi.fn().mockResolvedValue(true),
}));

describe(getDcaQuoteParams, () => {
  beforeEach(() => {
    vi.clearAllMocks();
    env.DCA_CHUNK_SIZE_USD = { Btc: 3000 };
    env.DCA_CHUNK_INTERVAL_BLOCKS = 2;
    env.DCA_DEFAULT_CHUNK_SIZE_USD = 2000;
  });

  it('should correctly return 9060 usd worth of btc', async () => {
    vi.mocked(getUsdValue).mockResolvedValue('9060');

    const result = await getDcaQuoteParams('Btc', 27180n);
    expect(result).toMatchInlineSnapshot(`
    {
      "additionalSwapDurationSeconds": 36,
      "chunkSize": 6795n,
      "numberOfChunks": 4,
    }
    `);
  });

  it('should correctly return 9300 usd worth of btc', async () => {
    vi.mocked(getUsdValue).mockResolvedValue('9300');

    const result = await getDcaQuoteParams('Btc', 27900n);
    expect(result).toMatchInlineSnapshot(`
    {
      "additionalSwapDurationSeconds": 36,
      "chunkSize": 6975n,
      "numberOfChunks": 4,
    }
    `);
  });

  it('should correctly handle 300 usd worth of btc', async () => {
    vi.mocked(getUsdValue).mockResolvedValue('300');

    const result = await getDcaQuoteParams('Btc', 900n);
    expect(result).toEqual(null);
  });

  it('should correctly handle 30 usd worth of btc', async () => {
    vi.mocked(getUsdValue).mockResolvedValue('30');

    const result = await getDcaQuoteParams('Btc', 90n);
    expect(result).toEqual(null);
  });

  it('should correctly handle number of chunks bigger than max', async () => {
    const chunkSizeUsd = BigInt(env.DCA_CHUNK_SIZE_USD?.Btc ?? env.DCA_DEFAULT_CHUNK_SIZE_USD);
    const maxUsdValue = BigInt(MAX_NUMBER_OF_CHUNKS) * chunkSizeUsd + 1n;
    vi.mocked(getUsdValue).mockResolvedValue(maxUsdValue.toString());

    const result = await getDcaQuoteParams('Btc', 1n);
    expect(result).toEqual(null);
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
  swapRate?: CfSwapRateV3Response;
}) =>
  mockRpcResponse((url, data: any) => {
    if (data.method === 'cf_environment') {
      return Promise.resolve({
        data: environment({ maxSwapAmount: null, ingressFee, egressFee }),
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
    vi.mocked(getUsdValue).mockResolvedValue(undefined);
    server = app.listen(0);
    vi.mocked(Quoter.prototype.getLimitOrders).mockResolvedValue([]);
    vi.mocked(getTotalLiquidity).mockResolvedValue(BigInt(200e6));
    mockRpcs({ ingressFee: hexEncodeNumber(2000000), egressFee: hexEncodeNumber(50000) });
    // eslint-disable-next-line dot-notation
    boostPoolsCache['store'].clear();
  });

  afterEach(() => {
    Object.assign(env, oldEnv);
    server.close();
    vi.clearAllMocks();
  });

  describe('GET /v2/quote', () => {
    it('rejects malformed requests', async () => {
      const { body, status } = await request(server).get('/v2/quote');

      expect(status).toBe(400);
      expect(body).toMatchSnapshot();
    });

    it('rejects if source asset is disabled', async () => {
      env.FULLY_DISABLED_INTERNAL_ASSETS = ['Flip', 'Btc'];

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
      env.FULLY_DISABLED_INTERNAL_ASSETS = ['Btc', 'Eth'];

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

    it('rejects if the amount is 0', async () => {
      const params = new URLSearchParams({
        srcChain: 'Ethereum',
        srcAsset: 'FLIP',
        destChain: 'Ethereum',
        destAsset: 'ETH',
        amount: '0',
      });

      const { body, status } = await request(server).get(`/v2/quote?${params.toString()}`);

      expect(status).toBe(400);
      expect(body).toMatchObject({
        message: 'invalid request',
      });
    });

    it('rejects if the amount is greater than 2**128', async () => {
      const params = new URLSearchParams({
        srcChain: 'Ethereum',
        srcAsset: 'FLIP',
        destChain: 'Ethereum',
        destAsset: 'ETH',
        amount: String(2n ** 128n + 1n),
      });

      const { body, status } = await request(server).get(`/v2/quote?${params.toString()}`);

      expect(status).toBe(400);
      expect(body).toMatchObject({
        message: 'invalid request',
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

    it('rejects if it is a vault swap quote on Polkadot source chain', async () => {
      const params = new URLSearchParams({
        srcChain: 'Polkadot',
        srcAsset: 'DOT',
        destChain: 'Ethereum',
        destAsset: 'ETH',
        amount: (1000).toString(),
        isVaultSwap: 'true',
      });

      const { body, status } = await request(server).get(`/v2/quote?${params.toString()}`);

      expect(status).toBe(400);
      expect(body).toMatchObject({
        message: 'Polkadot does not support vault swaps',
      });
    });

    it('rejects when the egress amount is smaller than the egress fee', async () => {
      const sendSpy = vi.spyOn(WsClient.prototype, 'sendRequest').mockResolvedValueOnce({
        broker_commission: buildFee('Usdc', 0).bigint,
        egress_fee: buildFee('Eth', 25000).bigint,
        network_fee: buildFee('Usdc', 2000000).bigint,
        ingress_fee: buildFee('Usdc', 2000000).bigint,
        intermediary: null,
        output: 0n,
      } as CfSwapRateV3);

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

    it('throws 400 if totalLiquidity is lower than egressAmount', async () => {
      vi.mocked(getTotalLiquidity).mockResolvedValueOnce(BigInt(0));

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

        if (data.method === 'cf_pool_depth') {
          return Promise.resolve({
            data: cfPoolDepth(),
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

        throw new Error(`unexpected axios call to ${url}: ${JSON.stringify(data)}`);
      });

      const sendSpy = vi.spyOn(WsClient.prototype, 'sendRequest').mockResolvedValueOnce({
        broker_commission: buildFee('Usdc', 0).bigint,
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

      expect(status).toBe(400);
      expect(body.message).toBe('Insufficient liquidity for the requested amount');
      expect(sendSpy).toHaveBeenCalledTimes(1);
    });

    it("uses 0 as ingress fee when the protocol can't estimate it", async () => {
      vi.mocked(getTotalLiquidity).mockResolvedValueOnce(BigInt(2e18));
      const rpcEnvironment = environment({ maxSwapAmount: null });
      rpcEnvironment.result.ingress_egress.ingress_fees.Ethereum.USDC = null;
      mockRpcResponse((url, data: any) => {
        if (data.method === 'cf_environment') {
          return Promise.resolve({
            data: rpcEnvironment,
          });
        }

        if (data.method === 'cf_boost_pools_depth') {
          return Promise.resolve({
            data: boostPoolsDepth(),
          });
        }

        if (data.method === 'cf_pool_depth') {
          return Promise.resolve({
            data: cfPoolDepth(),
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

        throw new Error(`unexpected axios call to ${url}: ${JSON.stringify(data)}`);
      });
      vi.spyOn(WsClient.prototype, 'sendRequest').mockResolvedValueOnce({
        broker_commission: buildFee('Usdc', 0).bigint,
        ingress_fee: buildFee('Usdc', 0).bigint,
        egress_fee: buildFee('Eth', 0).bigint,
        network_fee: buildFee('Usdc', 100100).bigint,
        intermediary: null,
        output: BigInt(1e18),
      });

      const params = new URLSearchParams({
        srcChain: 'Ethereum',
        srcAsset: 'USDC',
        destChain: 'Ethereum',
        destAsset: 'ETH',
        amount: (100e6).toString(),
      });

      const { body, status } = await request(server).get(`/v2/quote?${params.toString()}`);

      expect(status).toBe(200);
      expect(body).toMatchObject([
        {
          egressAmount: '1000000000000000000',
          recommendedSlippageTolerancePercent: 1,
          includedFees: [
            { type: 'INGRESS', chain: 'Ethereum', asset: 'USDC', amount: '0' },
            { type: 'NETWORK', chain: 'Ethereum', asset: 'USDC', amount: '100100' },
            { type: 'EGRESS', chain: 'Ethereum', asset: 'ETH', amount: '0' },
          ],
          poolInfo: [
            {
              baseAsset: { chain: 'Ethereum', asset: 'ETH' },
              quoteAsset: { chain: 'Ethereum', asset: 'USDC' },
              fee: { chain: 'Ethereum', asset: 'USDC', amount: '200000' },
            },
          ],
          estimatedDurationsSeconds: { deposit: 30, swap: 12, egress: 102 },
          estimatedDurationSeconds: 144,
          estimatedPrice: '0.01',
          type: 'REGULAR',
          srcAsset: { chain: 'Ethereum', asset: 'USDC' },
          destAsset: { chain: 'Ethereum', asset: 'ETH' },
          depositAmount: '100000000',
        },
      ]);
    });

    it('excludes the ingress fee for vault swaps', async () => {
      vi.mocked(getTotalLiquidity).mockResolvedValueOnce(BigInt(2e18));

      const sendSpy = vi.spyOn(WsClient.prototype, 'sendRequest').mockResolvedValueOnce({
        broker_commission: buildFee('Usdc', 0).bigint,
        ingress_fee: buildFee('Usdc', 0).bigint,
        egress_fee: buildFee('Eth', 0).bigint,
        network_fee: buildFee('Usdc', 100100).bigint,
        intermediary: null,
        output: BigInt(1e18),
      });

      const params = new URLSearchParams({
        srcChain: 'Ethereum',
        srcAsset: 'USDC',
        destChain: 'Ethereum',
        destAsset: 'ETH',
        amount: (100e6).toString(),
        isVaultSwap: 'true',
      });

      const { status, body } = await request(server).get(`/v2/quote?${params.toString()}`);
      expect(status).toBe(200);
      expect(body).toMatchObject([
        {
          srcAsset: { chain: 'Ethereum', asset: 'USDC' },
          destAsset: { chain: 'Ethereum', asset: 'ETH' },
          isVaultSwap: true,
        },
      ]);
      expect(sendSpy).toHaveBeenNthCalledWith(
        1,
        'cf_swap_rate_v3',
        { asset: 'USDC', chain: 'Ethereum' },
        { asset: 'ETH', chain: 'Ethereum' },
        '0x5f5e100',
        0,
        undefined,
        undefined,
        ['IngressDepositChannel'],
        [],
      );
    });

    it('does not pass excluded fees and ccm params to the rpc for version < 180', async () => {
      vi.mocked(getTotalLiquidity).mockResolvedValueOnce(BigInt(2e18));
      vi.mocked(isAtLeastSpecVersion).mockResolvedValueOnce(false);

      const sendSpy = vi.spyOn(WsClient.prototype, 'sendRequest').mockResolvedValueOnce({
        broker_commission: buildFee('Usdc', 0).bigint,
        ingress_fee: buildFee('Usdc', 0).bigint,
        egress_fee: buildFee('Eth', 0).bigint,
        network_fee: buildFee('Usdc', 100100).bigint,
        intermediary: null,
        output: BigInt(1e18),
      });

      const params = new URLSearchParams({
        srcChain: 'Ethereum',
        srcAsset: 'USDC',
        destChain: 'Ethereum',
        destAsset: 'ETH',
        amount: (100e6).toString(),
      });

      const { status } = await request(server).get(`/v2/quote?${params.toString()}`);
      expect(status).toBe(200);
      expect(sendSpy).toHaveBeenNthCalledWith(
        1,
        'cf_swap_rate_v3',
        { asset: 'USDC', chain: 'Ethereum' },
        { asset: 'ETH', chain: 'Ethereum' },
        '0x5f5e100',
        0,
        undefined,
        [],
      );
    });

    it('does not throw if totalLiquidity is higher than egressAmount', async () => {
      vi.mocked(getTotalLiquidity).mockResolvedValueOnce(BigInt(200e6));
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

        if (data.method === 'cf_pool_depth') {
          return Promise.resolve({
            data: cfPoolDepth(),
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

        throw new Error(`unexpected axios call to ${url}: ${JSON.stringify(data)}`);
      });
      vi.spyOn(WsClient.prototype, 'sendRequest').mockResolvedValueOnce({
        broker_commission: buildFee('Usdc', 0).bigint,
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
          egressAmount: '100000000',
          recommendedSlippageTolerancePercent: 1,
          includedFees: [
            { type: 'INGRESS', chain: 'Ethereum', asset: 'ETH', amount: '25000' },
            { type: 'NETWORK', chain: 'Ethereum', asset: 'USDC', amount: '100100' },
            { type: 'EGRESS', chain: 'Ethereum', asset: 'USDC', amount: '0' },
          ],
          poolInfo: [
            {
              baseAsset: { chain: 'Ethereum', asset: 'ETH' },
              quoteAsset: { chain: 'Ethereum', asset: 'USDC' },
              fee: { chain: 'Ethereum', asset: 'ETH', amount: '1999999999999950' },
            },
          ],
          estimatedDurationsSeconds: { deposit: 30, swap: 12, egress: 102 },
          estimatedDurationSeconds: 144,
          estimatedPrice: '100.0000000000025',
          type: 'REGULAR',
          srcAsset: { chain: 'Ethereum', asset: 'ETH' },
          destAsset: { chain: 'Ethereum', asset: 'USDC' },
          depositAmount: '1000000000000000000',
        },
      ]);
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

        if (data.method === 'cf_pool_depth') {
          return Promise.resolve({
            data: cfPoolDepth(),
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

        throw new Error(`unexpected axios call to ${url}: ${JSON.stringify(data)}`);
      });

      const sendSpy = vi.spyOn(WsClient.prototype, 'sendRequest').mockResolvedValueOnce({
        broker_commission: buildFee('Usdc', 0).bigint,
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
          estimatedDurationSeconds: 144,
          estimatedDurationsSeconds: {
            deposit: 30,
            egress: 102,
            swap: 12,
          },
          estimatedPrice: '100.0000000000025',
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
                amount: '1999999999999950',
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

    it('gets the quote with ccm params', async () => {
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

        if (data.method === 'cf_pool_depth') {
          return Promise.resolve({
            data: cfPoolDepth(),
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

        throw new Error(`unexpected axios call to ${url}: ${JSON.stringify(data)}`);
      });

      const sendSpy = vi.spyOn(WsClient.prototype, 'sendRequest').mockResolvedValueOnce({
        broker_commission: buildFee('Usdc', 0).bigint,
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
        ccmGasBudget: '12345',
        ccmMessageLengthBytes: '321',
        amount: (1e18).toString(),
      });

      const { body, status } = await request(server).get(`/v2/quote?${params.toString()}`);

      expect(status).toBe(200);
      expect(body).toMatchObject([
        {
          egressAmount: (100e6).toString(),
          estimatedDurationSeconds: 144,
          estimatedDurationsSeconds: {
            deposit: 30,
            egress: 102,
            swap: 12,
          },
          estimatedPrice: '100.0000000000025',
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
                amount: '1999999999999950',
                asset: 'ETH',
                chain: 'Ethereum',
              },
              quoteAsset: { asset: 'USDC', chain: 'Ethereum' },
            },
          ],
        },
      ]);
      expect(sendSpy).toHaveBeenCalledTimes(1);
      expect(sendSpy).toHaveBeenCalledWith(
        'cf_swap_rate_v3',
        { asset: 'ETH', chain: 'Ethereum' },
        { asset: 'USDC', chain: 'Ethereum' },
        '0xde0b6b3a7640000', // 1e18
        0,
        undefined,
        {
          gas_budget: '0x3039',
          message_length: 321,
        },
        [],
        [],
      );
    });

    it('gets the DCA quote to USDC', async () => {
      env.DCA_CHUNK_SIZE_USD = { Eth: 3000 };
      env.DCA_CHUNK_INTERVAL_BLOCKS = 2;
      env.DCA_DEFAULT_CHUNK_SIZE_USD = 2000;
      vi.mocked(getUsdValue).mockResolvedValue('9800');
      vi.mocked(getTotalLiquidity)
        .mockResolvedValueOnce(BigInt(500e6))
        .mockResolvedValueOnce(BigInt(200e6));

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

      const sendSpy = vi
        .spyOn(WsClient.prototype, 'sendRequest')
        .mockResolvedValueOnce({
          broker_commission: buildFee('Usdc', 0).bigint,
          ingress_fee: buildFee('Eth', 25000).bigint,
          egress_fee: buildFee('Usdc', 8000).bigint,
          network_fee: buildFee('Usdc', 100100).bigint,
          intermediary: null,
          output: BigInt(100e6),
        })
        .mockResolvedValueOnce({
          broker_commission: buildFee('Usdc', 0).bigint,
          ingress_fee: buildFee('Eth', 25000).bigint,
          egress_fee: buildFee('Usdc', 8000).bigint,
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
        dcaEnabled: 'true',
      });

      const { body, status } = await request(server).get(`/v2/quote?${params.toString()}`);

      expect(status).toBe(200);
      expect(body).toEqual([
        {
          depositAmount: '1000000000000000000',
          destAsset: {
            asset: 'USDC',
            chain: 'Ethereum',
          },
          egressAmount: (100e6).toString(),
          estimatedDurationSeconds: 144,
          estimatedDurationsSeconds: {
            deposit: 30,
            egress: 102,
            swap: 12,
          },
          estimatedPrice: '100.0080000000025002',
          recommendedSlippageTolerancePercent: 1,
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
              amount: '8000',
              asset: 'USDC',
              chain: 'Ethereum',
              type: 'EGRESS',
            },
          ],
          poolInfo: [
            {
              baseAsset: { asset: 'ETH', chain: 'Ethereum' },
              fee: {
                amount: '1999999999999950',
                asset: 'ETH',
                chain: 'Ethereum',
              },
              quoteAsset: { asset: 'USDC', chain: 'Ethereum' },
            },
          ],
          srcAsset: {
            asset: 'ETH',
            chain: 'Ethereum',
          },
          type: 'REGULAR',
          isVaultSwap: false,
        },
        {
          depositAmount: '1000000000000000000',
          destAsset: {
            asset: 'USDC',
            chain: 'Ethereum',
          },
          egressAmount: (100e6).toString(),
          estimatedDurationSeconds: 180,
          estimatedDurationsSeconds: {
            deposit: 30,
            egress: 102,
            swap: 48,
          },
          estimatedPrice: '100.0080000000025002',
          recommendedSlippageTolerancePercent: 1,
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
              amount: '8000',
              asset: 'USDC',
              chain: 'Ethereum',
              type: 'EGRESS',
            },
          ],
          poolInfo: [
            {
              baseAsset: { asset: 'ETH', chain: 'Ethereum' },
              fee: {
                amount: '1999999999999950',
                asset: 'ETH',
                chain: 'Ethereum',
              },
              quoteAsset: { asset: 'USDC', chain: 'Ethereum' },
            },
          ],
          dcaParams: {
            chunkIntervalBlocks: 2,
            numberOfChunks: 4,
          },
          srcAsset: {
            asset: 'ETH',
            chain: 'Ethereum',
          },
          type: 'DCA',
          isVaultSwap: false,
        },
      ]);

      expect(sendSpy).toHaveBeenCalledTimes(2);
      expect(sendSpy).toHaveBeenNthCalledWith(
        1,
        'cf_swap_rate_v3',
        { asset: 'ETH', chain: 'Ethereum' },
        { asset: 'USDC', chain: 'Ethereum' },
        '0xde0b6b3a7640000', // 1e18
        0,
        undefined,
        undefined,
        [],
        [],
      );
      expect(sendSpy).toHaveBeenNthCalledWith(
        2,
        'cf_swap_rate_v3',
        { asset: 'ETH', chain: 'Ethereum' },
        { asset: 'USDC', chain: 'Ethereum' },
        '0xde0b6b3a7640000', // 1e18
        0,
        {
          number_of_chunks: 4,
          chunk_interval: 2,
        },
        undefined,
        [],
        [],
      );
    });

    it('throws 400 if dca quote and regular quote totalLiquidity is lower than egressAmount', async () => {
      env.DCA_CHUNK_SIZE_USD = { Eth: 3000 };
      env.DCA_CHUNK_INTERVAL_BLOCKS = 2;
      env.DCA_DEFAULT_CHUNK_SIZE_USD = 2000;
      vi.mocked(getUsdValue).mockResolvedValue('9800');
      vi.mocked(getTotalLiquidity)
        .mockResolvedValueOnce(BigInt(0))
        .mockResolvedValueOnce(BigInt(0));

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
      vi.spyOn(WsClient.prototype, 'sendRequest')
        .mockResolvedValueOnce({
          broker_commission: buildFee('Usdc', 0).bigint,
          ingress_fee: buildFee('Eth', 25000).bigint,
          egress_fee: buildFee('Usdc', 8000).bigint,
          network_fee: buildFee('Usdc', 100100).bigint,
          intermediary: null,
          output: BigInt(100e6),
        })
        .mockResolvedValueOnce({
          broker_commission: buildFee('Usdc', 0).bigint,
          ingress_fee: buildFee('Eth', 25000).bigint,
          egress_fee: buildFee('Usdc', 8000).bigint,
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
        dcaEnabled: 'true',
      });

      const { body, status } = await request(server).get(`/v2/quote?${params.toString()}`);

      expect(status).toBe(400);
      expect(body.message).toBe('Insufficient liquidity for the requested amount');
    });

    it('returns regular quote if DCA does not pass totalLiquidity check', async () => {
      env.DCA_CHUNK_SIZE_USD = { Eth: 3000 };
      env.DCA_CHUNK_INTERVAL_BLOCKS = 2;
      env.DCA_DEFAULT_CHUNK_SIZE_USD = 2000;
      vi.mocked(getUsdValue).mockResolvedValue('9800');
      vi.mocked(getTotalLiquidity)
        .mockResolvedValueOnce(BigInt(0))
        .mockResolvedValueOnce(BigInt(200e6));

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
      vi.spyOn(WsClient.prototype, 'sendRequest')
        .mockResolvedValueOnce({
          broker_commission: buildFee('Usdc', 0).bigint,
          ingress_fee: buildFee('Eth', 25000).bigint,
          egress_fee: buildFee('Usdc', 8000).bigint,
          network_fee: buildFee('Usdc', 100100).bigint,
          intermediary: null,
          output: BigInt(100e6),
        })
        .mockResolvedValueOnce({
          broker_commission: buildFee('Usdc', 0).bigint,
          ingress_fee: buildFee('Eth', 25000).bigint,
          egress_fee: buildFee('Usdc', 8000).bigint,
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
        dcaEnabled: 'true',
      });

      const { body, status } = await request(server).get(`/v2/quote?${params.toString()}`);
      expect(status).toBe(200);
      expect(body).toStrictEqual([
        {
          egressAmount: '100000000',
          recommendedSlippageTolerancePercent: 1,
          includedFees: [
            { type: 'INGRESS', chain: 'Ethereum', asset: 'ETH', amount: '25000' },
            { type: 'NETWORK', chain: 'Ethereum', asset: 'USDC', amount: '100100' },
            { type: 'EGRESS', chain: 'Ethereum', asset: 'USDC', amount: '8000' },
          ],
          poolInfo: [
            {
              baseAsset: { chain: 'Ethereum', asset: 'ETH' },
              quoteAsset: { chain: 'Ethereum', asset: 'USDC' },
              fee: { chain: 'Ethereum', asset: 'ETH', amount: '1999999999999950' },
            },
          ],
          estimatedDurationsSeconds: { deposit: 30, swap: 12, egress: 102 },
          estimatedDurationSeconds: 144,
          estimatedPrice: '100.0080000000025002',
          type: 'REGULAR',
          srcAsset: { chain: 'Ethereum', asset: 'ETH' },
          destAsset: { chain: 'Ethereum', asset: 'USDC' },
          depositAmount: '1000000000000000000',
          isVaultSwap: false,
        },
      ]);
    });

    it('returns DCA quote if regular does not pass totalLiquidity check', async () => {
      env.DCA_CHUNK_SIZE_USD = { Eth: 3000 };
      env.DCA_CHUNK_INTERVAL_BLOCKS = 2;
      env.DCA_DEFAULT_CHUNK_SIZE_USD = 2000;
      vi.mocked(getUsdValue).mockResolvedValue('9800');
      vi.mocked(getTotalLiquidity)
        .mockResolvedValueOnce(BigInt(200e6))
        .mockResolvedValueOnce(BigInt(0));

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
      vi.spyOn(WsClient.prototype, 'sendRequest')
        .mockResolvedValueOnce({
          broker_commission: buildFee('Usdc', 0).bigint,
          ingress_fee: buildFee('Eth', 25000).bigint,
          egress_fee: buildFee('Usdc', 8000).bigint,
          network_fee: buildFee('Usdc', 100100).bigint,
          intermediary: null,
          output: BigInt(100e6),
        })
        .mockResolvedValueOnce({
          broker_commission: buildFee('Usdc', 0).bigint,
          ingress_fee: buildFee('Eth', 25000).bigint,
          egress_fee: buildFee('Usdc', 8000).bigint,
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
        dcaEnabled: 'true',
      });

      const { body, status } = await request(server).get(`/v2/quote?${params.toString()}`);

      expect(status).toBe(200);
      expect(body).toStrictEqual([
        {
          egressAmount: '100000000',
          recommendedSlippageTolerancePercent: 1,
          includedFees: [
            { type: 'INGRESS', chain: 'Ethereum', asset: 'ETH', amount: '25000' },
            { type: 'NETWORK', chain: 'Ethereum', asset: 'USDC', amount: '100100' },
            { type: 'EGRESS', chain: 'Ethereum', asset: 'USDC', amount: '8000' },
          ],
          poolInfo: [
            {
              baseAsset: { chain: 'Ethereum', asset: 'ETH' },
              quoteAsset: { chain: 'Ethereum', asset: 'USDC' },
              fee: { chain: 'Ethereum', asset: 'ETH', amount: '1999999999999950' },
            },
          ],
          estimatedDurationsSeconds: { deposit: 30, swap: 48, egress: 102 },
          estimatedDurationSeconds: 180,
          estimatedPrice: '100.0080000000025002',
          type: 'DCA',
          srcAsset: { chain: 'Ethereum', asset: 'ETH' },
          destAsset: { chain: 'Ethereum', asset: 'USDC' },
          depositAmount: '1000000000000000000',
          dcaParams: { numberOfChunks: 4, chunkIntervalBlocks: 2 },
          isVaultSwap: false,
        },
      ]);
    });

    it('gets the DCA quote with a boost quote and broker fees', async () => {
      env.DCA_CHUNK_SIZE_USD = { Btc: 3000 };
      env.DCA_CHUNK_INTERVAL_BLOCKS = 2;
      env.DCA_DEFAULT_CHUNK_SIZE_USD = 2000;
      vi.mocked(getUsdValue).mockResolvedValue('9800');
      vi.mocked(getTotalLiquidity)
        .mockResolvedValueOnce(BigInt(1e18))
        .mockResolvedValueOnce(BigInt(1e18))
        .mockResolvedValueOnce(BigInt(1e18))
        .mockResolvedValueOnce(BigInt(1e18));

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

      const sendSpy = vi
        .spyOn(WsClient.prototype, 'sendRequest')
        .mockResolvedValueOnce({
          broker_commission: buildFee('Usdc', 1000000).bigint,
          ingress_fee: buildFee('Btc', 250).bigint,
          egress_fee: buildFee('Eth', 8000).bigint,
          network_fee: buildFee('Usdc', 100100).bigint,
          intermediary: BigInt(10e6),
          output: BigInt(0.1e18),
        })
        .mockResolvedValueOnce({
          broker_commission: buildFee('Usdc', 1000000).bigint,
          ingress_fee: buildFee('Btc', 250).bigint,
          egress_fee: buildFee('Eth', 8000).bigint,
          network_fee: buildFee('Usdc', 100100).bigint,
          intermediary: BigInt(10e6),
          output: BigInt(0.1e18),
        })
        .mockResolvedValueOnce({
          broker_commission: buildFee('Usdc', 1000000).bigint,
          ingress_fee: buildFee('Btc', 250).bigint,
          egress_fee: buildFee('Eth', 8000).bigint,
          network_fee: buildFee('Usdc', 100100).bigint,
          intermediary: BigInt(10e6),
          output: BigInt(0.1e18),
        })
        .mockResolvedValueOnce({
          broker_commission: buildFee('Usdc', 1000000).bigint,
          ingress_fee: buildFee('Btc', 250).bigint,
          egress_fee: buildFee('Eth', 8000).bigint,
          network_fee: buildFee('Usdc', 100100).bigint,
          intermediary: BigInt(10e6),
          output: BigInt(0.1e18),
        });

      const params = new URLSearchParams({
        srcChain: 'Bitcoin',
        srcAsset: 'BTC',
        destChain: 'Ethereum',
        destAsset: 'ETH',
        amount: (0.001e8).toString(),
        dcaEnabled: 'true',
        brokerCommissionBps: '10',
      });

      const { body, status } = await request(server).get(`/v2/quote?${params.toString()}`);

      expect(status).toBe(200);
      expect(body).toEqual([
        {
          depositAmount: '100000',
          destAsset: {
            asset: 'ETH',
            chain: 'Ethereum',
          },
          intermediateAmount: '10000000',
          egressAmount: '100000000000000000',
          estimatedDurationSeconds: 1920,
          estimatedDurationsSeconds: {
            deposit: 1806,
            egress: 102,
            swap: 12,
          },
          estimatedPrice: '100.25062656642406015038',
          includedFees: [
            {
              amount: '250',
              asset: 'BTC',
              chain: 'Bitcoin',
              type: 'INGRESS',
            },
            {
              amount: '100100',
              asset: 'USDC',
              chain: 'Ethereum',
              type: 'NETWORK',
            },
            {
              amount: '1000000',
              asset: 'USDC',
              chain: 'Ethereum',
              type: 'BROKER',
            },
            {
              amount: '8000',
              asset: 'ETH',
              chain: 'Ethereum',
              type: 'EGRESS',
            },
          ],
          poolInfo: [
            {
              baseAsset: { asset: 'BTC', chain: 'Bitcoin' },
              fee: {
                amount: '199',
                asset: 'BTC',
                chain: 'Bitcoin',
              },
              quoteAsset: { asset: 'USDC', chain: 'Ethereum' },
            },
            {
              baseAsset: { asset: 'ETH', chain: 'Ethereum' },
              fee: {
                amount: '20000',
                asset: 'USDC',
                chain: 'Ethereum',
              },
              quoteAsset: { asset: 'USDC', chain: 'Ethereum' },
            },
          ],
          recommendedSlippageTolerancePercent: 2,
          srcAsset: {
            asset: 'BTC',
            chain: 'Bitcoin',
          },
          type: 'REGULAR',
          isVaultSwap: false,
          boostQuote: {
            depositAmount: '100000',
            destAsset: {
              asset: 'ETH',
              chain: 'Ethereum',
            },
            intermediateAmount: '10000000',
            egressAmount: '100000000000000000',
            estimatedBoostFeeBps: 10,
            estimatedDurationSeconds: 720,
            estimatedDurationsSeconds: {
              deposit: 606,
              egress: 102,
              swap: 12,
            },
            estimatedPrice: '100.35122930256698444556',
            includedFees: [
              {
                amount: '100',
                asset: 'BTC',
                chain: 'Bitcoin',
                type: 'BOOST',
              },
              {
                amount: '250',
                asset: 'BTC',
                chain: 'Bitcoin',
                type: 'INGRESS',
              },
              {
                amount: '100100',
                asset: 'USDC',
                chain: 'Ethereum',
                type: 'NETWORK',
              },
              {
                amount: '1000000',
                asset: 'USDC',
                chain: 'Ethereum',
                type: 'BROKER',
              },
              {
                amount: '8000',
                asset: 'ETH',
                chain: 'Ethereum',
                type: 'EGRESS',
              },
            ],
            maxBoostFeeBps: 30,
            poolInfo: [
              {
                baseAsset: { asset: 'BTC', chain: 'Bitcoin' },
                fee: {
                  amount: '199',
                  asset: 'BTC',
                  chain: 'Bitcoin',
                },
                quoteAsset: { asset: 'USDC', chain: 'Ethereum' },
              },
              {
                baseAsset: { asset: 'ETH', chain: 'Ethereum' },
                fee: {
                  amount: '20000',
                  asset: 'USDC',
                  chain: 'Ethereum',
                },
                quoteAsset: { asset: 'USDC', chain: 'Ethereum' },
              },
            ],
            recommendedSlippageTolerancePercent: 1.5,
            srcAsset: {
              asset: 'BTC',
              chain: 'Bitcoin',
            },
            type: 'REGULAR',
            isVaultSwap: false,
          },
        },
        {
          depositAmount: '100000',
          destAsset: {
            asset: 'ETH',
            chain: 'Ethereum',
          },
          intermediateAmount: '10000000',
          egressAmount: '100000000000000000',
          estimatedDurationSeconds: 1956,
          estimatedDurationsSeconds: {
            deposit: 1806,
            egress: 102,
            swap: 48,
          },
          estimatedPrice: '100.25062656642406015038',
          recommendedSlippageTolerancePercent: 2,
          includedFees: [
            {
              amount: '250',
              asset: 'BTC',
              chain: 'Bitcoin',
              type: 'INGRESS',
            },
            {
              amount: '100100',
              asset: 'USDC',
              chain: 'Ethereum',
              type: 'NETWORK',
            },
            {
              amount: '1000000',
              asset: 'USDC',
              chain: 'Ethereum',
              type: 'BROKER',
            },
            {
              amount: '8000',
              asset: 'ETH',
              chain: 'Ethereum',
              type: 'EGRESS',
            },
          ],
          poolInfo: [
            {
              baseAsset: { asset: 'BTC', chain: 'Bitcoin' },
              fee: {
                amount: '199',
                asset: 'BTC',
                chain: 'Bitcoin',
              },
              quoteAsset: { asset: 'USDC', chain: 'Ethereum' },
            },
            {
              baseAsset: { asset: 'ETH', chain: 'Ethereum' },
              fee: {
                amount: '20000',
                asset: 'USDC',
                chain: 'Ethereum',
              },
              quoteAsset: { asset: 'USDC', chain: 'Ethereum' },
            },
          ],
          dcaParams: {
            chunkIntervalBlocks: 2,
            numberOfChunks: 4,
          },
          srcAsset: {
            asset: 'BTC',
            chain: 'Bitcoin',
          },
          type: 'DCA',
          isVaultSwap: false,
          boostQuote: {
            dcaParams: {
              chunkIntervalBlocks: 2,
              numberOfChunks: 4,
            },
            depositAmount: '100000',
            destAsset: {
              asset: 'ETH',
              chain: 'Ethereum',
            },
            egressAmount: '100000000000000000',
            intermediateAmount: '10000000',
            estimatedBoostFeeBps: 10,
            estimatedDurationSeconds: 756,
            estimatedDurationsSeconds: {
              deposit: 606,
              egress: 102,
              swap: 48,
            },
            estimatedPrice: '100.35122930256698444556',
            includedFees: [
              {
                amount: '100',
                asset: 'BTC',
                chain: 'Bitcoin',
                type: 'BOOST',
              },
              {
                amount: '250',
                asset: 'BTC',
                chain: 'Bitcoin',
                type: 'INGRESS',
              },
              {
                amount: '100100',
                asset: 'USDC',
                chain: 'Ethereum',
                type: 'NETWORK',
              },
              {
                amount: '1000000',
                asset: 'USDC',
                chain: 'Ethereum',
                type: 'BROKER',
              },
              {
                amount: '8000',
                asset: 'ETH',
                chain: 'Ethereum',
                type: 'EGRESS',
              },
            ],
            maxBoostFeeBps: 30,
            poolInfo: [
              {
                baseAsset: { asset: 'BTC', chain: 'Bitcoin' },
                fee: {
                  amount: '199',
                  asset: 'BTC',
                  chain: 'Bitcoin',
                },
                quoteAsset: { asset: 'USDC', chain: 'Ethereum' },
              },
              {
                baseAsset: { asset: 'ETH', chain: 'Ethereum' },
                fee: {
                  amount: '20000',
                  asset: 'USDC',
                  chain: 'Ethereum',
                },
                quoteAsset: { asset: 'USDC', chain: 'Ethereum' },
              },
            ],
            recommendedSlippageTolerancePercent: 1.5,
            srcAsset: {
              asset: 'BTC',
              chain: 'Bitcoin',
            },
            type: 'DCA',
            isVaultSwap: false,
          },
        },
      ]);
      expect(sendSpy).toHaveBeenCalledTimes(4);
      expect(sendSpy).toHaveBeenNthCalledWith(
        1,
        'cf_swap_rate_v3',
        { asset: 'BTC', chain: 'Bitcoin' },
        { asset: 'ETH', chain: 'Ethereum' },
        '0x186a0', // 0.001e8,
        10,
        undefined,
        undefined,
        [],
        [],
      );
      expect(sendSpy).toHaveBeenNthCalledWith(
        2,
        'cf_swap_rate_v3',
        { asset: 'BTC', chain: 'Bitcoin' },
        { asset: 'ETH', chain: 'Ethereum' },
        '0x1863c', // 0.001e8 - 100 (boostFee),
        10,
        undefined,
        undefined,
        [],
        [],
      );
      expect(sendSpy).toHaveBeenNthCalledWith(
        3,
        'cf_swap_rate_v3',
        { asset: 'BTC', chain: 'Bitcoin' },
        { asset: 'ETH', chain: 'Ethereum' },
        '0x186a0',
        10,
        {
          number_of_chunks: 4,
          chunk_interval: 2,
        },
        undefined,
        [],
        [],
      );
      expect(sendSpy).toHaveBeenNthCalledWith(
        4,
        'cf_swap_rate_v3',
        { asset: 'BTC', chain: 'Bitcoin' },
        { asset: 'ETH', chain: 'Ethereum' },
        '0x1863c', // 0.001e8 - 100 (boostFee),
        10,
        {
          number_of_chunks: 4,
          chunk_interval: 2,
        },
        undefined,
        [],
        [],
      );
    });

    it('gets no DCA quote if the flag is missing', async () => {
      env.DCA_CHUNK_SIZE_USD = { Eth: 3000 };
      env.DCA_CHUNK_INTERVAL_BLOCKS = 2;
      env.DCA_DEFAULT_CHUNK_SIZE_USD = 2000;
      vi.mocked(getUsdValue).mockResolvedValue('9800');

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

      const sendSpy = vi.spyOn(WsClient.prototype, 'sendRequest').mockResolvedValueOnce({
        broker_commission: buildFee('Usdc', 0).bigint,
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
        dcaEnabled: 'false',
      });

      const { body, status } = await request(server).get(`/v2/quote?${params.toString()}`);

      expect(status).toBe(200);
      expect(body).toEqual([
        {
          depositAmount: '1000000000000000000',
          destAsset: {
            asset: 'USDC',
            chain: 'Ethereum',
          },
          egressAmount: (100e6).toString(),
          estimatedDurationSeconds: 144,
          estimatedDurationsSeconds: {
            deposit: 30,
            egress: 102,
            swap: 12,
          },
          estimatedPrice: '100.0000000000025',
          recommendedSlippageTolerancePercent: 1,
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
                amount: '1999999999999950',
                asset: 'ETH',
                chain: 'Ethereum',
              },
              quoteAsset: { asset: 'USDC', chain: 'Ethereum' },
            },
          ],
          srcAsset: {
            asset: 'ETH',
            chain: 'Ethereum',
          },
          type: 'REGULAR',
          isVaultSwap: false,
        },
      ]);
      expect(sendSpy).toHaveBeenCalledTimes(1);
    });

    it('gets only REGULAR quote because amount is less than 3000', async () => {
      env.DCA_CHUNK_SIZE_USD = { Eth: 3000 };
      env.DCA_CHUNK_INTERVAL_BLOCKS = 2;
      env.DCA_DEFAULT_CHUNK_SIZE_USD = 2000;
      vi.mocked(getUsdValue).mockResolvedValue('2000');

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

      const sendSpy = vi.spyOn(WsClient.prototype, 'sendRequest').mockResolvedValueOnce({
        broker_commission: buildFee('Usdc', 0).bigint,
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
          depositAmount: '1000000000000000000',
          destAsset: {
            asset: 'USDC',
            chain: 'Ethereum',
          },
          egressAmount: (100e6).toString(),
          estimatedDurationSeconds: 144,
          estimatedDurationsSeconds: {
            deposit: 30,
            egress: 102,
            swap: 12,
          },
          estimatedPrice: '100.0000000000025',
          recommendedSlippageTolerancePercent: 1,
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
                amount: '1999999999999950',
                asset: 'ETH',
                chain: 'Ethereum',
              },
              quoteAsset: { asset: 'USDC', chain: 'Ethereum' },
            },
          ],
          srcAsset: {
            asset: 'ETH',
            chain: 'Ethereum',
          },
          type: 'REGULAR',
          isVaultSwap: false,
        },
      ]);
      expect(sendSpy).toHaveBeenCalledTimes(1);
    });

    it('gets only REGULAR quote when DCA quoting is disabled', async () => {
      env.DCA_CHUNK_SIZE_USD = { Eth: 3000 };
      env.DCA_CHUNK_INTERVAL_BLOCKS = 2;
      env.DCA_DEFAULT_CHUNK_SIZE_USD = 2000;
      vi.mocked(getUsdValue).mockResolvedValue('9800');
      env.DISABLE_DCA_QUOTING = true;

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

      const sendSpy = vi.spyOn(WsClient.prototype, 'sendRequest').mockResolvedValueOnce({
        broker_commission: buildFee('Usdc', 0).bigint,
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
          depositAmount: '1000000000000000000',
          destAsset: {
            asset: 'USDC',
            chain: 'Ethereum',
          },
          egressAmount: (100e6).toString(),
          estimatedDurationSeconds: 144,
          estimatedDurationsSeconds: {
            deposit: 30,
            egress: 102,
            swap: 12,
          },
          estimatedPrice: '100.0000000000025',
          recommendedSlippageTolerancePercent: 1,
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
                amount: '1999999999999950',
                asset: 'ETH',
                chain: 'Ethereum',
              },
              quoteAsset: { asset: 'USDC', chain: 'Ethereum' },
            },
          ],
          srcAsset: {
            asset: 'ETH',
            chain: 'Ethereum',
          },
          type: 'REGULAR',
          isVaultSwap: false,
        },
      ]);
      expect(sendSpy).toHaveBeenCalledTimes(1);
    });

    it('handles unexpected upstream errors', async () => {
      vi.mocked(getUsdValue).mockResolvedValue('9800');
      env.DISABLE_DCA_QUOTING = true;

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

      const sendSpy = vi
        .spyOn(WsClient.prototype, 'sendRequest')
        .mockRejectedValue(new Error('Dispatch Error: did you catch me?'));

      const params = new URLSearchParams({
        srcChain: 'Ethereum',
        srcAsset: 'ETH',
        destChain: 'Ethereum',
        destAsset: 'USDC',
        amount: (1e18).toString(),
      });

      const { body, status } = await request(server).get(`/v2/quote?${params.toString()}`);

      expect(status).toBe(500);
      expect(body).toEqual({ message: 'Dispatch Error: did you catch me?' });
      expect(sendSpy).toHaveBeenCalledTimes(1);
    });
  });
});

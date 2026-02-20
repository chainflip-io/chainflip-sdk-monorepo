import { CfSwapRateV3Response, CfSwapRateV3, WsClient } from '@chainflip/rpc';
import {
  assetConstants,
  baseChainflipAssets,
  ChainflipAsset,
  internalAssetToRpcAsset,
} from '@chainflip/utils/chainflip';
import { hexEncodeNumber } from '@chainflip/utils/number';
import BigNumber from 'bignumber.js';
import { Server } from 'http';
import request from 'supertest';
import { describe, it, beforeEach, beforeAll, afterEach, expect, vi } from 'vitest';
import {
  MockedBoostPoolsDepth,
  boostPoolsDepth,
  cfAccountInfo,
  cfPoolDepth,
  environment,
  mockRpcResponse,
} from '@/shared/tests/fixtures.js';
import prisma from '../../../client.js';
import env from '../../../config/env.js';
import { getUsdValue } from '../../../pricing/checkPriceWarning.js';
import Quoter from '../../../quoting/Quoter.js';
import app from '../../../server.js';
import { boostPoolsCache } from '../../../utils/boost.js';
import { getTotalLiquidity } from '../../../utils/pools.js';

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

vi.mock('../../../pricing/index');
vi.mock('../../../pricing/checkPriceWarning', () => ({
  checkPriceWarning: vi.fn(),
  getUsdValue: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../../polkadot/api', () => ({
  getBoostSafeMode: vi.fn().mockResolvedValue(true),
}));

const originalEnv = structuredClone(env);

const buildFee = (asset: ChainflipAsset, amount: bigint | number) => ({
  amount: BigInt(amount),
  ...internalAssetToRpcAsset[asset],
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

    if (data.method === 'cf_pool_depth') {
      return Promise.resolve({
        data: cfPoolDepth(),
      });
    }

    throw new Error(`unexpected axios call to ${url}: ${JSON.stringify(data)}`);
  });

describe('server', () => {
  let server: Server;

  beforeAll(async () => {
    await prisma.$queryRaw`TRUNCATE TABLE "Pool" CASCADE`;
    await prisma.pool.createMany({
      data: baseChainflipAssets.map((baseAsset) => ({
        baseAsset,
        quoteAsset: 'Usdc',
        liquidityFeeHundredthPips: 1000,
      })),
    });
    await prisma.pool.updateMany({
      where: { baseAsset: { in: ['Btc', 'Eth'] } },
      data: { liquidityFeeHundredthPips: 2000 },
    });
  });

  beforeEach(async () => {
    vi.spyOn(WsClient.prototype, 'sendRequest').mockReset();
    vi.mocked(getUsdValue).mockResolvedValue(undefined);
    server = app.listen(0);
    vi.mocked(Quoter.prototype.getLimitOrders).mockResolvedValue([]);
    vi.mocked(Quoter.prototype.getReplenishmentFactor).mockReturnValue([1n, 1n]);
    vi.mocked(getTotalLiquidity).mockResolvedValue(BigInt(200e6));
    mockRpcs({ ingressFee: hexEncodeNumber(2000000), egressFee: hexEncodeNumber(50000) });
    // eslint-disable-next-line dot-notation
    boostPoolsCache['store'].clear();
  });

  afterEach(() => {
    Object.assign(env, originalEnv);
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
      env.FULLY_DISABLED_INTERNAL_ASSETS = new Set(['Flip', 'Btc']);

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
      env.FULLY_DISABLED_INTERNAL_ASSETS = new Set(['Btc', 'Eth']);

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

    it('rejects if it is a vault swap quote on Assethub source chain', async () => {
      const params = new URLSearchParams({
        srcChain: 'Assethub',
        srcAsset: 'DOT',
        destChain: 'Ethereum',
        destAsset: 'ETH',
        amount: (1000).toString(),
        isVaultSwap: 'true',
      });

      const { body, status } = await request(server).get(`/v2/quote?${params.toString()}`);

      expect(status).toBe(400);
      expect(body).toMatchObject({
        message: 'invalid request',
      });
    });

    it('rejects when the egress amount is smaller than the egress fee', async () => {
      const sendSpy = vi.spyOn(WsClient.prototype, 'sendRequest').mockResolvedValueOnce({
        broker_commission: buildFee('Usdc', 0),
        egress_fee: buildFee('Eth', 25000),
        network_fee: buildFee('Usdc', 2000000),
        ingress_fee: buildFee('Usdc', 2000000),
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
        broker_commission: buildFee('Usdc', 0),
        ingress_fee: buildFee('Eth', 25000),
        egress_fee: buildFee('Usdc', 0),
        network_fee: buildFee('Usdc', 100100),
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
      expect(body.message).toBe('insufficient liquidity for the requested amount');
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
        broker_commission: buildFee('Usdc', 0),
        ingress_fee: buildFee('Usdc', 0),
        egress_fee: buildFee('Eth', 0),
        network_fee: buildFee('Usdc', 100100),
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
      expect(body).toMatchSnapshot();
    });

    it('excludes the ingress fee for vault swaps', async () => {
      vi.mocked(getTotalLiquidity).mockResolvedValueOnce(BigInt(2e18));

      const sendSpy = vi.spyOn(WsClient.prototype, 'sendRequest').mockResolvedValueOnce({
        broker_commission: buildFee('Usdc', 0),
        ingress_fee: buildFee('Usdc', 0),
        egress_fee: buildFee('Eth', 0),
        network_fee: buildFee('Usdc', 100100),
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
      expect(body).toMatchSnapshot();
      expect(sendSpy.mock.calls).toMatchInlineSnapshot(`
        [
          [
            "cf_swap_rate_v3",
            {
              "asset": "USDC",
              "chain": "Ethereum",
            },
            {
              "asset": "ETH",
              "chain": "Ethereum",
            },
            "0x5f5e100",
            0,
            undefined,
            undefined,
            [
              "IngressDepositChannel",
            ],
            [],
            false,
          ],
        ]
      `);
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
        broker_commission: buildFee('Usdc', 0),
        ingress_fee: buildFee('Eth', 25000),
        egress_fee: buildFee('Usdc', 0),
        network_fee: buildFee('Usdc', 100100),
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
      expect(body).toMatchSnapshot();
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
        broker_commission: buildFee('Usdc', 0),
        ingress_fee: buildFee('Eth', 25000),
        egress_fee: buildFee('Usdc', 0),
        network_fee: buildFee('Usdc', 100100),
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
      expect(body).toMatchSnapshot();
      expect(sendSpy).toHaveBeenCalledTimes(1);
    });

    it('returns the correct live price slippage tolerance percent for stable asset pair', async () => {
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
        broker_commission: buildFee('Usdc', 0),
        ingress_fee: buildFee('Eth', 25000),
        egress_fee: buildFee('Usdc', 0),
        network_fee: buildFee('Usdc', 100100),
        intermediary: null,
        output: BigInt(100e6),
      });

      const params = new URLSearchParams({
        srcChain: 'Ethereum',
        srcAsset: 'USDT',
        destChain: 'Ethereum',
        destAsset: 'USDC',
        amount: (1e18).toString(),
      });

      const { body, status } = await request(server).get(`/v2/quote?${params.toString()}`);

      expect(status).toBe(200);
      expect(body).toMatchSnapshot();
      expect(sendSpy).toHaveBeenCalledTimes(1);
    });

    it('does not return recommendedLivePriceSlippageTolerancePercent for unavailable asset pair', async () => {
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
        broker_commission: buildFee('Usdc', 0),
        ingress_fee: buildFee('Eth', 25000),
        egress_fee: buildFee('Usdc', 0),
        network_fee: buildFee('Usdc', 100100),
        intermediary: null,
        output: BigInt(100e6),
      });

      const params = new URLSearchParams({
        srcChain: 'Ethereum',
        srcAsset: 'FLIP',
        destChain: 'Ethereum',
        destAsset: 'USDC',
        amount: (1e18).toString(),
      });

      const { body, status } = await request(server).get(`/v2/quote?${params.toString()}`);

      expect(status).toBe(200);
      expect(body).toMatchSnapshot();
      expect(body).not.toHaveProperty('recommendedLivePriceSlippageTolerancePercent');
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
        broker_commission: buildFee('Usdc', 0),
        ingress_fee: buildFee('Eth', 25000),
        egress_fee: buildFee('Usdc', 0),
        network_fee: buildFee('Usdc', 100100),
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
          estimatedDurationSeconds: 132,
          estimatedDurationsSeconds: {
            deposit: 24,
            egress: 96,
            swap: 12,
          },
          ccmParams: {
            gasBudget: '12345',
            messageLengthBytes: 321,
          },
          estimatedPrice: '100.0000000000025',
          includedFees: [
            { amount: '25000', asset: 'ETH', chain: 'Ethereum', type: 'INGRESS' },
            { amount: '100100', asset: 'USDC', chain: 'Ethereum', type: 'NETWORK' },
            { amount: '0', asset: 'USDC', chain: 'Ethereum', type: 'EGRESS' },
          ],
          poolInfo: [
            {
              baseAsset: { asset: 'ETH', chain: 'Ethereum' },
              fee: { amount: '0', asset: 'ETH', chain: 'Ethereum' },
              quoteAsset: { asset: 'USDC', chain: 'Ethereum' },
            },
          ],
        },
      ]);
      expect(sendSpy).toHaveBeenCalledTimes(1);
      expect(sendSpy.mock.calls).toMatchInlineSnapshot(`
        [
          [
            "cf_swap_rate_v3",
            {
              "asset": "ETH",
              "chain": "Ethereum",
            },
            {
              "asset": "USDC",
              "chain": "Ethereum",
            },
            "0xde0b6b3a7640000",
            0,
            undefined,
            {
              "gas_budget": 12345,
              "message_length": 321,
            },
            [],
            [],
            false,
          ],
        ]
      `);
    });

    it('gets the quote with undefined ccm params (sdk version 1.8.2)', async () => {
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
        broker_commission: buildFee('Usdc', 0),
        ingress_fee: buildFee('Eth', 25000),
        egress_fee: buildFee('Usdc', 0),
        network_fee: buildFee('Usdc', 100100),
        intermediary: null,
        output: BigInt(100e6),
      });

      const params = new URLSearchParams({
        srcChain: 'Ethereum',
        srcAsset: 'ETH',
        destChain: 'Ethereum',
        destAsset: 'USDC',
        ccmGasBudget: 'undefined',
        ccmMessageLengthBytes: 'undefined',
        amount: (1e18).toString(),
      });

      const { body, status } = await request(server).get(`/v2/quote?${params.toString()}`);

      expect(status).toBe(200);
      expect(body).toMatchObject([
        {
          egressAmount: (100e6).toString(),
          estimatedDurationSeconds: 132,
          estimatedDurationsSeconds: {
            deposit: 24,
            egress: 96,
            swap: 12,
          },
          estimatedPrice: '100.0000000000025',
          includedFees: [
            { amount: '25000', asset: 'ETH', chain: 'Ethereum', type: 'INGRESS' },
            { amount: '100100', asset: 'USDC', chain: 'Ethereum', type: 'NETWORK' },
            { amount: '0', asset: 'USDC', chain: 'Ethereum', type: 'EGRESS' },
          ],
          poolInfo: [
            {
              baseAsset: { asset: 'ETH', chain: 'Ethereum' },
              fee: { amount: '0', asset: 'ETH', chain: 'Ethereum' },
              quoteAsset: { asset: 'USDC', chain: 'Ethereum' },
            },
          ],
        },
      ]);
      expect(sendSpy).toHaveBeenCalledTimes(1);
      expect(sendSpy.mock.calls).toMatchInlineSnapshot(`
        [
          [
            "cf_swap_rate_v3",
            {
              "asset": "ETH",
              "chain": "Ethereum",
            },
            {
              "asset": "USDC",
              "chain": "Ethereum",
            },
            "0xde0b6b3a7640000",
            0,
            undefined,
            undefined,
            [],
            [],
            false,
          ],
        ]
      `);
    });

    it('gets the DCA quote to USDC', async () => {
      env.DCA_SELL_CHUNK_SIZE_USD = { Eth: 3000 };
      env.DCA_CHUNK_INTERVAL_BLOCKS = 2;
      env.DCA_DEFAULT_SELL_CHUNK_SIZE_USD = 2000;
      env.DCA_100K_USD_PRICE_IMPACT_PERCENT = {};
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
          broker_commission: buildFee('Usdc', 0),
          ingress_fee: buildFee('Eth', 25000),
          egress_fee: buildFee('Usdc', 8000),
          network_fee: buildFee('Usdc', 100100),
          intermediary: null,
          output: BigInt(100e6),
        })
        .mockResolvedValueOnce({
          broker_commission: buildFee('Usdc', 0),
          ingress_fee: buildFee('Eth', 25000),
          egress_fee: buildFee('Usdc', 8000),
          network_fee: buildFee('Usdc', 100100),
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
      expect(body).toMatchSnapshot();

      expect(sendSpy).toHaveBeenCalledTimes(2);
      expect(sendSpy.mock.calls).toMatchInlineSnapshot(`
        [
          [
            "cf_swap_rate_v3",
            {
              "asset": "ETH",
              "chain": "Ethereum",
            },
            {
              "asset": "USDC",
              "chain": "Ethereum",
            },
            "0xde0b6b3a7640000",
            0,
            undefined,
            undefined,
            [],
            [],
            false,
          ],
          [
            "cf_swap_rate_v3",
            {
              "asset": "ETH",
              "chain": "Ethereum",
            },
            {
              "asset": "USDC",
              "chain": "Ethereum",
            },
            "0xde0b6b3a7640000",
            0,
            {
              "chunk_interval": 2,
              "number_of_chunks": 4,
            },
            undefined,
            [],
            [],
            false,
          ],
        ]
      `);
      expect(vi.mocked(Quoter.prototype.getLimitOrders).mock.calls).toMatchInlineSnapshot(`
        [
          [
            "Eth",
            "Usdc",
            1000000000000000000n,
          ],
          [
            "Eth",
            "Usdc",
            250000000000000000n,
          ],
        ]
      `);
    });

    it('applies price impact to DCA quote', async () => {
      env.DCA_SELL_CHUNK_SIZE_USD = { Eth: 3000 };
      env.DCA_CHUNK_INTERVAL_BLOCKS = 2;
      env.DCA_DEFAULT_SELL_CHUNK_SIZE_USD = 2000;
      env.DCA_100K_USD_PRICE_IMPACT_PERCENT = { Eth: 10 }; // 10/100000*9800=0.98% price impact for swap
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
          broker_commission: buildFee('Usdc', 0),
          ingress_fee: buildFee('Eth', 25000),
          egress_fee: buildFee('Usdc', 8000),
          network_fee: buildFee('Usdc', 100100),
          intermediary: null,
          output: BigInt(100e6),
        })
        .mockResolvedValueOnce({
          broker_commission: buildFee('Usdc', 0),
          ingress_fee: buildFee('Eth', 25000),
          egress_fee: buildFee('Usdc', 8000),
          network_fee: buildFee('Usdc', 100100),
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
      expect(body).toMatchSnapshot();

      expect(sendSpy).toHaveBeenCalledTimes(2);
      expect(sendSpy.mock.calls).toMatchInlineSnapshot(`
        [
          [
            "cf_swap_rate_v3",
            {
              "asset": "ETH",
              "chain": "Ethereum",
            },
            {
              "asset": "USDC",
              "chain": "Ethereum",
            },
            "0xde0b6b3a7640000",
            0,
            undefined,
            undefined,
            [],
            [],
            false,
          ],
          [
            "cf_swap_rate_v3",
            {
              "asset": "ETH",
              "chain": "Ethereum",
            },
            {
              "asset": "USDC",
              "chain": "Ethereum",
            },
            "0xde0b6b3a7640000",
            0,
            {
              "chunk_interval": 2,
              "number_of_chunks": 4,
            },
            undefined,
            [],
            [],
            false,
          ],
        ]
      `);
    });

    it('throws 400 if dca quote and regular quote totalLiquidity is lower than egressAmount', async () => {
      env.DCA_SELL_CHUNK_SIZE_USD = { Eth: 3000 };
      env.DCA_CHUNK_INTERVAL_BLOCKS = 2;
      env.DCA_DEFAULT_SELL_CHUNK_SIZE_USD = 2000;
      env.DCA_100K_USD_PRICE_IMPACT_PERCENT = {};
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
          broker_commission: buildFee('Usdc', 0),
          ingress_fee: buildFee('Eth', 25000),
          egress_fee: buildFee('Usdc', 8000),
          network_fee: buildFee('Usdc', 100100),
          intermediary: null,
          output: BigInt(100e6),
        })
        .mockResolvedValueOnce({
          broker_commission: buildFee('Usdc', 0),
          ingress_fee: buildFee('Eth', 25000),
          egress_fee: buildFee('Usdc', 8000),
          network_fee: buildFee('Usdc', 100100),
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
      expect(body.message).toBe('insufficient liquidity for the requested amount');
    });

    it('returns regular quote if DCA does not pass totalLiquidity check', async () => {
      env.DCA_SELL_CHUNK_SIZE_USD = { Eth: 3000 };
      env.DCA_CHUNK_INTERVAL_BLOCKS = 2;
      env.DCA_DEFAULT_SELL_CHUNK_SIZE_USD = 2000;
      env.DCA_100K_USD_PRICE_IMPACT_PERCENT = {};
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
          broker_commission: buildFee('Usdc', 0),
          ingress_fee: buildFee('Eth', 25000),
          egress_fee: buildFee('Usdc', 8000),
          network_fee: buildFee('Usdc', 100100),
          intermediary: null,
          output: BigInt(100e6),
        })
        .mockResolvedValueOnce({
          broker_commission: buildFee('Usdc', 0),
          ingress_fee: buildFee('Eth', 25000),
          egress_fee: buildFee('Usdc', 8000),
          network_fee: buildFee('Usdc', 100100),
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
      expect(body).toMatchSnapshot();
    });

    it('returns DCA quote if regular does not pass totalLiquidity check', async () => {
      env.DCA_SELL_CHUNK_SIZE_USD = { Eth: 3000 };
      env.DCA_CHUNK_INTERVAL_BLOCKS = 2;
      env.DCA_DEFAULT_SELL_CHUNK_SIZE_USD = 2000;
      env.DCA_100K_USD_PRICE_IMPACT_PERCENT = {};
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
          broker_commission: buildFee('Usdc', 0),
          ingress_fee: buildFee('Eth', 25000),
          egress_fee: buildFee('Usdc', 8000),
          network_fee: buildFee('Usdc', 100100),
          intermediary: null,
          output: BigInt(100e6),
        })
        .mockResolvedValueOnce({
          broker_commission: buildFee('Usdc', 0),
          ingress_fee: buildFee('Eth', 25000),
          egress_fee: buildFee('Usdc', 8000),
          network_fee: buildFee('Usdc', 100100),
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
      expect(body).toMatchSnapshot();
    });

    it('returns a DCA quote with replenishment', async () => {
      env.DCA_SELL_CHUNK_SIZE_USD = { Eth: 3000 };
      env.DCA_CHUNK_INTERVAL_BLOCKS = 2;
      env.DCA_DEFAULT_SELL_CHUNK_SIZE_USD = 2000;
      env.DCA_100K_USD_PRICE_IMPACT_PERCENT = {};
      vi.mocked(getUsdValue).mockResolvedValue('9800');
      vi.mocked(getTotalLiquidity)
        .mockResolvedValueOnce(BigInt(100e6))
        .mockResolvedValueOnce(BigInt(0));
      vi.mocked(Quoter.prototype.getReplenishmentFactor).mockReturnValueOnce([2n, 1n]);

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
          broker_commission: buildFee('Usdc', 0),
          ingress_fee: buildFee('Eth', 25000),
          egress_fee: buildFee('Usdc', 8000),
          network_fee: buildFee('Usdc', 100100),
          intermediary: null,
          output: BigInt(100e6),
        })
        .mockResolvedValueOnce({
          broker_commission: buildFee('Usdc', 0),
          ingress_fee: buildFee('Eth', 25000),
          egress_fee: buildFee('Usdc', 8000),
          network_fee: buildFee('Usdc', 100100),
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
      expect(body).toMatchSnapshot();
    });

    it('gets the DCA quote with a boost quote and broker fees', async () => {
      env.DCA_SELL_CHUNK_SIZE_USD = { Btc: 3000 };
      env.DCA_CHUNK_INTERVAL_BLOCKS = 2;
      env.DCA_DEFAULT_SELL_CHUNK_SIZE_USD = 2000;
      env.DCA_100K_USD_PRICE_IMPACT_PERCENT = {};
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
          broker_commission: buildFee('Usdc', 1000000),
          ingress_fee: buildFee('Btc', 250),
          egress_fee: buildFee('Eth', 8000),
          network_fee: buildFee('Usdc', 100100),
          intermediary: BigInt(10e6),
          output: BigInt(0.1e18),
        })
        .mockResolvedValueOnce({
          broker_commission: buildFee('Usdc', 1000000),
          ingress_fee: buildFee('Btc', 250),
          egress_fee: buildFee('Eth', 8000),
          network_fee: buildFee('Usdc', 100100),
          intermediary: BigInt(10e6),
          output: BigInt(0.1e18),
        })
        .mockResolvedValueOnce({
          broker_commission: buildFee('Usdc', 1000000),
          ingress_fee: buildFee('Btc', 250),
          egress_fee: buildFee('Eth', 8000),
          network_fee: buildFee('Usdc', 100100),
          intermediary: BigInt(10e6),
          output: BigInt(0.1e18),
        })
        .mockResolvedValueOnce({
          broker_commission: buildFee('Usdc', 1000000),
          ingress_fee: buildFee('Btc', 250),
          egress_fee: buildFee('Eth', 8000),
          network_fee: buildFee('Usdc', 100100),
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
      expect(body).toMatchSnapshot();
      expect(sendSpy).toHaveBeenCalledTimes(4);
      expect(sendSpy.mock.calls).toMatchInlineSnapshot(`
        [
          [
            "cf_swap_rate_v3",
            {
              "asset": "BTC",
              "chain": "Bitcoin",
            },
            {
              "asset": "ETH",
              "chain": "Ethereum",
            },
            "0x186a0",
            10,
            undefined,
            undefined,
            [],
            [],
            false,
          ],
          [
            "cf_swap_rate_v3",
            {
              "asset": "BTC",
              "chain": "Bitcoin",
            },
            {
              "asset": "ETH",
              "chain": "Ethereum",
            },
            "0x1863c",
            10,
            undefined,
            undefined,
            [],
            [],
            false,
          ],
          [
            "cf_swap_rate_v3",
            {
              "asset": "BTC",
              "chain": "Bitcoin",
            },
            {
              "asset": "ETH",
              "chain": "Ethereum",
            },
            "0x186a0",
            10,
            {
              "chunk_interval": 2,
              "number_of_chunks": 4,
            },
            undefined,
            [],
            [],
            false,
          ],
          [
            "cf_swap_rate_v3",
            {
              "asset": "BTC",
              "chain": "Bitcoin",
            },
            {
              "asset": "ETH",
              "chain": "Ethereum",
            },
            "0x1863c",
            10,
            {
              "chunk_interval": 2,
              "number_of_chunks": 4,
            },
            undefined,
            [],
            [],
            false,
          ],
        ]
      `);
    });

    it('gets no DCA quote if the flag is missing', async () => {
      env.DCA_SELL_CHUNK_SIZE_USD = { Eth: 3000 };
      env.DCA_CHUNK_INTERVAL_BLOCKS = 2;
      env.DCA_DEFAULT_SELL_CHUNK_SIZE_USD = 2000;
      env.DCA_100K_USD_PRICE_IMPACT_PERCENT = {};
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
        broker_commission: buildFee('Usdc', 0),
        ingress_fee: buildFee('Eth', 25000),
        egress_fee: buildFee('Usdc', 0),
        network_fee: buildFee('Usdc', 100100),
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
      expect(body).toMatchSnapshot();
      expect(sendSpy).toHaveBeenCalledTimes(1);
    });

    it('gets only REGULAR quote because amount is less than 3000', async () => {
      env.DCA_SELL_CHUNK_SIZE_USD = { Eth: 3000 };
      env.DCA_CHUNK_INTERVAL_BLOCKS = 2;
      env.DCA_DEFAULT_SELL_CHUNK_SIZE_USD = 2000;
      env.DCA_100K_USD_PRICE_IMPACT_PERCENT = {};
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
        broker_commission: buildFee('Usdc', 0),
        ingress_fee: buildFee('Eth', 25000),
        egress_fee: buildFee('Usdc', 0),
        network_fee: buildFee('Usdc', 100100),
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
      expect(body).toMatchSnapshot();
      expect(sendSpy).toHaveBeenCalledTimes(1);
    });

    it('gets only REGULAR quote when DCA quoting is disabled', async () => {
      env.DCA_SELL_CHUNK_SIZE_USD = { Eth: 3000 };
      env.DCA_CHUNK_INTERVAL_BLOCKS = 2;
      env.DCA_DEFAULT_SELL_CHUNK_SIZE_USD = 2000;
      env.DCA_100K_USD_PRICE_IMPACT_PERCENT = {};
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
        broker_commission: buildFee('Usdc', 0),
        ingress_fee: buildFee('Eth', 25000),
        egress_fee: buildFee('Usdc', 0),
        network_fee: buildFee('Usdc', 100100),
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
      expect(body).toMatchSnapshot();
      expect(sendSpy).toHaveBeenCalledTimes(1);
    });

    it('gets only REGULAR quote when DCA quoting is disabled for the source asset', async () => {
      env.DCA_SELL_CHUNK_SIZE_USD = { Eth: 3000 };
      env.DCA_CHUNK_INTERVAL_BLOCKS = 2;
      env.DCA_DEFAULT_SELL_CHUNK_SIZE_USD = 2000;
      env.DCA_100K_USD_PRICE_IMPACT_PERCENT = {};
      vi.mocked(getUsdValue).mockResolvedValue('9800');
      env.DCA_DISABLED_INTERNAL_ASSETS = new Set(['Eth']);

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
        broker_commission: buildFee('Usdc', 0),
        ingress_fee: buildFee('Eth', 25000),
        egress_fee: buildFee('Usdc', 0),
        network_fee: buildFee('Usdc', 100100),
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
      expect(body).toMatchSnapshot();
      expect(sendSpy).toHaveBeenCalledTimes(1);
    });

    it('gets only REGULAR quote when DCA quoting is disabled for the dest asset', async () => {
      env.DCA_SELL_CHUNK_SIZE_USD = { Eth: 3000 };
      env.DCA_CHUNK_INTERVAL_BLOCKS = 2;
      env.DCA_DEFAULT_SELL_CHUNK_SIZE_USD = 2000;
      env.DCA_100K_USD_PRICE_IMPACT_PERCENT = {};
      vi.mocked(getUsdValue).mockResolvedValue('9800');
      env.DCA_DISABLED_INTERNAL_ASSETS = new Set(['Usdc']);

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
        broker_commission: buildFee('Usdc', 0),
        ingress_fee: buildFee('Eth', 25000),
        egress_fee: buildFee('Usdc', 0),
        network_fee: buildFee('Usdc', 100100),
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
      expect(body).toMatchSnapshot();
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

    it('handles DCA v2 quoting', async () => {
      env.DCA_SELL_CHUNK_SIZE_USD = { Eth: 20_000 };
      env.DCA_CHUNK_INTERVAL_BLOCKS = 2;
      env.DCA_DEFAULT_SELL_CHUNK_SIZE_USD = 2000;
      env.DCA_100K_USD_PRICE_IMPACT_PERCENT = {};
      env.QUOTER_DCA_V2_MAX_USD_VALUE = 10_000_000;
      env.QUOTER_DCA_V2_DEPOSIT_ASSETS = new Set(['Eth', 'Btc']);
      env.QUOTER_DCA_V2_DESTINATION_ASSETS = new Set(['Eth']);
      env.DISABLE_DCA_QUOTING = false;
      const btcPrice = 78000;
      const btcAmount = new BigNumber(env.QUOTER_DCA_V2_MAX_USD_VALUE).dividedBy(btcPrice);
      vi.mocked(getUsdValue).mockResolvedValue(btcAmount.times(btcPrice).toFixed(2));
      vi.mocked(getTotalLiquidity).mockResolvedValueOnce(
        BigInt(btcAmount.shiftedBy(assetConstants.Btc.decimals).dividedBy(10).toFixed(0)),
      );

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

      const expectedChunkCount = 500;
      const sendSpy = vi
        .spyOn(WsClient.prototype, 'sendRequest')
        .mockRejectedValueOnce(Error('some rpc error'))
        .mockResolvedValueOnce({
          broker_commission: buildFee('Usdc', 0),
          ingress_fee: buildFee('Eth', 25000),
          egress_fee: buildFee('Usdc', 8000),
          network_fee: buildFee('Usdc', 10_000e6),
          // 20k USDC intermediary
          intermediary: BigInt(20_000e6 * expectedChunkCount),
          // output of 0.2 BTC
          output: BigInt(0.2e8 * expectedChunkCount),
        });

      const params = new URLSearchParams({
        srcChain: 'Bitcoin',
        srcAsset: 'BTC',
        destChain: 'Ethereum',
        destAsset: 'ETH',
        amount: btcAmount.shiftedBy(assetConstants.Btc.decimals).toFixed(0),
        dcaEnabled: 'true',
        dcaV2Enabled: 'true',
      });

      const { body, status } = await request(server).get(`/v2/quote?${params.toString()}`);

      expect(status).toBe(200);
      expect(body).toMatchSnapshot();

      expect(sendSpy).toHaveBeenCalledTimes(2);
      expect(sendSpy.mock.calls).toMatchInlineSnapshot(`
        [
          [
            "cf_swap_rate_v3",
            {
              "asset": "BTC",
              "chain": "Bitcoin",
            },
            {
              "asset": "ETH",
              "chain": "Ethereum",
            },
            "0x2fc298035",
            0,
            undefined,
            undefined,
            [],
            [],
            false,
          ],
          [
            "cf_swap_rate_v3",
            {
              "asset": "BTC",
              "chain": "Bitcoin",
            },
            {
              "asset": "ETH",
              "chain": "Ethereum",
            },
            "0x2fc298035",
            0,
            {
              "chunk_interval": 2,
              "number_of_chunks": 5000,
            },
            undefined,
            [],
            [],
            false,
          ],
        ]
      `);
      expect(vi.mocked(Quoter.prototype.getLimitOrders).mock.calls).toMatchInlineSnapshot(`
        [
          [
            "Btc",
            "Eth",
            12820512821n,
          ],
          [
            "Btc",
            "Eth",
            2564103n,
          ],
        ]
      `);
    });

    describe('on chain', () => {
      it('properly quotes for regular swaps', async () => {
        vi.mocked(getTotalLiquidity).mockResolvedValueOnce(BigInt(2000e18));

        const sendSpy = vi.spyOn(WsClient.prototype, 'sendRequest').mockResolvedValueOnce({
          broker_commission: buildFee('Usdc', 0),
          ingress_fee: buildFee('Sol', 0),
          egress_fee: buildFee('Eth', 0),
          network_fee: buildFee('Usdc', 1000e6),
          intermediary: null,
          output: BigInt(1_000_000e6),
        });

        const params = new URLSearchParams({
          srcChain: 'Solana',
          srcAsset: 'USDC',
          destChain: 'Ethereum',
          destAsset: 'USDC',
          amount: (1_000_000e6).toString(),
          isOnChain: 'true',
        });

        const { status, body } = await request(server).get(`/v2/quote?${params.toString()}`);
        expect(status).toBe(200);
        expect(body).toMatchSnapshot();
        expect(sendSpy.mock.calls).toMatchInlineSnapshot(`
          [
            [
              "cf_swap_rate_v3",
              {
                "asset": "USDC",
                "chain": "Solana",
              },
              {
                "asset": "USDC",
                "chain": "Ethereum",
              },
              "0xe8d4a51000",
              0,
              undefined,
              undefined,
              [
                "Egress",
                "IngressDepositChannel",
                "IngressVaultSwap",
              ],
              [],
              true,
            ],
          ]
        `);
      });

      it('properly quotes with DCA', async () => {
        env.DCA_SELL_CHUNK_SIZE_USD = { Btc: 3000 };
        env.DCA_CHUNK_INTERVAL_BLOCKS = 2;
        env.DCA_DEFAULT_SELL_CHUNK_SIZE_USD = 2000;
        env.DCA_100K_USD_PRICE_IMPACT_PERCENT = {};
        env.DISABLE_DCA_QUOTING = false;
        vi.mocked(getUsdValue).mockResolvedValue('98000');
        vi.mocked(getTotalLiquidity)
          .mockResolvedValueOnce(BigInt(10e18))
          .mockResolvedValueOnce(BigInt(10e18));

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
                  [
                    'cFMYYJ9F1r1pRo3NBbnQDVRVRwY9tYem39gcfKZddPjvfsFfH',
                    'Chainflip Testnet Broker 2',
                  ],
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
            broker_commission: buildFee('Usdc', 0),
            ingress_fee: buildFee('Btc', 0),
            egress_fee: buildFee('Eth', 0),
            network_fee: buildFee('Usdc', 1001000),
            intermediary: BigInt(100e6),
            output: BigInt(1e18),
          })
          .mockResolvedValueOnce({
            broker_commission: buildFee('Usdc', 0),
            ingress_fee: buildFee('Btc', 0),
            egress_fee: buildFee('Eth', 0),
            network_fee: buildFee('Usdc', 1001000),
            intermediary: BigInt(100e6),
            output: BigInt(1e18),
          });

        const params = new URLSearchParams({
          srcChain: 'Bitcoin',
          srcAsset: 'BTC',
          destChain: 'Ethereum',
          destAsset: 'ETH',
          amount: (0.01e8).toString(),
          dcaEnabled: 'true',
          isOnChain: 'true',
        });

        const { status, body } = await request(server).get(`/v2/quote?${params.toString()}`);

        expect(status).toBe(200);
        expect(body).toMatchSnapshot();
        expect(sendSpy.mock.calls).toMatchInlineSnapshot(`
          [
            [
              "cf_swap_rate_v3",
              {
                "asset": "BTC",
                "chain": "Bitcoin",
              },
              {
                "asset": "ETH",
                "chain": "Ethereum",
              },
              "0xf4240",
              0,
              undefined,
              undefined,
              [
                "Egress",
                "IngressDepositChannel",
                "IngressVaultSwap",
              ],
              [],
              true,
            ],
            [
              "cf_swap_rate_v3",
              {
                "asset": "BTC",
                "chain": "Bitcoin",
              },
              {
                "asset": "ETH",
                "chain": "Ethereum",
              },
              "0xf4240",
              0,
              {
                "chunk_interval": 2,
                "number_of_chunks": 33,
              },
              undefined,
              [
                "Egress",
                "IngressDepositChannel",
                "IngressVaultSwap",
              ],
              [],
              true,
            ],
          ]
        `);
      });

      it('respects the minimum network fee', async () => {
        vi.mocked(getTotalLiquidity).mockResolvedValueOnce(BigInt(2000e18));

        const sendSpy = vi.spyOn(WsClient.prototype, 'sendRequest').mockResolvedValueOnce({
          broker_commission: buildFee('Usdc', 0),
          ingress_fee: buildFee('Sol', 0),
          egress_fee: buildFee('Eth', 0),
          network_fee: buildFee('Usdc', 500_001n),
          intermediary: null,
          output: BigInt(1_000e6),
        });

        const params = new URLSearchParams({
          srcChain: 'Solana',
          srcAsset: 'USDC',
          destChain: 'Ethereum',
          destAsset: 'USDC',
          amount: (1_000e6).toString(),
          isOnChain: 'true',
        });

        const { status, body } = await request(server).get(`/v2/quote?${params.toString()}`);

        expect(status).toBe(200);
        expect(body).toMatchSnapshot();
        expect(sendSpy.mock.calls).toMatchInlineSnapshot(`
          [
            [
              "cf_swap_rate_v3",
              {
                "asset": "USDC",
                "chain": "Solana",
              },
              {
                "asset": "USDC",
                "chain": "Ethereum",
              },
              "0x3b9aca00",
              0,
              undefined,
              undefined,
              [
                "Egress",
                "IngressDepositChannel",
                "IngressVaultSwap",
              ],
              [],
              true,
            ],
          ]
        `);
      });
    });
  });
});

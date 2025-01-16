import { CfSwapRateV3, CfSwapRateV3Response, WsClient } from '@chainflip/rpc';
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
  swapRate,
} from '@/shared/tests/fixtures';
import prisma, { InternalAsset } from '../../client';
import env from '../../config/env';
import { checkPriceWarning } from '../../pricing/checkPriceWarning';
import Quoter from '../../quoting/Quoter';
import app from '../../server';
import { boostPoolsCache } from '../../utils/boost';
import { getTotalLiquidity } from '../../utils/pools';

vi.mock('../../utils/pools', async (importOriginal) => {
  const original = (await importOriginal()) as object;
  return {
    ...original,
    getTotalLiquidity: vi.fn(),
  };
});

vi.mock('../../utils/function', async (importOriginal) => {
  const original = (await importOriginal()) as object;
  return {
    ...original,
    isAfterSpecVersion: vi.fn().mockResolvedValue(true),
  };
});

vi.mock('../../quoting/Quoter');

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

vi.mock('../../pricing/checkPriceWarning', () => ({
  checkPriceWarning: vi.fn(),
  getUsdValue: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../polkadot/api', () => ({
  getBoostSafeMode: vi.fn().mockResolvedValue(true),
}));

vi.mock('../../pricing/index');

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

    if (data.method === 'cf_swap_rate_v3') {
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
    server = app.listen(0);
    vi.mocked(Quoter.prototype.getLimitOrders).mockResolvedValue([]);
    vi.mocked(getTotalLiquidity).mockResolvedValue(BigInt(100e18));
    mockRpcs({ ingressFee: hexEncodeNumber(2000000), egressFee: hexEncodeNumber(50000) });
    // eslint-disable-next-line dot-notation
    boostPoolsCache['store'].clear();
  });

  afterEach(() => {
    Object.assign(env, oldEnv);
    server.close();
    vi.clearAllMocks();
  });

  describe('GET /quote', () => {
    it('rejects malformed requests', async () => {
      const { body, status } = await request(server).get('/quote');

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

      const { body, status } = await request(server).get(`/quote?${params.toString()}`);

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

      const { body, status } = await request(server).get(`/quote?${params.toString()}`);

      expect(status).toBe(200);
      expect(body).toMatchObject({
        depositAmount: '100000000',
        destAsset: {
          asset: 'ETH',
          chain: 'Ethereum',
        },
        egressAmount: '1000000000000000000',
        estimatedDurationSeconds: 144,
        estimatedDurationsSeconds: {
          deposit: 30,
          egress: 102,
          swap: 12,
        },
        estimatedPrice: '0.01',
        includedFees: [
          {
            amount: '0',
            asset: 'USDC',
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
            asset: 'ETH',
            chain: 'Ethereum',
            type: 'EGRESS',
          },
        ],
        poolInfo: [
          {
            baseAsset: {
              asset: 'ETH',
              chain: 'Ethereum',
            },
            fee: {
              amount: '200000',
              asset: 'USDC',
              chain: 'Ethereum',
            },
            quoteAsset: {
              asset: 'USDC',
              chain: 'Ethereum',
            },
          },
        ],
        recommendedSlippageTolerancePercent: 1,
        srcAsset: {
          asset: 'USDC',
          chain: 'Ethereum',
        },
        type: 'REGULAR',
      });
    });

    it('rejects when the egress amount is smaller than the egress fee', async () => {
      const sendSpy = vi.spyOn(WsClient.prototype, 'sendRequest').mockResolvedValueOnce({
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

      const { body, status } = await request(server).get(`/quote?${params.toString()}`);

      expect(status).toBe(400);
      expect(body).toMatchObject({
        message: 'swap output amount is lower than the egress fee (50000)',
      });
      expect(sendSpy).toHaveBeenCalledTimes(1);
    });

    it('rejects when the egress amount is smaller than the minimum egress amount', async () => {
      const sendSpy = vi.spyOn(WsClient.prototype, 'sendRequest').mockResolvedValueOnce({
        egress_fee: buildFee('Eth', 25000).bigint,
        network_fee: buildFee('Usdc', 2000000).bigint,
        ingress_fee: buildFee('Usdc', 2000000).bigint,
        intermediary: null,
        output: 599n,
      } as CfSwapRateV3);

      const params = new URLSearchParams({
        srcChain: 'Ethereum',
        srcAsset: 'ETH',
        destChain: 'Bitcoin',
        destAsset: 'BTC',
        amount: (100e6).toString(),
      });

      const { body, status } = await request(server).get(`/quote?${params.toString()}`);

      expect(status).toBe(400);
      expect(body).toMatchObject({
        message: 'egress amount (599) is lower than minimum egress amount (600)',
      });
      expect(sendSpy).toHaveBeenCalledTimes(1);
    });

    it('gets the quote from USDC with a broker commission', async () => {
      const sendSpy = vi.spyOn(WsClient.prototype, 'sendRequest').mockResolvedValueOnce({
        broker_commission: buildFee('Usdc', 100000).bigint,
        egress_fee: buildFee('Eth', 25000).bigint,
        network_fee: buildFee('Usdc', 97902).bigint,
        ingress_fee: buildFee('Usdc', 2000000).bigint,
        intermediary: null,
        output: 999999999999975000n,
      } as CfSwapRateV3);

      mockRpcs({ egressFee: hexEncodeNumber(25000), ingressFee: hexEncodeNumber(2000000) });

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
        'cf_swap_rate_v3',
        { asset: 'USDC', chain: 'Ethereum' },
        { asset: 'ETH', chain: 'Ethereum' },
        hexEncodeNumber(100_000_000), // deposit amount
        10,
        undefined,
        null,
        [],
        [],
      );
      expect(body).toMatchObject({
        egressAmount: (999999999999975000).toString(),
        includedFees: [
          {
            amount: '2000000',
            asset: 'USDC',
            chain: 'Ethereum',
            type: 'INGRESS',
          },
          {
            amount: '97902',
            asset: 'USDC',
            chain: 'Ethereum',
            type: 'NETWORK',
          },
          {
            amount: '100000',
            asset: 'USDC',
            chain: 'Ethereum',
            type: 'BROKER',
          },
          {
            amount: '25000',
            asset: 'ETH',
            chain: 'Ethereum',
            type: 'EGRESS',
          },
        ],
        poolInfo: [
          {
            fee: {
              amount: '196000',
              asset: 'USDC',
              chain: 'Ethereum',
            },
            baseAsset: { asset: 'ETH', chain: 'Ethereum' },
            quoteAsset: { asset: 'USDC', chain: 'Ethereum' },
          },
        ],
      });
    });

    it('should return quote for vault swap with excluded ingress fee', async () => {
      const sendSpy = vi.spyOn(WsClient.prototype, 'sendRequest').mockResolvedValueOnce({
        broker_commission: buildFee('Usdc', 0).bigint,
        ingress_fee: buildFee('Usdc', 0).bigint,
        network_fee: buildFee('Usdc', 98000).bigint,
        egress_fee: buildFee('Eth', 25000).bigint,
        intermediary: null,
        output: 999999999999975000n,
      });
      mockRpcs({ ingressFee: hexEncodeNumber(2000000), egressFee: hexEncodeNumber(25000) });

      const params = new URLSearchParams({
        srcChain: 'Ethereum',
        srcAsset: 'USDC',
        destChain: 'Ethereum',
        destAsset: 'ETH',
        amount: (100e6).toString(),
        isVaultSwap: 'true',
      });

      const { body, status } = await request(server).get(`/quote?${params.toString()}`);

      expect(status).toBe(200);

      expect(sendSpy).toHaveBeenCalledWith(
        'cf_swap_rate_v3',
        { asset: 'USDC', chain: 'Ethereum' },
        { asset: 'ETH', chain: 'Ethereum' },
        hexEncodeNumber(100_000_000), // deposit amount
        0,
        undefined,
        null,
        ['Ingress'],
        [],
      );

      expect(body).toMatchObject({
        egressAmount: '999999999999975000',
        includedFees: [
          {
            amount: '0', // ingress still returns 0
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
            amount: '25000',
            asset: 'ETH',
            chain: 'Ethereum',
            type: 'EGRESS',
          },
        ],
        poolInfo: [
          {
            baseAsset: {
              asset: 'ETH',
              chain: 'Ethereum',
            },
            fee: {
              amount: '200000',
              asset: 'USDC',
              chain: 'Ethereum',
            },
            quoteAsset: {
              asset: 'USDC',
              chain: 'Ethereum',
            },
          },
        ],
      });
    });

    it('gets the quote from btc with boost information', async () => {
      env.CHAINFLIP_NETWORK = 'backspin';

      const sendSpy = vi
        .spyOn(WsClient.prototype, 'sendRequest')
        .mockResolvedValueOnce({
          broker_commission: buildFee('Usdc', 0).bigint,
          ingress_fee: buildFee('Btc', 100000).bigint,
          network_fee: buildFee('Usdc', 1999500).bigint,
          egress_fee: buildFee('Eth', 25000).bigint,
          intermediary: BigInt(2000e6),
          output: 999999999999975000n,
        } as CfSwapRateV3)
        .mockResolvedValueOnce({
          broker_commission: buildFee('Usdc', 0).bigint,
          ingress_fee: buildFee('Btc', 100000).bigint,
          network_fee: buildFee('Usdc', 1999500).bigint,
          egress_fee: buildFee('Eth', 25000).bigint,
          intermediary: BigInt(2000e6 - 5e5),
          output: 999999949999975000n,
        } as CfSwapRateV3);

      mockRpcs({
        ingressFee: hexEncodeNumber(100000),
        egressFee: hexEncodeNumber(25000),
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
      expect(sendSpy).toHaveBeenCalledWith(
        'cf_swap_rate_v3',
        { asset: 'BTC', chain: 'Bitcoin' },
        { asset: 'ETH', chain: 'Ethereum' },
        hexEncodeNumber(1e8), // deposit amount
        0,
        undefined,
        null,
        [],
        [],
      );

      // Boosted swap
      expect(sendSpy).toHaveBeenCalledWith(
        'cf_swap_rate_v3',
        { asset: 'BTC', chain: 'Bitcoin' },
        { asset: 'ETH', chain: 'Ethereum' },
        hexEncodeNumber(99950000), // deposit amount - boost fee
        0,
        undefined,
        null,
        [],
        [],
      );

      expect(body).toMatchSnapshot();
      expect(body.boostQuote).not.toBeUndefined();
    });

    it("doesn't include boost information inside quote when there is no liquidity to fill the provided amount", async () => {
      env.CHAINFLIP_NETWORK = 'backspin';

      const sendSpy = vi.spyOn(WsClient.prototype, 'sendRequest').mockResolvedValueOnce({
        broker_commission: buildFee('Usdc', 0).bigint,
        ingress_fee: buildFee('Btc', 100000).bigint,
        network_fee: buildFee('Usdc', 1999500).bigint,
        egress_fee: buildFee('Eth', 25000).bigint,
        intermediary: BigInt(2000e6),
        output: BigInt(1e18),
      });

      mockRpcs({
        ingressFee: hexEncodeNumber(100000),
        egressFee: hexEncodeNumber(25000),
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
        'cf_swap_rate_v3',
        { asset: 'BTC', chain: 'Bitcoin' },
        { asset: 'ETH', chain: 'Ethereum' },
        hexEncodeNumber(1e8), // deposit amount
        0,
        undefined,
        null,
        [],
        [],
      );

      expect(body.boostQuote).toBe(undefined);
    });

    it("doesn't include boost information when disabled", async () => {
      env.CHAINFLIP_NETWORK = 'backspin';
      env.DISABLE_BOOST_QUOTING = true;

      vi.spyOn(WsClient.prototype, 'sendRequest').mockResolvedValueOnce({
        broker_commission: buildFee('Usdc', 0).bigint,
        ingress_fee: buildFee('Btc', 100000).bigint,
        network_fee: buildFee('Usdc', 1999500).bigint,
        egress_fee: buildFee('Eth', 25000).bigint,
        intermediary: BigInt(2000e6),
        output: 999999999999975000n,
      } as CfSwapRateV3);

      mockRpcs({
        ingressFee: hexEncodeNumber(100000),
        egressFee: hexEncodeNumber(25000),
        mockedBoostPoolsDepth: [
          {
            chain: 'Bitcoin',
            asset: 'BTC',
            tier: 5,
            available_amount: `0x${(2e8).toString(16)}`,
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

      expect(body).toMatchSnapshot();
      expect(body.boostQuote).toBeUndefined();
    });

    it('gets the quote from USDC from the pools', async () => {
      const sendSpy = vi.spyOn(WsClient.prototype, 'sendRequest').mockResolvedValueOnce({
        broker_commission: buildFee('Usdc', 0).bigint,
        ingress_fee: buildFee('Usdc', 2000000).bigint,
        network_fee: buildFee('Usdc', 98000).bigint,
        egress_fee: buildFee('Eth', 25000).bigint,
        intermediary: null,
        output: 999999999999975000n,
      });
      mockRpcs({ ingressFee: hexEncodeNumber(2000000), egressFee: hexEncodeNumber(25000) });

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
        'cf_swap_rate_v3',
        { asset: 'USDC', chain: 'Ethereum' },
        { asset: 'ETH', chain: 'Ethereum' },
        hexEncodeNumber(100e6), // deposit amount,
        0,
        undefined,
        null,
        [],
        [],
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
            amount: '25000',
            asset: 'ETH',
            chain: 'Ethereum',
            type: 'EGRESS',
          },
        ],
        poolInfo: [
          {
            baseAsset: { asset: 'ETH', chain: 'Ethereum' },
            fee: { amount: '196000', asset: 'USDC', chain: 'Ethereum' },
            quoteAsset: { asset: 'USDC', chain: 'Ethereum' },
          },
        ],
      });
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
      });
      expect(sendSpy).toHaveBeenCalledTimes(1);
    });

    it('gets the quote with intermediate amount', async () => {
      vi.mocked(getTotalLiquidity).mockResolvedValueOnce(BigInt(1e18));

      const sendSpy = vi.spyOn(WsClient.prototype, 'sendRequest').mockResolvedValueOnce({
        broker_commission: buildFee('Usdc', 0).bigint,
        intermediary: BigInt(2000e6),
        output: 999999999999975000n,
        egress_fee: buildFee('Eth', 25000).bigint,
        ingress_fee: buildFee('Flip', 2000000).bigint,
        network_fee: buildFee('Usdc', 2000000).bigint,
      } as CfSwapRateV3);

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
            amount: '25000',
            asset: 'ETH',
            chain: 'Ethereum',
            type: 'EGRESS',
          },
        ],
        poolInfo: [
          {
            fee: {
              amount: '999999999998000',
              asset: 'FLIP',
              chain: 'Ethereum',
            },
          },
          {
            fee: {
              amount: '4000000',
              asset: 'USDC',
              chain: 'Ethereum',
            },
          },
        ],
      });
      expect(sendSpy).toHaveBeenCalledTimes(1);
    });

    it('throws 400 if totalLiquidity is lower than egressAmount', async () => {
      vi.mocked(getTotalLiquidity)
        .mockResolvedValueOnce(BigInt(0n))
        .mockResolvedValueOnce(BigInt(0n));

      const sendSpy = vi.spyOn(WsClient.prototype, 'sendRequest').mockResolvedValueOnce({
        broker_commission: buildFee('Usdc', 0).bigint,
        intermediary: BigInt(2000e6),
        output: 999999999999975000n,
        egress_fee: buildFee('Eth', 25000).bigint,
        ingress_fee: buildFee('Flip', 2000000).bigint,
        network_fee: buildFee('Usdc', 2000000).bigint,
      } as CfSwapRateV3);

      const params = new URLSearchParams({
        srcChain: 'Ethereum',
        srcAsset: 'FLIP',
        destChain: 'Ethereum',
        destAsset: 'ETH',
        amount: (1e18).toString(),
      });

      const { body, status } = await request(server).get(`/quote?${params.toString()}`);

      expect(status).toBe(400);
      expect(body.message).toBe('Insufficient liquidity for the requested amount');
      expect(sendSpy).toHaveBeenCalledTimes(1);
    });

    it('throws 400 if totalLiquidity is higher in the intermediate amount but lower for egressAmount', async () => {
      vi.mocked(getTotalLiquidity)
        .mockResolvedValueOnce(BigInt(3000e6))
        .mockResolvedValueOnce(BigInt(99999999999975000n));

      const sendSpy = vi.spyOn(WsClient.prototype, 'sendRequest').mockResolvedValueOnce({
        broker_commission: buildFee('Usdc', 0).bigint,
        intermediary: BigInt(2000e6),
        output: 999999999999975000n,
        egress_fee: buildFee('Eth', 25000).bigint,
        ingress_fee: buildFee('Flip', 2000000).bigint,
        network_fee: buildFee('Usdc', 2000000).bigint,
      } as CfSwapRateV3);

      const params = new URLSearchParams({
        srcChain: 'Ethereum',
        srcAsset: 'FLIP',
        destChain: 'Ethereum',
        destAsset: 'ETH',
        amount: (1e18).toString(),
      });

      const { body, status } = await request(server).get(`/quote?${params.toString()}`);

      expect(status).toBe(400);
      expect(body.message).toBe('Insufficient liquidity for the requested amount');
      expect(sendSpy).toHaveBeenCalledTimes(1);
    });

    it('does not throw if totalLiquidity is higher than egressAmount', async () => {
      vi.mocked(getTotalLiquidity)
        .mockResolvedValueOnce(BigInt(999999999999975001n))
        .mockResolvedValueOnce(BigInt(999999999999975001n));

      const sendSpy = vi.spyOn(WsClient.prototype, 'sendRequest').mockResolvedValueOnce({
        broker_commission: buildFee('Usdc', 0).bigint,
        intermediary: BigInt(2000e6),
        output: 999999999999975000n,
        egress_fee: buildFee('Eth', 25000).bigint,
        ingress_fee: buildFee('Flip', 2000000).bigint,
        network_fee: buildFee('Usdc', 2000000).bigint,
      } as CfSwapRateV3);

      const params = new URLSearchParams({
        srcChain: 'Ethereum',
        srcAsset: 'FLIP',
        destChain: 'Ethereum',
        destAsset: 'ETH',
        amount: (1e18).toString(),
      });
      const { status } = await request(server).get(`/quote?${params.toString()}`);
      expect(status).toBe(200);
      expect(sendSpy).toHaveBeenCalledTimes(1);
    });

    it('gets the quote with a realistic price', async () => {
      const sendSpy = vi.spyOn(WsClient.prototype, 'sendRequest').mockResolvedValueOnce({
        output: 1229437998n,
        ingress_fee: buildFee('Eth', 169953533800000).bigint,
        network_fee: buildFee('Usdc', 1231422).bigint,
        egress_fee: buildFee('Usdc', 752586).bigint,
        broker_commission: buildFee('Usdc', 0).bigint,
      } as CfSwapRateV3);

      const params = new URLSearchParams({
        srcChain: 'Ethereum',
        srcAsset: 'ETH',
        destChain: 'Ethereum',
        destAsset: 'USDC',
        amount: '500000000000000000',
      });

      const { body, status } = await request(server).get(`/quote?${params.toString()}`);

      expect(status).toBe(200);
      expect(body).toMatchSnapshot();
      expect(sendSpy).toHaveBeenCalledTimes(1);
    });

    it('gets the quote with low liquidity warning', async () => {
      const sendSpy = vi.spyOn(WsClient.prototype, 'sendRequest').mockResolvedValueOnce({
        broker_commission: buildFee('Usdc', 0).bigint,
        ingress_fee: buildFee('Flip', 2000000).bigint,
        network_fee: buildFee('Usdc', 2994000).bigint,
        egress_fee: buildFee('Eth', 25000).bigint,
        intermediary: BigInt(2994e6),
        output: 1999999999999975000n,
      } as CfSwapRateV3);

      mockRpcResponse((url, data: any) => {
        if (data.method === 'cf_environment') {
          return Promise.resolve({
            data: environment({
              maxSwapAmount: null,
              ingressFee: hexEncodeNumber(2000000),
              egressFee: hexEncodeNumber(25000),
            }),
          });
        }

        if (data.method === 'cf_swap_rate_v3') {
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

      vi.mocked(checkPriceWarning).mockResolvedValueOnce(true);

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
      vi.spyOn(WsClient.prototype, 'sendRequest').mockResolvedValueOnce({
        broker_commission: buildFee('Usdc', 0).bigint,
        ingress_fee: buildFee('Flip', 2000000).bigint,
        network_fee: buildFee('Usdc', 2000000).bigint,
        egress_fee: buildFee('Eth', 25000).bigint,
        intermediary: 2000000000n,
        output: 999999999999975000n,
      });

      mockRpcResponse((url, data: any) => {
        if (data.method === 'cf_environment') {
          return Promise.resolve({
            data: environment({
              maxSwapAmount: null,
              ingressFee: hexEncodeNumber(2000000),
              egressFee: hexEncodeNumber(25000),
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
  });
});

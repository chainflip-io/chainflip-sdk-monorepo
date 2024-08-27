import { CfSwapRateV2, CfSwapRateV2Response, WsClient } from '@chainflip/rpc';
import { hexEncodeNumber } from '@chainflip/utils/number';
import { Server } from 'http';
import request from 'supertest';
import { getAssetAndChain } from '@/shared/enums';
import {
  MockedBoostPoolsDepth,
  boostPoolsDepth,
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

jest.mock('../../utils/function', () => ({
  ...jest.requireActual('../../utils/function'),
  isAfterSpecVersion: jest.fn().mockResolvedValue(true),
}));

jest.mock('../../quoting/Quoter');

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

jest.mock('../../pricing/checkPriceWarning.ts', () => ({
  checkPriceWarning: jest.fn(),
}));

jest.mock('../../pricing/index');

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
    jest.mocked(Quoter.prototype.getLimitOrders).mockResolvedValue([]);
    mockRpcs({ ingressFee: hexEncodeNumber(2000000), egressFee: hexEncodeNumber(50000) });
    // eslint-disable-next-line dot-notation
    boostPoolsCache['store'].clear();
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

      const { body, status } = await request(server).get(`/quote?${params.toString()}`);

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

      const { body, status } = await request(server).get(`/quote?${params.toString()}`);

      expect(status).toBe(400);
      expect(body).toMatchObject({
        message: 'swap output amount is lower than the egress fee (50000)',
      });
      expect(sendSpy).toHaveBeenCalledTimes(1);
    });

    it('rejects when the egress amount is smaller than the minimum egress amount', async () => {
      const sendSpy = jest.spyOn(WsClient.prototype, 'sendRequest').mockResolvedValueOnce({
        egress_fee: buildFee('Eth', 25000).bigint,
        network_fee: buildFee('Usdc', 2000000).bigint,
        ingress_fee: buildFee('Usdc', 2000000).bigint,
        intermediary: null,
        output: 599n,
      } as CfSwapRateV2);

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
      const sendSpy = jest.spyOn(WsClient.prototype, 'sendRequest').mockResolvedValueOnce({
        egress_fee: buildFee('Eth', 25000).bigint,
        network_fee: buildFee('Usdc', 97902).bigint,
        ingress_fee: buildFee('Usdc', 2000000).bigint,
        intermediary: null,
        output: 999999999999975000n,
      } as CfSwapRateV2);

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
        'cf_swap_rate_v2',
        { asset: 'USDC', chain: 'Ethereum' },
        { asset: 'ETH', chain: 'Ethereum' },
        hexEncodeNumber(99_900_000), // deposit amount - broker fee
        [],
      );
      expect(body).toMatchObject({
        egressAmount: (1e18 - 25000).toString(),
        includedFees: [
          {
            amount: '100000',
            asset: 'USDC',
            chain: 'Ethereum',
            type: 'BROKER',
          },
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
            amount: '25000',
            asset: 'ETH',
            chain: 'Ethereum',
            type: 'EGRESS',
          },
        ],
        poolInfo: [
          {
            fee: {
              amount: '199800',
              asset: 'USDC',
              chain: 'Ethereum',
            },
            baseAsset: { asset: 'ETH', chain: 'Ethereum' },
            quoteAsset: { asset: 'USDC', chain: 'Ethereum' },
          },
        ],
      });
    });

    it('gets the quote from btc with boost information', async () => {
      env.CHAINFLIP_NETWORK = 'backspin';

      const sendSpy = jest
        .spyOn(WsClient.prototype, 'sendRequest')
        .mockResolvedValueOnce({
          ingress_fee: buildFee('Btc', 100000).bigint,
          network_fee: buildFee('Usdc', 1999500).bigint,
          egress_fee: buildFee('Eth', 25000).bigint,
          intermediary: BigInt(2000e6),
          output: 999999999999975000n,
        } as CfSwapRateV2)
        .mockResolvedValueOnce({
          ingress_fee: buildFee('Btc', 100000).bigint,
          network_fee: buildFee('Usdc', 1999500).bigint,
          egress_fee: buildFee('Eth', 25000).bigint,
          intermediary: BigInt(2000e6 - 5e5),
          output: 999999949999975000n,
        } as CfSwapRateV2);

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
        'cf_swap_rate_v2',
        { asset: 'BTC', chain: 'Bitcoin' },
        { asset: 'ETH', chain: 'Ethereum' },
        hexEncodeNumber(1e8), // deposit amount
        [],
      );

      // Boosted swap
      expect(sendSpy).toHaveBeenCalledWith(
        'cf_swap_rate_v2',
        { asset: 'BTC', chain: 'Bitcoin' },
        { asset: 'ETH', chain: 'Ethereum' },
        hexEncodeNumber(99950000), // deposit amount - boost fee
        [],
      );

      expect(body).toMatchSnapshot();
      expect(body.boostQuote).not.toBeUndefined();
    });

    it("doesn't include boost information inside quote when there is no liquidity to fill the provided amount", async () => {
      env.CHAINFLIP_NETWORK = 'backspin';

      const sendSpy = jest.spyOn(WsClient.prototype, 'sendRequest').mockResolvedValueOnce({
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
        'cf_swap_rate_v2',
        { asset: 'BTC', chain: 'Bitcoin' },
        { asset: 'ETH', chain: 'Ethereum' },
        hexEncodeNumber(1e8), // deposit amount
        [],
      );

      expect(body.boostQuote).toBe(undefined);
    });

    it("doesn't include boost information when disabled", async () => {
      env.CHAINFLIP_NETWORK = 'backspin';
      env.DISABLE_BOOST_QUOTING = true;

      jest.spyOn(WsClient.prototype, 'sendRequest').mockResolvedValueOnce({
        ingress_fee: buildFee('Btc', 100000).bigint,
        network_fee: buildFee('Usdc', 1999500).bigint,
        egress_fee: buildFee('Eth', 25000).bigint,
        intermediary: BigInt(2000e6),
        output: 999999999999975000n,
      } as CfSwapRateV2);

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
      const sendSpy = jest.spyOn(WsClient.prototype, 'sendRequest').mockResolvedValueOnce({
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
        'cf_swap_rate_v2',
        { asset: 'USDC', chain: 'Ethereum' },
        { asset: 'ETH', chain: 'Ethereum' },
        hexEncodeNumber(100e6), // deposit amount
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
            fee: { amount: '200000', asset: 'USDC', chain: 'Ethereum' },
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
              amount: '2000000000000000',
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
      const sendSpy = jest.spyOn(WsClient.prototype, 'sendRequest').mockResolvedValueOnce({
        intermediary: BigInt(2000e6),
        output: 999999999999975000n,
        egress_fee: buildFee('Eth', 25000).bigint,
        ingress_fee: buildFee('Flip', 2000000).bigint,
        network_fee: buildFee('Usdc', 2000000).bigint,
      } as CfSwapRateV2);

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
              amount: '1000000000000000',
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

    it('gets the quote with a realistic price', async () => {
      const sendSpy = jest.spyOn(WsClient.prototype, 'sendRequest').mockResolvedValueOnce({
        output: 1229437998n,
        ingress_fee: buildFee('Eth', 169953533800000).bigint,
        network_fee: buildFee('Usdc', 1231422).bigint,
        egress_fee: buildFee('Usdc', 752586).bigint,
      } as CfSwapRateV2);

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
      const sendSpy = jest.spyOn(WsClient.prototype, 'sendRequest').mockResolvedValueOnce({
        ingress_fee: buildFee('Flip', 2000000).bigint,
        network_fee: buildFee('Usdc', 2994000).bigint,
        egress_fee: buildFee('Eth', 25000).bigint,
        intermediary: BigInt(2994e6),
        output: 1999999999999975000n,
      } as CfSwapRateV2);

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

        if (data.method === 'cf_swap_rate_v2') {
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
      jest.spyOn(WsClient.prototype, 'sendRequest').mockResolvedValueOnce({
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

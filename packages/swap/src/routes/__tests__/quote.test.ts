import axios from 'axios';
import * as crypto from 'crypto';
import { once } from 'events';
import { Server } from 'http';
import { AddressInfo } from 'net';
import request from 'supertest';
import { promisify } from 'util';
import RpcClient from '@/shared/node-apis/RpcClient';
import { environment, swapRate } from '@/shared/tests/fixtures';
import env from '@/swap/config/env';
import prisma from '../../client';
import { checkPriceWarning } from '../../pricing/checkPriceWarning';
import QuotingClient from '../../quoting/QuotingClient';
import app from '../../server';

const generateKeyPairAsync = promisify(crypto.generateKeyPair);

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
}));

describe('server', () => {
  let server: Server;
  let quotingClient: QuotingClient;
  let oldEnv: typeof env;

  beforeAll(async () => {
    await prisma.$queryRaw`TRUNCATE TABLE public."Pool" CASCADE`;
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
      ],
    });
  });

  beforeEach(async () => {
    oldEnv = { ...env };
    server = app.listen(0);
    await prisma.$queryRaw`TRUNCATE TABLE private."MarketMaker" CASCADE`;
    const name = 'web_team_whales';
    const pair = await generateKeyPairAsync('ed25519');
    await prisma.marketMaker.create({
      data: {
        name: 'web_team_whales',
        publicKey: pair.publicKey
          .export({ format: 'pem', type: 'spki' })
          .toString('base64'),
      },
    });

    jest.mocked(axios.post).mockImplementation((url, data: any) => {
      if (data.method === 'cf_environment') {
        return Promise.resolve({
          data: environment({
            maxSwapAmount: null,
            ingressFee: '0xF4240', // 1000000
            egressFee: '0x61A8', // 25000
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

      throw new Error(
        `unexpected axios call to ${url}: ${JSON.stringify(data)}`,
      );
    });

    quotingClient = new QuotingClient(
      `http://localhost:${(server.address() as AddressInfo).port}`,
      name,
      pair.privateKey.export({ format: 'pem', type: 'pkcs8' }).toString(),
    );
    quotingClient.setQuoteRequestHandler(async (req) => ({
      id: req.id,
      intermediate_amount: '0',
      output_amount: '0',
    }));
    await once(quotingClient, 'connected');
  });

  afterEach((cb) => {
    Object.assign(env, oldEnv);
    quotingClient.close();
    server.close(cb);
  });

  describe('GET /quote', () => {
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

      const { body, status } = await request(server).get(
        `/quote?${params.toString()}`,
      );

      expect(status).toBe(400);
      expect(body).toMatchObject({
        message: 'expected amount is below minimum swap amount (16777215)',
      });
    });

    it('rejects if amount is higher than maximum swap amount', async () => {
      jest
        .mocked(axios.post)
        .mockResolvedValue({ data: environment({ maxSwapAmount: '0x1' }) });

      const params = new URLSearchParams({
        srcChain: 'Ethereum',
        srcAsset: 'USDC',
        destChain: 'Ethereum',
        destAsset: 'FLIP',
        amount: '50',
      });

      const { body, status } = await request(server).get(
        `/quote?${params.toString()}`,
      );

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

      const quoteHandler = jest.fn(async (req) => ({
        id: req.id,
        output_amount: '0',
      }));
      quotingClient.setQuoteRequestHandler(quoteHandler);

      const { body, status } = await request(server).get(
        `/quote?${params.toString()}`,
      );

      expect(status).toBe(400);
      expect(body).toMatchObject({
        message: 'amount is lower than estimated ingress fee (2000000)',
      });
    });

    it('rejects when the egress amount is smaller than the egress fee', async () => {
      const sendSpy = jest
        .spyOn(RpcClient.prototype, 'sendRequest')
        .mockResolvedValueOnce({
          outputAmount: (1250).toString(),
        });

      const params = new URLSearchParams({
        srcChain: 'Ethereum',
        srcAsset: 'USDC',
        destChain: 'Ethereum',
        destAsset: 'ETH',
        amount: (100e6).toString(),
      });

      const quoteHandler = jest.fn(async (req) => ({
        id: req.id,
        output_amount: '0',
      }));
      quotingClient.setQuoteRequestHandler(quoteHandler);

      const { body, status } = await request(server).get(
        `/quote?${params.toString()}`,
      );

      expect(status).toBe(400);
      expect(body).toMatchObject({
        message: 'egress amount (0) is lower than minimum egress amount (1)',
      });
      expect(sendSpy).toHaveBeenCalledTimes(1);
    });

    it('gets the quote from usdc with a broker commission', async () => {
      const sendSpy = jest
        .spyOn(RpcClient.prototype, 'sendRequest')
        .mockResolvedValueOnce({
          outputAmount: (1e18).toString(),
        });

      const params = new URLSearchParams({
        srcChain: 'Ethereum',
        srcAsset: 'USDC',
        destChain: 'Ethereum',
        destAsset: 'ETH',
        amount: (100e6).toString(),
        brokerCommissionBps: '10',
      });

      const quoteHandler = jest.fn(async (req) => ({
        id: req.id,
        output_amount: (0.5e18).toString(),
      }));
      quotingClient.setQuoteRequestHandler(quoteHandler);

      const { body, status } = await request(server).get(
        `/quote?${params.toString()}`,
      );

      expect(status).toBe(200);
      expect(quoteHandler).toHaveBeenCalledWith({
        deposit_amount: '97902000', // deposit amount - ingress fee - broker fee
        destination_asset: 'Eth',
        id: expect.any(String),
        intermediate_asset: null,
        source_asset: 'Usdc',
      });
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

    it('gets the quote from usdc with a boost fee', async () => {
      const sendSpy = jest
        .spyOn(RpcClient.prototype, 'sendRequest')
        .mockResolvedValueOnce({
          egressAmount: (1e18).toString(),
        });

      const params = new URLSearchParams({
        srcAsset: 'USDC',
        destAsset: 'ETH',
        amount: (100e6).toString(),
        boostFeeBps: '10',
      });

      const quoteHandler = jest.fn(async (req) => ({
        id: req.id,
        egress_amount: (0.5e18).toString(),
      }));
      client.setQuoteRequestHandler(quoteHandler);

      const { body, status } = await request(server).get(
        `/quote?${params.toString()}`,
      );

      expect(status).toBe(200);
      expect(quoteHandler).toHaveBeenCalledWith({
        deposit_amount: '98900000', // deposit amount - boost fee - ingress fee
        destination_asset: 'ETH',
        id: expect.any(String),
        intermediate_asset: null,
        source_asset: 'USDC',
      });

      expect(sendSpy).toHaveBeenCalledWith(
        'swap_rate',
        { asset: 'USDC', chain: 'Ethereum' },
        { asset: 'ETH', chain: 'Ethereum' },
        '98900000', // deposit amount - boost fee - ingress fee
      );
      expect(body).toMatchObject({
        egressAmount: (1e18 - 25000).toString(),
        includedFees: [
          {
            amount: '100000',
            asset: 'USDC',
            chain: 'Ethereum',
            type: 'BOOST',
          },
          {
            amount: '1000000',
            asset: 'USDC',
            chain: 'Ethereum',
            type: 'INGRESS',
          },
          {
            amount: '98900',
            asset: 'USDC',
            chain: 'Ethereum',
            type: 'NETWORK',
          },
          {
            amount: '197800',
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

    it('gets the quote from usdc when the broker is best', async () => {
      const sendSpy = jest
        .spyOn(RpcClient.prototype, 'sendRequest')
        .mockResolvedValueOnce({
          outputAmount: (1e18).toString(),
        });

      const params = new URLSearchParams({
        srcChain: 'Ethereum',
        srcAsset: 'USDC',
        destChain: 'Ethereum',
        destAsset: 'ETH',
        amount: (100e6).toString(),
      });

      const quoteHandler = jest.fn(async (req) => ({
        id: req.id,
        output_amount: (0.5e18).toString(),
      }));
      quotingClient.setQuoteRequestHandler(quoteHandler);

      const { body, status } = await request(server).get(
        `/quote?${params.toString()}`,
      );

      expect(status).toBe(200);
      expect(quoteHandler).toHaveBeenCalledWith({
        deposit_amount: '98000000', // deposit amount - ingress fee
        destination_asset: 'Eth',
        id: expect.any(String),
        intermediate_asset: null,
        source_asset: 'Usdc',
      });
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

    it('gets the quote to usdc when the broker is best', async () => {
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

        throw new Error(
          `unexpected axios call to ${url}: ${JSON.stringify(data)}`,
        );
      });

      const sendSpy = jest
        .spyOn(RpcClient.prototype, 'sendRequest')
        .mockResolvedValueOnce({
          outputAmount: (100e6).toString(),
        });

      const params = new URLSearchParams({
        srcChain: 'Ethereum',
        srcAsset: 'ETH',
        destChain: 'Ethereum',
        destAsset: 'USDC',
        amount: (1e18).toString(),
      });

      quotingClient.setQuoteRequestHandler(async (req) => ({
        id: req.id,
        output_amount: (50e6).toString(),
      }));

      const { body, status } = await request(server).get(
        `/quote?${params.toString()}`,
      );

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

    it('gets the quote with intermediate amount when the broker is best', async () => {
      const sendSpy = jest
        .spyOn(RpcClient.prototype, 'sendRequest')
        .mockResolvedValueOnce({
          intermediateAmount: (2000e6).toString(),
          outputAmount: (1e18).toString(),
        });

      const params = new URLSearchParams({
        srcChain: 'Ethereum',
        srcAsset: 'FLIP',
        destChain: 'Ethereum',
        destAsset: 'ETH',
        amount: (1e18).toString(),
      });

      quotingClient.setQuoteRequestHandler(async (req) => ({
        id: req.id,
        intermediate_amount: (1000e6).toString(),
        output_amount: (0.5e18).toString(),
      }));

      const { body, status } = await request(server).get(
        `/quote?${params.toString()}`,
      );

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

    it('gets the quote when the market maker is best', async () => {
      const sendSpy = jest
        .spyOn(RpcClient.prototype, 'sendRequest')
        .mockResolvedValueOnce({
          intermediateAmount: (2000e6).toString(),
          outputAmount: (1e18).toString(),
        });
      const params = new URLSearchParams({
        srcChain: 'Ethereum',
        srcAsset: 'FLIP',
        destChain: 'Ethereum',
        destAsset: 'ETH',
        amount: (1e18).toString(),
      });

      quotingClient.setQuoteRequestHandler(async (req) => ({
        id: req.id,
        intermediate_amount: (3000e6).toString(),
        output_amount: (2e18).toString(),
      }));

      const { body, status } = await request(server).get(
        `/quote?${params.toString()}`,
      );

      expect(status).toBe(200);
      expect(body).toMatchObject({
        intermediateAmount: (2994e6).toString(),
        egressAmount: (1.992e18 - 25000).toString(),
        includedFees: [
          {
            amount: '2000000',
            asset: 'FLIP',
            chain: 'Ethereum',
            type: 'INGRESS',
          },
          {
            amount: '2994000',
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
            amount: '5988000',
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
      const sendSpy = jest
        .spyOn(RpcClient.prototype, 'sendRequest')
        .mockResolvedValueOnce({
          intermediateAmount: (2000e6).toString(),
          outputAmount: (1e18).toString(),
        });
      const params = new URLSearchParams({
        srcChain: 'Ethereum',
        srcAsset: 'FLIP',
        destChain: 'Ethereum',
        destAsset: 'ETH',
        amount: (1e18).toString(),
      });

      quotingClient.setQuoteRequestHandler(async (req) => ({
        id: req.id,
        intermediate_amount: (3000e6).toString(),
        output_amount: (2e18).toString(),
      }));

      jest.mocked(checkPriceWarning).mockResolvedValueOnce(true);

      const { body, status } = await request(server).get(
        `/quote?${params.toString()}`,
      );

      expect(status).toBe(200);
      expect(body).toMatchSnapshot();
      expect(sendSpy).toHaveBeenCalledTimes(1);
    });

    it('is disabled in maintenance mode', async () => {
      env.MAINTENANCE_MODE = true;
      const { status } = await request(app).get('/quote');
      expect(status).toBe(503);
    });
  });

  it('gets the quote for deprecated params without the chain', async () => {
    jest.spyOn(RpcClient.prototype, 'sendRequest').mockResolvedValueOnce({
      intermediateAmount: (2000e6).toString(),
      outputAmount: (1e18).toString(),
    });

    const params = new URLSearchParams({
      srcAsset: 'FLIP',
      destAsset: 'ETH',
      amount: (1e18).toString(),
    });

    const { body, status } = await request(server).get(
      `/quote?${params.toString()}`,
    );

    expect(status).toBe(200);
    expect(body).toMatchSnapshot();
  });

  it('gets the quote when ingress and egress fee is returned as gas asset amount', async () => {
    jest.spyOn(RpcClient.prototype, 'sendRequest').mockResolvedValueOnce({
      outputAmount: (2000e6).toString(),
    });
    quotingClient.setQuoteRequestHandler(async (req) => ({
      id: req.id,
      output_amount: '0',
    }));

    const rpcEnvironment = environment();
    rpcEnvironment.result.ingress_egress.ingress_fees.Ethereum.FLIP = '0xF4240'; // 1000000
    rpcEnvironment.result.ingress_egress.ingress_fees.Ethereum.USDC = '0xF4240'; // 1000000
    rpcEnvironment.result.ingress_egress.egress_fees.Ethereum.FLIP = '0xF4240'; // 1000000
    rpcEnvironment.result.ingress_egress.egress_fees.Ethereum.USDC = '0xF4240'; // 1000000

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

      throw new Error(
        `unexpected axios call to ${url}: ${JSON.stringify(data)}`,
      );
    });

    const params = new URLSearchParams({
      srcAsset: 'FLIP',
      destAsset: 'USDC',
      amount: (1e18).toString(),
    });

    const { body, status } = await request(server).get(
      `/quote?${params.toString()}`,
    );

    expect(status).toBe(200);
    expect(body).toMatchSnapshot();
  });

  it('gets the quote when ingress and egress fee is returned as fee asset amount', async () => {
    jest.spyOn(RpcClient.prototype, 'sendRequest').mockResolvedValueOnce({
      outputAmount: (2000e6).toString(),
    });
    quotingClient.setQuoteRequestHandler(async (req) => ({
      id: req.id,
      output_amount: '0',
    }));

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

      throw new Error(
        `unexpected axios call to ${url}: ${JSON.stringify(data)}`,
      );
    });

    const params = new URLSearchParams({
      srcAsset: 'FLIP',
      destAsset: 'USDC',
      amount: (1e18).toString(),
    });

    const { body, status } = await request(server).get(
      `/quote?${params.toString()}`,
    );

    expect(status).toBe(200);
    expect(body).toMatchSnapshot();
  });
});

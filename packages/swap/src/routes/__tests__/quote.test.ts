import * as crypto from 'crypto';
import { once } from 'events';
import { Server } from 'http';
import { AddressInfo } from 'net';
import request from 'supertest';
import { promisify } from 'util';
import RpcClient from '@/shared/node-apis/RpcClient';
import prisma from '../../client';
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

      sendRequest() {
        throw new Error('unmocked request');
      }
    },
);

jest.mock('@/shared/consts', () => ({
  ...jest.requireActual('@/shared/consts'),
  getMinimumSwapAmount: jest.fn().mockReturnValue('100'),
  getPoolsNetworkFeeHundredthPips: jest.fn().mockReturnValue(100),
}));

describe('server', () => {
  let server: Server;
  let client: QuotingClient;

  beforeAll(async () => {
    await prisma.pool.createMany({
      data: [
        {
          baseAsset: 'USDC',
          pairAsset: 'FLIP',
          feeHundredthPips: 100,
        },
        {
          baseAsset: 'USDC',
          pairAsset: 'ETH',
          feeHundredthPips: 200,
        },
      ],
    });
  });

  beforeEach(async () => {
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

    client = new QuotingClient(
      `http://localhost:${(server.address() as AddressInfo).port}`,
      name,
      pair.privateKey.export({ format: 'pem', type: 'pkcs8' }).toString(),
    );
    await once(client, 'connected');
  });

  afterEach((cb) => {
    client.close();
    server.close(cb);
  });

  describe('GET /quote', () => {
    it('rejects if amount is lower than minimum swap amount', async () => {
      const params = new URLSearchParams({
        srcAsset: 'FLIP',
        destAsset: 'ETH',
        amount: '50',
      });

      const { body, status } = await request(server).get(
        `/quote?${params.toString()}`,
      );

      expect(status).toBe(400);
      expect(body).toMatchObject({
        message: 'expected amount is below minimum swap amount',
      });
    });

    it('gets the quote from usdc when the broker is best', async () => {
      const sendSpy = jest
        .spyOn(RpcClient.prototype, 'sendRequest')
        .mockResolvedValueOnce({
          output: (1e18).toString(),
        });

      const params = new URLSearchParams({
        srcAsset: 'USDC',
        destAsset: 'ETH',
        amount: (100e6).toString(),
      });

      client.setQuoteRequestHandler(async (req) => ({
        id: req.id,
        egress_amount: (0.5e18).toString(),
      }));

      const { body, status } = await request(server).get(
        `/quote?${params.toString()}`,
      );

      expect(status).toBe(200);
      expect(body).toMatchObject({
        id: expect.any(String),
        egressAmount: (1e18).toString(),
        includedFees: [
          { amount: '1000000', asset: 'USDC', type: 'network' },
          { amount: '2000000', asset: 'USDC', type: 'liquidity' },
        ],
      });
      expect(sendSpy).toHaveBeenCalledTimes(1);
    });

    it('gets the quote to usdc when the broker is best', async () => {
      const sendSpy = jest
        .spyOn(RpcClient.prototype, 'sendRequest')
        .mockResolvedValueOnce({
          output: (100e6).toString(),
        });

      const params = new URLSearchParams({
        srcAsset: 'ETH',
        destAsset: 'USDC',
        amount: (1e18).toString(),
      });

      client.setQuoteRequestHandler(async (req) => ({
        id: req.id,
        egress_amount: (50e6).toString(),
      }));

      const { body, status } = await request(server).get(
        `/quote?${params.toString()}`,
      );

      expect(status).toBe(200);
      expect(body).toMatchObject({
        id: expect.any(String),
        egressAmount: (100e6).toString(),
        includedFees: [
          { amount: '1010101', asset: 'USDC', type: 'network' },
          { amount: '20000000000000000', asset: 'ETH', type: 'liquidity' },
        ],
      });
      expect(sendSpy).toHaveBeenCalledTimes(1);
    });

    it('gets the quote with intermediate amount when the broker is best', async () => {
      const sendSpy = jest
        .spyOn(RpcClient.prototype, 'sendRequest')
        .mockResolvedValueOnce({
          intermediary: (2000e6).toString(),
          output: (1e18).toString(),
        });

      const params = new URLSearchParams({
        srcAsset: 'FLIP',
        destAsset: 'ETH',
        amount: (1e18).toString(),
      });

      client.setQuoteRequestHandler(async (req) => ({
        id: req.id,
        intermediate_amount: (1000e6).toString(),
        egress_amount: (0.5e18).toString(),
      }));

      const { body, status } = await request(server).get(
        `/quote?${params.toString()}`,
      );

      expect(status).toBe(200);
      expect(body).toMatchObject({
        id: expect.any(String),
        intermediateAmount: (2000e6).toString(),
        egressAmount: (1e18).toString(),
        includedFees: [
          { amount: '20000000', asset: 'USDC', type: 'network' },
          { amount: '10000000000000000', asset: 'FLIP', type: 'liquidity' },
          { amount: '40000000', asset: 'USDC', type: 'liquidity' },
        ],
      });
      expect(sendSpy).toHaveBeenCalledTimes(1);
    });

    it('gets the quote when the market maker is best', async () => {
      const sendSpy = jest
        .spyOn(RpcClient.prototype, 'sendRequest')
        .mockResolvedValueOnce({
          intermediary: (2000e6).toString(),
          output: (1e18).toString(),
        });
      const params = new URLSearchParams({
        srcAsset: 'FLIP',
        destAsset: 'ETH',
        amount: (1e18).toString(),
      });

      client.setQuoteRequestHandler(async (req) => ({
        id: req.id,
        intermediate_amount: (3000e6).toString(),
        egress_amount: (2e18).toString(),
      }));

      const { body, status } = await request(server).get(
        `/quote?${params.toString()}`,
      );

      expect(status).toBe(200);
      expect(body).toMatchObject({
        id: expect.any(String),
        intermediateAmount: (2940e6).toString(),
        egressAmount: (1.92e18).toString(),
        includedFees: [
          { amount: '29400000', asset: 'USDC', type: 'network' },
          { amount: '10000000000000000', asset: 'FLIP', type: 'liquidity' },
          { amount: '58800000', asset: 'USDC', type: 'liquidity' },
        ],
      });
      expect(sendSpy).toHaveBeenCalledTimes(1);
    });
  });
});

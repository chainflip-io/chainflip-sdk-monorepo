import { TRPCError } from '@trpc/server';
import * as crypto from 'crypto';
import { once } from 'events';
import { Server } from 'http';
import { AddressInfo } from 'net';
import request from 'supertest';
import { promisify } from 'util';
import { z } from 'zod';

import RpcClient from '@/shared/node-apis/RpcClient';
import { getQuoteRequestSchema } from '@/shared/schemas';
import { swappingEnvironment } from '@/shared/tests/fixtures';
import prisma from '../../client';
import QuotingClient from '../../quoting/QuotingClient';
import app, { appRouter } from '../../server';

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

jest.mock('../../utils/rpc', () => ({
  getMinimumSwapAmount: jest.fn().mockReturnValue(100n),
}));

jest.mock('@/shared/consts', () => ({
  ...jest.requireActual('@/shared/consts'),
  getPoolsNetworkFeeHundredthPips: jest.fn().mockReturnValue(1000),
}));

jest.mock('axios', () => ({
  post: jest.fn(() =>
    Promise.resolve({
      data: swappingEnvironment(),
    }),
  ),
}));

describe('server', () => {
  let server: Server;
  let client: QuotingClient;

  beforeAll(async () => {
    await prisma.$queryRaw`TRUNCATE TABLE public."Pool" CASCADE`;
    await prisma.pool.createMany({
      data: [
        {
          baseAsset: 'USDC',
          pairAsset: 'FLIP',
          liquidityFeeHundredthPips: 1000,
        },
        {
          baseAsset: 'USDC',
          pairAsset: 'ETH',
          liquidityFeeHundredthPips: 2000,
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

  describe('getQuote', () => {
    const caller = appRouter.createCaller({});
    describe('input validations', () => {
      it('should fail when provided a wrong format string', async () => {
        try {
          await caller.getQuote({
            srcAsset: 'FLIP',
            destAsset: 'ETH',
            srcChain: 'Ethereum',
            destChain: 'Ethereum',
            amount: 'hahahah',
          });
          expect(true).toBe(false);
        } catch (error) {
          if (error instanceof TRPCError) {
            expect(error.code).toBe('BAD_REQUEST');
          } else {
            expect(true).toBe(false);
          }
        }
      });

      it('should not fail with bad request when input is right', async () => {
        try {
          await caller.getQuote({
            srcAsset: 'FLIP',
            destAsset: 'ETH',
            srcChain: 'Ethereum',
            destChain: 'Ethereum',
            amount: '10000000000000000',
          });
        } catch (error) {
          if (error instanceof TRPCError) {
            expect(error.code).not.toBe('BAD_REQUEST');
          } else {
            expect(true).toBe(false);
          }
        }
      });
    });

    describe('output validations', () => {
      it('rejects if amount is lower than minimum swap amount', async () => {
        try {
          await caller.getQuote({
            srcAsset: 'FLIP',
            destAsset: 'ETH',
            srcChain: 'Ethereum',
            destChain: 'Ethereum',
            amount: '50',
          });
          expect(true).toBe(false);
        } catch (error) {
          if (error instanceof TRPCError) {
            expect(error.code).toBe('INTERNAL_SERVER_ERROR');
            expect(error.message).toBe(
              'expected amount is below minimum swap amount',
            );
          } else {
            expect(true).toBe(false);
          }
        }
      });

      it('gets the quote from usdc when the broker is best', async () => {
        const egressAmount = (1e18).toString();
        const sendSpy = jest
          .spyOn(RpcClient.prototype, 'sendRequest')
          .mockResolvedValueOnce({
            egressAmount: (1e18).toString(),
          });

        client.setQuoteRequestHandler(async (req) => ({
          id: req.id,
          egress_amount: egressAmount,
        }));

        const req = {
          srcAsset: 'USDC',
          destAsset: 'ETH',
          srcChain: 'Ethereum',
          destChain: 'Ethereum',
          amount: (100e6).toString(),
        } as z.infer<typeof getQuoteRequestSchema>;

        const res = await caller.getQuote(req);

        expect(res).toMatchObject({
          ...res,
          quote: {
            egressAmount,
            includedFees: [
              { amount: '100000', asset: 'USDC', type: 'network' },
              { amount: '200000', asset: 'USDC', type: 'liquidity' },
            ],
          },
        });
        expect(sendSpy).toHaveBeenCalledTimes(1);
      });

      it('gets the quote to usdc when the broker is best', async () => {
        const egressAmount = (100e6).toString();
        const sendSpy = jest
          .spyOn(RpcClient.prototype, 'sendRequest')
          .mockResolvedValueOnce({
            egressAmount,
          });

        client.setQuoteRequestHandler(async (req) => ({
          id: req.id,
          egress_amount: (50e6).toString(),
        }));

        const req = {
          srcAsset: 'ETH',
          destAsset: 'USDC',
          srcChain: 'Ethereum',
          destChain: 'Ethereum',
          amount: (1e18).toString(),
        } as z.infer<typeof getQuoteRequestSchema>;

        const res = await caller.getQuote(req);

        expect(res).toMatchObject({
          ...res,
          quote: {
            egressAmount: (100e6).toString(),
            includedFees: [
              { amount: '100100', asset: 'USDC', type: 'network' },
              { amount: '2000000000000000', asset: 'ETH', type: 'liquidity' },
            ],
          },
        });
        expect(sendSpy).toHaveBeenCalledTimes(1);
      });

      it('gets the quote with intermediate amount when the broker is best', async () => {
        const sendSpy = jest
          .spyOn(RpcClient.prototype, 'sendRequest')
          .mockResolvedValueOnce({
            intermediateAmount: (2000e6).toString(),
            egressAmount: (1e18).toString(),
          });

        client.setQuoteRequestHandler(async (req) => ({
          id: req.id,
          intermediate_amount: (1000e6).toString(),
          egress_amount: (0.4e18).toString(),
        }));

        const req = {
          srcAsset: 'FLIP',
          destAsset: 'ETH',
          srcChain: 'Ethereum',
          destChain: 'Ethereum',
          amount: (1e18).toString(),
        } as z.infer<typeof getQuoteRequestSchema>;

        const res = await caller.getQuote(req);

        expect(res).toMatchObject({
          ...res,
          quote: {
            intermediateAmount: (2000e6).toString(),
            egressAmount: (1e18).toString(),
            includedFees: [
              { amount: '2000000', asset: 'USDC', type: 'network' },
              { amount: '1000000000000000', asset: 'FLIP', type: 'liquidity' },
              { amount: '4000000', asset: 'USDC', type: 'liquidity' },
            ],
          },
        });
        expect(sendSpy).toHaveBeenCalledTimes(1);
      });

      // this fails :(
      it('gets the quote when the market maker is best', async () => {
        const sendSpy = jest
          .spyOn(RpcClient.prototype, 'sendRequest')
          .mockResolvedValueOnce({
            intermediateAmount: (2000e6).toString(),
            egressAmount: (1e18).toString(),
          });

        client.setQuoteRequestHandler(async (req) => ({
          id: req.id,
          intermediate_amount: (3000e6).toString(),
          egress_amount: (2e18).toString(),
        }));

        const req = {
          srcAsset: 'FLIP',
          destAsset: 'ETH',
          amount: (1e18).toString(),
          srcChain: 'Ethereum',
          destChain: 'Ethereum',
        } as z.infer<typeof getQuoteRequestSchema>;

        const res = await caller.getQuote(req);

        expect(res).toMatchObject({
          ...res,
          quote: {
            intermediateAmount: (2994e6).toString(),
            egressAmount: (1.992e18).toString(),
            includedFees: [
              { amount: '2994000', asset: 'USDC', type: 'network' },
              { amount: '1000000000000000', asset: 'FLIP', type: 'liquidity' },
              { amount: '5988000', asset: 'USDC', type: 'liquidity' },
            ],
          },
        });
        expect(sendSpy).toHaveBeenCalledTimes(1);
      });

      // this is the same passing express route test for ^
      xit('gets the quote when the market maker is best2', async () => {
        const sendSpy = jest
          .spyOn(RpcClient.prototype, 'sendRequest')
          .mockResolvedValueOnce({
            intermediateAmount: (2000e6).toString(),
            egressAmount: (1e18).toString(),
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
          intermediateAmount: (2994e6).toString(),
          egressAmount: (1.992e18).toString(),
          includedFees: [
            { amount: '2994000', asset: 'USDC', type: 'network' },
            { amount: '1000000000000000', asset: 'FLIP', type: 'liquidity' },
            { amount: '5988000', asset: 'USDC', type: 'liquidity' },
          ],
        });
        expect(sendSpy).toHaveBeenCalledTimes(1);
      });
    });
  });
});

import * as crypto from 'crypto';
import { Server } from 'http';
import request from 'supertest';
import { describe, it, beforeEach, expect } from 'vitest';
import prisma from '../../client.js';
import env from '../../config/env.js';
import app from '../../server.js';

describe('server', () => {
  let server: Server;

  let oldEnv: typeof env;

  beforeEach(async () => {
    oldEnv = { ...env };
    await prisma.$queryRaw`TRUNCATE TABLE "ThirdPartySwap" CASCADE`;
    server = app.listen(0);

    return () => {
      Object.assign(env, oldEnv);
      server.close();
    };
  });

  describe('POST /third-party-swap', () => {
    it('saves the third party swap information', async () => {
      const uuid = crypto.randomUUID();
      const body = {
        uuid,
        routeResponse: { integration: 'lifi', route: 'route' },
        txHash: '0x123',
        txLink: 'https://etherscan.io/tx/0xhash',
      };

      const { status } = await request(app).post('/third-party-swap').send(body);
      const swap = await prisma.thirdPartySwap.findFirstOrThrow({
        where: { uuid },
      });
      expect(status).toBe(201);
      expect(swap.uuid).toBe(uuid);
    });

    it.each([
      {
        uuid: crypto.randomUUID(),
        routeResponse: { route: 'route' },
        txHash: '0x123',
        txLink: 'https://etherscan.io/tx/0xhash',
      },
      {
        uuid: crypto.randomUUID(),
        routeResponse: { integration: 'lifi', route: 'route' },
        txLink: 'https://etherscan.io/tx/0xhash',
      },
      {
        uuid: crypto.randomUUID(),
        routeResponse: { integration: 'lifi', route: 'route' },
        txHash: '0x123',
      },
    ])('throws when request body has missing info', async (requestBody) => {
      const { status } = await request(app).post('/third-party-swap').send(requestBody);
      const swap = await prisma.thirdPartySwap.findFirst({
        where: { uuid: requestBody.uuid },
      });
      expect(swap).toBeNull();
      expect(status).not.toBe(201);
    });

    it('throws bad request uuid is missing', async () => {
      const body = {
        routeResponse: { protocol: 'Lifi', route: 'route' },
      };
      const { status } = await request(app).post('/third-party-swap').send(body);
      expect(status).toBe(400);
    });

    it('is disabled in maintenance mode', async () => {
      env.MAINTENANCE_MODE = true;

      const { status } = await request(app)
        .post('/third-party-swap')
        .send({ routeResponse: { protocol: 'squid', route: 'route' } });
      expect(status).toBe(503);
    });
  });

  describe('GET /third-party-swap/:uuid', () => {
    beforeEach(async () => {
      await prisma.thirdPartySwap.create({
        data: {
          uuid: 'test-uuid',
          protocol: 'lifi',
          routeResponse: { route: 'route' },
          txHash: '0x1234',
          txLink: 'https://etherscan.io/tx/0x1234',
        },
      });
    });

    it('fetches the correct third party swap information', async () => {
      const { status, body } = await request(app).get('/third-party-swap/test-uuid');
      expect(status).toBe(200);
      expect(body).toEqual(
        expect.objectContaining({
          uuid: 'test-uuid',
          protocol: 'lifi',
          routeResponse: { route: 'route' },
          txHash: '0x1234',
          txLink: 'https://etherscan.io/tx/0x1234',
        }),
      );
    });

    it('throws bad request uuid is not found', async () => {
      const { status } = await request(app).get('/third-party-swap/123');
      expect(status).toBe(404);
    });

    it('is disabled in maintenance mode', async () => {
      env.MAINTENANCE_MODE = true;

      const { status } = await request(app).get('/third-party-swap/test-uuid');

      expect(status).toBe(503);
    });
  });
});

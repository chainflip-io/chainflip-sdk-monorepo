import { Server } from 'http';
import request from 'supertest';
import { describe, it, beforeEach, expect, beforeAll } from 'vitest';
import prisma from '../../client.js';
import app from '../../server.js';

describe('server', () => {
  let server: Server;

  beforeAll(() => {
    server = app.listen(0);

    return async () => {
      server.close();
    };
  });

  beforeEach(async () => {
    await prisma.$queryRaw`TRUNCATE TABLE private."BlockedAddress"`;
  });

  describe('GET /addresses/blocked', () => {
    it('returns the blocked addresses', async () => {
      await prisma.blockedAddress.create({
        data: { address: '0x123' },
      });

      const { status, body } = await request(app).get('/addresses/blocked');
      expect(status).toBe(200);
      expect(body).toEqual(['0x123']);
    });
  });
});

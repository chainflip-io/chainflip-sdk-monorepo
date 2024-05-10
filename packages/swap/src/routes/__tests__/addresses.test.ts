import { Server } from 'http';
import request from 'supertest';
import prisma from '../../client';
import app from '../../server';

describe('server', () => {
  let server: Server;

  beforeEach(async () => {
    await prisma.$queryRaw`TRUNCATE TABLE private."BlockedAddress"`;
    server = app.listen(0);
  });

  afterEach((cb) => {
    server.close(cb);
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

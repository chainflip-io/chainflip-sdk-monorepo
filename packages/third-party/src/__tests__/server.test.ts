import request from 'supertest';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.hoisted(() => {
  process.env.THIRD_PARTY_DATABASE_URL =
    'postgresql://postgres:postgres@localhost:5432/swap?schema=third_party';
  process.env.NODE_ENV = 'test';
  process.env.THIRD_PARTY_RATE_LIMIT_PER_MINUTE = '5';
});

const prismaMock = vi.hoisted(() => ({ $queryRaw: vi.fn() }));

vi.mock('../prisma.js', () => ({ default: prismaMock }));
vi.mock('../utils/exit.js', () => ({ handleExit: vi.fn() }));

const CLIENT_IP = '9.9.9.9';

const loadApp = async (network = 'mainnet') => {
  vi.stubEnv('CHAINFLIP_NETWORK', network);
  return (await import('../server.js')).app;
};

describe('third-party server', () => {
  beforeEach(() => {
    vi.resetModules();
    prismaMock.$queryRaw.mockReset();
    prismaMock.$queryRaw.mockResolvedValue([{ ip: '1.2.3.4' }]);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  it('responds to healthchecks', async () => {
    const res = await request(await loadApp()).get('/healthcheck');

    expect(res.status).toBe(200);
    expect(res.text).toBe('OK');
  });

  describe('on mainnet', () => {
    it.each([
      ['post', '/third-party/quote'],
      ['post', '/third-party/swap'],
      ['get', '/third-party/status/123'],
    ] as const)('%s %s returns ok', async (method, path) => {
      const res = await request(await loadApp())
        [method](path)
        .set('cf-connecting-ip', CLIENT_IP);

      expect(res.status).toBe(200);
      expect(res.text).toBe('ok');
    });

    it('returns 404 for unknown routes', async () => {
      const res = await request(await loadApp())
        .get('/third-party/unknown')
        .set('cf-connecting-ip', CLIENT_IP);

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ message: 'resource not found' });
    });

    it('blocks blacklisted IPs', async () => {
      const res = await request(await loadApp())
        .post('/third-party/quote')
        .set('cf-connecting-ip', '1.2.3.4');

      expect(res.status).toBe(429);
    });

    it('keeps blocking blacklisted IPs when a refresh fails', async () => {
      vi.useFakeTimers();
      const app = await loadApp();
      prismaMock.$queryRaw.mockRejectedValue(new Error('connection lost'));

      await vi.advanceTimersByTimeAsync(60_000);
      const res = await request(app).post('/third-party/quote').set('cf-connecting-ip', '1.2.3.4');

      expect(prismaMock.$queryRaw).toHaveBeenCalledTimes(2);
      expect(res.status).toBe(429);
    });

    it('rate limits per IP', async () => {
      const app = await loadApp();

      const statuses = [];
      for (let i = 0; i < 6; i += 1) {
        const res = await request(app)
          .post('/third-party/quote')
          .set('cf-connecting-ip', '5.6.7.8');
        statuses.push(res.status);
      }

      expect(statuses).toEqual([200, 200, 200, 200, 200, 429]);
    });

    it('rejects requests without a client IP', async () => {
      const res = await request(await loadApp()).post('/third-party/quote');

      expect(res.status).toBe(400);
    });

    it('rejects malformed JSON', async () => {
      const res = await request(await loadApp())
        .post('/third-party/quote')
        .set('cf-connecting-ip', CLIENT_IP)
        .set('content-type', 'application/json')
        .send('{bad');

      expect(res.status).toBe(400);
    });

    describe('in maintenance mode', () => {
      beforeEach(() => {
        vi.stubEnv('THIRD_PARTY_MAINTENANCE_MODE', 'true');
      });

      it.each([
        ['post', '/third-party/quote'],
        ['post', '/third-party/swap'],
      ] as const)('%s %s is unavailable', async (method, path) => {
        const res = await request(await loadApp())
          [method](path)
          .set('cf-connecting-ip', CLIENT_IP);

        expect(res.status).toBe(503);
        expect(res.body).toEqual({
          message: 'Third-party swaps are currently unavailable due to maintenance',
        });
      });

      it('keeps serving swap status', async () => {
        const res = await request(await loadApp())
          .get('/third-party/status/123')
          .set('cf-connecting-ip', CLIENT_IP);

        expect(res.status).toBe(200);
      });
    });
  });

  describe.each(['backspin', 'sisyphos', 'perseverance'])('on %s', (network) => {
    it.each([
      ['post', '/third-party/quote'],
      ['post', '/third-party/swap'],
      ['get', '/third-party/status/123'],
    ] as const)('%s %s is disabled', async (method, path) => {
      const res = await request(await loadApp(network))
        [method](path)
        .set('cf-connecting-ip', CLIENT_IP);

      expect(res.status).toBe(404);
    });

    it('still responds to healthchecks', async () => {
      const res = await request(await loadApp(network)).get('/healthcheck');

      expect(res.status).toBe(200);
    });
  });
});

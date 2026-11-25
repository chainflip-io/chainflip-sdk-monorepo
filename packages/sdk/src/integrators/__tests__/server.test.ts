import request from 'supertest';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.hoisted(() => {
  process.env.INTEGRATORS_DATABASE_URL =
    'postgresql://postgres:postgres@localhost:5432/swap?schema=integrators';
  process.env.NODE_ENV = 'test';
});

const prismaMock = vi.hoisted(() => ({
  $queryRaw: vi.fn(),
  integratorSwap: { findUnique: vi.fn() },
}));

vi.mock('../prisma.js', () => ({ default: prismaMock }));

describe('integrators server', () => {
  beforeEach(() => {
    vi.resetModules();
    prismaMock.$queryRaw.mockResolvedValue([{ ip: '1.2.3.4' }]);
    prismaMock.integratorSwap.findUnique.mockReset();
  });

  const loadApp = async () => (await import('../server.js')).app;

  it('responds to healthchecks', async () => {
    const res = await request(await loadApp()).get('/healthcheck');

    expect(res.status).toBe(200);
    expect(res.text).toBe('OK');
  });

  it('blocks blacklisted IPs', async () => {
    const res = await request(await loadApp())
      .get('/v2/integrators/swaps/1')
      .set('cf-connecting-ip', '1.2.3.4');

    expect(res.status).toBe(429);
    expect(prismaMock.integratorSwap.findUnique).not.toHaveBeenCalled();
  });

  it('returns 404 for unknown swaps', async () => {
    prismaMock.integratorSwap.findUnique.mockResolvedValue(null);

    const res = await request(await loadApp()).get('/v2/integrators/swaps/1');

    expect(res.status).toBe(404);
    expect(prismaMock.integratorSwap.findUnique).toHaveBeenCalledWith({ where: { id: 1 } });
  });

  it('rejects invalid swap ids', async () => {
    const res = await request(await loadApp()).get('/v2/integrators/swaps/abc');

    expect(res.status).toBe(400);
  });

  it('returns 501 for routes that are not implemented yet', async () => {
    const app = await loadApp();

    expect((await request(app).post('/v2/integrators/quote').send({})).status).toBe(501);
    expect((await request(app).post('/v2/integrators/swap').send({})).status).toBe(501);
    expect((await request(app).post('/v2/integrators/swaps/1/tx').send({})).status).toBe(501);
  });
});

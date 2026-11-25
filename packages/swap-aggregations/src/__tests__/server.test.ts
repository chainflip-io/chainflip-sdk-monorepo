import request from 'supertest';
import { describe, it, expect, vi, beforeEach, afterEach, type MockInstance } from 'vitest';

vi.hoisted(() => {
  process.env.INTEGRATORS_DATABASE_URL =
    'postgresql://postgres:postgres@localhost:5432/swap?schema=integrators';
  process.env.NODE_ENV = 'test';
  process.env.SWAPKIT_API_KEY = 'test-api-key';
  process.env.SWAPKIT_API_URL = 'https://swapkit.test';
  process.env.SWAPKIT_AFFILIATE_FEE_BPS = '30';
  process.env.INTEGRATORS_RATE_LIMIT_PER_MINUTE = '5';
});

const prismaMock = vi.hoisted(() => ({ $queryRaw: vi.fn() }));

vi.mock('../prisma.js', () => ({ default: prismaMock }));

const jsonResponse = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

// each test loads a fresh app so the rate limit, IP blacklist and caches start empty
const loadApp = async () => (await import('../server.js')).app;

const quoteBody = {
  sellAsset: 'ETH.ETH',
  buyAsset: 'BTC.BTC',
  sellAmount: '1.5',
  slippage: 3,
  affiliateFee: 0,
  txHints: ['simpleTransfer'],
};

describe('integrators server', () => {
  let fetchSpy: MockInstance<typeof fetch>;

  beforeEach(() => {
    vi.resetModules();
    prismaMock.$queryRaw.mockResolvedValue([{ ip: '1.2.3.4' }]);
    fetchSpy = vi.spyOn(globalThis, 'fetch');
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  const lastFetch = () => {
    const [url, init] = fetchSpy.mock.lastCall!;
    return {
      url: String(url),
      method: init?.method,
      headers: init?.headers as Record<string, string>,
      body: init?.body ? JSON.parse(init.body as string) : undefined,
    };
  };

  it('responds to healthchecks', async () => {
    const res = await request(await loadApp()).get('/healthcheck');

    expect(res.status).toBe(200);
    expect(res.text).toBe('OK');
  });

  it('blocks blacklisted IPs', async () => {
    const res = await request(await loadApp())
      .get('/v2/integrators/swapkit/providers')
      .set('cf-connecting-ip', '1.2.3.4');

    expect(res.status).toBe(429);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('rate limits per IP', async () => {
    fetchSpy.mockImplementation(async () => jsonResponse(200, []));
    const app = await loadApp();

    const statuses = [];
    for (let i = 0; i < 6; i += 1) {
      const res = await request(app)
        .get('/v2/integrators/swapkit/providers')
        .set('cf-connecting-ip', '5.6.7.8');
      statuses.push(res.status);
    }

    expect(statuses).toEqual([200, 200, 200, 200, 200, 429]);
  });

  it('returns 404 for unknown integrator routes', async () => {
    const res = await request(await loadApp()).get('/v2/integrators/nope');

    expect(res.status).toBe(404);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  describe('POST /v3/quote', () => {
    it('forwards the quote with our api key and our affiliate fee', async () => {
      const routes = { routes: [{ routeId: 'route-1', providers: ['THORCHAIN'] }] };
      fetchSpy.mockResolvedValueOnce(jsonResponse(200, routes));

      const res = await request(await loadApp())
        .post('/v2/integrators/swapkit/v3/quote')
        .send({ ...quoteBody, unknownField: 'dropped' });

      expect(res.status).toBe(200);
      expect(res.body).toEqual(routes);
      expect(lastFetch()).toEqual({
        url: 'https://swapkit.test/v3/quote',
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-api-key': 'test-api-key' },
        // affiliateFee from the browser (0) is replaced, unknown fields are dropped
        body: { ...quoteBody, affiliateFee: 30 },
      });
    });

    it("passes SwapKit's error status and body through unchanged", async () => {
      const error = { error: 'noRoutesFound', message: 'No routes found' };
      fetchSpy.mockResolvedValueOnce(jsonResponse(404, error));

      const res = await request(await loadApp())
        .post('/v2/integrators/swapkit/v3/quote')
        .send(quoteBody);

      expect(res.status).toBe(404);
      expect(res.body).toEqual(error);
    });

    it('rejects invalid bodies without calling SwapKit', async () => {
      const res = await request(await loadApp())
        .post('/v2/integrators/swapkit/v3/quote')
        .send({ sellAsset: 'ETH.ETH' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('invalidRequest');
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('rejects malformed JSON with a 400', async () => {
      const res = await request(await loadApp())
        .post('/v2/integrators/swapkit/v3/quote')
        .set('content-type', 'application/json')
        .send('{"sellAsset":');

      expect(res.status).toBe(400);
    });

    it('returns 502 when SwapKit is unreachable', async () => {
      fetchSpy.mockRejectedValueOnce(new TypeError('fetch failed'));

      const res = await request(await loadApp())
        .post('/v2/integrators/swapkit/v3/quote')
        .send(quoteBody);

      expect(res.status).toBe(502);
      expect(res.body).toEqual({ error: 'swapkitUnavailable', message: 'SwapKit is unavailable' });
    });
  });

  describe('POST /v3/swap', () => {
    it('forwards the swap request', async () => {
      const swap = { swapId: 'swap-1', routeId: 'route-1', txType: 'EVM', tx: { to: '0x1' } };
      fetchSpy.mockResolvedValueOnce(jsonResponse(200, swap));
      const body = {
        routeId: 'route-1',
        sourceAddress: '0xsource',
        destinationAddress: 'bc1dest',
        refundAddress: '0xsource',
        slippageSetting: 'STRICT',
      };

      const res = await request(await loadApp())
        .post('/v2/integrators/swapkit/v3/swap')
        .send(body);

      expect(res.status).toBe(200);
      expect(res.body).toEqual(swap);
      expect(lastFetch()).toMatchObject({ url: 'https://swapkit.test/v3/swap', body });
    });

    it('passes price-moved errors through', async () => {
      const error = { error: 'outputBelowPublishedFloor', message: 'price moved' };
      fetchSpy.mockResolvedValueOnce(jsonResponse(400, error));

      const res = await request(await loadApp())
        .post('/v2/integrators/swapkit/v3/swap')
        .send({ routeId: 'route-1', sourceAddress: '0xa', destinationAddress: '0xb' });

      expect(res.status).toBe(400);
      expect(res.body).toEqual(error);
    });
  });

  describe('POST /track', () => {
    const trackBody = { hash: '0xhash', chainId: '1', routeId: 'route-1' };

    it('deduplicates polling of the same swap', async () => {
      fetchSpy.mockImplementation(async () => jsonResponse(200, { status: 'swapping' }));
      const app = await loadApp();

      const [a, b] = await Promise.all([
        request(app).post('/v2/integrators/swapkit/track').send(trackBody),
        request(app).post('/v2/integrators/swapkit/track').send(trackBody),
      ]);
      const c = await request(app).post('/v2/integrators/swapkit/track').send(trackBody);

      expect([a.body, b.body, c.body]).toEqual([
        { status: 'swapping' },
        { status: 'swapping' },
        { status: 'swapping' },
      ]);
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    it('passes "not indexed yet" 404s through', async () => {
      fetchSpy.mockResolvedValueOnce(jsonResponse(404, { error: 'notFound' }));

      const res = await request(await loadApp())
        .post('/v2/integrators/swapkit/track')
        .send(trackBody);

      expect(res.status).toBe(404);
    });

    it('does not cache SwapKit server errors', async () => {
      fetchSpy
        .mockResolvedValueOnce(jsonResponse(500, { message: 'boom' }))
        .mockResolvedValueOnce(jsonResponse(200, { status: 'completed' }));
      const app = await loadApp();

      const first = await request(app).post('/v2/integrators/swapkit/track').send(trackBody);
      const second = await request(app).post('/v2/integrators/swapkit/track').send(trackBody);

      expect(first.status).toBe(500);
      expect(second.body).toEqual({ status: 'completed' });
    });

    it('accepts deposit channel tracking', async () => {
      fetchSpy.mockResolvedValueOnce(jsonResponse(200, { status: 'pending' }));

      const res = await request(await loadApp())
        .post('/v2/integrators/swapkit/track')
        .send({ depositChannelId: '123-Ethereum-45' });

      expect(res.status).toBe(200);
      expect(lastFetch().body).toEqual({ depositChannelId: '123-Ethereum-45' });
    });

    it('rejects a hash without a chain id', async () => {
      const res = await request(await loadApp())
        .post('/v2/integrators/swapkit/track')
        .send({ hash: '0xhash' });

      expect(res.status).toBe(400);
      expect(fetchSpy).not.toHaveBeenCalled();
    });
  });

  describe('GET /providers and /tokens', () => {
    it('caches providers', async () => {
      fetchSpy.mockImplementation(async () => jsonResponse(200, [{ provider: 'THORCHAIN' }]));
      const app = await loadApp();

      await request(app).get('/v2/integrators/swapkit/providers');
      const res = await request(app).get('/v2/integrators/swapkit/providers');

      expect(res.body).toEqual([{ provider: 'THORCHAIN' }]);
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    it('forwards the tokens query string', async () => {
      fetchSpy.mockResolvedValueOnce(jsonResponse(200, { tokens: [] }));

      const res = await request(await loadApp()).get(
        '/v2/integrators/swapkit/tokens?provider=CHAINFLIP',
      );

      expect(res.status).toBe(200);
      expect(lastFetch()).toMatchObject({
        url: 'https://swapkit.test/tokens?provider=CHAINFLIP',
        method: 'GET',
        body: undefined,
      });
    });
  });
});

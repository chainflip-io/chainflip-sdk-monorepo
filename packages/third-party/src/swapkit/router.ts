import express, { Request, Response, Router } from 'express';
import { z } from 'zod';
import env from '../env.js';
import logger from '../logger.js';
import { swapkitRequest, UpstreamResponse } from './client.js';
import { quoteRequestSchema, swapRequestSchema, trackRequestSchema } from './types.js';
import { createTtlCache } from '../utils/ttlCache.js';

// SwapKit pass-through. Paths, request bodies, responses and error bodies match api.swapkit.dev, so
// the frontend's SwapKit integration works against us by setting
//   NEXT_PUBLIC_SWAPKIT_API_URL=<backend>/v2/third-party/swapkit
// and dropping NEXT_PUBLIC_SWAPKIT_API_KEY. What we add on the way through:
//   - our API key (never reaches the browser)
//   - our affiliate fee, forced on every quote
//   - caching, so one key can serve every user within SwapKit's rate limit
//   - request validation (only known fields are forwarded)

const PROVIDERS_TOKENS_TTL_MS = 10 * 60_000;
// the frontend polls /track every 5s per open status page; viewers of the same swap share a call
const TRACK_TTL_MS = 4_000;

const metadataCache = createTtlCache<UpstreamResponse>(PROVIDERS_TOKENS_TTL_MS, 100);
const trackCache = createTtlCache<UpstreamResponse>(TRACK_TTL_MS);

export const clearSwapkitCaches = () => {
  metadataCache.clear();
  trackCache.clear();
};

const isOk = ({ status }: UpstreamResponse) => status >= 200 && status < 300;
// 404 = "not indexed yet" for a just-broadcast tx; worth caching briefly too
const isCacheableTrack = (response: UpstreamResponse) => isOk(response) || response.status === 404;

const send = (res: Response, { status, body }: UpstreamResponse) => {
  res.status(status).json(body);
};

const sendInvalidRequest = (res: Response, error: z.ZodError) => {
  res.status(400).json({ error: 'invalidRequest', message: z.prettifyError(error) });
};

// wraps a handler so an unreachable SwapKit becomes a 502 in SwapKit's error shape
const forward =
  (handler: (req: Request, res: Response) => Promise<void>) =>
  async (req: Request, res: Response) => {
    try {
      await handler(req, res);
    } catch (error) {
      logger.error('swapkit unreachable', { path: req.path, error });
      res.status(502).json({ error: 'swapkitUnavailable', message: 'SwapKit is unavailable' });
    }
  };

const router: Router = express.Router();

router.get(
  '/providers',
  forward(async (_req, res) => {
    send(
      res,
      await metadataCache.get(
        'providers',
        () => swapkitRequest('/providers', { method: 'GET' }),
        isOk,
      ),
    );
  }),
);

router.get(
  '/tokens',
  forward(async (req, res) => {
    const query = new URLSearchParams(req.query as Record<string, string>).toString();
    send(
      res,
      await metadataCache.get(
        `tokens?${query}`,
        () => swapkitRequest('/tokens', { method: 'GET', query }),
        isOk,
      ),
    );
  }),
);

router.post(
  '/v3/quote',
  forward(async (req, res) => {
    const parsed = quoteRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      sendInvalidRequest(res, parsed.error);
      return;
    }

    const body = { ...parsed.data, affiliateFee: env.SWAPKIT_AFFILIATE_FEE_BPS };
    send(res, await swapkitRequest('/v3/quote', { method: 'POST', body }));
  }),
);

router.post(
  '/v3/swap',
  forward(async (req, res) => {
    const parsed = swapRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      sendInvalidRequest(res, parsed.error);
      return;
    }

    // TODO: record the swap (see the ThirdPartySwap discussion), from parsed.data + the response
    send(res, await swapkitRequest('/v3/swap', { method: 'POST', body: parsed.data }));
  }),
);

router.post(
  '/track',
  forward(async (req, res) => {
    const parsed = trackRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      sendInvalidRequest(res, parsed.error);
      return;
    }

    const body = parsed.data;
    const key = JSON.stringify(body, Object.keys(body).sort());
    send(
      res,
      await trackCache.get(
        key,
        () => swapkitRequest('/track', { method: 'POST', body }),
        isCacheableTrack,
      ),
    );
  }),
);

export default router;

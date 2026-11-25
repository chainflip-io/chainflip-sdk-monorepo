import env from '../env.js';
import logger from '../logger.js';

const REQUEST_TIMEOUT_MS = 15_000;

// an upstream response, forwarded to our caller unchanged (status + JSON body)
export type UpstreamResponse = { status: number; body: unknown };

const parseBody = async (response: Response): Promise<unknown> => {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
};

// Calls SwapKit with our API key. Never throws for HTTP errors: SwapKit's status code and error
// body (`{ error, message }`) are returned as-is because the frontend branches on them.
// Throws only when SwapKit can't be reached at all.
export const swapkitRequest = async (
  path: string,
  init: { method: 'GET' | 'POST'; body?: unknown; query?: string },
): Promise<UpstreamResponse> => {
  const url = `${env.SWAPKIT_API_URL}${path}${init.query ? `?${init.query}` : ''}`;

  const response = await fetch(url, {
    method: init.method,
    headers: {
      'content-type': 'application/json',
      'x-api-key': env.SWAPKIT_API_KEY,
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  const body = await parseBody(response);

  if (response.status >= 500) {
    logger.warn('swapkit request failed', { path, status: response.status, body });
  }

  return { status: response.status, body };
};

import type { Request, Response } from 'express';
import * as express from 'express';
import request from 'supertest';
import { describe, it, expect, vi, afterEach } from 'vitest';
import env from '../../../config/env.js';
import ServiceError from '../../../utils/ServiceError.js';
import { handleError, handleQuotingError, jsonBodyParser, quoteMiddleware } from '../common.js';

describe(handleQuotingError, () => {
  it('handles internal error message', () => {
    expect(() =>
      handleQuotingError(
        {} as unknown as express.Response,
        new Error('RPC error [-32603]: Internal error while processing request.', {}),
      ),
    ).toThrow('insufficient liquidity for requested amount');
  });
});

describe(quoteMiddleware, () => {
  const mockReq = (origin?: string) => ({ headers: { origin } }) as unknown as Request;
  const mockRes = () => ({}) as unknown as Response;

  afterEach(() => {
    Object.assign(env, { DISABLE_QUOTING: false, QUOTING_ALLOWED_ORIGINS: new Set() });
  });

  it('passes through when quoting is enabled', () => {
    Object.assign(env, { DISABLE_QUOTING: false, QUOTING_ALLOWED_ORIGINS: new Set() });
    const next = vi.fn();

    quoteMiddleware(mockReq('https://any-origin.example.com'), mockRes(), next);

    expect(next).toHaveBeenCalledWith();
  });

  it('passes through every origin when quoting is enabled and allowed hosts is set', () => {
    Object.assign(env, {
      DISABLE_QUOTING: false,
      QUOTING_ALLOWED_ORIGINS: new Set(['https://chainflip-swap.chainflip.io']),
    });
    const next = vi.fn();

    quoteMiddleware(mockReq('https://any-origin.example.com'), mockRes(), next);

    expect(next).toHaveBeenCalledWith();
  });

  it('allows quoting when disabled but the request origin is in the allowlist', () => {
    Object.assign(env, {
      DISABLE_QUOTING: true,
      QUOTING_ALLOWED_ORIGINS: new Set([
        'https://chainflip-swap.chainflip.io',
        'https://staging.chainflip.io',
      ]),
    });
    const next = vi.fn();

    quoteMiddleware(mockReq('https://chainflip-swap.chainflip.io'), mockRes(), next);

    expect(next).toHaveBeenCalledWith();
  });

  it('matches the origin case-insensitively', () => {
    Object.assign(env, {
      DISABLE_QUOTING: true,
      QUOTING_ALLOWED_ORIGINS: new Set(['https://chainflip-swap.chainflip.io']),
    });
    const next = vi.fn();

    quoteMiddleware(mockReq('https://Chainflip-Swap.Chainflip.io'), mockRes(), next);

    expect(next).toHaveBeenCalledWith();
  });

  it('blocks quoting when disabled and the request origin is not in the allowlist', () => {
    Object.assign(env, {
      DISABLE_QUOTING: true,
      QUOTING_ALLOWED_ORIGINS: new Set(['https://chainflip-swap.chainflip.io']),
    });
    const next = vi.fn();

    quoteMiddleware(mockReq('https://evil.example.com'), mockRes(), next);

    expect(next.mock.calls[0]![0]?.code).toBe(503);
  });

  it('blocks quoting when disabled and the allowlist is empty', () => {
    Object.assign(env, { DISABLE_QUOTING: true, QUOTING_ALLOWED_ORIGINS: new Set() });
    const next = vi.fn();

    quoteMiddleware(mockReq('https://chainflip-swap.chainflip.io'), mockRes(), next);

    expect(next.mock.calls[0]![0]?.code).toBe(503);
  });

  it('blocks quoting when disabled and the request has no origin header', () => {
    Object.assign(env, {
      DISABLE_QUOTING: true,
      QUOTING_ALLOWED_ORIGINS: new Set(['https://chainflip-swap.chainflip.io']),
    });
    const next = vi.fn();

    quoteMiddleware(mockReq(undefined), mockRes(), next);

    expect(next.mock.calls[0]![0]?.code).toBe(503);
  });
});

describe(handleError, () => {
  const mockRes = () => {
    const res = { status: vi.fn(), json: vi.fn() };
    res.status.mockReturnValue(res);
    return res;
  };

  const callHandleError = (error: unknown) => {
    const res = mockRes();
    handleError(error, {} as Request, res as unknown as Response, vi.fn());
    return res;
  };

  it('responds with the code of a ServiceError', () => {
    const res = callHandleError(ServiceError.badRequest('nope'));

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'nope' });
  });

  // error messages as returned by the broker RPC (debug representation of the state chain's
  // `KnownModuleError`, see `api/cf-node-client/src/error_decoder.rs` in chainflip-backend)
  const moduleError = (pallet: string, name: string, error: string, code = -32024) =>
    `RPC error [${code}]: KnownModuleError { pallet: "${pallet}", name: "${name}", error: "${error}" }`;

  it.each([
    ['ZeroNumberOfChunksNotAllowed', 'The number of DCA chunks must be greater than 0.'],
    ['ChunkIntervalTooLow', 'The chunk interval must be greater than the swap delay (2).'],
    [
      'SwapRequestDurationTooLong',
      'The total duration of a DCA swap request must be less then the max allowed.',
    ],
    ['InvalidUserSignatureData', 'The provided Signature Data is invalid'],
    ['InvalidTransactionMetadata', 'The provided Transaction Metadata is invalid'],
    ['CcmUnsupportedForTargetChain', 'The target chain does not support CCM.'],
    [
      'AccountAlreadyExists',
      'Account already exists, cannot open an account creation deposit channel.',
    ],
  ])('maps the client error %s of the swapping pallet to a bad request', (name, description) => {
    const res = callHandleError(new Error(moduleError('Swapping', name, description)));

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: `${name}: ${description}` });
  });

  it.each([
    moduleError(
      'Swapping',
      'OraclePriceNotAvailable',
      'Oracle price not available for one or more of the assets.',
    ),
    moduleError(
      'Swapping',
      'LiquidityDepositDisabled',
      'Liquidity deposit is disabled due to Safe Mode.',
    ),
    moduleError('Swapping', 'CannotEncodeData', 'Failed to encode data'),
    moduleError(
      'Swapping',
      'ZeroNumberOfChunksNotAllowed',
      'The number of DCA chunks must be greater than 0.',
      -32021,
    ),
    moduleError('Flip', 'InsufficientBalance', ''),
    'RPC error [-32602]: Invalid params',
    'something went wrong',
  ])('responds with 500 for other errors: %s', (message) => {
    const res = callHandleError(new Error(message));

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: 'unknown error' });
  });

  it.each([429, 401, 404, 500])(
    'responds with 500 for errors of other origins that carry a %s status',
    (status) => {
      // e.g. an AxiosError of a rate limited upstream api
      const error = Object.assign(new Error(`Request failed with status code ${status}`), {
        status,
      });

      const res = callHandleError(error);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'unknown error' });
    },
  );
});

describe(jsonBodyParser, () => {
  const app = express
    .default()
    .post('/', jsonBodyParser({ limit: '1kb' }), (req, res) => {
      res.json({ received: req.body });
    })
    .post('/upstream', jsonBodyParser(), () => {
      throw Object.assign(new Error('Request failed with status code 429'), { status: 429 });
    })
    .use(handleError);

  it('parses valid json bodies', async () => {
    const res = await request(app).post('/').send({ a: 1 });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ received: { a: 1 } });
  });

  it.each([
    ['malformed json', '{"a": }', 'application/json', undefined],
    ['non-standard json', '{"amount": Infinity}', 'application/json', undefined],
    ['invalid gzip', 'not gzip', 'application/json', 'gzip'],
  ])('responds with 400 for %s', async (_, body, contentType, contentEncoding) => {
    let req = request(app).post('/').set('content-type', contentType);
    if (contentEncoding) req = req.set('content-encoding', contentEncoding);

    const res = await req.send(body);

    expect(res.status).toBe(400);
    expect(res.body.message).toEqual(expect.any(String));
  });

  it('responds with 413 for oversized bodies', async () => {
    const res = await request(app)
      .post('/')
      .send({ a: 'x'.repeat(2000) });

    expect(res.status).toBe(413);
    expect(res.body).toEqual({ message: 'request entity too large' });
  });

  it('responds with 415 for unsupported content encodings', async () => {
    const res = await request(app)
      .post('/')
      .set('content-type', 'application/json')
      .set('content-encoding', 'x-gzip')
      .send('{}');

    expect(res.status).toBe(415);
    expect(res.body).toEqual({ message: 'unsupported content encoding "x-gzip"' });
  });

  it('does not map 4xx errors thrown after the body was parsed', async () => {
    const res = await request(app).post('/upstream').send({ a: 1 });

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ message: 'unknown error' });
  });
});

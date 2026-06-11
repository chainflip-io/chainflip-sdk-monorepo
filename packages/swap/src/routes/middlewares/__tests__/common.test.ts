import type { Request, Response } from 'express';
import * as express from 'express';
import { describe, it, expect, vi, afterEach } from 'vitest';
import env from '../../../config/env.js';
import { handleQuotingError, quoteMiddleware } from '../common.js';

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

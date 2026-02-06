import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createApiKeyChecker } from '../apiKeyCache.js';

const mockFindMany = vi.fn();

const mockPrisma = {
  apiKey: { findMany: mockFindMany },
} as unknown as Parameters<typeof createApiKeyChecker>[0];

const mockReq = (apiKey?: string) =>
  ({
    headers: apiKey ? { 'x-api-key': apiKey } : {},
  }) as unknown as import('express').Request;

describe(createApiKeyChecker, () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockFindMany.mockReset();
    mockFindMany.mockResolvedValue([{ key: 'valid-key-1' }, { key: 'valid-key-2' }]);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns true for a valid API key', async () => {
    const checker = createApiKeyChecker(mockPrisma);
    const result = await checker(mockReq('valid-key-1'));
    expect(result).toBe(true);
  });

  it('returns false for an invalid API key', async () => {
    const checker = createApiKeyChecker(mockPrisma);
    const result = await checker(mockReq('bad-key'));
    expect(result).toBe(false);
  });

  it('returns false when no API key header is provided', async () => {
    const checker = createApiKeyChecker(mockPrisma);
    const result = await checker(mockReq());
    expect(result).toBe(false);
  });

  it('caches keys and does not re-query within TTL', async () => {
    const checker = createApiKeyChecker(mockPrisma);

    await checker(mockReq('valid-key-1'));
    await checker(mockReq('valid-key-2'));

    expect(mockFindMany).toHaveBeenCalledTimes(1);
  });

  it('refreshes cache after TTL expires', async () => {
    const checker = createApiKeyChecker(mockPrisma);

    await checker(mockReq('valid-key-1'));
    expect(mockFindMany).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(60_001);

    await checker(mockReq('valid-key-1'));
    expect(mockFindMany).toHaveBeenCalledTimes(2);
  });
});

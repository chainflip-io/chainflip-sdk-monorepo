import { describe, expect, it, vi } from 'vitest';
import * as rpc from '@/shared/rpc';
import { isAtLeastSpecVersion } from '../function';

vi.mock('@/shared/rpc');

describe(isAtLeastSpecVersion, () => {
  it('handles 1.7.10', async () => {
    vi.mocked(rpc.getRuntimeVersion).mockResolvedValueOnce({ specVersion: 1710 } as any);

    expect(await isAtLeastSpecVersion('1.8.0')).toBe(false);
  });

  it('handles 1.7.9', async () => {
    vi.mocked(rpc.getRuntimeVersion).mockResolvedValueOnce({ specVersion: 179 } as any);

    expect(await isAtLeastSpecVersion('1.8.0')).toBe(false);
  });

  it('handles 1.8.0', async () => {
    vi.mocked(rpc.getRuntimeVersion).mockResolvedValueOnce({ specVersion: 180 } as any);

    expect(await isAtLeastSpecVersion('1.8.0')).toBe(true);
  });
});

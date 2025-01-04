import { beforeAll, vi } from 'vitest';

beforeAll(() => {
  global.fetch = vi
    .fn()
    .mockRejectedValue(new Error('fetch is not implemented in this environment'));
});

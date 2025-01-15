import { beforeAll, vi } from 'vitest';

vi.mock('./src/config/env');

beforeAll(() => {
  global.fetch = vi
    .fn()
    .mockRejectedValue(new Error('fetch is not implemented in this environment'));
});

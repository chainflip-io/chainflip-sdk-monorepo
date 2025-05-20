import { beforeAll, vi } from 'vitest';

vi.mock('./src/config/env.js');
vi.mock('./src/pricing/index.js');

beforeAll(() => {
  global.fetch = vi
    .fn()
    .mockRejectedValue(new Error('fetch is not implemented in this environment'));
});

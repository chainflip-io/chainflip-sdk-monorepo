import { beforeAll, vi } from 'vitest';

vi.mock('./src/config/env');

beforeAll(() => {
  vi.spyOn(global, 'fetch').mockRejectedValue(
    new Error('fetch is not implemented in this environment'),
  );
});

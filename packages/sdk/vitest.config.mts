import { defineProject, mergeConfig } from 'vitest/config';
import configShared from '../../vitest.shared.mjs';

export default mergeConfig(
  configShared,
  defineProject({
    test: {
      include: ['**/*.test.ts'],
    },
  }),
);

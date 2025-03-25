import * as path from 'path';
import { defineProject, mergeConfig } from 'vitest/config';

import configShared from '../../vitest.shared.mjs';

export default mergeConfig(
  configShared,
  defineProject({
    test: {
      include: ['**/*.test.ts'],
      globalSetup: ['./globalSetup.mts'],
      setupFiles: ['./setupFile.ts'],
    },
    resolve: {
      alias: {
        '.prisma/client': path.resolve(__dirname, './node_modules/.prisma/client/index.js'),
      },
    },
  }),
);

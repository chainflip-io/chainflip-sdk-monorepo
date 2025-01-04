import * as path from 'path';
import { defineProject, mergeConfig } from 'vitest/config';

import configShared from '../../vitest.shared.mjs';

export default mergeConfig(
  configShared,
  defineProject({
    test: {
      include: ['**/*.test.ts'],
      globalSetup: ['./globalSetup.ts'],
      setupFiles: ['./setupFile.ts'],
      env: {
        CHAINFLIP_NETWORK: 'perseverance',
        REDIS_URL: 'redis://localhost:6379',
        INGEST_GATEWAY_URL: 'https://ingest-gateway.test',
      },
      exclude: ['**/*/Quoter.test.ts', '**/*/integration.test.ts'], // TODO: fix these two tests
    },
    resolve: {
      alias: {
        '.prisma/client': path.resolve(__dirname, './node_modules/.prisma/client/index.js'),
      },
    },
  }),
);

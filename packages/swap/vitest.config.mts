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
        INGEST_GATEWAY_URL: 'https://ingest-gateway.test',
        RPC_NODE_HTTP_URL: 'http://rpc-node.test',
        RPC_BROKER_HTTPS_URL: 'https://rpc-broker.test',
        RPC_NODE_WSS_URL: 'ws://rpc-node.test',
        SOLANA_RPC_HTTP_URL: 'http://solana-rpc.test',
        REDIS_URL: 'redis://localhost:6379',
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

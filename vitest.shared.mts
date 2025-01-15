import * as path from 'path';
// eslint-disable-next-line import/no-extraneous-dependencies
import tsconfigPaths from 'vite-tsconfig-paths';
// eslint-disable-next-line import/no-extraneous-dependencies
import { defineConfig, configDefaults } from 'vitest/config';

export default defineConfig({
  plugins: [
    tsconfigPaths({
      projects: [path.resolve(__dirname, 'tsconfig.json')],
    }),
  ],
  test: {
    exclude: [...configDefaults.exclude],
    coverage: { enabled: true, provider: 'v8' },
    isolate: false,
  },
  resolve: {
    alias: {
      '@chainflip/processor': path.resolve(__dirname, 'node_modules/@chainflip/processor/dist'),
    },
  },
});

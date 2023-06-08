/* eslint-disable import/no-extraneous-dependencies */
import { defineConfig } from 'tsup';

export default defineConfig({
  treeshake: true,
  minify: false,
  dts: true,
  format: ['cjs', 'esm'],
  entry: {
    lib: 'src/lib/index.ts',
    cli: 'src/main.ts',
  },
  splitting: true,
});

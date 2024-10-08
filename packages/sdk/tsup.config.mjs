import { defineConfig } from 'tsup';

export default defineConfig({
  treeshake: true,
  minify: false,
  dts: true,
  external: [/^node:!(crypto)/],
  format: ['cjs', 'esm'],
  entry: {
    swap: 'src/swap/index.ts',
    funding: 'src/funding/index.ts',
  },
});

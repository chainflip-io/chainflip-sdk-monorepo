import { defineConfig } from 'tsup';

export default defineConfig({
  treeshake: 'smallest',
  minify: false,
  dts: true,
  format: ['cjs', 'esm'],
  skipNodeModulesBundle: true,
  entry: {
    swap: 'src/swap/index.ts',
    funding: 'src/funding/index.ts',
  },
});

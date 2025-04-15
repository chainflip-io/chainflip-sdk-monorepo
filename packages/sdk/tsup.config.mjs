import { defineConfig } from 'tsup';

export default defineConfig({
  treeshake: 'smallest',
  minify: false,
  dts: true,
  format: ['cjs', 'esm'],
  skipNodeModulesBundle: true,
  // bundle chainflip dependencies w/ the sdk
  noExternal: [/@chainflip\/.+/],
  entry: {
    swap: 'src/swap/index.ts',
    funding: 'src/funding/index.ts',
  },
  target: 'es2022',
});

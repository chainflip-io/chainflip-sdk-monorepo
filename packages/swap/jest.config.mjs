// eslint-disable-next-line import/no-relative-packages
import baseConfig from '../../jest.config.mjs';

export default {
  ...baseConfig,
  rootDir: './',
  roots: ['<rootDir>/src'],
  globalSetup: '<rootDir>/jest-globalSetup.mjs',
  resetMocks: false,
  setupFiles: ['<rootDir>/src/__mocks__/env.mjs', '<rootDir>/jest-setup.mjs'],
};

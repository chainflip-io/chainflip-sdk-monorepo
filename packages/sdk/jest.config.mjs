// eslint-disable-next-line import/no-relative-packages
import baseConfig from '../../jest.config.mjs';

export default {
  ...baseConfig,
  setupFilesAfterEnv: ['<rootDir>/jest-setup.mjs'],
};

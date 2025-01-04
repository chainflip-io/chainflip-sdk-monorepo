// eslint-disable-next-line @typescript-eslint/no-var-requires
const path = require('path');

module.exports = {
  extends: '../../.eslintrc.json',
  plugins: ['eslint-plugin-n'],
  rules: {
    'n/no-process-env': ['error'],
    'import/no-extraneous-dependencies': [
      'error',
      {
        packageDir: [__dirname, path.join(__dirname, '..', '..')],
      },
    ],
  },
  overrides: [
    {
      files: ['*.test.ts', '*.mjs', '*.js', '*.cjs'],
      rules: {
        'n/no-process-env': ['off'],
      },
    },
  ],
};

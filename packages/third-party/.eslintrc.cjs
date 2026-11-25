// eslint-disable-next-line @typescript-eslint/no-var-requires
const path = require('path');

module.exports = {
  extends: '../../.eslintrc.json',
  settings: {
    // the Prisma client is generated into node_modules by `prisma generate` and is not a
    // package.json dependency. treating it as a core module keeps lint results the same whether or
    // not it has been generated yet
    'import/core-modules': ['@prisma/third-party'],
  },
  rules: {
    'import/no-extraneous-dependencies': [
      'error',
      {
        packageDir: [__dirname, path.join(__dirname, '..', '..')],
      },
    ],
  },
};

// eslint-disable-next-line @typescript-eslint/no-var-requires
const path = require('path');

module.exports = {
  extends: '../../.eslintrc.json',
  settings: {
    // the integrators Prisma client is generated into node_modules by `pnpm integrators:generate`
    // and is not a package.json dependency. treating it as a core module keeps lint results the
    // same whether or not it has been generated (CI lints without generating it)
    'import/core-modules': ['@prisma/integrators'],
  },
  rules: {
    'import/no-extraneous-dependencies': [
      'error',
      {
        packageDir: [__dirname, path.join(__dirname, '..', '..')],
      },
    ],
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            group: ['@/shared/node-apis/*'],
            message: 'This directory uses Node.js APIs that are not browser compatible.',
          },
        ],
      },
    ],
  },
};

import { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  schema: ['https://indexer-backspin.staging/graphql'],
  documents: ['**/*.ts'],
  emitLegacyCommonJSImports: false,
  generates: {
    'src/gql/generated/': {
      preset: 'client',
      presetConfig: {
        gqlTagName: 'gql',
        fragmentMasking: false,
      },
      config: {
        enumsAsTypes: true,
        // client-preset v6 defaults unmapped scalars to `unknown`; restore the
        // previous `any` behavior so downstream `new Date(block.timestamp)` /
        // `schema.parse(event.args)` call sites keep type-checking.
        defaultScalarType: 'any',
      },
    },
  },
};

export default config;

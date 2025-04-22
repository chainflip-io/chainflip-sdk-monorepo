import { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  schema: ['https://indexer.staging/graphql'],
  documents: ['**/*.ts', '**/*.tsx'],
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
      },
    },
  },
};

export default config;

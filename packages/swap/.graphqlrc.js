module.exports = {
  schema: ['https://indexer.staging/graphql'],
  documents: ['**/*.ts', '**/*.tsx'],
  extensions: {
    codegen: {
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
    },
  },
};

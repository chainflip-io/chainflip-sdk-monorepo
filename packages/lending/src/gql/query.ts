import { gql } from './generated/index.js';

export const GET_BATCH = gql(/* GraphQL */ `
  query GetBatch($height: Int!, $limit: Int!, $lendingEvents: [String!]!) {
    blocks: allBlocks(
      filter: { height: { greaterThanOrEqualTo: $height } }
      first: $limit
      orderBy: HEIGHT_ASC
    ) {
      nodes {
        height
        hash
        timestamp
        specId
        events: eventsByBlockId(
          filter: { name: { in: $lendingEvents } }
          orderBy: INDEX_IN_BLOCK_ASC
        ) {
          nodes {
            args
            name
            indexInBlock
          }
        }
      }
    }
  }
`);

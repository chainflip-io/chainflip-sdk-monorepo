import { gql } from './generated';

export const GET_BATCH = gql(/* GraphQL */ `
  query GetBatch($height: Int!, $limit: Int!, $swapEvents: [String!]!) {
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
        events: eventsByBlockId(filter: { name: { in: $swapEvents } }) {
          nodes {
            args
            name
            indexInBlock
            callId
            extrinsicId
          }
        }
      }
    }
  }
`);

export const GET_CALL = gql(/* GraphQL */ `
  query GetCall($id: String!) {
    call: callById(id: $id) {
      args
    }
  }
`);

export const GET_EXTRINSIC = gql(/* GraphQL */ `
  query GetExtrinsic($id: String!) {
    extrinsic: extrinsicById(id: $id) {
      signature
    }
  }
`);

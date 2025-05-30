/* eslint-disable */
import * as types from './graphql.js';
import { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';

/**
 * Map of all GraphQL operations in the project.
 *
 * This map has several performance disadvantages:
 * 1. It is not tree-shakeable, so it will include all operations in the project.
 * 2. It is not minifiable, so the string of a GraphQL query will be multiple times inside the bundle.
 * 3. It does not support dead code elimination, so it will add unused operations.
 *
 * Therefore it is highly recommended to use the babel or swc plugin for production.
 * Learn more about it here: https://the-guild.dev/graphql/codegen/plugins/presets/preset-client#reducing-bundle-size
 */
type Documents = {
    "\n  query FallbackQuery {\n    events: allEvents(condition: { name: \"SolanaIngressEgress.TransferFallbackRequested\" }) {\n      nodes {\n        id\n        indexInBlock\n        args\n        block: blockByBlockId {\n          height\n          timestamp\n          events: eventsByBlockId(filter: { name: { startsWith: \"Solana\" } }) {\n            nodes {\n              indexInBlock\n              name\n              args\n            }\n          }\n        }\n      }\n    }\n  }\n": typeof types.FallbackQueryDocument,
    "\n  query BroadcastSuccessQuery($id: String!) {\n    events: allEvents(\n      filter: { id: { greaterThan: $id }, name: { equalTo: \"SolanaBroadcaster.BroadcastSuccess\" } }\n      first: 1\n      orderBy: ID_ASC\n    ) {\n      nodes {\n        id\n        name\n        args\n        indexInBlock\n        block: blockByBlockId {\n          height\n          timestamp\n        }\n      }\n    }\n  }\n": typeof types.BroadcastSuccessQueryDocument,
    "\n  query GetBatch($height: Int!, $limit: Int!, $swapEvents: [String!]!) {\n    blocks: allBlocks(\n      filter: { height: { greaterThanOrEqualTo: $height } }\n      first: $limit\n      orderBy: HEIGHT_ASC\n    ) {\n      nodes {\n        height\n        hash\n        timestamp\n        specId\n        events: eventsByBlockId(\n          filter: { name: { in: $swapEvents } }\n          orderBy: INDEX_IN_BLOCK_ASC\n        ) {\n          nodes {\n            args\n            name\n            indexInBlock\n            callId\n            extrinsicId\n          }\n        }\n      }\n    }\n  }\n": typeof types.GetBatchDocument,
    "\n  query GetCall($id: String!) {\n    call: callById(id: $id) {\n      args\n    }\n  }\n": typeof types.GetCallDocument,
    "\n  query GetExtrinsic($id: String!) {\n    extrinsic: extrinsicById(id: $id) {\n      signature\n    }\n  }\n": typeof types.GetExtrinsicDocument,
};
const documents: Documents = {
    "\n  query FallbackQuery {\n    events: allEvents(condition: { name: \"SolanaIngressEgress.TransferFallbackRequested\" }) {\n      nodes {\n        id\n        indexInBlock\n        args\n        block: blockByBlockId {\n          height\n          timestamp\n          events: eventsByBlockId(filter: { name: { startsWith: \"Solana\" } }) {\n            nodes {\n              indexInBlock\n              name\n              args\n            }\n          }\n        }\n      }\n    }\n  }\n": types.FallbackQueryDocument,
    "\n  query BroadcastSuccessQuery($id: String!) {\n    events: allEvents(\n      filter: { id: { greaterThan: $id }, name: { equalTo: \"SolanaBroadcaster.BroadcastSuccess\" } }\n      first: 1\n      orderBy: ID_ASC\n    ) {\n      nodes {\n        id\n        name\n        args\n        indexInBlock\n        block: blockByBlockId {\n          height\n          timestamp\n        }\n      }\n    }\n  }\n": types.BroadcastSuccessQueryDocument,
    "\n  query GetBatch($height: Int!, $limit: Int!, $swapEvents: [String!]!) {\n    blocks: allBlocks(\n      filter: { height: { greaterThanOrEqualTo: $height } }\n      first: $limit\n      orderBy: HEIGHT_ASC\n    ) {\n      nodes {\n        height\n        hash\n        timestamp\n        specId\n        events: eventsByBlockId(\n          filter: { name: { in: $swapEvents } }\n          orderBy: INDEX_IN_BLOCK_ASC\n        ) {\n          nodes {\n            args\n            name\n            indexInBlock\n            callId\n            extrinsicId\n          }\n        }\n      }\n    }\n  }\n": types.GetBatchDocument,
    "\n  query GetCall($id: String!) {\n    call: callById(id: $id) {\n      args\n    }\n  }\n": types.GetCallDocument,
    "\n  query GetExtrinsic($id: String!) {\n    extrinsic: extrinsicById(id: $id) {\n      signature\n    }\n  }\n": types.GetExtrinsicDocument,
};

/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 *
 *
 * @example
 * ```ts
 * const query = gql(`query GetUser($id: ID!) { user(id: $id) { name } }`);
 * ```
 *
 * The query argument is unknown!
 * Please regenerate the types.
 */
export function gql(source: string): unknown;

/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n  query FallbackQuery {\n    events: allEvents(condition: { name: \"SolanaIngressEgress.TransferFallbackRequested\" }) {\n      nodes {\n        id\n        indexInBlock\n        args\n        block: blockByBlockId {\n          height\n          timestamp\n          events: eventsByBlockId(filter: { name: { startsWith: \"Solana\" } }) {\n            nodes {\n              indexInBlock\n              name\n              args\n            }\n          }\n        }\n      }\n    }\n  }\n"): (typeof documents)["\n  query FallbackQuery {\n    events: allEvents(condition: { name: \"SolanaIngressEgress.TransferFallbackRequested\" }) {\n      nodes {\n        id\n        indexInBlock\n        args\n        block: blockByBlockId {\n          height\n          timestamp\n          events: eventsByBlockId(filter: { name: { startsWith: \"Solana\" } }) {\n            nodes {\n              indexInBlock\n              name\n              args\n            }\n          }\n        }\n      }\n    }\n  }\n"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n  query BroadcastSuccessQuery($id: String!) {\n    events: allEvents(\n      filter: { id: { greaterThan: $id }, name: { equalTo: \"SolanaBroadcaster.BroadcastSuccess\" } }\n      first: 1\n      orderBy: ID_ASC\n    ) {\n      nodes {\n        id\n        name\n        args\n        indexInBlock\n        block: blockByBlockId {\n          height\n          timestamp\n        }\n      }\n    }\n  }\n"): (typeof documents)["\n  query BroadcastSuccessQuery($id: String!) {\n    events: allEvents(\n      filter: { id: { greaterThan: $id }, name: { equalTo: \"SolanaBroadcaster.BroadcastSuccess\" } }\n      first: 1\n      orderBy: ID_ASC\n    ) {\n      nodes {\n        id\n        name\n        args\n        indexInBlock\n        block: blockByBlockId {\n          height\n          timestamp\n        }\n      }\n    }\n  }\n"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n  query GetBatch($height: Int!, $limit: Int!, $swapEvents: [String!]!) {\n    blocks: allBlocks(\n      filter: { height: { greaterThanOrEqualTo: $height } }\n      first: $limit\n      orderBy: HEIGHT_ASC\n    ) {\n      nodes {\n        height\n        hash\n        timestamp\n        specId\n        events: eventsByBlockId(\n          filter: { name: { in: $swapEvents } }\n          orderBy: INDEX_IN_BLOCK_ASC\n        ) {\n          nodes {\n            args\n            name\n            indexInBlock\n            callId\n            extrinsicId\n          }\n        }\n      }\n    }\n  }\n"): (typeof documents)["\n  query GetBatch($height: Int!, $limit: Int!, $swapEvents: [String!]!) {\n    blocks: allBlocks(\n      filter: { height: { greaterThanOrEqualTo: $height } }\n      first: $limit\n      orderBy: HEIGHT_ASC\n    ) {\n      nodes {\n        height\n        hash\n        timestamp\n        specId\n        events: eventsByBlockId(\n          filter: { name: { in: $swapEvents } }\n          orderBy: INDEX_IN_BLOCK_ASC\n        ) {\n          nodes {\n            args\n            name\n            indexInBlock\n            callId\n            extrinsicId\n          }\n        }\n      }\n    }\n  }\n"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n  query GetCall($id: String!) {\n    call: callById(id: $id) {\n      args\n    }\n  }\n"): (typeof documents)["\n  query GetCall($id: String!) {\n    call: callById(id: $id) {\n      args\n    }\n  }\n"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n  query GetExtrinsic($id: String!) {\n    extrinsic: extrinsicById(id: $id) {\n      signature\n    }\n  }\n"): (typeof documents)["\n  query GetExtrinsic($id: String!) {\n    extrinsic: extrinsicById(id: $id) {\n      signature\n    }\n  }\n"];

export function gql(source: string) {
  return (documents as any)[source] ?? {};
}

export type DocumentType<TDocumentNode extends DocumentNode<any, any>> = TDocumentNode extends DocumentNode<  infer TType,  any>  ? TType  : never;
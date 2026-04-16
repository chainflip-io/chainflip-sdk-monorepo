/* eslint-disable */
import * as types from './graphql.js';
import { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';

type Documents = {
    "\n  query GetBatch($height: Int!, $limit: Int!, $lendingEvents: [String!]!) {\n    blocks: allBlocks(\n      filter: { height: { greaterThanOrEqualTo: $height } }\n      first: $limit\n      orderBy: HEIGHT_ASC\n    ) {\n      nodes {\n        height\n        hash\n        timestamp\n        specId\n        events: eventsByBlockId(\n          filter: { name: { in: $lendingEvents } }\n          orderBy: INDEX_IN_BLOCK_ASC\n        ) {\n          nodes {\n            args\n            name\n            indexInBlock\n          }\n        }\n      }\n    }\n  }\n": typeof types.GetBatchDocument,
};
const documents: Documents = {
    "\n  query GetBatch($height: Int!, $limit: Int!, $lendingEvents: [String!]!) {\n    blocks: allBlocks(\n      filter: { height: { greaterThanOrEqualTo: $height } }\n      first: $limit\n      orderBy: HEIGHT_ASC\n    ) {\n      nodes {\n        height\n        hash\n        timestamp\n        specId\n        events: eventsByBlockId(\n          filter: { name: { in: $lendingEvents } }\n          orderBy: INDEX_IN_BLOCK_ASC\n        ) {\n          nodes {\n            args\n            name\n            indexInBlock\n          }\n        }\n      }\n    }\n  }\n": types.GetBatchDocument,
};

export function gql(source: string): unknown;
export function gql(source: "\n  query GetBatch($height: Int!, $limit: Int!, $lendingEvents: [String!]!) {\n    blocks: allBlocks(\n      filter: { height: { greaterThanOrEqualTo: $height } }\n      first: $limit\n      orderBy: HEIGHT_ASC\n    ) {\n      nodes {\n        height\n        hash\n        timestamp\n        specId\n        events: eventsByBlockId(\n          filter: { name: { in: $lendingEvents } }\n          orderBy: INDEX_IN_BLOCK_ASC\n        ) {\n          nodes {\n            args\n            name\n            indexInBlock\n          }\n        }\n      }\n    }\n  }\n"): (typeof documents)["\n  query GetBatch($height: Int!, $limit: Int!, $lendingEvents: [String!]!) {\n    blocks: allBlocks(\n      filter: { height: { greaterThanOrEqualTo: $height } }\n      first: $limit\n      orderBy: HEIGHT_ASC\n    ) {\n      nodes {\n        height\n        hash\n        timestamp\n        specId\n        events: eventsByBlockId(\n          filter: { name: { in: $lendingEvents } }\n          orderBy: INDEX_IN_BLOCK_ASC\n        ) {\n          nodes {\n            args\n            name\n            indexInBlock\n          }\n        }\n      }\n    }\n  }\n"];

export function gql(source: string) {
  return (documents as any)[source] ?? {};
}

export type DocumentType<TDocumentNode extends DocumentNode<any, any>> = TDocumentNode extends DocumentNode<  infer TType,  any>  ? TType  : never;

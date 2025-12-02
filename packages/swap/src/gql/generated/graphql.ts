/* eslint-disable */
import { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  /** A floating point number that requires more precision than IEEE 754 binary 64 */
  BigFloat: { input: any; output: any; }
  /**
   * A signed eight-byte integer. The upper big integer values are greater than the
   * max value for a JavaScript number. Therefore all big integers will be output as
   * strings and not numbers.
   */
  BigInt: { input: any; output: any; }
  /** A location in a connection that can be used for resuming pagination. */
  Cursor: { input: any; output: any; }
  /**
   * A point in time as described by the [ISO
   * 8601](https://en.wikipedia.org/wiki/ISO_8601) standard. May or may not include a timezone.
   */
  Datetime: { input: any; output: any; }
  /** The `JSON` scalar type represents JSON values as specified by [ECMA-404](http://www.ecma-international.org/publications/files/ECMA-ST/ECMA-404.pdf). */
  JSON: { input: any; output: any; }
};

export type AcalaEvmExecuted = Node & {
  __typename?: 'AcalaEvmExecuted';
  contract: Scalars['String']['output'];
  /** Reads a single `Event` that is related to this `AcalaEvmExecuted`. */
  eventByEventId: Event;
  eventId: Scalars['String']['output'];
  /** A globally unique identifier. Can be used in various places throughout the system to identify this single value. */
  nodeId: Scalars['ID']['output'];
};

export type AcalaEvmExecutedAggregates = {
  __typename?: 'AcalaEvmExecutedAggregates';
  /** Distinct count aggregates across the matching connection (ignoring before/after/first/last/offset) */
  distinctCount?: Maybe<AcalaEvmExecutedDistinctCountAggregates>;
  keys?: Maybe<Array<Scalars['String']['output']>>;
};

/**
 * A condition to be used against `AcalaEvmExecuted` object types. All fields are
 * tested for equality and combined with a logical ‘and.’
 */
export type AcalaEvmExecutedCondition = {
  /** Checks for equality with the object’s `contract` field. */
  contract?: InputMaybe<Scalars['String']['input']>;
  /** Checks for equality with the object’s `eventId` field. */
  eventId?: InputMaybe<Scalars['String']['input']>;
};

export type AcalaEvmExecutedDistinctCountAggregates = {
  __typename?: 'AcalaEvmExecutedDistinctCountAggregates';
  /** Distinct count of contract across the matching connection */
  contract?: Maybe<Scalars['BigInt']['output']>;
  /** Distinct count of eventId across the matching connection */
  eventId?: Maybe<Scalars['BigInt']['output']>;
};

export type AcalaEvmExecutedFailed = Node & {
  __typename?: 'AcalaEvmExecutedFailed';
  contract: Scalars['String']['output'];
  /** Reads a single `Event` that is related to this `AcalaEvmExecutedFailed`. */
  eventByEventId: Event;
  eventId: Scalars['String']['output'];
  /** A globally unique identifier. Can be used in various places throughout the system to identify this single value. */
  nodeId: Scalars['ID']['output'];
};

export type AcalaEvmExecutedFailedAggregates = {
  __typename?: 'AcalaEvmExecutedFailedAggregates';
  /** Distinct count aggregates across the matching connection (ignoring before/after/first/last/offset) */
  distinctCount?: Maybe<AcalaEvmExecutedFailedDistinctCountAggregates>;
  keys?: Maybe<Array<Scalars['String']['output']>>;
};

/**
 * A condition to be used against `AcalaEvmExecutedFailed` object types. All fields
 * are tested for equality and combined with a logical ‘and.’
 */
export type AcalaEvmExecutedFailedCondition = {
  /** Checks for equality with the object’s `contract` field. */
  contract?: InputMaybe<Scalars['String']['input']>;
  /** Checks for equality with the object’s `eventId` field. */
  eventId?: InputMaybe<Scalars['String']['input']>;
};

export type AcalaEvmExecutedFailedDistinctCountAggregates = {
  __typename?: 'AcalaEvmExecutedFailedDistinctCountAggregates';
  /** Distinct count of contract across the matching connection */
  contract?: Maybe<Scalars['BigInt']['output']>;
  /** Distinct count of eventId across the matching connection */
  eventId?: Maybe<Scalars['BigInt']['output']>;
};

/** A filter to be used against `AcalaEvmExecutedFailed` object types. All fields are combined with a logical ‘and.’ */
export type AcalaEvmExecutedFailedFilter = {
  /** Checks for all expressions in this list. */
  and?: InputMaybe<Array<AcalaEvmExecutedFailedFilter>>;
  /** Filter by the object’s `contract` field. */
  contract?: InputMaybe<StringFilter>;
  /** Filter by the object’s `eventId` field. */
  eventId?: InputMaybe<StringFilter>;
  /** Negates the expression. */
  not?: InputMaybe<AcalaEvmExecutedFailedFilter>;
  /** Checks for any expressions in this list. */
  or?: InputMaybe<Array<AcalaEvmExecutedFailedFilter>>;
};

/** Grouping methods for `AcalaEvmExecutedFailed` for usage during aggregation. */
export type AcalaEvmExecutedFailedGroupBy =
  | 'CONTRACT';

/** Conditions for `AcalaEvmExecutedFailed` aggregates. */
export type AcalaEvmExecutedFailedHavingInput = {
  AND?: InputMaybe<Array<AcalaEvmExecutedFailedHavingInput>>;
  OR?: InputMaybe<Array<AcalaEvmExecutedFailedHavingInput>>;
};

export type AcalaEvmExecutedFailedLog = Node & {
  __typename?: 'AcalaEvmExecutedFailedLog';
  contract: Scalars['String']['output'];
  /** Reads a single `Event` that is related to this `AcalaEvmExecutedFailedLog`. */
  eventByEventId: Event;
  eventContract: Scalars['String']['output'];
  eventId: Scalars['String']['output'];
  id: Scalars['String']['output'];
  /** A globally unique identifier. Can be used in various places throughout the system to identify this single value. */
  nodeId: Scalars['ID']['output'];
  topic0?: Maybe<Scalars['String']['output']>;
  topic1?: Maybe<Scalars['String']['output']>;
  topic2?: Maybe<Scalars['String']['output']>;
  topic3?: Maybe<Scalars['String']['output']>;
};

export type AcalaEvmExecutedFailedLogAggregates = {
  __typename?: 'AcalaEvmExecutedFailedLogAggregates';
  /** Distinct count aggregates across the matching connection (ignoring before/after/first/last/offset) */
  distinctCount?: Maybe<AcalaEvmExecutedFailedLogDistinctCountAggregates>;
  keys?: Maybe<Array<Scalars['String']['output']>>;
};

/**
 * A condition to be used against `AcalaEvmExecutedFailedLog` object types. All
 * fields are tested for equality and combined with a logical ‘and.’
 */
export type AcalaEvmExecutedFailedLogCondition = {
  /** Checks for equality with the object’s `contract` field. */
  contract?: InputMaybe<Scalars['String']['input']>;
  /** Checks for equality with the object’s `eventContract` field. */
  eventContract?: InputMaybe<Scalars['String']['input']>;
  /** Checks for equality with the object’s `eventId` field. */
  eventId?: InputMaybe<Scalars['String']['input']>;
  /** Checks for equality with the object’s `id` field. */
  id?: InputMaybe<Scalars['String']['input']>;
  /** Checks for equality with the object’s `topic0` field. */
  topic0?: InputMaybe<Scalars['String']['input']>;
  /** Checks for equality with the object’s `topic1` field. */
  topic1?: InputMaybe<Scalars['String']['input']>;
  /** Checks for equality with the object’s `topic2` field. */
  topic2?: InputMaybe<Scalars['String']['input']>;
  /** Checks for equality with the object’s `topic3` field. */
  topic3?: InputMaybe<Scalars['String']['input']>;
};

export type AcalaEvmExecutedFailedLogDistinctCountAggregates = {
  __typename?: 'AcalaEvmExecutedFailedLogDistinctCountAggregates';
  /** Distinct count of contract across the matching connection */
  contract?: Maybe<Scalars['BigInt']['output']>;
  /** Distinct count of eventContract across the matching connection */
  eventContract?: Maybe<Scalars['BigInt']['output']>;
  /** Distinct count of eventId across the matching connection */
  eventId?: Maybe<Scalars['BigInt']['output']>;
  /** Distinct count of id across the matching connection */
  id?: Maybe<Scalars['BigInt']['output']>;
  /** Distinct count of topic0 across the matching connection */
  topic0?: Maybe<Scalars['BigInt']['output']>;
  /** Distinct count of topic1 across the matching connection */
  topic1?: Maybe<Scalars['BigInt']['output']>;
  /** Distinct count of topic2 across the matching connection */
  topic2?: Maybe<Scalars['BigInt']['output']>;
  /** Distinct count of topic3 across the matching connection */
  topic3?: Maybe<Scalars['BigInt']['output']>;
};

/** A filter to be used against `AcalaEvmExecutedFailedLog` object types. All fields are combined with a logical ‘and.’ */
export type AcalaEvmExecutedFailedLogFilter = {
  /** Checks for all expressions in this list. */
  and?: InputMaybe<Array<AcalaEvmExecutedFailedLogFilter>>;
  /** Filter by the object’s `contract` field. */
  contract?: InputMaybe<StringFilter>;
  /** Filter by the object’s `eventContract` field. */
  eventContract?: InputMaybe<StringFilter>;
  /** Filter by the object’s `eventId` field. */
  eventId?: InputMaybe<StringFilter>;
  /** Filter by the object’s `id` field. */
  id?: InputMaybe<StringFilter>;
  /** Negates the expression. */
  not?: InputMaybe<AcalaEvmExecutedFailedLogFilter>;
  /** Checks for any expressions in this list. */
  or?: InputMaybe<Array<AcalaEvmExecutedFailedLogFilter>>;
  /** Filter by the object’s `topic0` field. */
  topic0?: InputMaybe<StringFilter>;
  /** Filter by the object’s `topic1` field. */
  topic1?: InputMaybe<StringFilter>;
  /** Filter by the object’s `topic2` field. */
  topic2?: InputMaybe<StringFilter>;
  /** Filter by the object’s `topic3` field. */
  topic3?: InputMaybe<StringFilter>;
};

/** Grouping methods for `AcalaEvmExecutedFailedLog` for usage during aggregation. */
export type AcalaEvmExecutedFailedLogGroupBy =
  | 'CONTRACT'
  | 'EVENT_CONTRACT'
  | 'EVENT_ID'
  | 'TOPIC0'
  | 'TOPIC1'
  | 'TOPIC2'
  | 'TOPIC3';

/** Conditions for `AcalaEvmExecutedFailedLog` aggregates. */
export type AcalaEvmExecutedFailedLogHavingInput = {
  AND?: InputMaybe<Array<AcalaEvmExecutedFailedLogHavingInput>>;
  OR?: InputMaybe<Array<AcalaEvmExecutedFailedLogHavingInput>>;
};

/** A connection to a list of `AcalaEvmExecutedFailedLog` values. */
export type AcalaEvmExecutedFailedLogsConnection = {
  __typename?: 'AcalaEvmExecutedFailedLogsConnection';
  /** Aggregates across the matching connection (ignoring before/after/first/last/offset) */
  aggregates?: Maybe<AcalaEvmExecutedFailedLogAggregates>;
  /** A list of edges which contains the `AcalaEvmExecutedFailedLog` and cursor to aid in pagination. */
  edges: Array<AcalaEvmExecutedFailedLogsEdge>;
  /** Grouped aggregates across the matching connection (ignoring before/after/first/last/offset) */
  groupedAggregates?: Maybe<Array<AcalaEvmExecutedFailedLogAggregates>>;
  /** A list of `AcalaEvmExecutedFailedLog` objects. */
  nodes: Array<AcalaEvmExecutedFailedLog>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
  /** The count of *all* `AcalaEvmExecutedFailedLog` you could get from the connection. */
  totalCount: Scalars['Int']['output'];
};


/** A connection to a list of `AcalaEvmExecutedFailedLog` values. */
export type AcalaEvmExecutedFailedLogsConnectionGroupedAggregatesArgs = {
  groupBy: Array<AcalaEvmExecutedFailedLogGroupBy>;
  having?: InputMaybe<AcalaEvmExecutedFailedLogHavingInput>;
};

/** A `AcalaEvmExecutedFailedLog` edge in the connection. */
export type AcalaEvmExecutedFailedLogsEdge = {
  __typename?: 'AcalaEvmExecutedFailedLogsEdge';
  /** A cursor for use in pagination. */
  cursor?: Maybe<Scalars['Cursor']['output']>;
  /** The `AcalaEvmExecutedFailedLog` at the end of the edge. */
  node: AcalaEvmExecutedFailedLog;
};

/** Methods to use when ordering `AcalaEvmExecutedFailedLog`. */
export type AcalaEvmExecutedFailedLogsOrderBy =
  | 'CONTRACT_ASC'
  | 'CONTRACT_DESC'
  | 'EVENT_CONTRACT_ASC'
  | 'EVENT_CONTRACT_DESC'
  | 'EVENT_ID_ASC'
  | 'EVENT_ID_DESC'
  | 'ID_ASC'
  | 'ID_DESC'
  | 'NATURAL'
  | 'PRIMARY_KEY_ASC'
  | 'PRIMARY_KEY_DESC'
  | 'TOPIC0_ASC'
  | 'TOPIC0_DESC'
  | 'TOPIC1_ASC'
  | 'TOPIC1_DESC'
  | 'TOPIC2_ASC'
  | 'TOPIC2_DESC'
  | 'TOPIC3_ASC'
  | 'TOPIC3_DESC';

/** A connection to a list of `AcalaEvmExecutedFailed` values. */
export type AcalaEvmExecutedFailedsConnection = {
  __typename?: 'AcalaEvmExecutedFailedsConnection';
  /** Aggregates across the matching connection (ignoring before/after/first/last/offset) */
  aggregates?: Maybe<AcalaEvmExecutedFailedAggregates>;
  /** A list of edges which contains the `AcalaEvmExecutedFailed` and cursor to aid in pagination. */
  edges: Array<AcalaEvmExecutedFailedsEdge>;
  /** Grouped aggregates across the matching connection (ignoring before/after/first/last/offset) */
  groupedAggregates?: Maybe<Array<AcalaEvmExecutedFailedAggregates>>;
  /** A list of `AcalaEvmExecutedFailed` objects. */
  nodes: Array<AcalaEvmExecutedFailed>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
  /** The count of *all* `AcalaEvmExecutedFailed` you could get from the connection. */
  totalCount: Scalars['Int']['output'];
};


/** A connection to a list of `AcalaEvmExecutedFailed` values. */
export type AcalaEvmExecutedFailedsConnectionGroupedAggregatesArgs = {
  groupBy: Array<AcalaEvmExecutedFailedGroupBy>;
  having?: InputMaybe<AcalaEvmExecutedFailedHavingInput>;
};

/** A `AcalaEvmExecutedFailed` edge in the connection. */
export type AcalaEvmExecutedFailedsEdge = {
  __typename?: 'AcalaEvmExecutedFailedsEdge';
  /** A cursor for use in pagination. */
  cursor?: Maybe<Scalars['Cursor']['output']>;
  /** The `AcalaEvmExecutedFailed` at the end of the edge. */
  node: AcalaEvmExecutedFailed;
};

/** Methods to use when ordering `AcalaEvmExecutedFailed`. */
export type AcalaEvmExecutedFailedsOrderBy =
  | 'CONTRACT_ASC'
  | 'CONTRACT_DESC'
  | 'EVENT_ID_ASC'
  | 'EVENT_ID_DESC'
  | 'NATURAL'
  | 'PRIMARY_KEY_ASC'
  | 'PRIMARY_KEY_DESC';

/** A filter to be used against `AcalaEvmExecuted` object types. All fields are combined with a logical ‘and.’ */
export type AcalaEvmExecutedFilter = {
  /** Checks for all expressions in this list. */
  and?: InputMaybe<Array<AcalaEvmExecutedFilter>>;
  /** Filter by the object’s `contract` field. */
  contract?: InputMaybe<StringFilter>;
  /** Filter by the object’s `eventId` field. */
  eventId?: InputMaybe<StringFilter>;
  /** Negates the expression. */
  not?: InputMaybe<AcalaEvmExecutedFilter>;
  /** Checks for any expressions in this list. */
  or?: InputMaybe<Array<AcalaEvmExecutedFilter>>;
};

/** Grouping methods for `AcalaEvmExecuted` for usage during aggregation. */
export type AcalaEvmExecutedGroupBy =
  | 'CONTRACT';

/** Conditions for `AcalaEvmExecuted` aggregates. */
export type AcalaEvmExecutedHavingInput = {
  AND?: InputMaybe<Array<AcalaEvmExecutedHavingInput>>;
  OR?: InputMaybe<Array<AcalaEvmExecutedHavingInput>>;
};

export type AcalaEvmExecutedLog = Node & {
  __typename?: 'AcalaEvmExecutedLog';
  contract: Scalars['String']['output'];
  /** Reads a single `Event` that is related to this `AcalaEvmExecutedLog`. */
  eventByEventId: Event;
  eventContract: Scalars['String']['output'];
  eventId: Scalars['String']['output'];
  id: Scalars['String']['output'];
  /** A globally unique identifier. Can be used in various places throughout the system to identify this single value. */
  nodeId: Scalars['ID']['output'];
  topic0?: Maybe<Scalars['String']['output']>;
  topic1?: Maybe<Scalars['String']['output']>;
  topic2?: Maybe<Scalars['String']['output']>;
  topic3?: Maybe<Scalars['String']['output']>;
};

export type AcalaEvmExecutedLogAggregates = {
  __typename?: 'AcalaEvmExecutedLogAggregates';
  /** Distinct count aggregates across the matching connection (ignoring before/after/first/last/offset) */
  distinctCount?: Maybe<AcalaEvmExecutedLogDistinctCountAggregates>;
  keys?: Maybe<Array<Scalars['String']['output']>>;
};

/**
 * A condition to be used against `AcalaEvmExecutedLog` object types. All fields
 * are tested for equality and combined with a logical ‘and.’
 */
export type AcalaEvmExecutedLogCondition = {
  /** Checks for equality with the object’s `contract` field. */
  contract?: InputMaybe<Scalars['String']['input']>;
  /** Checks for equality with the object’s `eventContract` field. */
  eventContract?: InputMaybe<Scalars['String']['input']>;
  /** Checks for equality with the object’s `eventId` field. */
  eventId?: InputMaybe<Scalars['String']['input']>;
  /** Checks for equality with the object’s `id` field. */
  id?: InputMaybe<Scalars['String']['input']>;
  /** Checks for equality with the object’s `topic0` field. */
  topic0?: InputMaybe<Scalars['String']['input']>;
  /** Checks for equality with the object’s `topic1` field. */
  topic1?: InputMaybe<Scalars['String']['input']>;
  /** Checks for equality with the object’s `topic2` field. */
  topic2?: InputMaybe<Scalars['String']['input']>;
  /** Checks for equality with the object’s `topic3` field. */
  topic3?: InputMaybe<Scalars['String']['input']>;
};

export type AcalaEvmExecutedLogDistinctCountAggregates = {
  __typename?: 'AcalaEvmExecutedLogDistinctCountAggregates';
  /** Distinct count of contract across the matching connection */
  contract?: Maybe<Scalars['BigInt']['output']>;
  /** Distinct count of eventContract across the matching connection */
  eventContract?: Maybe<Scalars['BigInt']['output']>;
  /** Distinct count of eventId across the matching connection */
  eventId?: Maybe<Scalars['BigInt']['output']>;
  /** Distinct count of id across the matching connection */
  id?: Maybe<Scalars['BigInt']['output']>;
  /** Distinct count of topic0 across the matching connection */
  topic0?: Maybe<Scalars['BigInt']['output']>;
  /** Distinct count of topic1 across the matching connection */
  topic1?: Maybe<Scalars['BigInt']['output']>;
  /** Distinct count of topic2 across the matching connection */
  topic2?: Maybe<Scalars['BigInt']['output']>;
  /** Distinct count of topic3 across the matching connection */
  topic3?: Maybe<Scalars['BigInt']['output']>;
};

/** A filter to be used against `AcalaEvmExecutedLog` object types. All fields are combined with a logical ‘and.’ */
export type AcalaEvmExecutedLogFilter = {
  /** Checks for all expressions in this list. */
  and?: InputMaybe<Array<AcalaEvmExecutedLogFilter>>;
  /** Filter by the object’s `contract` field. */
  contract?: InputMaybe<StringFilter>;
  /** Filter by the object’s `eventContract` field. */
  eventContract?: InputMaybe<StringFilter>;
  /** Filter by the object’s `eventId` field. */
  eventId?: InputMaybe<StringFilter>;
  /** Filter by the object’s `id` field. */
  id?: InputMaybe<StringFilter>;
  /** Negates the expression. */
  not?: InputMaybe<AcalaEvmExecutedLogFilter>;
  /** Checks for any expressions in this list. */
  or?: InputMaybe<Array<AcalaEvmExecutedLogFilter>>;
  /** Filter by the object’s `topic0` field. */
  topic0?: InputMaybe<StringFilter>;
  /** Filter by the object’s `topic1` field. */
  topic1?: InputMaybe<StringFilter>;
  /** Filter by the object’s `topic2` field. */
  topic2?: InputMaybe<StringFilter>;
  /** Filter by the object’s `topic3` field. */
  topic3?: InputMaybe<StringFilter>;
};

/** Grouping methods for `AcalaEvmExecutedLog` for usage during aggregation. */
export type AcalaEvmExecutedLogGroupBy =
  | 'CONTRACT'
  | 'EVENT_CONTRACT'
  | 'EVENT_ID'
  | 'TOPIC0'
  | 'TOPIC1'
  | 'TOPIC2'
  | 'TOPIC3';

/** Conditions for `AcalaEvmExecutedLog` aggregates. */
export type AcalaEvmExecutedLogHavingInput = {
  AND?: InputMaybe<Array<AcalaEvmExecutedLogHavingInput>>;
  OR?: InputMaybe<Array<AcalaEvmExecutedLogHavingInput>>;
};

/** A connection to a list of `AcalaEvmExecutedLog` values. */
export type AcalaEvmExecutedLogsConnection = {
  __typename?: 'AcalaEvmExecutedLogsConnection';
  /** Aggregates across the matching connection (ignoring before/after/first/last/offset) */
  aggregates?: Maybe<AcalaEvmExecutedLogAggregates>;
  /** A list of edges which contains the `AcalaEvmExecutedLog` and cursor to aid in pagination. */
  edges: Array<AcalaEvmExecutedLogsEdge>;
  /** Grouped aggregates across the matching connection (ignoring before/after/first/last/offset) */
  groupedAggregates?: Maybe<Array<AcalaEvmExecutedLogAggregates>>;
  /** A list of `AcalaEvmExecutedLog` objects. */
  nodes: Array<AcalaEvmExecutedLog>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
  /** The count of *all* `AcalaEvmExecutedLog` you could get from the connection. */
  totalCount: Scalars['Int']['output'];
};


/** A connection to a list of `AcalaEvmExecutedLog` values. */
export type AcalaEvmExecutedLogsConnectionGroupedAggregatesArgs = {
  groupBy: Array<AcalaEvmExecutedLogGroupBy>;
  having?: InputMaybe<AcalaEvmExecutedLogHavingInput>;
};

/** A `AcalaEvmExecutedLog` edge in the connection. */
export type AcalaEvmExecutedLogsEdge = {
  __typename?: 'AcalaEvmExecutedLogsEdge';
  /** A cursor for use in pagination. */
  cursor?: Maybe<Scalars['Cursor']['output']>;
  /** The `AcalaEvmExecutedLog` at the end of the edge. */
  node: AcalaEvmExecutedLog;
};

/** Methods to use when ordering `AcalaEvmExecutedLog`. */
export type AcalaEvmExecutedLogsOrderBy =
  | 'CONTRACT_ASC'
  | 'CONTRACT_DESC'
  | 'EVENT_CONTRACT_ASC'
  | 'EVENT_CONTRACT_DESC'
  | 'EVENT_ID_ASC'
  | 'EVENT_ID_DESC'
  | 'ID_ASC'
  | 'ID_DESC'
  | 'NATURAL'
  | 'PRIMARY_KEY_ASC'
  | 'PRIMARY_KEY_DESC'
  | 'TOPIC0_ASC'
  | 'TOPIC0_DESC'
  | 'TOPIC1_ASC'
  | 'TOPIC1_DESC'
  | 'TOPIC2_ASC'
  | 'TOPIC2_DESC'
  | 'TOPIC3_ASC'
  | 'TOPIC3_DESC';

/** A connection to a list of `AcalaEvmExecuted` values. */
export type AcalaEvmExecutedsConnection = {
  __typename?: 'AcalaEvmExecutedsConnection';
  /** Aggregates across the matching connection (ignoring before/after/first/last/offset) */
  aggregates?: Maybe<AcalaEvmExecutedAggregates>;
  /** A list of edges which contains the `AcalaEvmExecuted` and cursor to aid in pagination. */
  edges: Array<AcalaEvmExecutedsEdge>;
  /** Grouped aggregates across the matching connection (ignoring before/after/first/last/offset) */
  groupedAggregates?: Maybe<Array<AcalaEvmExecutedAggregates>>;
  /** A list of `AcalaEvmExecuted` objects. */
  nodes: Array<AcalaEvmExecuted>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
  /** The count of *all* `AcalaEvmExecuted` you could get from the connection. */
  totalCount: Scalars['Int']['output'];
};


/** A connection to a list of `AcalaEvmExecuted` values. */
export type AcalaEvmExecutedsConnectionGroupedAggregatesArgs = {
  groupBy: Array<AcalaEvmExecutedGroupBy>;
  having?: InputMaybe<AcalaEvmExecutedHavingInput>;
};

/** A `AcalaEvmExecuted` edge in the connection. */
export type AcalaEvmExecutedsEdge = {
  __typename?: 'AcalaEvmExecutedsEdge';
  /** A cursor for use in pagination. */
  cursor?: Maybe<Scalars['Cursor']['output']>;
  /** The `AcalaEvmExecuted` at the end of the edge. */
  node: AcalaEvmExecuted;
};

/** Methods to use when ordering `AcalaEvmExecuted`. */
export type AcalaEvmExecutedsOrderBy =
  | 'CONTRACT_ASC'
  | 'CONTRACT_DESC'
  | 'EVENT_ID_ASC'
  | 'EVENT_ID_DESC'
  | 'NATURAL'
  | 'PRIMARY_KEY_ASC'
  | 'PRIMARY_KEY_DESC';

/** A filter to be used against BigFloat fields. All fields are combined with a logical ‘and.’ */
export type BigFloatFilter = {
  /** Not equal to the specified value, treating null like an ordinary value. */
  distinctFrom?: InputMaybe<Scalars['BigFloat']['input']>;
  /** Equal to the specified value. */
  equalTo?: InputMaybe<Scalars['BigFloat']['input']>;
  /** Greater than the specified value. */
  greaterThan?: InputMaybe<Scalars['BigFloat']['input']>;
  /** Greater than or equal to the specified value. */
  greaterThanOrEqualTo?: InputMaybe<Scalars['BigFloat']['input']>;
  /** Included in the specified list. */
  in?: InputMaybe<Array<Scalars['BigFloat']['input']>>;
  /** Is null (if `true` is specified) or is not null (if `false` is specified). */
  isNull?: InputMaybe<Scalars['Boolean']['input']>;
  /** Less than the specified value. */
  lessThan?: InputMaybe<Scalars['BigFloat']['input']>;
  /** Less than or equal to the specified value. */
  lessThanOrEqualTo?: InputMaybe<Scalars['BigFloat']['input']>;
  /** Equal to the specified value, treating null like an ordinary value. */
  notDistinctFrom?: InputMaybe<Scalars['BigFloat']['input']>;
  /** Not equal to the specified value. */
  notEqualTo?: InputMaybe<Scalars['BigFloat']['input']>;
  /** Not included in the specified list. */
  notIn?: InputMaybe<Array<Scalars['BigFloat']['input']>>;
};

export type Block = Node & {
  __typename?: 'Block';
  /** Reads and enables pagination through a set of `Call`. */
  callsByBlockId: CallsConnection;
  /** Reads and enables pagination through a set of `Event`. */
  eventsByBlockId: EventsConnection;
  /** Reads and enables pagination through a set of `Extrinsic`. */
  extrinsicsByBlockId: ExtrinsicsConnection;
  extrinsicsRoot: Scalars['String']['output'];
  hash: Scalars['String']['output'];
  height: Scalars['Int']['output'];
  id: Scalars['String']['output'];
  /** A globally unique identifier. Can be used in various places throughout the system to identify this single value. */
  nodeId: Scalars['ID']['output'];
  parentHash: Scalars['String']['output'];
  specId: Scalars['String']['output'];
  stateRoot: Scalars['String']['output'];
  timestamp: Scalars['Datetime']['output'];
  validator?: Maybe<Scalars['String']['output']>;
};


export type BlockCallsByBlockIdArgs = {
  after?: InputMaybe<Scalars['Cursor']['input']>;
  before?: InputMaybe<Scalars['Cursor']['input']>;
  condition?: InputMaybe<CallCondition>;
  filter?: InputMaybe<CallFilter>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<CallsOrderBy>>;
};


export type BlockEventsByBlockIdArgs = {
  after?: InputMaybe<Scalars['Cursor']['input']>;
  before?: InputMaybe<Scalars['Cursor']['input']>;
  condition?: InputMaybe<EventCondition>;
  filter?: InputMaybe<EventFilter>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<EventsOrderBy>>;
};


export type BlockExtrinsicsByBlockIdArgs = {
  after?: InputMaybe<Scalars['Cursor']['input']>;
  before?: InputMaybe<Scalars['Cursor']['input']>;
  condition?: InputMaybe<ExtrinsicCondition>;
  filter?: InputMaybe<ExtrinsicFilter>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<ExtrinsicsOrderBy>>;
};

export type BlockAggregates = {
  __typename?: 'BlockAggregates';
  /** Mean average aggregates across the matching connection (ignoring before/after/first/last/offset) */
  average?: Maybe<BlockAverageAggregates>;
  /** Distinct count aggregates across the matching connection (ignoring before/after/first/last/offset) */
  distinctCount?: Maybe<BlockDistinctCountAggregates>;
  keys?: Maybe<Array<Scalars['String']['output']>>;
  /** Maximum aggregates across the matching connection (ignoring before/after/first/last/offset) */
  max?: Maybe<BlockMaxAggregates>;
  /** Minimum aggregates across the matching connection (ignoring before/after/first/last/offset) */
  min?: Maybe<BlockMinAggregates>;
  /** Population standard deviation aggregates across the matching connection (ignoring before/after/first/last/offset) */
  stddevPopulation?: Maybe<BlockStddevPopulationAggregates>;
  /** Sample standard deviation aggregates across the matching connection (ignoring before/after/first/last/offset) */
  stddevSample?: Maybe<BlockStddevSampleAggregates>;
  /** Sum aggregates across the matching connection (ignoring before/after/first/last/offset) */
  sum?: Maybe<BlockSumAggregates>;
  /** Population variance aggregates across the matching connection (ignoring before/after/first/last/offset) */
  variancePopulation?: Maybe<BlockVariancePopulationAggregates>;
  /** Sample variance aggregates across the matching connection (ignoring before/after/first/last/offset) */
  varianceSample?: Maybe<BlockVarianceSampleAggregates>;
};

export type BlockAverageAggregates = {
  __typename?: 'BlockAverageAggregates';
  /** Mean average of height across the matching connection */
  height?: Maybe<Scalars['BigFloat']['output']>;
};

/** A condition to be used against `Block` object types. All fields are tested for equality and combined with a logical ‘and.’ */
export type BlockCondition = {
  /** Checks for equality with the object’s `extrinsicsRoot` field. */
  extrinsicsRoot?: InputMaybe<Scalars['String']['input']>;
  /** Checks for equality with the object’s `hash` field. */
  hash?: InputMaybe<Scalars['String']['input']>;
  /** Checks for equality with the object’s `height` field. */
  height?: InputMaybe<Scalars['Int']['input']>;
  /** Checks for equality with the object’s `id` field. */
  id?: InputMaybe<Scalars['String']['input']>;
  /** Checks for equality with the object’s `parentHash` field. */
  parentHash?: InputMaybe<Scalars['String']['input']>;
  /** Checks for equality with the object’s `specId` field. */
  specId?: InputMaybe<Scalars['String']['input']>;
  /** Checks for equality with the object’s `stateRoot` field. */
  stateRoot?: InputMaybe<Scalars['String']['input']>;
  /** Checks for equality with the object’s `timestamp` field. */
  timestamp?: InputMaybe<Scalars['Datetime']['input']>;
  /** Checks for equality with the object’s `validator` field. */
  validator?: InputMaybe<Scalars['String']['input']>;
};

export type BlockDistinctCountAggregates = {
  __typename?: 'BlockDistinctCountAggregates';
  /** Distinct count of extrinsicsRoot across the matching connection */
  extrinsicsRoot?: Maybe<Scalars['BigInt']['output']>;
  /** Distinct count of hash across the matching connection */
  hash?: Maybe<Scalars['BigInt']['output']>;
  /** Distinct count of height across the matching connection */
  height?: Maybe<Scalars['BigInt']['output']>;
  /** Distinct count of id across the matching connection */
  id?: Maybe<Scalars['BigInt']['output']>;
  /** Distinct count of parentHash across the matching connection */
  parentHash?: Maybe<Scalars['BigInt']['output']>;
  /** Distinct count of specId across the matching connection */
  specId?: Maybe<Scalars['BigInt']['output']>;
  /** Distinct count of stateRoot across the matching connection */
  stateRoot?: Maybe<Scalars['BigInt']['output']>;
  /** Distinct count of timestamp across the matching connection */
  timestamp?: Maybe<Scalars['BigInt']['output']>;
  /** Distinct count of validator across the matching connection */
  validator?: Maybe<Scalars['BigInt']['output']>;
};

/** A filter to be used against `Block` object types. All fields are combined with a logical ‘and.’ */
export type BlockFilter = {
  /** Checks for all expressions in this list. */
  and?: InputMaybe<Array<BlockFilter>>;
  /** Filter by the object’s `extrinsicsRoot` field. */
  extrinsicsRoot?: InputMaybe<StringFilter>;
  /** Filter by the object’s `hash` field. */
  hash?: InputMaybe<StringFilter>;
  /** Filter by the object’s `height` field. */
  height?: InputMaybe<IntFilter>;
  /** Filter by the object’s `id` field. */
  id?: InputMaybe<StringFilter>;
  /** Negates the expression. */
  not?: InputMaybe<BlockFilter>;
  /** Checks for any expressions in this list. */
  or?: InputMaybe<Array<BlockFilter>>;
  /** Filter by the object’s `parentHash` field. */
  parentHash?: InputMaybe<StringFilter>;
  /** Filter by the object’s `specId` field. */
  specId?: InputMaybe<StringFilter>;
  /** Filter by the object’s `stateRoot` field. */
  stateRoot?: InputMaybe<StringFilter>;
  /** Filter by the object’s `timestamp` field. */
  timestamp?: InputMaybe<DatetimeFilter>;
  /** Filter by the object’s `validator` field. */
  validator?: InputMaybe<StringFilter>;
};

/** Grouping methods for `Block` for usage during aggregation. */
export type BlockGroupBy =
  | 'EXTRINSICS_ROOT'
  | 'HASH'
  | 'HEIGHT'
  | 'PARENT_HASH'
  | 'SPEC_ID'
  | 'STATE_ROOT'
  | 'TIMESTAMP'
  | 'TIMESTAMP_TRUNCATED_TO_DAY'
  | 'TIMESTAMP_TRUNCATED_TO_HOUR'
  | 'TIMESTAMP_TRUNCATED_TO_MONTH'
  | 'TIMESTAMP_TRUNCATED_TO_WEEK'
  | 'VALIDATOR';

export type BlockHavingAverageInput = {
  height?: InputMaybe<HavingIntFilter>;
  timestamp?: InputMaybe<HavingDatetimeFilter>;
};

export type BlockHavingDistinctCountInput = {
  height?: InputMaybe<HavingIntFilter>;
  timestamp?: InputMaybe<HavingDatetimeFilter>;
};

/** Conditions for `Block` aggregates. */
export type BlockHavingInput = {
  AND?: InputMaybe<Array<BlockHavingInput>>;
  OR?: InputMaybe<Array<BlockHavingInput>>;
  average?: InputMaybe<BlockHavingAverageInput>;
  distinctCount?: InputMaybe<BlockHavingDistinctCountInput>;
  max?: InputMaybe<BlockHavingMaxInput>;
  min?: InputMaybe<BlockHavingMinInput>;
  stddevPopulation?: InputMaybe<BlockHavingStddevPopulationInput>;
  stddevSample?: InputMaybe<BlockHavingStddevSampleInput>;
  sum?: InputMaybe<BlockHavingSumInput>;
  variancePopulation?: InputMaybe<BlockHavingVariancePopulationInput>;
  varianceSample?: InputMaybe<BlockHavingVarianceSampleInput>;
};

export type BlockHavingMaxInput = {
  height?: InputMaybe<HavingIntFilter>;
  timestamp?: InputMaybe<HavingDatetimeFilter>;
};

export type BlockHavingMinInput = {
  height?: InputMaybe<HavingIntFilter>;
  timestamp?: InputMaybe<HavingDatetimeFilter>;
};

export type BlockHavingStddevPopulationInput = {
  height?: InputMaybe<HavingIntFilter>;
  timestamp?: InputMaybe<HavingDatetimeFilter>;
};

export type BlockHavingStddevSampleInput = {
  height?: InputMaybe<HavingIntFilter>;
  timestamp?: InputMaybe<HavingDatetimeFilter>;
};

export type BlockHavingSumInput = {
  height?: InputMaybe<HavingIntFilter>;
  timestamp?: InputMaybe<HavingDatetimeFilter>;
};

export type BlockHavingVariancePopulationInput = {
  height?: InputMaybe<HavingIntFilter>;
  timestamp?: InputMaybe<HavingDatetimeFilter>;
};

export type BlockHavingVarianceSampleInput = {
  height?: InputMaybe<HavingIntFilter>;
  timestamp?: InputMaybe<HavingDatetimeFilter>;
};

export type BlockMaxAggregates = {
  __typename?: 'BlockMaxAggregates';
  /** Maximum of height across the matching connection */
  height?: Maybe<Scalars['Int']['output']>;
  /** Maximum of timestamp across the matching connection */
  timestamp?: Maybe<Scalars['Datetime']['output']>;
};

export type BlockMinAggregates = {
  __typename?: 'BlockMinAggregates';
  /** Minimum of height across the matching connection */
  height?: Maybe<Scalars['Int']['output']>;
  /** Minimum of timestamp across the matching connection */
  timestamp?: Maybe<Scalars['Datetime']['output']>;
};

export type BlockStddevPopulationAggregates = {
  __typename?: 'BlockStddevPopulationAggregates';
  /** Population standard deviation of height across the matching connection */
  height?: Maybe<Scalars['BigFloat']['output']>;
};

export type BlockStddevSampleAggregates = {
  __typename?: 'BlockStddevSampleAggregates';
  /** Sample standard deviation of height across the matching connection */
  height?: Maybe<Scalars['BigFloat']['output']>;
};

export type BlockSumAggregates = {
  __typename?: 'BlockSumAggregates';
  /** Sum of height across the matching connection */
  height: Scalars['BigInt']['output'];
};

export type BlockVariancePopulationAggregates = {
  __typename?: 'BlockVariancePopulationAggregates';
  /** Population variance of height across the matching connection */
  height?: Maybe<Scalars['BigFloat']['output']>;
};

export type BlockVarianceSampleAggregates = {
  __typename?: 'BlockVarianceSampleAggregates';
  /** Sample variance of height across the matching connection */
  height?: Maybe<Scalars['BigFloat']['output']>;
};

/** A connection to a list of `Block` values. */
export type BlocksConnection = {
  __typename?: 'BlocksConnection';
  /** Aggregates across the matching connection (ignoring before/after/first/last/offset) */
  aggregates?: Maybe<BlockAggregates>;
  /** A list of edges which contains the `Block` and cursor to aid in pagination. */
  edges: Array<BlocksEdge>;
  /** Grouped aggregates across the matching connection (ignoring before/after/first/last/offset) */
  groupedAggregates?: Maybe<Array<BlockAggregates>>;
  /** A list of `Block` objects. */
  nodes: Array<Block>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
  /** The count of *all* `Block` you could get from the connection. */
  totalCount: Scalars['Int']['output'];
};


/** A connection to a list of `Block` values. */
export type BlocksConnectionGroupedAggregatesArgs = {
  groupBy: Array<BlockGroupBy>;
  having?: InputMaybe<BlockHavingInput>;
};

/** A `Block` edge in the connection. */
export type BlocksEdge = {
  __typename?: 'BlocksEdge';
  /** A cursor for use in pagination. */
  cursor?: Maybe<Scalars['Cursor']['output']>;
  /** The `Block` at the end of the edge. */
  node: Block;
};

/** Methods to use when ordering `Block`. */
export type BlocksOrderBy =
  | 'CALLS_BY_BLOCK_ID_AVERAGE_ARGS_ASC'
  | 'CALLS_BY_BLOCK_ID_AVERAGE_ARGS_DESC'
  | 'CALLS_BY_BLOCK_ID_AVERAGE_BLOCK_ID_ASC'
  | 'CALLS_BY_BLOCK_ID_AVERAGE_BLOCK_ID_DESC'
  | 'CALLS_BY_BLOCK_ID_AVERAGE_ERROR_ASC'
  | 'CALLS_BY_BLOCK_ID_AVERAGE_ERROR_DESC'
  | 'CALLS_BY_BLOCK_ID_AVERAGE_EXTRINSIC_ID_ASC'
  | 'CALLS_BY_BLOCK_ID_AVERAGE_EXTRINSIC_ID_DESC'
  | 'CALLS_BY_BLOCK_ID_AVERAGE_ID_ASC'
  | 'CALLS_BY_BLOCK_ID_AVERAGE_ID_DESC'
  | 'CALLS_BY_BLOCK_ID_AVERAGE_NAME_ASC'
  | 'CALLS_BY_BLOCK_ID_AVERAGE_NAME_DESC'
  | 'CALLS_BY_BLOCK_ID_AVERAGE_ORIGIN_ASC'
  | 'CALLS_BY_BLOCK_ID_AVERAGE_ORIGIN_DESC'
  | 'CALLS_BY_BLOCK_ID_AVERAGE_PARENT_ID_ASC'
  | 'CALLS_BY_BLOCK_ID_AVERAGE_PARENT_ID_DESC'
  | 'CALLS_BY_BLOCK_ID_AVERAGE_POS_ASC'
  | 'CALLS_BY_BLOCK_ID_AVERAGE_POS_DESC'
  | 'CALLS_BY_BLOCK_ID_AVERAGE_SUCCESS_ASC'
  | 'CALLS_BY_BLOCK_ID_AVERAGE_SUCCESS_DESC'
  | 'CALLS_BY_BLOCK_ID_COUNT_ASC'
  | 'CALLS_BY_BLOCK_ID_COUNT_DESC'
  | 'CALLS_BY_BLOCK_ID_DISTINCT_COUNT_ARGS_ASC'
  | 'CALLS_BY_BLOCK_ID_DISTINCT_COUNT_ARGS_DESC'
  | 'CALLS_BY_BLOCK_ID_DISTINCT_COUNT_BLOCK_ID_ASC'
  | 'CALLS_BY_BLOCK_ID_DISTINCT_COUNT_BLOCK_ID_DESC'
  | 'CALLS_BY_BLOCK_ID_DISTINCT_COUNT_ERROR_ASC'
  | 'CALLS_BY_BLOCK_ID_DISTINCT_COUNT_ERROR_DESC'
  | 'CALLS_BY_BLOCK_ID_DISTINCT_COUNT_EXTRINSIC_ID_ASC'
  | 'CALLS_BY_BLOCK_ID_DISTINCT_COUNT_EXTRINSIC_ID_DESC'
  | 'CALLS_BY_BLOCK_ID_DISTINCT_COUNT_ID_ASC'
  | 'CALLS_BY_BLOCK_ID_DISTINCT_COUNT_ID_DESC'
  | 'CALLS_BY_BLOCK_ID_DISTINCT_COUNT_NAME_ASC'
  | 'CALLS_BY_BLOCK_ID_DISTINCT_COUNT_NAME_DESC'
  | 'CALLS_BY_BLOCK_ID_DISTINCT_COUNT_ORIGIN_ASC'
  | 'CALLS_BY_BLOCK_ID_DISTINCT_COUNT_ORIGIN_DESC'
  | 'CALLS_BY_BLOCK_ID_DISTINCT_COUNT_PARENT_ID_ASC'
  | 'CALLS_BY_BLOCK_ID_DISTINCT_COUNT_PARENT_ID_DESC'
  | 'CALLS_BY_BLOCK_ID_DISTINCT_COUNT_POS_ASC'
  | 'CALLS_BY_BLOCK_ID_DISTINCT_COUNT_POS_DESC'
  | 'CALLS_BY_BLOCK_ID_DISTINCT_COUNT_SUCCESS_ASC'
  | 'CALLS_BY_BLOCK_ID_DISTINCT_COUNT_SUCCESS_DESC'
  | 'CALLS_BY_BLOCK_ID_MAX_ARGS_ASC'
  | 'CALLS_BY_BLOCK_ID_MAX_ARGS_DESC'
  | 'CALLS_BY_BLOCK_ID_MAX_BLOCK_ID_ASC'
  | 'CALLS_BY_BLOCK_ID_MAX_BLOCK_ID_DESC'
  | 'CALLS_BY_BLOCK_ID_MAX_ERROR_ASC'
  | 'CALLS_BY_BLOCK_ID_MAX_ERROR_DESC'
  | 'CALLS_BY_BLOCK_ID_MAX_EXTRINSIC_ID_ASC'
  | 'CALLS_BY_BLOCK_ID_MAX_EXTRINSIC_ID_DESC'
  | 'CALLS_BY_BLOCK_ID_MAX_ID_ASC'
  | 'CALLS_BY_BLOCK_ID_MAX_ID_DESC'
  | 'CALLS_BY_BLOCK_ID_MAX_NAME_ASC'
  | 'CALLS_BY_BLOCK_ID_MAX_NAME_DESC'
  | 'CALLS_BY_BLOCK_ID_MAX_ORIGIN_ASC'
  | 'CALLS_BY_BLOCK_ID_MAX_ORIGIN_DESC'
  | 'CALLS_BY_BLOCK_ID_MAX_PARENT_ID_ASC'
  | 'CALLS_BY_BLOCK_ID_MAX_PARENT_ID_DESC'
  | 'CALLS_BY_BLOCK_ID_MAX_POS_ASC'
  | 'CALLS_BY_BLOCK_ID_MAX_POS_DESC'
  | 'CALLS_BY_BLOCK_ID_MAX_SUCCESS_ASC'
  | 'CALLS_BY_BLOCK_ID_MAX_SUCCESS_DESC'
  | 'CALLS_BY_BLOCK_ID_MIN_ARGS_ASC'
  | 'CALLS_BY_BLOCK_ID_MIN_ARGS_DESC'
  | 'CALLS_BY_BLOCK_ID_MIN_BLOCK_ID_ASC'
  | 'CALLS_BY_BLOCK_ID_MIN_BLOCK_ID_DESC'
  | 'CALLS_BY_BLOCK_ID_MIN_ERROR_ASC'
  | 'CALLS_BY_BLOCK_ID_MIN_ERROR_DESC'
  | 'CALLS_BY_BLOCK_ID_MIN_EXTRINSIC_ID_ASC'
  | 'CALLS_BY_BLOCK_ID_MIN_EXTRINSIC_ID_DESC'
  | 'CALLS_BY_BLOCK_ID_MIN_ID_ASC'
  | 'CALLS_BY_BLOCK_ID_MIN_ID_DESC'
  | 'CALLS_BY_BLOCK_ID_MIN_NAME_ASC'
  | 'CALLS_BY_BLOCK_ID_MIN_NAME_DESC'
  | 'CALLS_BY_BLOCK_ID_MIN_ORIGIN_ASC'
  | 'CALLS_BY_BLOCK_ID_MIN_ORIGIN_DESC'
  | 'CALLS_BY_BLOCK_ID_MIN_PARENT_ID_ASC'
  | 'CALLS_BY_BLOCK_ID_MIN_PARENT_ID_DESC'
  | 'CALLS_BY_BLOCK_ID_MIN_POS_ASC'
  | 'CALLS_BY_BLOCK_ID_MIN_POS_DESC'
  | 'CALLS_BY_BLOCK_ID_MIN_SUCCESS_ASC'
  | 'CALLS_BY_BLOCK_ID_MIN_SUCCESS_DESC'
  | 'CALLS_BY_BLOCK_ID_STDDEV_POPULATION_ARGS_ASC'
  | 'CALLS_BY_BLOCK_ID_STDDEV_POPULATION_ARGS_DESC'
  | 'CALLS_BY_BLOCK_ID_STDDEV_POPULATION_BLOCK_ID_ASC'
  | 'CALLS_BY_BLOCK_ID_STDDEV_POPULATION_BLOCK_ID_DESC'
  | 'CALLS_BY_BLOCK_ID_STDDEV_POPULATION_ERROR_ASC'
  | 'CALLS_BY_BLOCK_ID_STDDEV_POPULATION_ERROR_DESC'
  | 'CALLS_BY_BLOCK_ID_STDDEV_POPULATION_EXTRINSIC_ID_ASC'
  | 'CALLS_BY_BLOCK_ID_STDDEV_POPULATION_EXTRINSIC_ID_DESC'
  | 'CALLS_BY_BLOCK_ID_STDDEV_POPULATION_ID_ASC'
  | 'CALLS_BY_BLOCK_ID_STDDEV_POPULATION_ID_DESC'
  | 'CALLS_BY_BLOCK_ID_STDDEV_POPULATION_NAME_ASC'
  | 'CALLS_BY_BLOCK_ID_STDDEV_POPULATION_NAME_DESC'
  | 'CALLS_BY_BLOCK_ID_STDDEV_POPULATION_ORIGIN_ASC'
  | 'CALLS_BY_BLOCK_ID_STDDEV_POPULATION_ORIGIN_DESC'
  | 'CALLS_BY_BLOCK_ID_STDDEV_POPULATION_PARENT_ID_ASC'
  | 'CALLS_BY_BLOCK_ID_STDDEV_POPULATION_PARENT_ID_DESC'
  | 'CALLS_BY_BLOCK_ID_STDDEV_POPULATION_POS_ASC'
  | 'CALLS_BY_BLOCK_ID_STDDEV_POPULATION_POS_DESC'
  | 'CALLS_BY_BLOCK_ID_STDDEV_POPULATION_SUCCESS_ASC'
  | 'CALLS_BY_BLOCK_ID_STDDEV_POPULATION_SUCCESS_DESC'
  | 'CALLS_BY_BLOCK_ID_STDDEV_SAMPLE_ARGS_ASC'
  | 'CALLS_BY_BLOCK_ID_STDDEV_SAMPLE_ARGS_DESC'
  | 'CALLS_BY_BLOCK_ID_STDDEV_SAMPLE_BLOCK_ID_ASC'
  | 'CALLS_BY_BLOCK_ID_STDDEV_SAMPLE_BLOCK_ID_DESC'
  | 'CALLS_BY_BLOCK_ID_STDDEV_SAMPLE_ERROR_ASC'
  | 'CALLS_BY_BLOCK_ID_STDDEV_SAMPLE_ERROR_DESC'
  | 'CALLS_BY_BLOCK_ID_STDDEV_SAMPLE_EXTRINSIC_ID_ASC'
  | 'CALLS_BY_BLOCK_ID_STDDEV_SAMPLE_EXTRINSIC_ID_DESC'
  | 'CALLS_BY_BLOCK_ID_STDDEV_SAMPLE_ID_ASC'
  | 'CALLS_BY_BLOCK_ID_STDDEV_SAMPLE_ID_DESC'
  | 'CALLS_BY_BLOCK_ID_STDDEV_SAMPLE_NAME_ASC'
  | 'CALLS_BY_BLOCK_ID_STDDEV_SAMPLE_NAME_DESC'
  | 'CALLS_BY_BLOCK_ID_STDDEV_SAMPLE_ORIGIN_ASC'
  | 'CALLS_BY_BLOCK_ID_STDDEV_SAMPLE_ORIGIN_DESC'
  | 'CALLS_BY_BLOCK_ID_STDDEV_SAMPLE_PARENT_ID_ASC'
  | 'CALLS_BY_BLOCK_ID_STDDEV_SAMPLE_PARENT_ID_DESC'
  | 'CALLS_BY_BLOCK_ID_STDDEV_SAMPLE_POS_ASC'
  | 'CALLS_BY_BLOCK_ID_STDDEV_SAMPLE_POS_DESC'
  | 'CALLS_BY_BLOCK_ID_STDDEV_SAMPLE_SUCCESS_ASC'
  | 'CALLS_BY_BLOCK_ID_STDDEV_SAMPLE_SUCCESS_DESC'
  | 'CALLS_BY_BLOCK_ID_SUM_ARGS_ASC'
  | 'CALLS_BY_BLOCK_ID_SUM_ARGS_DESC'
  | 'CALLS_BY_BLOCK_ID_SUM_BLOCK_ID_ASC'
  | 'CALLS_BY_BLOCK_ID_SUM_BLOCK_ID_DESC'
  | 'CALLS_BY_BLOCK_ID_SUM_ERROR_ASC'
  | 'CALLS_BY_BLOCK_ID_SUM_ERROR_DESC'
  | 'CALLS_BY_BLOCK_ID_SUM_EXTRINSIC_ID_ASC'
  | 'CALLS_BY_BLOCK_ID_SUM_EXTRINSIC_ID_DESC'
  | 'CALLS_BY_BLOCK_ID_SUM_ID_ASC'
  | 'CALLS_BY_BLOCK_ID_SUM_ID_DESC'
  | 'CALLS_BY_BLOCK_ID_SUM_NAME_ASC'
  | 'CALLS_BY_BLOCK_ID_SUM_NAME_DESC'
  | 'CALLS_BY_BLOCK_ID_SUM_ORIGIN_ASC'
  | 'CALLS_BY_BLOCK_ID_SUM_ORIGIN_DESC'
  | 'CALLS_BY_BLOCK_ID_SUM_PARENT_ID_ASC'
  | 'CALLS_BY_BLOCK_ID_SUM_PARENT_ID_DESC'
  | 'CALLS_BY_BLOCK_ID_SUM_POS_ASC'
  | 'CALLS_BY_BLOCK_ID_SUM_POS_DESC'
  | 'CALLS_BY_BLOCK_ID_SUM_SUCCESS_ASC'
  | 'CALLS_BY_BLOCK_ID_SUM_SUCCESS_DESC'
  | 'CALLS_BY_BLOCK_ID_VARIANCE_POPULATION_ARGS_ASC'
  | 'CALLS_BY_BLOCK_ID_VARIANCE_POPULATION_ARGS_DESC'
  | 'CALLS_BY_BLOCK_ID_VARIANCE_POPULATION_BLOCK_ID_ASC'
  | 'CALLS_BY_BLOCK_ID_VARIANCE_POPULATION_BLOCK_ID_DESC'
  | 'CALLS_BY_BLOCK_ID_VARIANCE_POPULATION_ERROR_ASC'
  | 'CALLS_BY_BLOCK_ID_VARIANCE_POPULATION_ERROR_DESC'
  | 'CALLS_BY_BLOCK_ID_VARIANCE_POPULATION_EXTRINSIC_ID_ASC'
  | 'CALLS_BY_BLOCK_ID_VARIANCE_POPULATION_EXTRINSIC_ID_DESC'
  | 'CALLS_BY_BLOCK_ID_VARIANCE_POPULATION_ID_ASC'
  | 'CALLS_BY_BLOCK_ID_VARIANCE_POPULATION_ID_DESC'
  | 'CALLS_BY_BLOCK_ID_VARIANCE_POPULATION_NAME_ASC'
  | 'CALLS_BY_BLOCK_ID_VARIANCE_POPULATION_NAME_DESC'
  | 'CALLS_BY_BLOCK_ID_VARIANCE_POPULATION_ORIGIN_ASC'
  | 'CALLS_BY_BLOCK_ID_VARIANCE_POPULATION_ORIGIN_DESC'
  | 'CALLS_BY_BLOCK_ID_VARIANCE_POPULATION_PARENT_ID_ASC'
  | 'CALLS_BY_BLOCK_ID_VARIANCE_POPULATION_PARENT_ID_DESC'
  | 'CALLS_BY_BLOCK_ID_VARIANCE_POPULATION_POS_ASC'
  | 'CALLS_BY_BLOCK_ID_VARIANCE_POPULATION_POS_DESC'
  | 'CALLS_BY_BLOCK_ID_VARIANCE_POPULATION_SUCCESS_ASC'
  | 'CALLS_BY_BLOCK_ID_VARIANCE_POPULATION_SUCCESS_DESC'
  | 'CALLS_BY_BLOCK_ID_VARIANCE_SAMPLE_ARGS_ASC'
  | 'CALLS_BY_BLOCK_ID_VARIANCE_SAMPLE_ARGS_DESC'
  | 'CALLS_BY_BLOCK_ID_VARIANCE_SAMPLE_BLOCK_ID_ASC'
  | 'CALLS_BY_BLOCK_ID_VARIANCE_SAMPLE_BLOCK_ID_DESC'
  | 'CALLS_BY_BLOCK_ID_VARIANCE_SAMPLE_ERROR_ASC'
  | 'CALLS_BY_BLOCK_ID_VARIANCE_SAMPLE_ERROR_DESC'
  | 'CALLS_BY_BLOCK_ID_VARIANCE_SAMPLE_EXTRINSIC_ID_ASC'
  | 'CALLS_BY_BLOCK_ID_VARIANCE_SAMPLE_EXTRINSIC_ID_DESC'
  | 'CALLS_BY_BLOCK_ID_VARIANCE_SAMPLE_ID_ASC'
  | 'CALLS_BY_BLOCK_ID_VARIANCE_SAMPLE_ID_DESC'
  | 'CALLS_BY_BLOCK_ID_VARIANCE_SAMPLE_NAME_ASC'
  | 'CALLS_BY_BLOCK_ID_VARIANCE_SAMPLE_NAME_DESC'
  | 'CALLS_BY_BLOCK_ID_VARIANCE_SAMPLE_ORIGIN_ASC'
  | 'CALLS_BY_BLOCK_ID_VARIANCE_SAMPLE_ORIGIN_DESC'
  | 'CALLS_BY_BLOCK_ID_VARIANCE_SAMPLE_PARENT_ID_ASC'
  | 'CALLS_BY_BLOCK_ID_VARIANCE_SAMPLE_PARENT_ID_DESC'
  | 'CALLS_BY_BLOCK_ID_VARIANCE_SAMPLE_POS_ASC'
  | 'CALLS_BY_BLOCK_ID_VARIANCE_SAMPLE_POS_DESC'
  | 'CALLS_BY_BLOCK_ID_VARIANCE_SAMPLE_SUCCESS_ASC'
  | 'CALLS_BY_BLOCK_ID_VARIANCE_SAMPLE_SUCCESS_DESC'
  | 'EVENTS_BY_BLOCK_ID_AVERAGE_ARGS_ASC'
  | 'EVENTS_BY_BLOCK_ID_AVERAGE_ARGS_DESC'
  | 'EVENTS_BY_BLOCK_ID_AVERAGE_BLOCK_ID_ASC'
  | 'EVENTS_BY_BLOCK_ID_AVERAGE_BLOCK_ID_DESC'
  | 'EVENTS_BY_BLOCK_ID_AVERAGE_CALL_ID_ASC'
  | 'EVENTS_BY_BLOCK_ID_AVERAGE_CALL_ID_DESC'
  | 'EVENTS_BY_BLOCK_ID_AVERAGE_EXTRINSIC_ID_ASC'
  | 'EVENTS_BY_BLOCK_ID_AVERAGE_EXTRINSIC_ID_DESC'
  | 'EVENTS_BY_BLOCK_ID_AVERAGE_ID_ASC'
  | 'EVENTS_BY_BLOCK_ID_AVERAGE_ID_DESC'
  | 'EVENTS_BY_BLOCK_ID_AVERAGE_INDEX_IN_BLOCK_ASC'
  | 'EVENTS_BY_BLOCK_ID_AVERAGE_INDEX_IN_BLOCK_DESC'
  | 'EVENTS_BY_BLOCK_ID_AVERAGE_NAME_ASC'
  | 'EVENTS_BY_BLOCK_ID_AVERAGE_NAME_DESC'
  | 'EVENTS_BY_BLOCK_ID_AVERAGE_PHASE_ASC'
  | 'EVENTS_BY_BLOCK_ID_AVERAGE_PHASE_DESC'
  | 'EVENTS_BY_BLOCK_ID_AVERAGE_POS_ASC'
  | 'EVENTS_BY_BLOCK_ID_AVERAGE_POS_DESC'
  | 'EVENTS_BY_BLOCK_ID_COUNT_ASC'
  | 'EVENTS_BY_BLOCK_ID_COUNT_DESC'
  | 'EVENTS_BY_BLOCK_ID_DISTINCT_COUNT_ARGS_ASC'
  | 'EVENTS_BY_BLOCK_ID_DISTINCT_COUNT_ARGS_DESC'
  | 'EVENTS_BY_BLOCK_ID_DISTINCT_COUNT_BLOCK_ID_ASC'
  | 'EVENTS_BY_BLOCK_ID_DISTINCT_COUNT_BLOCK_ID_DESC'
  | 'EVENTS_BY_BLOCK_ID_DISTINCT_COUNT_CALL_ID_ASC'
  | 'EVENTS_BY_BLOCK_ID_DISTINCT_COUNT_CALL_ID_DESC'
  | 'EVENTS_BY_BLOCK_ID_DISTINCT_COUNT_EXTRINSIC_ID_ASC'
  | 'EVENTS_BY_BLOCK_ID_DISTINCT_COUNT_EXTRINSIC_ID_DESC'
  | 'EVENTS_BY_BLOCK_ID_DISTINCT_COUNT_ID_ASC'
  | 'EVENTS_BY_BLOCK_ID_DISTINCT_COUNT_ID_DESC'
  | 'EVENTS_BY_BLOCK_ID_DISTINCT_COUNT_INDEX_IN_BLOCK_ASC'
  | 'EVENTS_BY_BLOCK_ID_DISTINCT_COUNT_INDEX_IN_BLOCK_DESC'
  | 'EVENTS_BY_BLOCK_ID_DISTINCT_COUNT_NAME_ASC'
  | 'EVENTS_BY_BLOCK_ID_DISTINCT_COUNT_NAME_DESC'
  | 'EVENTS_BY_BLOCK_ID_DISTINCT_COUNT_PHASE_ASC'
  | 'EVENTS_BY_BLOCK_ID_DISTINCT_COUNT_PHASE_DESC'
  | 'EVENTS_BY_BLOCK_ID_DISTINCT_COUNT_POS_ASC'
  | 'EVENTS_BY_BLOCK_ID_DISTINCT_COUNT_POS_DESC'
  | 'EVENTS_BY_BLOCK_ID_MAX_ARGS_ASC'
  | 'EVENTS_BY_BLOCK_ID_MAX_ARGS_DESC'
  | 'EVENTS_BY_BLOCK_ID_MAX_BLOCK_ID_ASC'
  | 'EVENTS_BY_BLOCK_ID_MAX_BLOCK_ID_DESC'
  | 'EVENTS_BY_BLOCK_ID_MAX_CALL_ID_ASC'
  | 'EVENTS_BY_BLOCK_ID_MAX_CALL_ID_DESC'
  | 'EVENTS_BY_BLOCK_ID_MAX_EXTRINSIC_ID_ASC'
  | 'EVENTS_BY_BLOCK_ID_MAX_EXTRINSIC_ID_DESC'
  | 'EVENTS_BY_BLOCK_ID_MAX_ID_ASC'
  | 'EVENTS_BY_BLOCK_ID_MAX_ID_DESC'
  | 'EVENTS_BY_BLOCK_ID_MAX_INDEX_IN_BLOCK_ASC'
  | 'EVENTS_BY_BLOCK_ID_MAX_INDEX_IN_BLOCK_DESC'
  | 'EVENTS_BY_BLOCK_ID_MAX_NAME_ASC'
  | 'EVENTS_BY_BLOCK_ID_MAX_NAME_DESC'
  | 'EVENTS_BY_BLOCK_ID_MAX_PHASE_ASC'
  | 'EVENTS_BY_BLOCK_ID_MAX_PHASE_DESC'
  | 'EVENTS_BY_BLOCK_ID_MAX_POS_ASC'
  | 'EVENTS_BY_BLOCK_ID_MAX_POS_DESC'
  | 'EVENTS_BY_BLOCK_ID_MIN_ARGS_ASC'
  | 'EVENTS_BY_BLOCK_ID_MIN_ARGS_DESC'
  | 'EVENTS_BY_BLOCK_ID_MIN_BLOCK_ID_ASC'
  | 'EVENTS_BY_BLOCK_ID_MIN_BLOCK_ID_DESC'
  | 'EVENTS_BY_BLOCK_ID_MIN_CALL_ID_ASC'
  | 'EVENTS_BY_BLOCK_ID_MIN_CALL_ID_DESC'
  | 'EVENTS_BY_BLOCK_ID_MIN_EXTRINSIC_ID_ASC'
  | 'EVENTS_BY_BLOCK_ID_MIN_EXTRINSIC_ID_DESC'
  | 'EVENTS_BY_BLOCK_ID_MIN_ID_ASC'
  | 'EVENTS_BY_BLOCK_ID_MIN_ID_DESC'
  | 'EVENTS_BY_BLOCK_ID_MIN_INDEX_IN_BLOCK_ASC'
  | 'EVENTS_BY_BLOCK_ID_MIN_INDEX_IN_BLOCK_DESC'
  | 'EVENTS_BY_BLOCK_ID_MIN_NAME_ASC'
  | 'EVENTS_BY_BLOCK_ID_MIN_NAME_DESC'
  | 'EVENTS_BY_BLOCK_ID_MIN_PHASE_ASC'
  | 'EVENTS_BY_BLOCK_ID_MIN_PHASE_DESC'
  | 'EVENTS_BY_BLOCK_ID_MIN_POS_ASC'
  | 'EVENTS_BY_BLOCK_ID_MIN_POS_DESC'
  | 'EVENTS_BY_BLOCK_ID_STDDEV_POPULATION_ARGS_ASC'
  | 'EVENTS_BY_BLOCK_ID_STDDEV_POPULATION_ARGS_DESC'
  | 'EVENTS_BY_BLOCK_ID_STDDEV_POPULATION_BLOCK_ID_ASC'
  | 'EVENTS_BY_BLOCK_ID_STDDEV_POPULATION_BLOCK_ID_DESC'
  | 'EVENTS_BY_BLOCK_ID_STDDEV_POPULATION_CALL_ID_ASC'
  | 'EVENTS_BY_BLOCK_ID_STDDEV_POPULATION_CALL_ID_DESC'
  | 'EVENTS_BY_BLOCK_ID_STDDEV_POPULATION_EXTRINSIC_ID_ASC'
  | 'EVENTS_BY_BLOCK_ID_STDDEV_POPULATION_EXTRINSIC_ID_DESC'
  | 'EVENTS_BY_BLOCK_ID_STDDEV_POPULATION_ID_ASC'
  | 'EVENTS_BY_BLOCK_ID_STDDEV_POPULATION_ID_DESC'
  | 'EVENTS_BY_BLOCK_ID_STDDEV_POPULATION_INDEX_IN_BLOCK_ASC'
  | 'EVENTS_BY_BLOCK_ID_STDDEV_POPULATION_INDEX_IN_BLOCK_DESC'
  | 'EVENTS_BY_BLOCK_ID_STDDEV_POPULATION_NAME_ASC'
  | 'EVENTS_BY_BLOCK_ID_STDDEV_POPULATION_NAME_DESC'
  | 'EVENTS_BY_BLOCK_ID_STDDEV_POPULATION_PHASE_ASC'
  | 'EVENTS_BY_BLOCK_ID_STDDEV_POPULATION_PHASE_DESC'
  | 'EVENTS_BY_BLOCK_ID_STDDEV_POPULATION_POS_ASC'
  | 'EVENTS_BY_BLOCK_ID_STDDEV_POPULATION_POS_DESC'
  | 'EVENTS_BY_BLOCK_ID_STDDEV_SAMPLE_ARGS_ASC'
  | 'EVENTS_BY_BLOCK_ID_STDDEV_SAMPLE_ARGS_DESC'
  | 'EVENTS_BY_BLOCK_ID_STDDEV_SAMPLE_BLOCK_ID_ASC'
  | 'EVENTS_BY_BLOCK_ID_STDDEV_SAMPLE_BLOCK_ID_DESC'
  | 'EVENTS_BY_BLOCK_ID_STDDEV_SAMPLE_CALL_ID_ASC'
  | 'EVENTS_BY_BLOCK_ID_STDDEV_SAMPLE_CALL_ID_DESC'
  | 'EVENTS_BY_BLOCK_ID_STDDEV_SAMPLE_EXTRINSIC_ID_ASC'
  | 'EVENTS_BY_BLOCK_ID_STDDEV_SAMPLE_EXTRINSIC_ID_DESC'
  | 'EVENTS_BY_BLOCK_ID_STDDEV_SAMPLE_ID_ASC'
  | 'EVENTS_BY_BLOCK_ID_STDDEV_SAMPLE_ID_DESC'
  | 'EVENTS_BY_BLOCK_ID_STDDEV_SAMPLE_INDEX_IN_BLOCK_ASC'
  | 'EVENTS_BY_BLOCK_ID_STDDEV_SAMPLE_INDEX_IN_BLOCK_DESC'
  | 'EVENTS_BY_BLOCK_ID_STDDEV_SAMPLE_NAME_ASC'
  | 'EVENTS_BY_BLOCK_ID_STDDEV_SAMPLE_NAME_DESC'
  | 'EVENTS_BY_BLOCK_ID_STDDEV_SAMPLE_PHASE_ASC'
  | 'EVENTS_BY_BLOCK_ID_STDDEV_SAMPLE_PHASE_DESC'
  | 'EVENTS_BY_BLOCK_ID_STDDEV_SAMPLE_POS_ASC'
  | 'EVENTS_BY_BLOCK_ID_STDDEV_SAMPLE_POS_DESC'
  | 'EVENTS_BY_BLOCK_ID_SUM_ARGS_ASC'
  | 'EVENTS_BY_BLOCK_ID_SUM_ARGS_DESC'
  | 'EVENTS_BY_BLOCK_ID_SUM_BLOCK_ID_ASC'
  | 'EVENTS_BY_BLOCK_ID_SUM_BLOCK_ID_DESC'
  | 'EVENTS_BY_BLOCK_ID_SUM_CALL_ID_ASC'
  | 'EVENTS_BY_BLOCK_ID_SUM_CALL_ID_DESC'
  | 'EVENTS_BY_BLOCK_ID_SUM_EXTRINSIC_ID_ASC'
  | 'EVENTS_BY_BLOCK_ID_SUM_EXTRINSIC_ID_DESC'
  | 'EVENTS_BY_BLOCK_ID_SUM_ID_ASC'
  | 'EVENTS_BY_BLOCK_ID_SUM_ID_DESC'
  | 'EVENTS_BY_BLOCK_ID_SUM_INDEX_IN_BLOCK_ASC'
  | 'EVENTS_BY_BLOCK_ID_SUM_INDEX_IN_BLOCK_DESC'
  | 'EVENTS_BY_BLOCK_ID_SUM_NAME_ASC'
  | 'EVENTS_BY_BLOCK_ID_SUM_NAME_DESC'
  | 'EVENTS_BY_BLOCK_ID_SUM_PHASE_ASC'
  | 'EVENTS_BY_BLOCK_ID_SUM_PHASE_DESC'
  | 'EVENTS_BY_BLOCK_ID_SUM_POS_ASC'
  | 'EVENTS_BY_BLOCK_ID_SUM_POS_DESC'
  | 'EVENTS_BY_BLOCK_ID_VARIANCE_POPULATION_ARGS_ASC'
  | 'EVENTS_BY_BLOCK_ID_VARIANCE_POPULATION_ARGS_DESC'
  | 'EVENTS_BY_BLOCK_ID_VARIANCE_POPULATION_BLOCK_ID_ASC'
  | 'EVENTS_BY_BLOCK_ID_VARIANCE_POPULATION_BLOCK_ID_DESC'
  | 'EVENTS_BY_BLOCK_ID_VARIANCE_POPULATION_CALL_ID_ASC'
  | 'EVENTS_BY_BLOCK_ID_VARIANCE_POPULATION_CALL_ID_DESC'
  | 'EVENTS_BY_BLOCK_ID_VARIANCE_POPULATION_EXTRINSIC_ID_ASC'
  | 'EVENTS_BY_BLOCK_ID_VARIANCE_POPULATION_EXTRINSIC_ID_DESC'
  | 'EVENTS_BY_BLOCK_ID_VARIANCE_POPULATION_ID_ASC'
  | 'EVENTS_BY_BLOCK_ID_VARIANCE_POPULATION_ID_DESC'
  | 'EVENTS_BY_BLOCK_ID_VARIANCE_POPULATION_INDEX_IN_BLOCK_ASC'
  | 'EVENTS_BY_BLOCK_ID_VARIANCE_POPULATION_INDEX_IN_BLOCK_DESC'
  | 'EVENTS_BY_BLOCK_ID_VARIANCE_POPULATION_NAME_ASC'
  | 'EVENTS_BY_BLOCK_ID_VARIANCE_POPULATION_NAME_DESC'
  | 'EVENTS_BY_BLOCK_ID_VARIANCE_POPULATION_PHASE_ASC'
  | 'EVENTS_BY_BLOCK_ID_VARIANCE_POPULATION_PHASE_DESC'
  | 'EVENTS_BY_BLOCK_ID_VARIANCE_POPULATION_POS_ASC'
  | 'EVENTS_BY_BLOCK_ID_VARIANCE_POPULATION_POS_DESC'
  | 'EVENTS_BY_BLOCK_ID_VARIANCE_SAMPLE_ARGS_ASC'
  | 'EVENTS_BY_BLOCK_ID_VARIANCE_SAMPLE_ARGS_DESC'
  | 'EVENTS_BY_BLOCK_ID_VARIANCE_SAMPLE_BLOCK_ID_ASC'
  | 'EVENTS_BY_BLOCK_ID_VARIANCE_SAMPLE_BLOCK_ID_DESC'
  | 'EVENTS_BY_BLOCK_ID_VARIANCE_SAMPLE_CALL_ID_ASC'
  | 'EVENTS_BY_BLOCK_ID_VARIANCE_SAMPLE_CALL_ID_DESC'
  | 'EVENTS_BY_BLOCK_ID_VARIANCE_SAMPLE_EXTRINSIC_ID_ASC'
  | 'EVENTS_BY_BLOCK_ID_VARIANCE_SAMPLE_EXTRINSIC_ID_DESC'
  | 'EVENTS_BY_BLOCK_ID_VARIANCE_SAMPLE_ID_ASC'
  | 'EVENTS_BY_BLOCK_ID_VARIANCE_SAMPLE_ID_DESC'
  | 'EVENTS_BY_BLOCK_ID_VARIANCE_SAMPLE_INDEX_IN_BLOCK_ASC'
  | 'EVENTS_BY_BLOCK_ID_VARIANCE_SAMPLE_INDEX_IN_BLOCK_DESC'
  | 'EVENTS_BY_BLOCK_ID_VARIANCE_SAMPLE_NAME_ASC'
  | 'EVENTS_BY_BLOCK_ID_VARIANCE_SAMPLE_NAME_DESC'
  | 'EVENTS_BY_BLOCK_ID_VARIANCE_SAMPLE_PHASE_ASC'
  | 'EVENTS_BY_BLOCK_ID_VARIANCE_SAMPLE_PHASE_DESC'
  | 'EVENTS_BY_BLOCK_ID_VARIANCE_SAMPLE_POS_ASC'
  | 'EVENTS_BY_BLOCK_ID_VARIANCE_SAMPLE_POS_DESC'
  | 'EXTRINSICS_BY_BLOCK_ID_AVERAGE_BLOCK_ID_ASC'
  | 'EXTRINSICS_BY_BLOCK_ID_AVERAGE_BLOCK_ID_DESC'
  | 'EXTRINSICS_BY_BLOCK_ID_AVERAGE_CALL_ID_ASC'
  | 'EXTRINSICS_BY_BLOCK_ID_AVERAGE_CALL_ID_DESC'
  | 'EXTRINSICS_BY_BLOCK_ID_AVERAGE_ERROR_ASC'
  | 'EXTRINSICS_BY_BLOCK_ID_AVERAGE_ERROR_DESC'
  | 'EXTRINSICS_BY_BLOCK_ID_AVERAGE_FEE_ASC'
  | 'EXTRINSICS_BY_BLOCK_ID_AVERAGE_FEE_DESC'
  | 'EXTRINSICS_BY_BLOCK_ID_AVERAGE_HASH_ASC'
  | 'EXTRINSICS_BY_BLOCK_ID_AVERAGE_HASH_DESC'
  | 'EXTRINSICS_BY_BLOCK_ID_AVERAGE_ID_ASC'
  | 'EXTRINSICS_BY_BLOCK_ID_AVERAGE_ID_DESC'
  | 'EXTRINSICS_BY_BLOCK_ID_AVERAGE_INDEX_IN_BLOCK_ASC'
  | 'EXTRINSICS_BY_BLOCK_ID_AVERAGE_INDEX_IN_BLOCK_DESC'
  | 'EXTRINSICS_BY_BLOCK_ID_AVERAGE_POS_ASC'
  | 'EXTRINSICS_BY_BLOCK_ID_AVERAGE_POS_DESC'
  | 'EXTRINSICS_BY_BLOCK_ID_AVERAGE_SIGNATURE_ASC'
  | 'EXTRINSICS_BY_BLOCK_ID_AVERAGE_SIGNATURE_DESC'
  | 'EXTRINSICS_BY_BLOCK_ID_AVERAGE_SUCCESS_ASC'
  | 'EXTRINSICS_BY_BLOCK_ID_AVERAGE_SUCCESS_DESC'
  | 'EXTRINSICS_BY_BLOCK_ID_AVERAGE_TIP_ASC'
  | 'EXTRINSICS_BY_BLOCK_ID_AVERAGE_TIP_DESC'
  | 'EXTRINSICS_BY_BLOCK_ID_AVERAGE_VERSION_ASC'
  | 'EXTRINSICS_BY_BLOCK_ID_AVERAGE_VERSION_DESC'
  | 'EXTRINSICS_BY_BLOCK_ID_COUNT_ASC'
  | 'EXTRINSICS_BY_BLOCK_ID_COUNT_DESC'
  | 'EXTRINSICS_BY_BLOCK_ID_DISTINCT_COUNT_BLOCK_ID_ASC'
  | 'EXTRINSICS_BY_BLOCK_ID_DISTINCT_COUNT_BLOCK_ID_DESC'
  | 'EXTRINSICS_BY_BLOCK_ID_DISTINCT_COUNT_CALL_ID_ASC'
  | 'EXTRINSICS_BY_BLOCK_ID_DISTINCT_COUNT_CALL_ID_DESC'
  | 'EXTRINSICS_BY_BLOCK_ID_DISTINCT_COUNT_ERROR_ASC'
  | 'EXTRINSICS_BY_BLOCK_ID_DISTINCT_COUNT_ERROR_DESC'
  | 'EXTRINSICS_BY_BLOCK_ID_DISTINCT_COUNT_FEE_ASC'
  | 'EXTRINSICS_BY_BLOCK_ID_DISTINCT_COUNT_FEE_DESC'
  | 'EXTRINSICS_BY_BLOCK_ID_DISTINCT_COUNT_HASH_ASC'
  | 'EXTRINSICS_BY_BLOCK_ID_DISTINCT_COUNT_HASH_DESC'
  | 'EXTRINSICS_BY_BLOCK_ID_DISTINCT_COUNT_ID_ASC'
  | 'EXTRINSICS_BY_BLOCK_ID_DISTINCT_COUNT_ID_DESC'
  | 'EXTRINSICS_BY_BLOCK_ID_DISTINCT_COUNT_INDEX_IN_BLOCK_ASC'
  | 'EXTRINSICS_BY_BLOCK_ID_DISTINCT_COUNT_INDEX_IN_BLOCK_DESC'
  | 'EXTRINSICS_BY_BLOCK_ID_DISTINCT_COUNT_POS_ASC'
  | 'EXTRINSICS_BY_BLOCK_ID_DISTINCT_COUNT_POS_DESC'
  | 'EXTRINSICS_BY_BLOCK_ID_DISTINCT_COUNT_SIGNATURE_ASC'
  | 'EXTRINSICS_BY_BLOCK_ID_DISTINCT_COUNT_SIGNATURE_DESC'
  | 'EXTRINSICS_BY_BLOCK_ID_DISTINCT_COUNT_SUCCESS_ASC'
  | 'EXTRINSICS_BY_BLOCK_ID_DISTINCT_COUNT_SUCCESS_DESC'
  | 'EXTRINSICS_BY_BLOCK_ID_DISTINCT_COUNT_TIP_ASC'
  | 'EXTRINSICS_BY_BLOCK_ID_DISTINCT_COUNT_TIP_DESC'
  | 'EXTRINSICS_BY_BLOCK_ID_DISTINCT_COUNT_VERSION_ASC'
  | 'EXTRINSICS_BY_BLOCK_ID_DISTINCT_COUNT_VERSION_DESC'
  | 'EXTRINSICS_BY_BLOCK_ID_MAX_BLOCK_ID_ASC'
  | 'EXTRINSICS_BY_BLOCK_ID_MAX_BLOCK_ID_DESC'
  | 'EXTRINSICS_BY_BLOCK_ID_MAX_CALL_ID_ASC'
  | 'EXTRINSICS_BY_BLOCK_ID_MAX_CALL_ID_DESC'
  | 'EXTRINSICS_BY_BLOCK_ID_MAX_ERROR_ASC'
  | 'EXTRINSICS_BY_BLOCK_ID_MAX_ERROR_DESC'
  | 'EXTRINSICS_BY_BLOCK_ID_MAX_FEE_ASC'
  | 'EXTRINSICS_BY_BLOCK_ID_MAX_FEE_DESC'
  | 'EXTRINSICS_BY_BLOCK_ID_MAX_HASH_ASC'
  | 'EXTRINSICS_BY_BLOCK_ID_MAX_HASH_DESC'
  | 'EXTRINSICS_BY_BLOCK_ID_MAX_ID_ASC'
  | 'EXTRINSICS_BY_BLOCK_ID_MAX_ID_DESC'
  | 'EXTRINSICS_BY_BLOCK_ID_MAX_INDEX_IN_BLOCK_ASC'
  | 'EXTRINSICS_BY_BLOCK_ID_MAX_INDEX_IN_BLOCK_DESC'
  | 'EXTRINSICS_BY_BLOCK_ID_MAX_POS_ASC'
  | 'EXTRINSICS_BY_BLOCK_ID_MAX_POS_DESC'
  | 'EXTRINSICS_BY_BLOCK_ID_MAX_SIGNATURE_ASC'
  | 'EXTRINSICS_BY_BLOCK_ID_MAX_SIGNATURE_DESC'
  | 'EXTRINSICS_BY_BLOCK_ID_MAX_SUCCESS_ASC'
  | 'EXTRINSICS_BY_BLOCK_ID_MAX_SUCCESS_DESC'
  | 'EXTRINSICS_BY_BLOCK_ID_MAX_TIP_ASC'
  | 'EXTRINSICS_BY_BLOCK_ID_MAX_TIP_DESC'
  | 'EXTRINSICS_BY_BLOCK_ID_MAX_VERSION_ASC'
  | 'EXTRINSICS_BY_BLOCK_ID_MAX_VERSION_DESC'
  | 'EXTRINSICS_BY_BLOCK_ID_MIN_BLOCK_ID_ASC'
  | 'EXTRINSICS_BY_BLOCK_ID_MIN_BLOCK_ID_DESC'
  | 'EXTRINSICS_BY_BLOCK_ID_MIN_CALL_ID_ASC'
  | 'EXTRINSICS_BY_BLOCK_ID_MIN_CALL_ID_DESC'
  | 'EXTRINSICS_BY_BLOCK_ID_MIN_ERROR_ASC'
  | 'EXTRINSICS_BY_BLOCK_ID_MIN_ERROR_DESC'
  | 'EXTRINSICS_BY_BLOCK_ID_MIN_FEE_ASC'
  | 'EXTRINSICS_BY_BLOCK_ID_MIN_FEE_DESC'
  | 'EXTRINSICS_BY_BLOCK_ID_MIN_HASH_ASC'
  | 'EXTRINSICS_BY_BLOCK_ID_MIN_HASH_DESC'
  | 'EXTRINSICS_BY_BLOCK_ID_MIN_ID_ASC'
  | 'EXTRINSICS_BY_BLOCK_ID_MIN_ID_DESC'
  | 'EXTRINSICS_BY_BLOCK_ID_MIN_INDEX_IN_BLOCK_ASC'
  | 'EXTRINSICS_BY_BLOCK_ID_MIN_INDEX_IN_BLOCK_DESC'
  | 'EXTRINSICS_BY_BLOCK_ID_MIN_POS_ASC'
  | 'EXTRINSICS_BY_BLOCK_ID_MIN_POS_DESC'
  | 'EXTRINSICS_BY_BLOCK_ID_MIN_SIGNATURE_ASC'
  | 'EXTRINSICS_BY_BLOCK_ID_MIN_SIGNATURE_DESC'
  | 'EXTRINSICS_BY_BLOCK_ID_MIN_SUCCESS_ASC'
  | 'EXTRINSICS_BY_BLOCK_ID_MIN_SUCCESS_DESC'
  | 'EXTRINSICS_BY_BLOCK_ID_MIN_TIP_ASC'
  | 'EXTRINSICS_BY_BLOCK_ID_MIN_TIP_DESC'
  | 'EXTRINSICS_BY_BLOCK_ID_MIN_VERSION_ASC'
  | 'EXTRINSICS_BY_BLOCK_ID_MIN_VERSION_DESC'
  | 'EXTRINSICS_BY_BLOCK_ID_STDDEV_POPULATION_BLOCK_ID_ASC'
  | 'EXTRINSICS_BY_BLOCK_ID_STDDEV_POPULATION_BLOCK_ID_DESC'
  | 'EXTRINSICS_BY_BLOCK_ID_STDDEV_POPULATION_CALL_ID_ASC'
  | 'EXTRINSICS_BY_BLOCK_ID_STDDEV_POPULATION_CALL_ID_DESC'
  | 'EXTRINSICS_BY_BLOCK_ID_STDDEV_POPULATION_ERROR_ASC'
  | 'EXTRINSICS_BY_BLOCK_ID_STDDEV_POPULATION_ERROR_DESC'
  | 'EXTRINSICS_BY_BLOCK_ID_STDDEV_POPULATION_FEE_ASC'
  | 'EXTRINSICS_BY_BLOCK_ID_STDDEV_POPULATION_FEE_DESC'
  | 'EXTRINSICS_BY_BLOCK_ID_STDDEV_POPULATION_HASH_ASC'
  | 'EXTRINSICS_BY_BLOCK_ID_STDDEV_POPULATION_HASH_DESC'
  | 'EXTRINSICS_BY_BLOCK_ID_STDDEV_POPULATION_ID_ASC'
  | 'EXTRINSICS_BY_BLOCK_ID_STDDEV_POPULATION_ID_DESC'
  | 'EXTRINSICS_BY_BLOCK_ID_STDDEV_POPULATION_INDEX_IN_BLOCK_ASC'
  | 'EXTRINSICS_BY_BLOCK_ID_STDDEV_POPULATION_INDEX_IN_BLOCK_DESC'
  | 'EXTRINSICS_BY_BLOCK_ID_STDDEV_POPULATION_POS_ASC'
  | 'EXTRINSICS_BY_BLOCK_ID_STDDEV_POPULATION_POS_DESC'
  | 'EXTRINSICS_BY_BLOCK_ID_STDDEV_POPULATION_SIGNATURE_ASC'
  | 'EXTRINSICS_BY_BLOCK_ID_STDDEV_POPULATION_SIGNATURE_DESC'
  | 'EXTRINSICS_BY_BLOCK_ID_STDDEV_POPULATION_SUCCESS_ASC'
  | 'EXTRINSICS_BY_BLOCK_ID_STDDEV_POPULATION_SUCCESS_DESC'
  | 'EXTRINSICS_BY_BLOCK_ID_STDDEV_POPULATION_TIP_ASC'
  | 'EXTRINSICS_BY_BLOCK_ID_STDDEV_POPULATION_TIP_DESC'
  | 'EXTRINSICS_BY_BLOCK_ID_STDDEV_POPULATION_VERSION_ASC'
  | 'EXTRINSICS_BY_BLOCK_ID_STDDEV_POPULATION_VERSION_DESC'
  | 'EXTRINSICS_BY_BLOCK_ID_STDDEV_SAMPLE_BLOCK_ID_ASC'
  | 'EXTRINSICS_BY_BLOCK_ID_STDDEV_SAMPLE_BLOCK_ID_DESC'
  | 'EXTRINSICS_BY_BLOCK_ID_STDDEV_SAMPLE_CALL_ID_ASC'
  | 'EXTRINSICS_BY_BLOCK_ID_STDDEV_SAMPLE_CALL_ID_DESC'
  | 'EXTRINSICS_BY_BLOCK_ID_STDDEV_SAMPLE_ERROR_ASC'
  | 'EXTRINSICS_BY_BLOCK_ID_STDDEV_SAMPLE_ERROR_DESC'
  | 'EXTRINSICS_BY_BLOCK_ID_STDDEV_SAMPLE_FEE_ASC'
  | 'EXTRINSICS_BY_BLOCK_ID_STDDEV_SAMPLE_FEE_DESC'
  | 'EXTRINSICS_BY_BLOCK_ID_STDDEV_SAMPLE_HASH_ASC'
  | 'EXTRINSICS_BY_BLOCK_ID_STDDEV_SAMPLE_HASH_DESC'
  | 'EXTRINSICS_BY_BLOCK_ID_STDDEV_SAMPLE_ID_ASC'
  | 'EXTRINSICS_BY_BLOCK_ID_STDDEV_SAMPLE_ID_DESC'
  | 'EXTRINSICS_BY_BLOCK_ID_STDDEV_SAMPLE_INDEX_IN_BLOCK_ASC'
  | 'EXTRINSICS_BY_BLOCK_ID_STDDEV_SAMPLE_INDEX_IN_BLOCK_DESC'
  | 'EXTRINSICS_BY_BLOCK_ID_STDDEV_SAMPLE_POS_ASC'
  | 'EXTRINSICS_BY_BLOCK_ID_STDDEV_SAMPLE_POS_DESC'
  | 'EXTRINSICS_BY_BLOCK_ID_STDDEV_SAMPLE_SIGNATURE_ASC'
  | 'EXTRINSICS_BY_BLOCK_ID_STDDEV_SAMPLE_SIGNATURE_DESC'
  | 'EXTRINSICS_BY_BLOCK_ID_STDDEV_SAMPLE_SUCCESS_ASC'
  | 'EXTRINSICS_BY_BLOCK_ID_STDDEV_SAMPLE_SUCCESS_DESC'
  | 'EXTRINSICS_BY_BLOCK_ID_STDDEV_SAMPLE_TIP_ASC'
  | 'EXTRINSICS_BY_BLOCK_ID_STDDEV_SAMPLE_TIP_DESC'
  | 'EXTRINSICS_BY_BLOCK_ID_STDDEV_SAMPLE_VERSION_ASC'
  | 'EXTRINSICS_BY_BLOCK_ID_STDDEV_SAMPLE_VERSION_DESC'
  | 'EXTRINSICS_BY_BLOCK_ID_SUM_BLOCK_ID_ASC'
  | 'EXTRINSICS_BY_BLOCK_ID_SUM_BLOCK_ID_DESC'
  | 'EXTRINSICS_BY_BLOCK_ID_SUM_CALL_ID_ASC'
  | 'EXTRINSICS_BY_BLOCK_ID_SUM_CALL_ID_DESC'
  | 'EXTRINSICS_BY_BLOCK_ID_SUM_ERROR_ASC'
  | 'EXTRINSICS_BY_BLOCK_ID_SUM_ERROR_DESC'
  | 'EXTRINSICS_BY_BLOCK_ID_SUM_FEE_ASC'
  | 'EXTRINSICS_BY_BLOCK_ID_SUM_FEE_DESC'
  | 'EXTRINSICS_BY_BLOCK_ID_SUM_HASH_ASC'
  | 'EXTRINSICS_BY_BLOCK_ID_SUM_HASH_DESC'
  | 'EXTRINSICS_BY_BLOCK_ID_SUM_ID_ASC'
  | 'EXTRINSICS_BY_BLOCK_ID_SUM_ID_DESC'
  | 'EXTRINSICS_BY_BLOCK_ID_SUM_INDEX_IN_BLOCK_ASC'
  | 'EXTRINSICS_BY_BLOCK_ID_SUM_INDEX_IN_BLOCK_DESC'
  | 'EXTRINSICS_BY_BLOCK_ID_SUM_POS_ASC'
  | 'EXTRINSICS_BY_BLOCK_ID_SUM_POS_DESC'
  | 'EXTRINSICS_BY_BLOCK_ID_SUM_SIGNATURE_ASC'
  | 'EXTRINSICS_BY_BLOCK_ID_SUM_SIGNATURE_DESC'
  | 'EXTRINSICS_BY_BLOCK_ID_SUM_SUCCESS_ASC'
  | 'EXTRINSICS_BY_BLOCK_ID_SUM_SUCCESS_DESC'
  | 'EXTRINSICS_BY_BLOCK_ID_SUM_TIP_ASC'
  | 'EXTRINSICS_BY_BLOCK_ID_SUM_TIP_DESC'
  | 'EXTRINSICS_BY_BLOCK_ID_SUM_VERSION_ASC'
  | 'EXTRINSICS_BY_BLOCK_ID_SUM_VERSION_DESC'
  | 'EXTRINSICS_BY_BLOCK_ID_VARIANCE_POPULATION_BLOCK_ID_ASC'
  | 'EXTRINSICS_BY_BLOCK_ID_VARIANCE_POPULATION_BLOCK_ID_DESC'
  | 'EXTRINSICS_BY_BLOCK_ID_VARIANCE_POPULATION_CALL_ID_ASC'
  | 'EXTRINSICS_BY_BLOCK_ID_VARIANCE_POPULATION_CALL_ID_DESC'
  | 'EXTRINSICS_BY_BLOCK_ID_VARIANCE_POPULATION_ERROR_ASC'
  | 'EXTRINSICS_BY_BLOCK_ID_VARIANCE_POPULATION_ERROR_DESC'
  | 'EXTRINSICS_BY_BLOCK_ID_VARIANCE_POPULATION_FEE_ASC'
  | 'EXTRINSICS_BY_BLOCK_ID_VARIANCE_POPULATION_FEE_DESC'
  | 'EXTRINSICS_BY_BLOCK_ID_VARIANCE_POPULATION_HASH_ASC'
  | 'EXTRINSICS_BY_BLOCK_ID_VARIANCE_POPULATION_HASH_DESC'
  | 'EXTRINSICS_BY_BLOCK_ID_VARIANCE_POPULATION_ID_ASC'
  | 'EXTRINSICS_BY_BLOCK_ID_VARIANCE_POPULATION_ID_DESC'
  | 'EXTRINSICS_BY_BLOCK_ID_VARIANCE_POPULATION_INDEX_IN_BLOCK_ASC'
  | 'EXTRINSICS_BY_BLOCK_ID_VARIANCE_POPULATION_INDEX_IN_BLOCK_DESC'
  | 'EXTRINSICS_BY_BLOCK_ID_VARIANCE_POPULATION_POS_ASC'
  | 'EXTRINSICS_BY_BLOCK_ID_VARIANCE_POPULATION_POS_DESC'
  | 'EXTRINSICS_BY_BLOCK_ID_VARIANCE_POPULATION_SIGNATURE_ASC'
  | 'EXTRINSICS_BY_BLOCK_ID_VARIANCE_POPULATION_SIGNATURE_DESC'
  | 'EXTRINSICS_BY_BLOCK_ID_VARIANCE_POPULATION_SUCCESS_ASC'
  | 'EXTRINSICS_BY_BLOCK_ID_VARIANCE_POPULATION_SUCCESS_DESC'
  | 'EXTRINSICS_BY_BLOCK_ID_VARIANCE_POPULATION_TIP_ASC'
  | 'EXTRINSICS_BY_BLOCK_ID_VARIANCE_POPULATION_TIP_DESC'
  | 'EXTRINSICS_BY_BLOCK_ID_VARIANCE_POPULATION_VERSION_ASC'
  | 'EXTRINSICS_BY_BLOCK_ID_VARIANCE_POPULATION_VERSION_DESC'
  | 'EXTRINSICS_BY_BLOCK_ID_VARIANCE_SAMPLE_BLOCK_ID_ASC'
  | 'EXTRINSICS_BY_BLOCK_ID_VARIANCE_SAMPLE_BLOCK_ID_DESC'
  | 'EXTRINSICS_BY_BLOCK_ID_VARIANCE_SAMPLE_CALL_ID_ASC'
  | 'EXTRINSICS_BY_BLOCK_ID_VARIANCE_SAMPLE_CALL_ID_DESC'
  | 'EXTRINSICS_BY_BLOCK_ID_VARIANCE_SAMPLE_ERROR_ASC'
  | 'EXTRINSICS_BY_BLOCK_ID_VARIANCE_SAMPLE_ERROR_DESC'
  | 'EXTRINSICS_BY_BLOCK_ID_VARIANCE_SAMPLE_FEE_ASC'
  | 'EXTRINSICS_BY_BLOCK_ID_VARIANCE_SAMPLE_FEE_DESC'
  | 'EXTRINSICS_BY_BLOCK_ID_VARIANCE_SAMPLE_HASH_ASC'
  | 'EXTRINSICS_BY_BLOCK_ID_VARIANCE_SAMPLE_HASH_DESC'
  | 'EXTRINSICS_BY_BLOCK_ID_VARIANCE_SAMPLE_ID_ASC'
  | 'EXTRINSICS_BY_BLOCK_ID_VARIANCE_SAMPLE_ID_DESC'
  | 'EXTRINSICS_BY_BLOCK_ID_VARIANCE_SAMPLE_INDEX_IN_BLOCK_ASC'
  | 'EXTRINSICS_BY_BLOCK_ID_VARIANCE_SAMPLE_INDEX_IN_BLOCK_DESC'
  | 'EXTRINSICS_BY_BLOCK_ID_VARIANCE_SAMPLE_POS_ASC'
  | 'EXTRINSICS_BY_BLOCK_ID_VARIANCE_SAMPLE_POS_DESC'
  | 'EXTRINSICS_BY_BLOCK_ID_VARIANCE_SAMPLE_SIGNATURE_ASC'
  | 'EXTRINSICS_BY_BLOCK_ID_VARIANCE_SAMPLE_SIGNATURE_DESC'
  | 'EXTRINSICS_BY_BLOCK_ID_VARIANCE_SAMPLE_SUCCESS_ASC'
  | 'EXTRINSICS_BY_BLOCK_ID_VARIANCE_SAMPLE_SUCCESS_DESC'
  | 'EXTRINSICS_BY_BLOCK_ID_VARIANCE_SAMPLE_TIP_ASC'
  | 'EXTRINSICS_BY_BLOCK_ID_VARIANCE_SAMPLE_TIP_DESC'
  | 'EXTRINSICS_BY_BLOCK_ID_VARIANCE_SAMPLE_VERSION_ASC'
  | 'EXTRINSICS_BY_BLOCK_ID_VARIANCE_SAMPLE_VERSION_DESC'
  | 'EXTRINSICS_ROOT_ASC'
  | 'EXTRINSICS_ROOT_DESC'
  | 'HASH_ASC'
  | 'HASH_DESC'
  | 'HEIGHT_ASC'
  | 'HEIGHT_DESC'
  | 'ID_ASC'
  | 'ID_DESC'
  | 'NATURAL'
  | 'PARENT_HASH_ASC'
  | 'PARENT_HASH_DESC'
  | 'PRIMARY_KEY_ASC'
  | 'PRIMARY_KEY_DESC'
  | 'SPEC_ID_ASC'
  | 'SPEC_ID_DESC'
  | 'STATE_ROOT_ASC'
  | 'STATE_ROOT_DESC'
  | 'TIMESTAMP_ASC'
  | 'TIMESTAMP_DESC'
  | 'VALIDATOR_ASC'
  | 'VALIDATOR_DESC';

/** A filter to be used against Boolean fields. All fields are combined with a logical ‘and.’ */
export type BooleanFilter = {
  /** Not equal to the specified value, treating null like an ordinary value. */
  distinctFrom?: InputMaybe<Scalars['Boolean']['input']>;
  /** Equal to the specified value. */
  equalTo?: InputMaybe<Scalars['Boolean']['input']>;
  /** Greater than the specified value. */
  greaterThan?: InputMaybe<Scalars['Boolean']['input']>;
  /** Greater than or equal to the specified value. */
  greaterThanOrEqualTo?: InputMaybe<Scalars['Boolean']['input']>;
  /** Included in the specified list. */
  in?: InputMaybe<Array<Scalars['Boolean']['input']>>;
  /** Is null (if `true` is specified) or is not null (if `false` is specified). */
  isNull?: InputMaybe<Scalars['Boolean']['input']>;
  /** Less than the specified value. */
  lessThan?: InputMaybe<Scalars['Boolean']['input']>;
  /** Less than or equal to the specified value. */
  lessThanOrEqualTo?: InputMaybe<Scalars['Boolean']['input']>;
  /** Equal to the specified value, treating null like an ordinary value. */
  notDistinctFrom?: InputMaybe<Scalars['Boolean']['input']>;
  /** Not equal to the specified value. */
  notEqualTo?: InputMaybe<Scalars['Boolean']['input']>;
  /** Not included in the specified list. */
  notIn?: InputMaybe<Array<Scalars['Boolean']['input']>>;
};

export type Call = Node & {
  __typename?: 'Call';
  args?: Maybe<Scalars['JSON']['output']>;
  /** Reads a single `Block` that is related to this `Call`. */
  blockByBlockId: Block;
  blockId: Scalars['String']['output'];
  /** Reads a single `Call` that is related to this `Call`. */
  callByParentId?: Maybe<Call>;
  /** Reads and enables pagination through a set of `Call`. */
  callsByParentId: CallsConnection;
  error?: Maybe<Scalars['JSON']['output']>;
  /** Reads and enables pagination through a set of `Event`. */
  eventsByCallId: EventsConnection;
  /** Reads a single `Extrinsic` that is related to this `Call`. */
  extrinsicByExtrinsicId: Extrinsic;
  extrinsicId: Scalars['String']['output'];
  /** Reads a single `FrontierEthereumTransaction` that is related to this `Call`. */
  frontierEthereumTransactionByCallId?: Maybe<FrontierEthereumTransaction>;
  /**
   * Reads and enables pagination through a set of `FrontierEthereumTransaction`.
   * @deprecated Please use frontierEthereumTransactionByCallId instead
   */
  frontierEthereumTransactionsByCallId: FrontierEthereumTransactionsConnection;
  id: Scalars['String']['output'];
  name: Scalars['String']['output'];
  /** A globally unique identifier. Can be used in various places throughout the system to identify this single value. */
  nodeId: Scalars['ID']['output'];
  origin?: Maybe<Scalars['JSON']['output']>;
  parentId?: Maybe<Scalars['String']['output']>;
  pos: Scalars['Int']['output'];
  success: Scalars['Boolean']['output'];
};


export type CallCallsByParentIdArgs = {
  after?: InputMaybe<Scalars['Cursor']['input']>;
  before?: InputMaybe<Scalars['Cursor']['input']>;
  condition?: InputMaybe<CallCondition>;
  filter?: InputMaybe<CallFilter>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<CallsOrderBy>>;
};


export type CallEventsByCallIdArgs = {
  after?: InputMaybe<Scalars['Cursor']['input']>;
  before?: InputMaybe<Scalars['Cursor']['input']>;
  condition?: InputMaybe<EventCondition>;
  filter?: InputMaybe<EventFilter>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<EventsOrderBy>>;
};


export type CallFrontierEthereumTransactionsByCallIdArgs = {
  after?: InputMaybe<Scalars['Cursor']['input']>;
  before?: InputMaybe<Scalars['Cursor']['input']>;
  condition?: InputMaybe<FrontierEthereumTransactionCondition>;
  filter?: InputMaybe<FrontierEthereumTransactionFilter>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<FrontierEthereumTransactionsOrderBy>>;
};

export type CallAggregates = {
  __typename?: 'CallAggregates';
  /** Mean average aggregates across the matching connection (ignoring before/after/first/last/offset) */
  average?: Maybe<CallAverageAggregates>;
  /** Distinct count aggregates across the matching connection (ignoring before/after/first/last/offset) */
  distinctCount?: Maybe<CallDistinctCountAggregates>;
  keys?: Maybe<Array<Scalars['String']['output']>>;
  /** Maximum aggregates across the matching connection (ignoring before/after/first/last/offset) */
  max?: Maybe<CallMaxAggregates>;
  /** Minimum aggregates across the matching connection (ignoring before/after/first/last/offset) */
  min?: Maybe<CallMinAggregates>;
  /** Population standard deviation aggregates across the matching connection (ignoring before/after/first/last/offset) */
  stddevPopulation?: Maybe<CallStddevPopulationAggregates>;
  /** Sample standard deviation aggregates across the matching connection (ignoring before/after/first/last/offset) */
  stddevSample?: Maybe<CallStddevSampleAggregates>;
  /** Sum aggregates across the matching connection (ignoring before/after/first/last/offset) */
  sum?: Maybe<CallSumAggregates>;
  /** Population variance aggregates across the matching connection (ignoring before/after/first/last/offset) */
  variancePopulation?: Maybe<CallVariancePopulationAggregates>;
  /** Sample variance aggregates across the matching connection (ignoring before/after/first/last/offset) */
  varianceSample?: Maybe<CallVarianceSampleAggregates>;
};

export type CallAverageAggregates = {
  __typename?: 'CallAverageAggregates';
  /** Mean average of pos across the matching connection */
  pos?: Maybe<Scalars['BigFloat']['output']>;
};

/** A condition to be used against `Call` object types. All fields are tested for equality and combined with a logical ‘and.’ */
export type CallCondition = {
  /** Checks for equality with the object’s `args` field. */
  args?: InputMaybe<Scalars['JSON']['input']>;
  /** Checks for equality with the object’s `blockId` field. */
  blockId?: InputMaybe<Scalars['String']['input']>;
  /** Checks for equality with the object’s `error` field. */
  error?: InputMaybe<Scalars['JSON']['input']>;
  /** Checks for equality with the object’s `extrinsicId` field. */
  extrinsicId?: InputMaybe<Scalars['String']['input']>;
  /** Checks for equality with the object’s `id` field. */
  id?: InputMaybe<Scalars['String']['input']>;
  /** Checks for equality with the object’s `name` field. */
  name?: InputMaybe<Scalars['String']['input']>;
  /** Checks for equality with the object’s `origin` field. */
  origin?: InputMaybe<Scalars['JSON']['input']>;
  /** Checks for equality with the object’s `parentId` field. */
  parentId?: InputMaybe<Scalars['String']['input']>;
  /** Checks for equality with the object’s `pos` field. */
  pos?: InputMaybe<Scalars['Int']['input']>;
  /** Checks for equality with the object’s `success` field. */
  success?: InputMaybe<Scalars['Boolean']['input']>;
};

export type CallDistinctCountAggregates = {
  __typename?: 'CallDistinctCountAggregates';
  /** Distinct count of args across the matching connection */
  args?: Maybe<Scalars['BigInt']['output']>;
  /** Distinct count of blockId across the matching connection */
  blockId?: Maybe<Scalars['BigInt']['output']>;
  /** Distinct count of error across the matching connection */
  error?: Maybe<Scalars['BigInt']['output']>;
  /** Distinct count of extrinsicId across the matching connection */
  extrinsicId?: Maybe<Scalars['BigInt']['output']>;
  /** Distinct count of id across the matching connection */
  id?: Maybe<Scalars['BigInt']['output']>;
  /** Distinct count of name across the matching connection */
  name?: Maybe<Scalars['BigInt']['output']>;
  /** Distinct count of origin across the matching connection */
  origin?: Maybe<Scalars['BigInt']['output']>;
  /** Distinct count of parentId across the matching connection */
  parentId?: Maybe<Scalars['BigInt']['output']>;
  /** Distinct count of pos across the matching connection */
  pos?: Maybe<Scalars['BigInt']['output']>;
  /** Distinct count of success across the matching connection */
  success?: Maybe<Scalars['BigInt']['output']>;
};

/** A filter to be used against `Call` object types. All fields are combined with a logical ‘and.’ */
export type CallFilter = {
  /** Checks for all expressions in this list. */
  and?: InputMaybe<Array<CallFilter>>;
  /** Filter by the object’s `args` field. */
  args?: InputMaybe<JsonFilter>;
  /** Filter by the object’s `blockId` field. */
  blockId?: InputMaybe<StringFilter>;
  /** Filter by the object’s `error` field. */
  error?: InputMaybe<JsonFilter>;
  /** Filter by the object’s `extrinsicId` field. */
  extrinsicId?: InputMaybe<StringFilter>;
  /** Filter by the object’s `id` field. */
  id?: InputMaybe<StringFilter>;
  /** Filter by the object’s `name` field. */
  name?: InputMaybe<StringFilter>;
  /** Negates the expression. */
  not?: InputMaybe<CallFilter>;
  /** Checks for any expressions in this list. */
  or?: InputMaybe<Array<CallFilter>>;
  /** Filter by the object’s `origin` field. */
  origin?: InputMaybe<JsonFilter>;
  /** Filter by the object’s `parentId` field. */
  parentId?: InputMaybe<StringFilter>;
  /** Filter by the object’s `pos` field. */
  pos?: InputMaybe<IntFilter>;
  /** Filter by the object’s `success` field. */
  success?: InputMaybe<BooleanFilter>;
};

/** Grouping methods for `Call` for usage during aggregation. */
export type CallGroupBy =
  | 'ARGS'
  | 'BLOCK_ID'
  | 'ERROR'
  | 'EXTRINSIC_ID'
  | 'NAME'
  | 'ORIGIN'
  | 'PARENT_ID'
  | 'POS'
  | 'SUCCESS';

export type CallHavingAverageInput = {
  pos?: InputMaybe<HavingIntFilter>;
};

export type CallHavingDistinctCountInput = {
  pos?: InputMaybe<HavingIntFilter>;
};

/** Conditions for `Call` aggregates. */
export type CallHavingInput = {
  AND?: InputMaybe<Array<CallHavingInput>>;
  OR?: InputMaybe<Array<CallHavingInput>>;
  average?: InputMaybe<CallHavingAverageInput>;
  distinctCount?: InputMaybe<CallHavingDistinctCountInput>;
  max?: InputMaybe<CallHavingMaxInput>;
  min?: InputMaybe<CallHavingMinInput>;
  stddevPopulation?: InputMaybe<CallHavingStddevPopulationInput>;
  stddevSample?: InputMaybe<CallHavingStddevSampleInput>;
  sum?: InputMaybe<CallHavingSumInput>;
  variancePopulation?: InputMaybe<CallHavingVariancePopulationInput>;
  varianceSample?: InputMaybe<CallHavingVarianceSampleInput>;
};

export type CallHavingMaxInput = {
  pos?: InputMaybe<HavingIntFilter>;
};

export type CallHavingMinInput = {
  pos?: InputMaybe<HavingIntFilter>;
};

export type CallHavingStddevPopulationInput = {
  pos?: InputMaybe<HavingIntFilter>;
};

export type CallHavingStddevSampleInput = {
  pos?: InputMaybe<HavingIntFilter>;
};

export type CallHavingSumInput = {
  pos?: InputMaybe<HavingIntFilter>;
};

export type CallHavingVariancePopulationInput = {
  pos?: InputMaybe<HavingIntFilter>;
};

export type CallHavingVarianceSampleInput = {
  pos?: InputMaybe<HavingIntFilter>;
};

export type CallMaxAggregates = {
  __typename?: 'CallMaxAggregates';
  /** Maximum of pos across the matching connection */
  pos?: Maybe<Scalars['Int']['output']>;
};

export type CallMinAggregates = {
  __typename?: 'CallMinAggregates';
  /** Minimum of pos across the matching connection */
  pos?: Maybe<Scalars['Int']['output']>;
};

export type CallStddevPopulationAggregates = {
  __typename?: 'CallStddevPopulationAggregates';
  /** Population standard deviation of pos across the matching connection */
  pos?: Maybe<Scalars['BigFloat']['output']>;
};

export type CallStddevSampleAggregates = {
  __typename?: 'CallStddevSampleAggregates';
  /** Sample standard deviation of pos across the matching connection */
  pos?: Maybe<Scalars['BigFloat']['output']>;
};

export type CallSumAggregates = {
  __typename?: 'CallSumAggregates';
  /** Sum of pos across the matching connection */
  pos: Scalars['BigInt']['output'];
};

export type CallVariancePopulationAggregates = {
  __typename?: 'CallVariancePopulationAggregates';
  /** Population variance of pos across the matching connection */
  pos?: Maybe<Scalars['BigFloat']['output']>;
};

export type CallVarianceSampleAggregates = {
  __typename?: 'CallVarianceSampleAggregates';
  /** Sample variance of pos across the matching connection */
  pos?: Maybe<Scalars['BigFloat']['output']>;
};

/** A connection to a list of `Call` values. */
export type CallsConnection = {
  __typename?: 'CallsConnection';
  /** Aggregates across the matching connection (ignoring before/after/first/last/offset) */
  aggregates?: Maybe<CallAggregates>;
  /** A list of edges which contains the `Call` and cursor to aid in pagination. */
  edges: Array<CallsEdge>;
  /** Grouped aggregates across the matching connection (ignoring before/after/first/last/offset) */
  groupedAggregates?: Maybe<Array<CallAggregates>>;
  /** A list of `Call` objects. */
  nodes: Array<Call>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
  /** The count of *all* `Call` you could get from the connection. */
  totalCount: Scalars['Int']['output'];
};


/** A connection to a list of `Call` values. */
export type CallsConnectionGroupedAggregatesArgs = {
  groupBy: Array<CallGroupBy>;
  having?: InputMaybe<CallHavingInput>;
};

/** A `Call` edge in the connection. */
export type CallsEdge = {
  __typename?: 'CallsEdge';
  /** A cursor for use in pagination. */
  cursor?: Maybe<Scalars['Cursor']['output']>;
  /** The `Call` at the end of the edge. */
  node: Call;
};

/** Methods to use when ordering `Call`. */
export type CallsOrderBy =
  | 'ARGS_ASC'
  | 'ARGS_DESC'
  | 'BLOCK_ID_ASC'
  | 'BLOCK_ID_DESC'
  | 'CALLS_BY_PARENT_ID_AVERAGE_ARGS_ASC'
  | 'CALLS_BY_PARENT_ID_AVERAGE_ARGS_DESC'
  | 'CALLS_BY_PARENT_ID_AVERAGE_BLOCK_ID_ASC'
  | 'CALLS_BY_PARENT_ID_AVERAGE_BLOCK_ID_DESC'
  | 'CALLS_BY_PARENT_ID_AVERAGE_ERROR_ASC'
  | 'CALLS_BY_PARENT_ID_AVERAGE_ERROR_DESC'
  | 'CALLS_BY_PARENT_ID_AVERAGE_EXTRINSIC_ID_ASC'
  | 'CALLS_BY_PARENT_ID_AVERAGE_EXTRINSIC_ID_DESC'
  | 'CALLS_BY_PARENT_ID_AVERAGE_ID_ASC'
  | 'CALLS_BY_PARENT_ID_AVERAGE_ID_DESC'
  | 'CALLS_BY_PARENT_ID_AVERAGE_NAME_ASC'
  | 'CALLS_BY_PARENT_ID_AVERAGE_NAME_DESC'
  | 'CALLS_BY_PARENT_ID_AVERAGE_ORIGIN_ASC'
  | 'CALLS_BY_PARENT_ID_AVERAGE_ORIGIN_DESC'
  | 'CALLS_BY_PARENT_ID_AVERAGE_PARENT_ID_ASC'
  | 'CALLS_BY_PARENT_ID_AVERAGE_PARENT_ID_DESC'
  | 'CALLS_BY_PARENT_ID_AVERAGE_POS_ASC'
  | 'CALLS_BY_PARENT_ID_AVERAGE_POS_DESC'
  | 'CALLS_BY_PARENT_ID_AVERAGE_SUCCESS_ASC'
  | 'CALLS_BY_PARENT_ID_AVERAGE_SUCCESS_DESC'
  | 'CALLS_BY_PARENT_ID_COUNT_ASC'
  | 'CALLS_BY_PARENT_ID_COUNT_DESC'
  | 'CALLS_BY_PARENT_ID_DISTINCT_COUNT_ARGS_ASC'
  | 'CALLS_BY_PARENT_ID_DISTINCT_COUNT_ARGS_DESC'
  | 'CALLS_BY_PARENT_ID_DISTINCT_COUNT_BLOCK_ID_ASC'
  | 'CALLS_BY_PARENT_ID_DISTINCT_COUNT_BLOCK_ID_DESC'
  | 'CALLS_BY_PARENT_ID_DISTINCT_COUNT_ERROR_ASC'
  | 'CALLS_BY_PARENT_ID_DISTINCT_COUNT_ERROR_DESC'
  | 'CALLS_BY_PARENT_ID_DISTINCT_COUNT_EXTRINSIC_ID_ASC'
  | 'CALLS_BY_PARENT_ID_DISTINCT_COUNT_EXTRINSIC_ID_DESC'
  | 'CALLS_BY_PARENT_ID_DISTINCT_COUNT_ID_ASC'
  | 'CALLS_BY_PARENT_ID_DISTINCT_COUNT_ID_DESC'
  | 'CALLS_BY_PARENT_ID_DISTINCT_COUNT_NAME_ASC'
  | 'CALLS_BY_PARENT_ID_DISTINCT_COUNT_NAME_DESC'
  | 'CALLS_BY_PARENT_ID_DISTINCT_COUNT_ORIGIN_ASC'
  | 'CALLS_BY_PARENT_ID_DISTINCT_COUNT_ORIGIN_DESC'
  | 'CALLS_BY_PARENT_ID_DISTINCT_COUNT_PARENT_ID_ASC'
  | 'CALLS_BY_PARENT_ID_DISTINCT_COUNT_PARENT_ID_DESC'
  | 'CALLS_BY_PARENT_ID_DISTINCT_COUNT_POS_ASC'
  | 'CALLS_BY_PARENT_ID_DISTINCT_COUNT_POS_DESC'
  | 'CALLS_BY_PARENT_ID_DISTINCT_COUNT_SUCCESS_ASC'
  | 'CALLS_BY_PARENT_ID_DISTINCT_COUNT_SUCCESS_DESC'
  | 'CALLS_BY_PARENT_ID_MAX_ARGS_ASC'
  | 'CALLS_BY_PARENT_ID_MAX_ARGS_DESC'
  | 'CALLS_BY_PARENT_ID_MAX_BLOCK_ID_ASC'
  | 'CALLS_BY_PARENT_ID_MAX_BLOCK_ID_DESC'
  | 'CALLS_BY_PARENT_ID_MAX_ERROR_ASC'
  | 'CALLS_BY_PARENT_ID_MAX_ERROR_DESC'
  | 'CALLS_BY_PARENT_ID_MAX_EXTRINSIC_ID_ASC'
  | 'CALLS_BY_PARENT_ID_MAX_EXTRINSIC_ID_DESC'
  | 'CALLS_BY_PARENT_ID_MAX_ID_ASC'
  | 'CALLS_BY_PARENT_ID_MAX_ID_DESC'
  | 'CALLS_BY_PARENT_ID_MAX_NAME_ASC'
  | 'CALLS_BY_PARENT_ID_MAX_NAME_DESC'
  | 'CALLS_BY_PARENT_ID_MAX_ORIGIN_ASC'
  | 'CALLS_BY_PARENT_ID_MAX_ORIGIN_DESC'
  | 'CALLS_BY_PARENT_ID_MAX_PARENT_ID_ASC'
  | 'CALLS_BY_PARENT_ID_MAX_PARENT_ID_DESC'
  | 'CALLS_BY_PARENT_ID_MAX_POS_ASC'
  | 'CALLS_BY_PARENT_ID_MAX_POS_DESC'
  | 'CALLS_BY_PARENT_ID_MAX_SUCCESS_ASC'
  | 'CALLS_BY_PARENT_ID_MAX_SUCCESS_DESC'
  | 'CALLS_BY_PARENT_ID_MIN_ARGS_ASC'
  | 'CALLS_BY_PARENT_ID_MIN_ARGS_DESC'
  | 'CALLS_BY_PARENT_ID_MIN_BLOCK_ID_ASC'
  | 'CALLS_BY_PARENT_ID_MIN_BLOCK_ID_DESC'
  | 'CALLS_BY_PARENT_ID_MIN_ERROR_ASC'
  | 'CALLS_BY_PARENT_ID_MIN_ERROR_DESC'
  | 'CALLS_BY_PARENT_ID_MIN_EXTRINSIC_ID_ASC'
  | 'CALLS_BY_PARENT_ID_MIN_EXTRINSIC_ID_DESC'
  | 'CALLS_BY_PARENT_ID_MIN_ID_ASC'
  | 'CALLS_BY_PARENT_ID_MIN_ID_DESC'
  | 'CALLS_BY_PARENT_ID_MIN_NAME_ASC'
  | 'CALLS_BY_PARENT_ID_MIN_NAME_DESC'
  | 'CALLS_BY_PARENT_ID_MIN_ORIGIN_ASC'
  | 'CALLS_BY_PARENT_ID_MIN_ORIGIN_DESC'
  | 'CALLS_BY_PARENT_ID_MIN_PARENT_ID_ASC'
  | 'CALLS_BY_PARENT_ID_MIN_PARENT_ID_DESC'
  | 'CALLS_BY_PARENT_ID_MIN_POS_ASC'
  | 'CALLS_BY_PARENT_ID_MIN_POS_DESC'
  | 'CALLS_BY_PARENT_ID_MIN_SUCCESS_ASC'
  | 'CALLS_BY_PARENT_ID_MIN_SUCCESS_DESC'
  | 'CALLS_BY_PARENT_ID_STDDEV_POPULATION_ARGS_ASC'
  | 'CALLS_BY_PARENT_ID_STDDEV_POPULATION_ARGS_DESC'
  | 'CALLS_BY_PARENT_ID_STDDEV_POPULATION_BLOCK_ID_ASC'
  | 'CALLS_BY_PARENT_ID_STDDEV_POPULATION_BLOCK_ID_DESC'
  | 'CALLS_BY_PARENT_ID_STDDEV_POPULATION_ERROR_ASC'
  | 'CALLS_BY_PARENT_ID_STDDEV_POPULATION_ERROR_DESC'
  | 'CALLS_BY_PARENT_ID_STDDEV_POPULATION_EXTRINSIC_ID_ASC'
  | 'CALLS_BY_PARENT_ID_STDDEV_POPULATION_EXTRINSIC_ID_DESC'
  | 'CALLS_BY_PARENT_ID_STDDEV_POPULATION_ID_ASC'
  | 'CALLS_BY_PARENT_ID_STDDEV_POPULATION_ID_DESC'
  | 'CALLS_BY_PARENT_ID_STDDEV_POPULATION_NAME_ASC'
  | 'CALLS_BY_PARENT_ID_STDDEV_POPULATION_NAME_DESC'
  | 'CALLS_BY_PARENT_ID_STDDEV_POPULATION_ORIGIN_ASC'
  | 'CALLS_BY_PARENT_ID_STDDEV_POPULATION_ORIGIN_DESC'
  | 'CALLS_BY_PARENT_ID_STDDEV_POPULATION_PARENT_ID_ASC'
  | 'CALLS_BY_PARENT_ID_STDDEV_POPULATION_PARENT_ID_DESC'
  | 'CALLS_BY_PARENT_ID_STDDEV_POPULATION_POS_ASC'
  | 'CALLS_BY_PARENT_ID_STDDEV_POPULATION_POS_DESC'
  | 'CALLS_BY_PARENT_ID_STDDEV_POPULATION_SUCCESS_ASC'
  | 'CALLS_BY_PARENT_ID_STDDEV_POPULATION_SUCCESS_DESC'
  | 'CALLS_BY_PARENT_ID_STDDEV_SAMPLE_ARGS_ASC'
  | 'CALLS_BY_PARENT_ID_STDDEV_SAMPLE_ARGS_DESC'
  | 'CALLS_BY_PARENT_ID_STDDEV_SAMPLE_BLOCK_ID_ASC'
  | 'CALLS_BY_PARENT_ID_STDDEV_SAMPLE_BLOCK_ID_DESC'
  | 'CALLS_BY_PARENT_ID_STDDEV_SAMPLE_ERROR_ASC'
  | 'CALLS_BY_PARENT_ID_STDDEV_SAMPLE_ERROR_DESC'
  | 'CALLS_BY_PARENT_ID_STDDEV_SAMPLE_EXTRINSIC_ID_ASC'
  | 'CALLS_BY_PARENT_ID_STDDEV_SAMPLE_EXTRINSIC_ID_DESC'
  | 'CALLS_BY_PARENT_ID_STDDEV_SAMPLE_ID_ASC'
  | 'CALLS_BY_PARENT_ID_STDDEV_SAMPLE_ID_DESC'
  | 'CALLS_BY_PARENT_ID_STDDEV_SAMPLE_NAME_ASC'
  | 'CALLS_BY_PARENT_ID_STDDEV_SAMPLE_NAME_DESC'
  | 'CALLS_BY_PARENT_ID_STDDEV_SAMPLE_ORIGIN_ASC'
  | 'CALLS_BY_PARENT_ID_STDDEV_SAMPLE_ORIGIN_DESC'
  | 'CALLS_BY_PARENT_ID_STDDEV_SAMPLE_PARENT_ID_ASC'
  | 'CALLS_BY_PARENT_ID_STDDEV_SAMPLE_PARENT_ID_DESC'
  | 'CALLS_BY_PARENT_ID_STDDEV_SAMPLE_POS_ASC'
  | 'CALLS_BY_PARENT_ID_STDDEV_SAMPLE_POS_DESC'
  | 'CALLS_BY_PARENT_ID_STDDEV_SAMPLE_SUCCESS_ASC'
  | 'CALLS_BY_PARENT_ID_STDDEV_SAMPLE_SUCCESS_DESC'
  | 'CALLS_BY_PARENT_ID_SUM_ARGS_ASC'
  | 'CALLS_BY_PARENT_ID_SUM_ARGS_DESC'
  | 'CALLS_BY_PARENT_ID_SUM_BLOCK_ID_ASC'
  | 'CALLS_BY_PARENT_ID_SUM_BLOCK_ID_DESC'
  | 'CALLS_BY_PARENT_ID_SUM_ERROR_ASC'
  | 'CALLS_BY_PARENT_ID_SUM_ERROR_DESC'
  | 'CALLS_BY_PARENT_ID_SUM_EXTRINSIC_ID_ASC'
  | 'CALLS_BY_PARENT_ID_SUM_EXTRINSIC_ID_DESC'
  | 'CALLS_BY_PARENT_ID_SUM_ID_ASC'
  | 'CALLS_BY_PARENT_ID_SUM_ID_DESC'
  | 'CALLS_BY_PARENT_ID_SUM_NAME_ASC'
  | 'CALLS_BY_PARENT_ID_SUM_NAME_DESC'
  | 'CALLS_BY_PARENT_ID_SUM_ORIGIN_ASC'
  | 'CALLS_BY_PARENT_ID_SUM_ORIGIN_DESC'
  | 'CALLS_BY_PARENT_ID_SUM_PARENT_ID_ASC'
  | 'CALLS_BY_PARENT_ID_SUM_PARENT_ID_DESC'
  | 'CALLS_BY_PARENT_ID_SUM_POS_ASC'
  | 'CALLS_BY_PARENT_ID_SUM_POS_DESC'
  | 'CALLS_BY_PARENT_ID_SUM_SUCCESS_ASC'
  | 'CALLS_BY_PARENT_ID_SUM_SUCCESS_DESC'
  | 'CALLS_BY_PARENT_ID_VARIANCE_POPULATION_ARGS_ASC'
  | 'CALLS_BY_PARENT_ID_VARIANCE_POPULATION_ARGS_DESC'
  | 'CALLS_BY_PARENT_ID_VARIANCE_POPULATION_BLOCK_ID_ASC'
  | 'CALLS_BY_PARENT_ID_VARIANCE_POPULATION_BLOCK_ID_DESC'
  | 'CALLS_BY_PARENT_ID_VARIANCE_POPULATION_ERROR_ASC'
  | 'CALLS_BY_PARENT_ID_VARIANCE_POPULATION_ERROR_DESC'
  | 'CALLS_BY_PARENT_ID_VARIANCE_POPULATION_EXTRINSIC_ID_ASC'
  | 'CALLS_BY_PARENT_ID_VARIANCE_POPULATION_EXTRINSIC_ID_DESC'
  | 'CALLS_BY_PARENT_ID_VARIANCE_POPULATION_ID_ASC'
  | 'CALLS_BY_PARENT_ID_VARIANCE_POPULATION_ID_DESC'
  | 'CALLS_BY_PARENT_ID_VARIANCE_POPULATION_NAME_ASC'
  | 'CALLS_BY_PARENT_ID_VARIANCE_POPULATION_NAME_DESC'
  | 'CALLS_BY_PARENT_ID_VARIANCE_POPULATION_ORIGIN_ASC'
  | 'CALLS_BY_PARENT_ID_VARIANCE_POPULATION_ORIGIN_DESC'
  | 'CALLS_BY_PARENT_ID_VARIANCE_POPULATION_PARENT_ID_ASC'
  | 'CALLS_BY_PARENT_ID_VARIANCE_POPULATION_PARENT_ID_DESC'
  | 'CALLS_BY_PARENT_ID_VARIANCE_POPULATION_POS_ASC'
  | 'CALLS_BY_PARENT_ID_VARIANCE_POPULATION_POS_DESC'
  | 'CALLS_BY_PARENT_ID_VARIANCE_POPULATION_SUCCESS_ASC'
  | 'CALLS_BY_PARENT_ID_VARIANCE_POPULATION_SUCCESS_DESC'
  | 'CALLS_BY_PARENT_ID_VARIANCE_SAMPLE_ARGS_ASC'
  | 'CALLS_BY_PARENT_ID_VARIANCE_SAMPLE_ARGS_DESC'
  | 'CALLS_BY_PARENT_ID_VARIANCE_SAMPLE_BLOCK_ID_ASC'
  | 'CALLS_BY_PARENT_ID_VARIANCE_SAMPLE_BLOCK_ID_DESC'
  | 'CALLS_BY_PARENT_ID_VARIANCE_SAMPLE_ERROR_ASC'
  | 'CALLS_BY_PARENT_ID_VARIANCE_SAMPLE_ERROR_DESC'
  | 'CALLS_BY_PARENT_ID_VARIANCE_SAMPLE_EXTRINSIC_ID_ASC'
  | 'CALLS_BY_PARENT_ID_VARIANCE_SAMPLE_EXTRINSIC_ID_DESC'
  | 'CALLS_BY_PARENT_ID_VARIANCE_SAMPLE_ID_ASC'
  | 'CALLS_BY_PARENT_ID_VARIANCE_SAMPLE_ID_DESC'
  | 'CALLS_BY_PARENT_ID_VARIANCE_SAMPLE_NAME_ASC'
  | 'CALLS_BY_PARENT_ID_VARIANCE_SAMPLE_NAME_DESC'
  | 'CALLS_BY_PARENT_ID_VARIANCE_SAMPLE_ORIGIN_ASC'
  | 'CALLS_BY_PARENT_ID_VARIANCE_SAMPLE_ORIGIN_DESC'
  | 'CALLS_BY_PARENT_ID_VARIANCE_SAMPLE_PARENT_ID_ASC'
  | 'CALLS_BY_PARENT_ID_VARIANCE_SAMPLE_PARENT_ID_DESC'
  | 'CALLS_BY_PARENT_ID_VARIANCE_SAMPLE_POS_ASC'
  | 'CALLS_BY_PARENT_ID_VARIANCE_SAMPLE_POS_DESC'
  | 'CALLS_BY_PARENT_ID_VARIANCE_SAMPLE_SUCCESS_ASC'
  | 'CALLS_BY_PARENT_ID_VARIANCE_SAMPLE_SUCCESS_DESC'
  | 'ERROR_ASC'
  | 'ERROR_DESC'
  | 'EVENTS_BY_CALL_ID_AVERAGE_ARGS_ASC'
  | 'EVENTS_BY_CALL_ID_AVERAGE_ARGS_DESC'
  | 'EVENTS_BY_CALL_ID_AVERAGE_BLOCK_ID_ASC'
  | 'EVENTS_BY_CALL_ID_AVERAGE_BLOCK_ID_DESC'
  | 'EVENTS_BY_CALL_ID_AVERAGE_CALL_ID_ASC'
  | 'EVENTS_BY_CALL_ID_AVERAGE_CALL_ID_DESC'
  | 'EVENTS_BY_CALL_ID_AVERAGE_EXTRINSIC_ID_ASC'
  | 'EVENTS_BY_CALL_ID_AVERAGE_EXTRINSIC_ID_DESC'
  | 'EVENTS_BY_CALL_ID_AVERAGE_ID_ASC'
  | 'EVENTS_BY_CALL_ID_AVERAGE_ID_DESC'
  | 'EVENTS_BY_CALL_ID_AVERAGE_INDEX_IN_BLOCK_ASC'
  | 'EVENTS_BY_CALL_ID_AVERAGE_INDEX_IN_BLOCK_DESC'
  | 'EVENTS_BY_CALL_ID_AVERAGE_NAME_ASC'
  | 'EVENTS_BY_CALL_ID_AVERAGE_NAME_DESC'
  | 'EVENTS_BY_CALL_ID_AVERAGE_PHASE_ASC'
  | 'EVENTS_BY_CALL_ID_AVERAGE_PHASE_DESC'
  | 'EVENTS_BY_CALL_ID_AVERAGE_POS_ASC'
  | 'EVENTS_BY_CALL_ID_AVERAGE_POS_DESC'
  | 'EVENTS_BY_CALL_ID_COUNT_ASC'
  | 'EVENTS_BY_CALL_ID_COUNT_DESC'
  | 'EVENTS_BY_CALL_ID_DISTINCT_COUNT_ARGS_ASC'
  | 'EVENTS_BY_CALL_ID_DISTINCT_COUNT_ARGS_DESC'
  | 'EVENTS_BY_CALL_ID_DISTINCT_COUNT_BLOCK_ID_ASC'
  | 'EVENTS_BY_CALL_ID_DISTINCT_COUNT_BLOCK_ID_DESC'
  | 'EVENTS_BY_CALL_ID_DISTINCT_COUNT_CALL_ID_ASC'
  | 'EVENTS_BY_CALL_ID_DISTINCT_COUNT_CALL_ID_DESC'
  | 'EVENTS_BY_CALL_ID_DISTINCT_COUNT_EXTRINSIC_ID_ASC'
  | 'EVENTS_BY_CALL_ID_DISTINCT_COUNT_EXTRINSIC_ID_DESC'
  | 'EVENTS_BY_CALL_ID_DISTINCT_COUNT_ID_ASC'
  | 'EVENTS_BY_CALL_ID_DISTINCT_COUNT_ID_DESC'
  | 'EVENTS_BY_CALL_ID_DISTINCT_COUNT_INDEX_IN_BLOCK_ASC'
  | 'EVENTS_BY_CALL_ID_DISTINCT_COUNT_INDEX_IN_BLOCK_DESC'
  | 'EVENTS_BY_CALL_ID_DISTINCT_COUNT_NAME_ASC'
  | 'EVENTS_BY_CALL_ID_DISTINCT_COUNT_NAME_DESC'
  | 'EVENTS_BY_CALL_ID_DISTINCT_COUNT_PHASE_ASC'
  | 'EVENTS_BY_CALL_ID_DISTINCT_COUNT_PHASE_DESC'
  | 'EVENTS_BY_CALL_ID_DISTINCT_COUNT_POS_ASC'
  | 'EVENTS_BY_CALL_ID_DISTINCT_COUNT_POS_DESC'
  | 'EVENTS_BY_CALL_ID_MAX_ARGS_ASC'
  | 'EVENTS_BY_CALL_ID_MAX_ARGS_DESC'
  | 'EVENTS_BY_CALL_ID_MAX_BLOCK_ID_ASC'
  | 'EVENTS_BY_CALL_ID_MAX_BLOCK_ID_DESC'
  | 'EVENTS_BY_CALL_ID_MAX_CALL_ID_ASC'
  | 'EVENTS_BY_CALL_ID_MAX_CALL_ID_DESC'
  | 'EVENTS_BY_CALL_ID_MAX_EXTRINSIC_ID_ASC'
  | 'EVENTS_BY_CALL_ID_MAX_EXTRINSIC_ID_DESC'
  | 'EVENTS_BY_CALL_ID_MAX_ID_ASC'
  | 'EVENTS_BY_CALL_ID_MAX_ID_DESC'
  | 'EVENTS_BY_CALL_ID_MAX_INDEX_IN_BLOCK_ASC'
  | 'EVENTS_BY_CALL_ID_MAX_INDEX_IN_BLOCK_DESC'
  | 'EVENTS_BY_CALL_ID_MAX_NAME_ASC'
  | 'EVENTS_BY_CALL_ID_MAX_NAME_DESC'
  | 'EVENTS_BY_CALL_ID_MAX_PHASE_ASC'
  | 'EVENTS_BY_CALL_ID_MAX_PHASE_DESC'
  | 'EVENTS_BY_CALL_ID_MAX_POS_ASC'
  | 'EVENTS_BY_CALL_ID_MAX_POS_DESC'
  | 'EVENTS_BY_CALL_ID_MIN_ARGS_ASC'
  | 'EVENTS_BY_CALL_ID_MIN_ARGS_DESC'
  | 'EVENTS_BY_CALL_ID_MIN_BLOCK_ID_ASC'
  | 'EVENTS_BY_CALL_ID_MIN_BLOCK_ID_DESC'
  | 'EVENTS_BY_CALL_ID_MIN_CALL_ID_ASC'
  | 'EVENTS_BY_CALL_ID_MIN_CALL_ID_DESC'
  | 'EVENTS_BY_CALL_ID_MIN_EXTRINSIC_ID_ASC'
  | 'EVENTS_BY_CALL_ID_MIN_EXTRINSIC_ID_DESC'
  | 'EVENTS_BY_CALL_ID_MIN_ID_ASC'
  | 'EVENTS_BY_CALL_ID_MIN_ID_DESC'
  | 'EVENTS_BY_CALL_ID_MIN_INDEX_IN_BLOCK_ASC'
  | 'EVENTS_BY_CALL_ID_MIN_INDEX_IN_BLOCK_DESC'
  | 'EVENTS_BY_CALL_ID_MIN_NAME_ASC'
  | 'EVENTS_BY_CALL_ID_MIN_NAME_DESC'
  | 'EVENTS_BY_CALL_ID_MIN_PHASE_ASC'
  | 'EVENTS_BY_CALL_ID_MIN_PHASE_DESC'
  | 'EVENTS_BY_CALL_ID_MIN_POS_ASC'
  | 'EVENTS_BY_CALL_ID_MIN_POS_DESC'
  | 'EVENTS_BY_CALL_ID_STDDEV_POPULATION_ARGS_ASC'
  | 'EVENTS_BY_CALL_ID_STDDEV_POPULATION_ARGS_DESC'
  | 'EVENTS_BY_CALL_ID_STDDEV_POPULATION_BLOCK_ID_ASC'
  | 'EVENTS_BY_CALL_ID_STDDEV_POPULATION_BLOCK_ID_DESC'
  | 'EVENTS_BY_CALL_ID_STDDEV_POPULATION_CALL_ID_ASC'
  | 'EVENTS_BY_CALL_ID_STDDEV_POPULATION_CALL_ID_DESC'
  | 'EVENTS_BY_CALL_ID_STDDEV_POPULATION_EXTRINSIC_ID_ASC'
  | 'EVENTS_BY_CALL_ID_STDDEV_POPULATION_EXTRINSIC_ID_DESC'
  | 'EVENTS_BY_CALL_ID_STDDEV_POPULATION_ID_ASC'
  | 'EVENTS_BY_CALL_ID_STDDEV_POPULATION_ID_DESC'
  | 'EVENTS_BY_CALL_ID_STDDEV_POPULATION_INDEX_IN_BLOCK_ASC'
  | 'EVENTS_BY_CALL_ID_STDDEV_POPULATION_INDEX_IN_BLOCK_DESC'
  | 'EVENTS_BY_CALL_ID_STDDEV_POPULATION_NAME_ASC'
  | 'EVENTS_BY_CALL_ID_STDDEV_POPULATION_NAME_DESC'
  | 'EVENTS_BY_CALL_ID_STDDEV_POPULATION_PHASE_ASC'
  | 'EVENTS_BY_CALL_ID_STDDEV_POPULATION_PHASE_DESC'
  | 'EVENTS_BY_CALL_ID_STDDEV_POPULATION_POS_ASC'
  | 'EVENTS_BY_CALL_ID_STDDEV_POPULATION_POS_DESC'
  | 'EVENTS_BY_CALL_ID_STDDEV_SAMPLE_ARGS_ASC'
  | 'EVENTS_BY_CALL_ID_STDDEV_SAMPLE_ARGS_DESC'
  | 'EVENTS_BY_CALL_ID_STDDEV_SAMPLE_BLOCK_ID_ASC'
  | 'EVENTS_BY_CALL_ID_STDDEV_SAMPLE_BLOCK_ID_DESC'
  | 'EVENTS_BY_CALL_ID_STDDEV_SAMPLE_CALL_ID_ASC'
  | 'EVENTS_BY_CALL_ID_STDDEV_SAMPLE_CALL_ID_DESC'
  | 'EVENTS_BY_CALL_ID_STDDEV_SAMPLE_EXTRINSIC_ID_ASC'
  | 'EVENTS_BY_CALL_ID_STDDEV_SAMPLE_EXTRINSIC_ID_DESC'
  | 'EVENTS_BY_CALL_ID_STDDEV_SAMPLE_ID_ASC'
  | 'EVENTS_BY_CALL_ID_STDDEV_SAMPLE_ID_DESC'
  | 'EVENTS_BY_CALL_ID_STDDEV_SAMPLE_INDEX_IN_BLOCK_ASC'
  | 'EVENTS_BY_CALL_ID_STDDEV_SAMPLE_INDEX_IN_BLOCK_DESC'
  | 'EVENTS_BY_CALL_ID_STDDEV_SAMPLE_NAME_ASC'
  | 'EVENTS_BY_CALL_ID_STDDEV_SAMPLE_NAME_DESC'
  | 'EVENTS_BY_CALL_ID_STDDEV_SAMPLE_PHASE_ASC'
  | 'EVENTS_BY_CALL_ID_STDDEV_SAMPLE_PHASE_DESC'
  | 'EVENTS_BY_CALL_ID_STDDEV_SAMPLE_POS_ASC'
  | 'EVENTS_BY_CALL_ID_STDDEV_SAMPLE_POS_DESC'
  | 'EVENTS_BY_CALL_ID_SUM_ARGS_ASC'
  | 'EVENTS_BY_CALL_ID_SUM_ARGS_DESC'
  | 'EVENTS_BY_CALL_ID_SUM_BLOCK_ID_ASC'
  | 'EVENTS_BY_CALL_ID_SUM_BLOCK_ID_DESC'
  | 'EVENTS_BY_CALL_ID_SUM_CALL_ID_ASC'
  | 'EVENTS_BY_CALL_ID_SUM_CALL_ID_DESC'
  | 'EVENTS_BY_CALL_ID_SUM_EXTRINSIC_ID_ASC'
  | 'EVENTS_BY_CALL_ID_SUM_EXTRINSIC_ID_DESC'
  | 'EVENTS_BY_CALL_ID_SUM_ID_ASC'
  | 'EVENTS_BY_CALL_ID_SUM_ID_DESC'
  | 'EVENTS_BY_CALL_ID_SUM_INDEX_IN_BLOCK_ASC'
  | 'EVENTS_BY_CALL_ID_SUM_INDEX_IN_BLOCK_DESC'
  | 'EVENTS_BY_CALL_ID_SUM_NAME_ASC'
  | 'EVENTS_BY_CALL_ID_SUM_NAME_DESC'
  | 'EVENTS_BY_CALL_ID_SUM_PHASE_ASC'
  | 'EVENTS_BY_CALL_ID_SUM_PHASE_DESC'
  | 'EVENTS_BY_CALL_ID_SUM_POS_ASC'
  | 'EVENTS_BY_CALL_ID_SUM_POS_DESC'
  | 'EVENTS_BY_CALL_ID_VARIANCE_POPULATION_ARGS_ASC'
  | 'EVENTS_BY_CALL_ID_VARIANCE_POPULATION_ARGS_DESC'
  | 'EVENTS_BY_CALL_ID_VARIANCE_POPULATION_BLOCK_ID_ASC'
  | 'EVENTS_BY_CALL_ID_VARIANCE_POPULATION_BLOCK_ID_DESC'
  | 'EVENTS_BY_CALL_ID_VARIANCE_POPULATION_CALL_ID_ASC'
  | 'EVENTS_BY_CALL_ID_VARIANCE_POPULATION_CALL_ID_DESC'
  | 'EVENTS_BY_CALL_ID_VARIANCE_POPULATION_EXTRINSIC_ID_ASC'
  | 'EVENTS_BY_CALL_ID_VARIANCE_POPULATION_EXTRINSIC_ID_DESC'
  | 'EVENTS_BY_CALL_ID_VARIANCE_POPULATION_ID_ASC'
  | 'EVENTS_BY_CALL_ID_VARIANCE_POPULATION_ID_DESC'
  | 'EVENTS_BY_CALL_ID_VARIANCE_POPULATION_INDEX_IN_BLOCK_ASC'
  | 'EVENTS_BY_CALL_ID_VARIANCE_POPULATION_INDEX_IN_BLOCK_DESC'
  | 'EVENTS_BY_CALL_ID_VARIANCE_POPULATION_NAME_ASC'
  | 'EVENTS_BY_CALL_ID_VARIANCE_POPULATION_NAME_DESC'
  | 'EVENTS_BY_CALL_ID_VARIANCE_POPULATION_PHASE_ASC'
  | 'EVENTS_BY_CALL_ID_VARIANCE_POPULATION_PHASE_DESC'
  | 'EVENTS_BY_CALL_ID_VARIANCE_POPULATION_POS_ASC'
  | 'EVENTS_BY_CALL_ID_VARIANCE_POPULATION_POS_DESC'
  | 'EVENTS_BY_CALL_ID_VARIANCE_SAMPLE_ARGS_ASC'
  | 'EVENTS_BY_CALL_ID_VARIANCE_SAMPLE_ARGS_DESC'
  | 'EVENTS_BY_CALL_ID_VARIANCE_SAMPLE_BLOCK_ID_ASC'
  | 'EVENTS_BY_CALL_ID_VARIANCE_SAMPLE_BLOCK_ID_DESC'
  | 'EVENTS_BY_CALL_ID_VARIANCE_SAMPLE_CALL_ID_ASC'
  | 'EVENTS_BY_CALL_ID_VARIANCE_SAMPLE_CALL_ID_DESC'
  | 'EVENTS_BY_CALL_ID_VARIANCE_SAMPLE_EXTRINSIC_ID_ASC'
  | 'EVENTS_BY_CALL_ID_VARIANCE_SAMPLE_EXTRINSIC_ID_DESC'
  | 'EVENTS_BY_CALL_ID_VARIANCE_SAMPLE_ID_ASC'
  | 'EVENTS_BY_CALL_ID_VARIANCE_SAMPLE_ID_DESC'
  | 'EVENTS_BY_CALL_ID_VARIANCE_SAMPLE_INDEX_IN_BLOCK_ASC'
  | 'EVENTS_BY_CALL_ID_VARIANCE_SAMPLE_INDEX_IN_BLOCK_DESC'
  | 'EVENTS_BY_CALL_ID_VARIANCE_SAMPLE_NAME_ASC'
  | 'EVENTS_BY_CALL_ID_VARIANCE_SAMPLE_NAME_DESC'
  | 'EVENTS_BY_CALL_ID_VARIANCE_SAMPLE_PHASE_ASC'
  | 'EVENTS_BY_CALL_ID_VARIANCE_SAMPLE_PHASE_DESC'
  | 'EVENTS_BY_CALL_ID_VARIANCE_SAMPLE_POS_ASC'
  | 'EVENTS_BY_CALL_ID_VARIANCE_SAMPLE_POS_DESC'
  | 'EXTRINSIC_ID_ASC'
  | 'EXTRINSIC_ID_DESC'
  | 'ID_ASC'
  | 'ID_DESC'
  | 'NAME_ASC'
  | 'NAME_DESC'
  | 'NATURAL'
  | 'ORIGIN_ASC'
  | 'ORIGIN_DESC'
  | 'PARENT_ID_ASC'
  | 'PARENT_ID_DESC'
  | 'POS_ASC'
  | 'POS_DESC'
  | 'PRIMARY_KEY_ASC'
  | 'PRIMARY_KEY_DESC'
  | 'SUCCESS_ASC'
  | 'SUCCESS_DESC';

export type ContractsContractEmitted = Node & {
  __typename?: 'ContractsContractEmitted';
  contract: Scalars['String']['output'];
  /** Reads a single `Event` that is related to this `ContractsContractEmitted`. */
  eventByEventId: Event;
  eventId: Scalars['String']['output'];
  /** A globally unique identifier. Can be used in various places throughout the system to identify this single value. */
  nodeId: Scalars['ID']['output'];
};

export type ContractsContractEmittedAggregates = {
  __typename?: 'ContractsContractEmittedAggregates';
  /** Distinct count aggregates across the matching connection (ignoring before/after/first/last/offset) */
  distinctCount?: Maybe<ContractsContractEmittedDistinctCountAggregates>;
  keys?: Maybe<Array<Scalars['String']['output']>>;
};

/**
 * A condition to be used against `ContractsContractEmitted` object types. All
 * fields are tested for equality and combined with a logical ‘and.’
 */
export type ContractsContractEmittedCondition = {
  /** Checks for equality with the object’s `contract` field. */
  contract?: InputMaybe<Scalars['String']['input']>;
  /** Checks for equality with the object’s `eventId` field. */
  eventId?: InputMaybe<Scalars['String']['input']>;
};

export type ContractsContractEmittedDistinctCountAggregates = {
  __typename?: 'ContractsContractEmittedDistinctCountAggregates';
  /** Distinct count of contract across the matching connection */
  contract?: Maybe<Scalars['BigInt']['output']>;
  /** Distinct count of eventId across the matching connection */
  eventId?: Maybe<Scalars['BigInt']['output']>;
};

/** A filter to be used against `ContractsContractEmitted` object types. All fields are combined with a logical ‘and.’ */
export type ContractsContractEmittedFilter = {
  /** Checks for all expressions in this list. */
  and?: InputMaybe<Array<ContractsContractEmittedFilter>>;
  /** Filter by the object’s `contract` field. */
  contract?: InputMaybe<StringFilter>;
  /** Filter by the object’s `eventId` field. */
  eventId?: InputMaybe<StringFilter>;
  /** Negates the expression. */
  not?: InputMaybe<ContractsContractEmittedFilter>;
  /** Checks for any expressions in this list. */
  or?: InputMaybe<Array<ContractsContractEmittedFilter>>;
};

/** Grouping methods for `ContractsContractEmitted` for usage during aggregation. */
export type ContractsContractEmittedGroupBy =
  | 'CONTRACT';

/** Conditions for `ContractsContractEmitted` aggregates. */
export type ContractsContractEmittedHavingInput = {
  AND?: InputMaybe<Array<ContractsContractEmittedHavingInput>>;
  OR?: InputMaybe<Array<ContractsContractEmittedHavingInput>>;
};

/** A connection to a list of `ContractsContractEmitted` values. */
export type ContractsContractEmittedsConnection = {
  __typename?: 'ContractsContractEmittedsConnection';
  /** Aggregates across the matching connection (ignoring before/after/first/last/offset) */
  aggregates?: Maybe<ContractsContractEmittedAggregates>;
  /** A list of edges which contains the `ContractsContractEmitted` and cursor to aid in pagination. */
  edges: Array<ContractsContractEmittedsEdge>;
  /** Grouped aggregates across the matching connection (ignoring before/after/first/last/offset) */
  groupedAggregates?: Maybe<Array<ContractsContractEmittedAggregates>>;
  /** A list of `ContractsContractEmitted` objects. */
  nodes: Array<ContractsContractEmitted>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
  /** The count of *all* `ContractsContractEmitted` you could get from the connection. */
  totalCount: Scalars['Int']['output'];
};


/** A connection to a list of `ContractsContractEmitted` values. */
export type ContractsContractEmittedsConnectionGroupedAggregatesArgs = {
  groupBy: Array<ContractsContractEmittedGroupBy>;
  having?: InputMaybe<ContractsContractEmittedHavingInput>;
};

/** A `ContractsContractEmitted` edge in the connection. */
export type ContractsContractEmittedsEdge = {
  __typename?: 'ContractsContractEmittedsEdge';
  /** A cursor for use in pagination. */
  cursor?: Maybe<Scalars['Cursor']['output']>;
  /** The `ContractsContractEmitted` at the end of the edge. */
  node: ContractsContractEmitted;
};

/** Methods to use when ordering `ContractsContractEmitted`. */
export type ContractsContractEmittedsOrderBy =
  | 'CONTRACT_ASC'
  | 'CONTRACT_DESC'
  | 'EVENT_ID_ASC'
  | 'EVENT_ID_DESC'
  | 'NATURAL'
  | 'PRIMARY_KEY_ASC'
  | 'PRIMARY_KEY_DESC';

/** A filter to be used against Datetime fields. All fields are combined with a logical ‘and.’ */
export type DatetimeFilter = {
  /** Not equal to the specified value, treating null like an ordinary value. */
  distinctFrom?: InputMaybe<Scalars['Datetime']['input']>;
  /** Equal to the specified value. */
  equalTo?: InputMaybe<Scalars['Datetime']['input']>;
  /** Greater than the specified value. */
  greaterThan?: InputMaybe<Scalars['Datetime']['input']>;
  /** Greater than or equal to the specified value. */
  greaterThanOrEqualTo?: InputMaybe<Scalars['Datetime']['input']>;
  /** Included in the specified list. */
  in?: InputMaybe<Array<Scalars['Datetime']['input']>>;
  /** Is null (if `true` is specified) or is not null (if `false` is specified). */
  isNull?: InputMaybe<Scalars['Boolean']['input']>;
  /** Less than the specified value. */
  lessThan?: InputMaybe<Scalars['Datetime']['input']>;
  /** Less than or equal to the specified value. */
  lessThanOrEqualTo?: InputMaybe<Scalars['Datetime']['input']>;
  /** Equal to the specified value, treating null like an ordinary value. */
  notDistinctFrom?: InputMaybe<Scalars['Datetime']['input']>;
  /** Not equal to the specified value. */
  notEqualTo?: InputMaybe<Scalars['Datetime']['input']>;
  /** Not included in the specified list. */
  notIn?: InputMaybe<Array<Scalars['Datetime']['input']>>;
};

export type Event = Node & {
  __typename?: 'Event';
  /** Reads a single `AcalaEvmExecuted` that is related to this `Event`. */
  acalaEvmExecutedByEventId?: Maybe<AcalaEvmExecuted>;
  /** Reads a single `AcalaEvmExecutedFailed` that is related to this `Event`. */
  acalaEvmExecutedFailedByEventId?: Maybe<AcalaEvmExecutedFailed>;
  /** Reads and enables pagination through a set of `AcalaEvmExecutedFailedLog`. */
  acalaEvmExecutedFailedLogsByEventId: AcalaEvmExecutedFailedLogsConnection;
  /**
   * Reads and enables pagination through a set of `AcalaEvmExecutedFailed`.
   * @deprecated Please use acalaEvmExecutedFailedByEventId instead
   */
  acalaEvmExecutedFailedsByEventId: AcalaEvmExecutedFailedsConnection;
  /** Reads and enables pagination through a set of `AcalaEvmExecutedLog`. */
  acalaEvmExecutedLogsByEventId: AcalaEvmExecutedLogsConnection;
  /**
   * Reads and enables pagination through a set of `AcalaEvmExecuted`.
   * @deprecated Please use acalaEvmExecutedByEventId instead
   */
  acalaEvmExecutedsByEventId: AcalaEvmExecutedsConnection;
  args?: Maybe<Scalars['JSON']['output']>;
  /** Reads a single `Block` that is related to this `Event`. */
  blockByBlockId: Block;
  blockId: Scalars['String']['output'];
  /** Reads a single `Call` that is related to this `Event`. */
  callByCallId?: Maybe<Call>;
  callId?: Maybe<Scalars['String']['output']>;
  /** Reads a single `ContractsContractEmitted` that is related to this `Event`. */
  contractsContractEmittedByEventId?: Maybe<ContractsContractEmitted>;
  /**
   * Reads and enables pagination through a set of `ContractsContractEmitted`.
   * @deprecated Please use contractsContractEmittedByEventId instead
   */
  contractsContractEmittedsByEventId: ContractsContractEmittedsConnection;
  /** Reads a single `Extrinsic` that is related to this `Event`. */
  extrinsicByExtrinsicId?: Maybe<Extrinsic>;
  extrinsicId?: Maybe<Scalars['String']['output']>;
  /** Reads a single `FrontierEvmLog` that is related to this `Event`. */
  frontierEvmLogByEventId?: Maybe<FrontierEvmLog>;
  /**
   * Reads and enables pagination through a set of `FrontierEvmLog`.
   * @deprecated Please use frontierEvmLogByEventId instead
   */
  frontierEvmLogsByEventId: FrontierEvmLogsConnection;
  /** Reads a single `GearMessageEnqueued` that is related to this `Event`. */
  gearMessageEnqueuedByEventId?: Maybe<GearMessageEnqueued>;
  /**
   * Reads and enables pagination through a set of `GearMessageEnqueued`.
   * @deprecated Please use gearMessageEnqueuedByEventId instead
   */
  gearMessageEnqueuedsByEventId: GearMessageEnqueuedsConnection;
  /** Reads a single `GearUserMessageSent` that is related to this `Event`. */
  gearUserMessageSentByEventId?: Maybe<GearUserMessageSent>;
  /**
   * Reads and enables pagination through a set of `GearUserMessageSent`.
   * @deprecated Please use gearUserMessageSentByEventId instead
   */
  gearUserMessageSentsByEventId: GearUserMessageSentsConnection;
  id: Scalars['String']['output'];
  indexInBlock: Scalars['Int']['output'];
  name: Scalars['String']['output'];
  /** A globally unique identifier. Can be used in various places throughout the system to identify this single value. */
  nodeId: Scalars['ID']['output'];
  phase: Scalars['String']['output'];
  pos: Scalars['Int']['output'];
};


export type EventAcalaEvmExecutedFailedLogsByEventIdArgs = {
  after?: InputMaybe<Scalars['Cursor']['input']>;
  before?: InputMaybe<Scalars['Cursor']['input']>;
  condition?: InputMaybe<AcalaEvmExecutedFailedLogCondition>;
  filter?: InputMaybe<AcalaEvmExecutedFailedLogFilter>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<AcalaEvmExecutedFailedLogsOrderBy>>;
};


export type EventAcalaEvmExecutedFailedsByEventIdArgs = {
  after?: InputMaybe<Scalars['Cursor']['input']>;
  before?: InputMaybe<Scalars['Cursor']['input']>;
  condition?: InputMaybe<AcalaEvmExecutedFailedCondition>;
  filter?: InputMaybe<AcalaEvmExecutedFailedFilter>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<AcalaEvmExecutedFailedsOrderBy>>;
};


export type EventAcalaEvmExecutedLogsByEventIdArgs = {
  after?: InputMaybe<Scalars['Cursor']['input']>;
  before?: InputMaybe<Scalars['Cursor']['input']>;
  condition?: InputMaybe<AcalaEvmExecutedLogCondition>;
  filter?: InputMaybe<AcalaEvmExecutedLogFilter>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<AcalaEvmExecutedLogsOrderBy>>;
};


export type EventAcalaEvmExecutedsByEventIdArgs = {
  after?: InputMaybe<Scalars['Cursor']['input']>;
  before?: InputMaybe<Scalars['Cursor']['input']>;
  condition?: InputMaybe<AcalaEvmExecutedCondition>;
  filter?: InputMaybe<AcalaEvmExecutedFilter>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<AcalaEvmExecutedsOrderBy>>;
};


export type EventContractsContractEmittedsByEventIdArgs = {
  after?: InputMaybe<Scalars['Cursor']['input']>;
  before?: InputMaybe<Scalars['Cursor']['input']>;
  condition?: InputMaybe<ContractsContractEmittedCondition>;
  filter?: InputMaybe<ContractsContractEmittedFilter>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<ContractsContractEmittedsOrderBy>>;
};


export type EventFrontierEvmLogsByEventIdArgs = {
  after?: InputMaybe<Scalars['Cursor']['input']>;
  before?: InputMaybe<Scalars['Cursor']['input']>;
  condition?: InputMaybe<FrontierEvmLogCondition>;
  filter?: InputMaybe<FrontierEvmLogFilter>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<FrontierEvmLogsOrderBy>>;
};


export type EventGearMessageEnqueuedsByEventIdArgs = {
  after?: InputMaybe<Scalars['Cursor']['input']>;
  before?: InputMaybe<Scalars['Cursor']['input']>;
  condition?: InputMaybe<GearMessageEnqueuedCondition>;
  filter?: InputMaybe<GearMessageEnqueuedFilter>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<GearMessageEnqueuedsOrderBy>>;
};


export type EventGearUserMessageSentsByEventIdArgs = {
  after?: InputMaybe<Scalars['Cursor']['input']>;
  before?: InputMaybe<Scalars['Cursor']['input']>;
  condition?: InputMaybe<GearUserMessageSentCondition>;
  filter?: InputMaybe<GearUserMessageSentFilter>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<GearUserMessageSentsOrderBy>>;
};

export type EventAggregates = {
  __typename?: 'EventAggregates';
  /** Mean average aggregates across the matching connection (ignoring before/after/first/last/offset) */
  average?: Maybe<EventAverageAggregates>;
  /** Distinct count aggregates across the matching connection (ignoring before/after/first/last/offset) */
  distinctCount?: Maybe<EventDistinctCountAggregates>;
  keys?: Maybe<Array<Scalars['String']['output']>>;
  /** Maximum aggregates across the matching connection (ignoring before/after/first/last/offset) */
  max?: Maybe<EventMaxAggregates>;
  /** Minimum aggregates across the matching connection (ignoring before/after/first/last/offset) */
  min?: Maybe<EventMinAggregates>;
  /** Population standard deviation aggregates across the matching connection (ignoring before/after/first/last/offset) */
  stddevPopulation?: Maybe<EventStddevPopulationAggregates>;
  /** Sample standard deviation aggregates across the matching connection (ignoring before/after/first/last/offset) */
  stddevSample?: Maybe<EventStddevSampleAggregates>;
  /** Sum aggregates across the matching connection (ignoring before/after/first/last/offset) */
  sum?: Maybe<EventSumAggregates>;
  /** Population variance aggregates across the matching connection (ignoring before/after/first/last/offset) */
  variancePopulation?: Maybe<EventVariancePopulationAggregates>;
  /** Sample variance aggregates across the matching connection (ignoring before/after/first/last/offset) */
  varianceSample?: Maybe<EventVarianceSampleAggregates>;
};

export type EventAverageAggregates = {
  __typename?: 'EventAverageAggregates';
  /** Mean average of indexInBlock across the matching connection */
  indexInBlock?: Maybe<Scalars['BigFloat']['output']>;
  /** Mean average of pos across the matching connection */
  pos?: Maybe<Scalars['BigFloat']['output']>;
};

/** A condition to be used against `Event` object types. All fields are tested for equality and combined with a logical ‘and.’ */
export type EventCondition = {
  /** Checks for equality with the object’s `args` field. */
  args?: InputMaybe<Scalars['JSON']['input']>;
  /** Checks for equality with the object’s `blockId` field. */
  blockId?: InputMaybe<Scalars['String']['input']>;
  /** Checks for equality with the object’s `callId` field. */
  callId?: InputMaybe<Scalars['String']['input']>;
  /** Checks for equality with the object’s `extrinsicId` field. */
  extrinsicId?: InputMaybe<Scalars['String']['input']>;
  /** Checks for equality with the object’s `id` field. */
  id?: InputMaybe<Scalars['String']['input']>;
  /** Checks for equality with the object’s `indexInBlock` field. */
  indexInBlock?: InputMaybe<Scalars['Int']['input']>;
  /** Checks for equality with the object’s `name` field. */
  name?: InputMaybe<Scalars['String']['input']>;
  /** Checks for equality with the object’s `phase` field. */
  phase?: InputMaybe<Scalars['String']['input']>;
  /** Checks for equality with the object’s `pos` field. */
  pos?: InputMaybe<Scalars['Int']['input']>;
};

export type EventDistinctCountAggregates = {
  __typename?: 'EventDistinctCountAggregates';
  /** Distinct count of args across the matching connection */
  args?: Maybe<Scalars['BigInt']['output']>;
  /** Distinct count of blockId across the matching connection */
  blockId?: Maybe<Scalars['BigInt']['output']>;
  /** Distinct count of callId across the matching connection */
  callId?: Maybe<Scalars['BigInt']['output']>;
  /** Distinct count of extrinsicId across the matching connection */
  extrinsicId?: Maybe<Scalars['BigInt']['output']>;
  /** Distinct count of id across the matching connection */
  id?: Maybe<Scalars['BigInt']['output']>;
  /** Distinct count of indexInBlock across the matching connection */
  indexInBlock?: Maybe<Scalars['BigInt']['output']>;
  /** Distinct count of name across the matching connection */
  name?: Maybe<Scalars['BigInt']['output']>;
  /** Distinct count of phase across the matching connection */
  phase?: Maybe<Scalars['BigInt']['output']>;
  /** Distinct count of pos across the matching connection */
  pos?: Maybe<Scalars['BigInt']['output']>;
};

/** A filter to be used against `Event` object types. All fields are combined with a logical ‘and.’ */
export type EventFilter = {
  /** Checks for all expressions in this list. */
  and?: InputMaybe<Array<EventFilter>>;
  /** Filter by the object’s `args` field. */
  args?: InputMaybe<JsonFilter>;
  /** Filter by the object’s `blockId` field. */
  blockId?: InputMaybe<StringFilter>;
  /** Filter by the object’s `callId` field. */
  callId?: InputMaybe<StringFilter>;
  /** Filter by the object’s `extrinsicId` field. */
  extrinsicId?: InputMaybe<StringFilter>;
  /** Filter by the object’s `id` field. */
  id?: InputMaybe<StringFilter>;
  /** Filter by the object’s `indexInBlock` field. */
  indexInBlock?: InputMaybe<IntFilter>;
  /** Filter by the object’s `name` field. */
  name?: InputMaybe<StringFilter>;
  /** Negates the expression. */
  not?: InputMaybe<EventFilter>;
  /** Checks for any expressions in this list. */
  or?: InputMaybe<Array<EventFilter>>;
  /** Filter by the object’s `phase` field. */
  phase?: InputMaybe<StringFilter>;
  /** Filter by the object’s `pos` field. */
  pos?: InputMaybe<IntFilter>;
};

/** Grouping methods for `Event` for usage during aggregation. */
export type EventGroupBy =
  | 'ARGS'
  | 'BLOCK_ID'
  | 'CALL_ID'
  | 'EXTRINSIC_ID'
  | 'INDEX_IN_BLOCK'
  | 'NAME'
  | 'PHASE'
  | 'POS';

export type EventHavingAverageInput = {
  indexInBlock?: InputMaybe<HavingIntFilter>;
  pos?: InputMaybe<HavingIntFilter>;
};

export type EventHavingDistinctCountInput = {
  indexInBlock?: InputMaybe<HavingIntFilter>;
  pos?: InputMaybe<HavingIntFilter>;
};

/** Conditions for `Event` aggregates. */
export type EventHavingInput = {
  AND?: InputMaybe<Array<EventHavingInput>>;
  OR?: InputMaybe<Array<EventHavingInput>>;
  average?: InputMaybe<EventHavingAverageInput>;
  distinctCount?: InputMaybe<EventHavingDistinctCountInput>;
  max?: InputMaybe<EventHavingMaxInput>;
  min?: InputMaybe<EventHavingMinInput>;
  stddevPopulation?: InputMaybe<EventHavingStddevPopulationInput>;
  stddevSample?: InputMaybe<EventHavingStddevSampleInput>;
  sum?: InputMaybe<EventHavingSumInput>;
  variancePopulation?: InputMaybe<EventHavingVariancePopulationInput>;
  varianceSample?: InputMaybe<EventHavingVarianceSampleInput>;
};

export type EventHavingMaxInput = {
  indexInBlock?: InputMaybe<HavingIntFilter>;
  pos?: InputMaybe<HavingIntFilter>;
};

export type EventHavingMinInput = {
  indexInBlock?: InputMaybe<HavingIntFilter>;
  pos?: InputMaybe<HavingIntFilter>;
};

export type EventHavingStddevPopulationInput = {
  indexInBlock?: InputMaybe<HavingIntFilter>;
  pos?: InputMaybe<HavingIntFilter>;
};

export type EventHavingStddevSampleInput = {
  indexInBlock?: InputMaybe<HavingIntFilter>;
  pos?: InputMaybe<HavingIntFilter>;
};

export type EventHavingSumInput = {
  indexInBlock?: InputMaybe<HavingIntFilter>;
  pos?: InputMaybe<HavingIntFilter>;
};

export type EventHavingVariancePopulationInput = {
  indexInBlock?: InputMaybe<HavingIntFilter>;
  pos?: InputMaybe<HavingIntFilter>;
};

export type EventHavingVarianceSampleInput = {
  indexInBlock?: InputMaybe<HavingIntFilter>;
  pos?: InputMaybe<HavingIntFilter>;
};

export type EventMaxAggregates = {
  __typename?: 'EventMaxAggregates';
  /** Maximum of indexInBlock across the matching connection */
  indexInBlock?: Maybe<Scalars['Int']['output']>;
  /** Maximum of pos across the matching connection */
  pos?: Maybe<Scalars['Int']['output']>;
};

export type EventMinAggregates = {
  __typename?: 'EventMinAggregates';
  /** Minimum of indexInBlock across the matching connection */
  indexInBlock?: Maybe<Scalars['Int']['output']>;
  /** Minimum of pos across the matching connection */
  pos?: Maybe<Scalars['Int']['output']>;
};

export type EventStddevPopulationAggregates = {
  __typename?: 'EventStddevPopulationAggregates';
  /** Population standard deviation of indexInBlock across the matching connection */
  indexInBlock?: Maybe<Scalars['BigFloat']['output']>;
  /** Population standard deviation of pos across the matching connection */
  pos?: Maybe<Scalars['BigFloat']['output']>;
};

export type EventStddevSampleAggregates = {
  __typename?: 'EventStddevSampleAggregates';
  /** Sample standard deviation of indexInBlock across the matching connection */
  indexInBlock?: Maybe<Scalars['BigFloat']['output']>;
  /** Sample standard deviation of pos across the matching connection */
  pos?: Maybe<Scalars['BigFloat']['output']>;
};

export type EventSumAggregates = {
  __typename?: 'EventSumAggregates';
  /** Sum of indexInBlock across the matching connection */
  indexInBlock: Scalars['BigInt']['output'];
  /** Sum of pos across the matching connection */
  pos: Scalars['BigInt']['output'];
};

export type EventVariancePopulationAggregates = {
  __typename?: 'EventVariancePopulationAggregates';
  /** Population variance of indexInBlock across the matching connection */
  indexInBlock?: Maybe<Scalars['BigFloat']['output']>;
  /** Population variance of pos across the matching connection */
  pos?: Maybe<Scalars['BigFloat']['output']>;
};

export type EventVarianceSampleAggregates = {
  __typename?: 'EventVarianceSampleAggregates';
  /** Sample variance of indexInBlock across the matching connection */
  indexInBlock?: Maybe<Scalars['BigFloat']['output']>;
  /** Sample variance of pos across the matching connection */
  pos?: Maybe<Scalars['BigFloat']['output']>;
};

/** A connection to a list of `Event` values. */
export type EventsConnection = {
  __typename?: 'EventsConnection';
  /** Aggregates across the matching connection (ignoring before/after/first/last/offset) */
  aggregates?: Maybe<EventAggregates>;
  /** A list of edges which contains the `Event` and cursor to aid in pagination. */
  edges: Array<EventsEdge>;
  /** Grouped aggregates across the matching connection (ignoring before/after/first/last/offset) */
  groupedAggregates?: Maybe<Array<EventAggregates>>;
  /** A list of `Event` objects. */
  nodes: Array<Event>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
  /** The count of *all* `Event` you could get from the connection. */
  totalCount: Scalars['Int']['output'];
};


/** A connection to a list of `Event` values. */
export type EventsConnectionGroupedAggregatesArgs = {
  groupBy: Array<EventGroupBy>;
  having?: InputMaybe<EventHavingInput>;
};

/** A `Event` edge in the connection. */
export type EventsEdge = {
  __typename?: 'EventsEdge';
  /** A cursor for use in pagination. */
  cursor?: Maybe<Scalars['Cursor']['output']>;
  /** The `Event` at the end of the edge. */
  node: Event;
};

/** Methods to use when ordering `Event`. */
export type EventsOrderBy =
  | 'ACALA_EVM_EXECUTED_FAILED_LOGS_BY_EVENT_ID_AVERAGE_CONTRACT_ASC'
  | 'ACALA_EVM_EXECUTED_FAILED_LOGS_BY_EVENT_ID_AVERAGE_CONTRACT_DESC'
  | 'ACALA_EVM_EXECUTED_FAILED_LOGS_BY_EVENT_ID_AVERAGE_EVENT_CONTRACT_ASC'
  | 'ACALA_EVM_EXECUTED_FAILED_LOGS_BY_EVENT_ID_AVERAGE_EVENT_CONTRACT_DESC'
  | 'ACALA_EVM_EXECUTED_FAILED_LOGS_BY_EVENT_ID_AVERAGE_EVENT_ID_ASC'
  | 'ACALA_EVM_EXECUTED_FAILED_LOGS_BY_EVENT_ID_AVERAGE_EVENT_ID_DESC'
  | 'ACALA_EVM_EXECUTED_FAILED_LOGS_BY_EVENT_ID_AVERAGE_ID_ASC'
  | 'ACALA_EVM_EXECUTED_FAILED_LOGS_BY_EVENT_ID_AVERAGE_ID_DESC'
  | 'ACALA_EVM_EXECUTED_FAILED_LOGS_BY_EVENT_ID_AVERAGE_TOPIC0_ASC'
  | 'ACALA_EVM_EXECUTED_FAILED_LOGS_BY_EVENT_ID_AVERAGE_TOPIC0_DESC'
  | 'ACALA_EVM_EXECUTED_FAILED_LOGS_BY_EVENT_ID_AVERAGE_TOPIC1_ASC'
  | 'ACALA_EVM_EXECUTED_FAILED_LOGS_BY_EVENT_ID_AVERAGE_TOPIC1_DESC'
  | 'ACALA_EVM_EXECUTED_FAILED_LOGS_BY_EVENT_ID_AVERAGE_TOPIC2_ASC'
  | 'ACALA_EVM_EXECUTED_FAILED_LOGS_BY_EVENT_ID_AVERAGE_TOPIC2_DESC'
  | 'ACALA_EVM_EXECUTED_FAILED_LOGS_BY_EVENT_ID_AVERAGE_TOPIC3_ASC'
  | 'ACALA_EVM_EXECUTED_FAILED_LOGS_BY_EVENT_ID_AVERAGE_TOPIC3_DESC'
  | 'ACALA_EVM_EXECUTED_FAILED_LOGS_BY_EVENT_ID_COUNT_ASC'
  | 'ACALA_EVM_EXECUTED_FAILED_LOGS_BY_EVENT_ID_COUNT_DESC'
  | 'ACALA_EVM_EXECUTED_FAILED_LOGS_BY_EVENT_ID_DISTINCT_COUNT_CONTRACT_ASC'
  | 'ACALA_EVM_EXECUTED_FAILED_LOGS_BY_EVENT_ID_DISTINCT_COUNT_CONTRACT_DESC'
  | 'ACALA_EVM_EXECUTED_FAILED_LOGS_BY_EVENT_ID_DISTINCT_COUNT_EVENT_CONTRACT_ASC'
  | 'ACALA_EVM_EXECUTED_FAILED_LOGS_BY_EVENT_ID_DISTINCT_COUNT_EVENT_CONTRACT_DESC'
  | 'ACALA_EVM_EXECUTED_FAILED_LOGS_BY_EVENT_ID_DISTINCT_COUNT_EVENT_ID_ASC'
  | 'ACALA_EVM_EXECUTED_FAILED_LOGS_BY_EVENT_ID_DISTINCT_COUNT_EVENT_ID_DESC'
  | 'ACALA_EVM_EXECUTED_FAILED_LOGS_BY_EVENT_ID_DISTINCT_COUNT_ID_ASC'
  | 'ACALA_EVM_EXECUTED_FAILED_LOGS_BY_EVENT_ID_DISTINCT_COUNT_ID_DESC'
  | 'ACALA_EVM_EXECUTED_FAILED_LOGS_BY_EVENT_ID_DISTINCT_COUNT_TOPIC0_ASC'
  | 'ACALA_EVM_EXECUTED_FAILED_LOGS_BY_EVENT_ID_DISTINCT_COUNT_TOPIC0_DESC'
  | 'ACALA_EVM_EXECUTED_FAILED_LOGS_BY_EVENT_ID_DISTINCT_COUNT_TOPIC1_ASC'
  | 'ACALA_EVM_EXECUTED_FAILED_LOGS_BY_EVENT_ID_DISTINCT_COUNT_TOPIC1_DESC'
  | 'ACALA_EVM_EXECUTED_FAILED_LOGS_BY_EVENT_ID_DISTINCT_COUNT_TOPIC2_ASC'
  | 'ACALA_EVM_EXECUTED_FAILED_LOGS_BY_EVENT_ID_DISTINCT_COUNT_TOPIC2_DESC'
  | 'ACALA_EVM_EXECUTED_FAILED_LOGS_BY_EVENT_ID_DISTINCT_COUNT_TOPIC3_ASC'
  | 'ACALA_EVM_EXECUTED_FAILED_LOGS_BY_EVENT_ID_DISTINCT_COUNT_TOPIC3_DESC'
  | 'ACALA_EVM_EXECUTED_FAILED_LOGS_BY_EVENT_ID_MAX_CONTRACT_ASC'
  | 'ACALA_EVM_EXECUTED_FAILED_LOGS_BY_EVENT_ID_MAX_CONTRACT_DESC'
  | 'ACALA_EVM_EXECUTED_FAILED_LOGS_BY_EVENT_ID_MAX_EVENT_CONTRACT_ASC'
  | 'ACALA_EVM_EXECUTED_FAILED_LOGS_BY_EVENT_ID_MAX_EVENT_CONTRACT_DESC'
  | 'ACALA_EVM_EXECUTED_FAILED_LOGS_BY_EVENT_ID_MAX_EVENT_ID_ASC'
  | 'ACALA_EVM_EXECUTED_FAILED_LOGS_BY_EVENT_ID_MAX_EVENT_ID_DESC'
  | 'ACALA_EVM_EXECUTED_FAILED_LOGS_BY_EVENT_ID_MAX_ID_ASC'
  | 'ACALA_EVM_EXECUTED_FAILED_LOGS_BY_EVENT_ID_MAX_ID_DESC'
  | 'ACALA_EVM_EXECUTED_FAILED_LOGS_BY_EVENT_ID_MAX_TOPIC0_ASC'
  | 'ACALA_EVM_EXECUTED_FAILED_LOGS_BY_EVENT_ID_MAX_TOPIC0_DESC'
  | 'ACALA_EVM_EXECUTED_FAILED_LOGS_BY_EVENT_ID_MAX_TOPIC1_ASC'
  | 'ACALA_EVM_EXECUTED_FAILED_LOGS_BY_EVENT_ID_MAX_TOPIC1_DESC'
  | 'ACALA_EVM_EXECUTED_FAILED_LOGS_BY_EVENT_ID_MAX_TOPIC2_ASC'
  | 'ACALA_EVM_EXECUTED_FAILED_LOGS_BY_EVENT_ID_MAX_TOPIC2_DESC'
  | 'ACALA_EVM_EXECUTED_FAILED_LOGS_BY_EVENT_ID_MAX_TOPIC3_ASC'
  | 'ACALA_EVM_EXECUTED_FAILED_LOGS_BY_EVENT_ID_MAX_TOPIC3_DESC'
  | 'ACALA_EVM_EXECUTED_FAILED_LOGS_BY_EVENT_ID_MIN_CONTRACT_ASC'
  | 'ACALA_EVM_EXECUTED_FAILED_LOGS_BY_EVENT_ID_MIN_CONTRACT_DESC'
  | 'ACALA_EVM_EXECUTED_FAILED_LOGS_BY_EVENT_ID_MIN_EVENT_CONTRACT_ASC'
  | 'ACALA_EVM_EXECUTED_FAILED_LOGS_BY_EVENT_ID_MIN_EVENT_CONTRACT_DESC'
  | 'ACALA_EVM_EXECUTED_FAILED_LOGS_BY_EVENT_ID_MIN_EVENT_ID_ASC'
  | 'ACALA_EVM_EXECUTED_FAILED_LOGS_BY_EVENT_ID_MIN_EVENT_ID_DESC'
  | 'ACALA_EVM_EXECUTED_FAILED_LOGS_BY_EVENT_ID_MIN_ID_ASC'
  | 'ACALA_EVM_EXECUTED_FAILED_LOGS_BY_EVENT_ID_MIN_ID_DESC'
  | 'ACALA_EVM_EXECUTED_FAILED_LOGS_BY_EVENT_ID_MIN_TOPIC0_ASC'
  | 'ACALA_EVM_EXECUTED_FAILED_LOGS_BY_EVENT_ID_MIN_TOPIC0_DESC'
  | 'ACALA_EVM_EXECUTED_FAILED_LOGS_BY_EVENT_ID_MIN_TOPIC1_ASC'
  | 'ACALA_EVM_EXECUTED_FAILED_LOGS_BY_EVENT_ID_MIN_TOPIC1_DESC'
  | 'ACALA_EVM_EXECUTED_FAILED_LOGS_BY_EVENT_ID_MIN_TOPIC2_ASC'
  | 'ACALA_EVM_EXECUTED_FAILED_LOGS_BY_EVENT_ID_MIN_TOPIC2_DESC'
  | 'ACALA_EVM_EXECUTED_FAILED_LOGS_BY_EVENT_ID_MIN_TOPIC3_ASC'
  | 'ACALA_EVM_EXECUTED_FAILED_LOGS_BY_EVENT_ID_MIN_TOPIC3_DESC'
  | 'ACALA_EVM_EXECUTED_FAILED_LOGS_BY_EVENT_ID_STDDEV_POPULATION_CONTRACT_ASC'
  | 'ACALA_EVM_EXECUTED_FAILED_LOGS_BY_EVENT_ID_STDDEV_POPULATION_CONTRACT_DESC'
  | 'ACALA_EVM_EXECUTED_FAILED_LOGS_BY_EVENT_ID_STDDEV_POPULATION_EVENT_CONTRACT_ASC'
  | 'ACALA_EVM_EXECUTED_FAILED_LOGS_BY_EVENT_ID_STDDEV_POPULATION_EVENT_CONTRACT_DESC'
  | 'ACALA_EVM_EXECUTED_FAILED_LOGS_BY_EVENT_ID_STDDEV_POPULATION_EVENT_ID_ASC'
  | 'ACALA_EVM_EXECUTED_FAILED_LOGS_BY_EVENT_ID_STDDEV_POPULATION_EVENT_ID_DESC'
  | 'ACALA_EVM_EXECUTED_FAILED_LOGS_BY_EVENT_ID_STDDEV_POPULATION_ID_ASC'
  | 'ACALA_EVM_EXECUTED_FAILED_LOGS_BY_EVENT_ID_STDDEV_POPULATION_ID_DESC'
  | 'ACALA_EVM_EXECUTED_FAILED_LOGS_BY_EVENT_ID_STDDEV_POPULATION_TOPIC0_ASC'
  | 'ACALA_EVM_EXECUTED_FAILED_LOGS_BY_EVENT_ID_STDDEV_POPULATION_TOPIC0_DESC'
  | 'ACALA_EVM_EXECUTED_FAILED_LOGS_BY_EVENT_ID_STDDEV_POPULATION_TOPIC1_ASC'
  | 'ACALA_EVM_EXECUTED_FAILED_LOGS_BY_EVENT_ID_STDDEV_POPULATION_TOPIC1_DESC'
  | 'ACALA_EVM_EXECUTED_FAILED_LOGS_BY_EVENT_ID_STDDEV_POPULATION_TOPIC2_ASC'
  | 'ACALA_EVM_EXECUTED_FAILED_LOGS_BY_EVENT_ID_STDDEV_POPULATION_TOPIC2_DESC'
  | 'ACALA_EVM_EXECUTED_FAILED_LOGS_BY_EVENT_ID_STDDEV_POPULATION_TOPIC3_ASC'
  | 'ACALA_EVM_EXECUTED_FAILED_LOGS_BY_EVENT_ID_STDDEV_POPULATION_TOPIC3_DESC'
  | 'ACALA_EVM_EXECUTED_FAILED_LOGS_BY_EVENT_ID_STDDEV_SAMPLE_CONTRACT_ASC'
  | 'ACALA_EVM_EXECUTED_FAILED_LOGS_BY_EVENT_ID_STDDEV_SAMPLE_CONTRACT_DESC'
  | 'ACALA_EVM_EXECUTED_FAILED_LOGS_BY_EVENT_ID_STDDEV_SAMPLE_EVENT_CONTRACT_ASC'
  | 'ACALA_EVM_EXECUTED_FAILED_LOGS_BY_EVENT_ID_STDDEV_SAMPLE_EVENT_CONTRACT_DESC'
  | 'ACALA_EVM_EXECUTED_FAILED_LOGS_BY_EVENT_ID_STDDEV_SAMPLE_EVENT_ID_ASC'
  | 'ACALA_EVM_EXECUTED_FAILED_LOGS_BY_EVENT_ID_STDDEV_SAMPLE_EVENT_ID_DESC'
  | 'ACALA_EVM_EXECUTED_FAILED_LOGS_BY_EVENT_ID_STDDEV_SAMPLE_ID_ASC'
  | 'ACALA_EVM_EXECUTED_FAILED_LOGS_BY_EVENT_ID_STDDEV_SAMPLE_ID_DESC'
  | 'ACALA_EVM_EXECUTED_FAILED_LOGS_BY_EVENT_ID_STDDEV_SAMPLE_TOPIC0_ASC'
  | 'ACALA_EVM_EXECUTED_FAILED_LOGS_BY_EVENT_ID_STDDEV_SAMPLE_TOPIC0_DESC'
  | 'ACALA_EVM_EXECUTED_FAILED_LOGS_BY_EVENT_ID_STDDEV_SAMPLE_TOPIC1_ASC'
  | 'ACALA_EVM_EXECUTED_FAILED_LOGS_BY_EVENT_ID_STDDEV_SAMPLE_TOPIC1_DESC'
  | 'ACALA_EVM_EXECUTED_FAILED_LOGS_BY_EVENT_ID_STDDEV_SAMPLE_TOPIC2_ASC'
  | 'ACALA_EVM_EXECUTED_FAILED_LOGS_BY_EVENT_ID_STDDEV_SAMPLE_TOPIC2_DESC'
  | 'ACALA_EVM_EXECUTED_FAILED_LOGS_BY_EVENT_ID_STDDEV_SAMPLE_TOPIC3_ASC'
  | 'ACALA_EVM_EXECUTED_FAILED_LOGS_BY_EVENT_ID_STDDEV_SAMPLE_TOPIC3_DESC'
  | 'ACALA_EVM_EXECUTED_FAILED_LOGS_BY_EVENT_ID_SUM_CONTRACT_ASC'
  | 'ACALA_EVM_EXECUTED_FAILED_LOGS_BY_EVENT_ID_SUM_CONTRACT_DESC'
  | 'ACALA_EVM_EXECUTED_FAILED_LOGS_BY_EVENT_ID_SUM_EVENT_CONTRACT_ASC'
  | 'ACALA_EVM_EXECUTED_FAILED_LOGS_BY_EVENT_ID_SUM_EVENT_CONTRACT_DESC'
  | 'ACALA_EVM_EXECUTED_FAILED_LOGS_BY_EVENT_ID_SUM_EVENT_ID_ASC'
  | 'ACALA_EVM_EXECUTED_FAILED_LOGS_BY_EVENT_ID_SUM_EVENT_ID_DESC'
  | 'ACALA_EVM_EXECUTED_FAILED_LOGS_BY_EVENT_ID_SUM_ID_ASC'
  | 'ACALA_EVM_EXECUTED_FAILED_LOGS_BY_EVENT_ID_SUM_ID_DESC'
  | 'ACALA_EVM_EXECUTED_FAILED_LOGS_BY_EVENT_ID_SUM_TOPIC0_ASC'
  | 'ACALA_EVM_EXECUTED_FAILED_LOGS_BY_EVENT_ID_SUM_TOPIC0_DESC'
  | 'ACALA_EVM_EXECUTED_FAILED_LOGS_BY_EVENT_ID_SUM_TOPIC1_ASC'
  | 'ACALA_EVM_EXECUTED_FAILED_LOGS_BY_EVENT_ID_SUM_TOPIC1_DESC'
  | 'ACALA_EVM_EXECUTED_FAILED_LOGS_BY_EVENT_ID_SUM_TOPIC2_ASC'
  | 'ACALA_EVM_EXECUTED_FAILED_LOGS_BY_EVENT_ID_SUM_TOPIC2_DESC'
  | 'ACALA_EVM_EXECUTED_FAILED_LOGS_BY_EVENT_ID_SUM_TOPIC3_ASC'
  | 'ACALA_EVM_EXECUTED_FAILED_LOGS_BY_EVENT_ID_SUM_TOPIC3_DESC'
  | 'ACALA_EVM_EXECUTED_FAILED_LOGS_BY_EVENT_ID_VARIANCE_POPULATION_CONTRACT_ASC'
  | 'ACALA_EVM_EXECUTED_FAILED_LOGS_BY_EVENT_ID_VARIANCE_POPULATION_CONTRACT_DESC'
  | 'ACALA_EVM_EXECUTED_FAILED_LOGS_BY_EVENT_ID_VARIANCE_POPULATION_EVENT_CONTRACT_ASC'
  | 'ACALA_EVM_EXECUTED_FAILED_LOGS_BY_EVENT_ID_VARIANCE_POPULATION_EVENT_CONTRACT_DESC'
  | 'ACALA_EVM_EXECUTED_FAILED_LOGS_BY_EVENT_ID_VARIANCE_POPULATION_EVENT_ID_ASC'
  | 'ACALA_EVM_EXECUTED_FAILED_LOGS_BY_EVENT_ID_VARIANCE_POPULATION_EVENT_ID_DESC'
  | 'ACALA_EVM_EXECUTED_FAILED_LOGS_BY_EVENT_ID_VARIANCE_POPULATION_ID_ASC'
  | 'ACALA_EVM_EXECUTED_FAILED_LOGS_BY_EVENT_ID_VARIANCE_POPULATION_ID_DESC'
  | 'ACALA_EVM_EXECUTED_FAILED_LOGS_BY_EVENT_ID_VARIANCE_POPULATION_TOPIC0_ASC'
  | 'ACALA_EVM_EXECUTED_FAILED_LOGS_BY_EVENT_ID_VARIANCE_POPULATION_TOPIC0_DESC'
  | 'ACALA_EVM_EXECUTED_FAILED_LOGS_BY_EVENT_ID_VARIANCE_POPULATION_TOPIC1_ASC'
  | 'ACALA_EVM_EXECUTED_FAILED_LOGS_BY_EVENT_ID_VARIANCE_POPULATION_TOPIC1_DESC'
  | 'ACALA_EVM_EXECUTED_FAILED_LOGS_BY_EVENT_ID_VARIANCE_POPULATION_TOPIC2_ASC'
  | 'ACALA_EVM_EXECUTED_FAILED_LOGS_BY_EVENT_ID_VARIANCE_POPULATION_TOPIC2_DESC'
  | 'ACALA_EVM_EXECUTED_FAILED_LOGS_BY_EVENT_ID_VARIANCE_POPULATION_TOPIC3_ASC'
  | 'ACALA_EVM_EXECUTED_FAILED_LOGS_BY_EVENT_ID_VARIANCE_POPULATION_TOPIC3_DESC'
  | 'ACALA_EVM_EXECUTED_FAILED_LOGS_BY_EVENT_ID_VARIANCE_SAMPLE_CONTRACT_ASC'
  | 'ACALA_EVM_EXECUTED_FAILED_LOGS_BY_EVENT_ID_VARIANCE_SAMPLE_CONTRACT_DESC'
  | 'ACALA_EVM_EXECUTED_FAILED_LOGS_BY_EVENT_ID_VARIANCE_SAMPLE_EVENT_CONTRACT_ASC'
  | 'ACALA_EVM_EXECUTED_FAILED_LOGS_BY_EVENT_ID_VARIANCE_SAMPLE_EVENT_CONTRACT_DESC'
  | 'ACALA_EVM_EXECUTED_FAILED_LOGS_BY_EVENT_ID_VARIANCE_SAMPLE_EVENT_ID_ASC'
  | 'ACALA_EVM_EXECUTED_FAILED_LOGS_BY_EVENT_ID_VARIANCE_SAMPLE_EVENT_ID_DESC'
  | 'ACALA_EVM_EXECUTED_FAILED_LOGS_BY_EVENT_ID_VARIANCE_SAMPLE_ID_ASC'
  | 'ACALA_EVM_EXECUTED_FAILED_LOGS_BY_EVENT_ID_VARIANCE_SAMPLE_ID_DESC'
  | 'ACALA_EVM_EXECUTED_FAILED_LOGS_BY_EVENT_ID_VARIANCE_SAMPLE_TOPIC0_ASC'
  | 'ACALA_EVM_EXECUTED_FAILED_LOGS_BY_EVENT_ID_VARIANCE_SAMPLE_TOPIC0_DESC'
  | 'ACALA_EVM_EXECUTED_FAILED_LOGS_BY_EVENT_ID_VARIANCE_SAMPLE_TOPIC1_ASC'
  | 'ACALA_EVM_EXECUTED_FAILED_LOGS_BY_EVENT_ID_VARIANCE_SAMPLE_TOPIC1_DESC'
  | 'ACALA_EVM_EXECUTED_FAILED_LOGS_BY_EVENT_ID_VARIANCE_SAMPLE_TOPIC2_ASC'
  | 'ACALA_EVM_EXECUTED_FAILED_LOGS_BY_EVENT_ID_VARIANCE_SAMPLE_TOPIC2_DESC'
  | 'ACALA_EVM_EXECUTED_FAILED_LOGS_BY_EVENT_ID_VARIANCE_SAMPLE_TOPIC3_ASC'
  | 'ACALA_EVM_EXECUTED_FAILED_LOGS_BY_EVENT_ID_VARIANCE_SAMPLE_TOPIC3_DESC'
  | 'ACALA_EVM_EXECUTED_LOGS_BY_EVENT_ID_AVERAGE_CONTRACT_ASC'
  | 'ACALA_EVM_EXECUTED_LOGS_BY_EVENT_ID_AVERAGE_CONTRACT_DESC'
  | 'ACALA_EVM_EXECUTED_LOGS_BY_EVENT_ID_AVERAGE_EVENT_CONTRACT_ASC'
  | 'ACALA_EVM_EXECUTED_LOGS_BY_EVENT_ID_AVERAGE_EVENT_CONTRACT_DESC'
  | 'ACALA_EVM_EXECUTED_LOGS_BY_EVENT_ID_AVERAGE_EVENT_ID_ASC'
  | 'ACALA_EVM_EXECUTED_LOGS_BY_EVENT_ID_AVERAGE_EVENT_ID_DESC'
  | 'ACALA_EVM_EXECUTED_LOGS_BY_EVENT_ID_AVERAGE_ID_ASC'
  | 'ACALA_EVM_EXECUTED_LOGS_BY_EVENT_ID_AVERAGE_ID_DESC'
  | 'ACALA_EVM_EXECUTED_LOGS_BY_EVENT_ID_AVERAGE_TOPIC0_ASC'
  | 'ACALA_EVM_EXECUTED_LOGS_BY_EVENT_ID_AVERAGE_TOPIC0_DESC'
  | 'ACALA_EVM_EXECUTED_LOGS_BY_EVENT_ID_AVERAGE_TOPIC1_ASC'
  | 'ACALA_EVM_EXECUTED_LOGS_BY_EVENT_ID_AVERAGE_TOPIC1_DESC'
  | 'ACALA_EVM_EXECUTED_LOGS_BY_EVENT_ID_AVERAGE_TOPIC2_ASC'
  | 'ACALA_EVM_EXECUTED_LOGS_BY_EVENT_ID_AVERAGE_TOPIC2_DESC'
  | 'ACALA_EVM_EXECUTED_LOGS_BY_EVENT_ID_AVERAGE_TOPIC3_ASC'
  | 'ACALA_EVM_EXECUTED_LOGS_BY_EVENT_ID_AVERAGE_TOPIC3_DESC'
  | 'ACALA_EVM_EXECUTED_LOGS_BY_EVENT_ID_COUNT_ASC'
  | 'ACALA_EVM_EXECUTED_LOGS_BY_EVENT_ID_COUNT_DESC'
  | 'ACALA_EVM_EXECUTED_LOGS_BY_EVENT_ID_DISTINCT_COUNT_CONTRACT_ASC'
  | 'ACALA_EVM_EXECUTED_LOGS_BY_EVENT_ID_DISTINCT_COUNT_CONTRACT_DESC'
  | 'ACALA_EVM_EXECUTED_LOGS_BY_EVENT_ID_DISTINCT_COUNT_EVENT_CONTRACT_ASC'
  | 'ACALA_EVM_EXECUTED_LOGS_BY_EVENT_ID_DISTINCT_COUNT_EVENT_CONTRACT_DESC'
  | 'ACALA_EVM_EXECUTED_LOGS_BY_EVENT_ID_DISTINCT_COUNT_EVENT_ID_ASC'
  | 'ACALA_EVM_EXECUTED_LOGS_BY_EVENT_ID_DISTINCT_COUNT_EVENT_ID_DESC'
  | 'ACALA_EVM_EXECUTED_LOGS_BY_EVENT_ID_DISTINCT_COUNT_ID_ASC'
  | 'ACALA_EVM_EXECUTED_LOGS_BY_EVENT_ID_DISTINCT_COUNT_ID_DESC'
  | 'ACALA_EVM_EXECUTED_LOGS_BY_EVENT_ID_DISTINCT_COUNT_TOPIC0_ASC'
  | 'ACALA_EVM_EXECUTED_LOGS_BY_EVENT_ID_DISTINCT_COUNT_TOPIC0_DESC'
  | 'ACALA_EVM_EXECUTED_LOGS_BY_EVENT_ID_DISTINCT_COUNT_TOPIC1_ASC'
  | 'ACALA_EVM_EXECUTED_LOGS_BY_EVENT_ID_DISTINCT_COUNT_TOPIC1_DESC'
  | 'ACALA_EVM_EXECUTED_LOGS_BY_EVENT_ID_DISTINCT_COUNT_TOPIC2_ASC'
  | 'ACALA_EVM_EXECUTED_LOGS_BY_EVENT_ID_DISTINCT_COUNT_TOPIC2_DESC'
  | 'ACALA_EVM_EXECUTED_LOGS_BY_EVENT_ID_DISTINCT_COUNT_TOPIC3_ASC'
  | 'ACALA_EVM_EXECUTED_LOGS_BY_EVENT_ID_DISTINCT_COUNT_TOPIC3_DESC'
  | 'ACALA_EVM_EXECUTED_LOGS_BY_EVENT_ID_MAX_CONTRACT_ASC'
  | 'ACALA_EVM_EXECUTED_LOGS_BY_EVENT_ID_MAX_CONTRACT_DESC'
  | 'ACALA_EVM_EXECUTED_LOGS_BY_EVENT_ID_MAX_EVENT_CONTRACT_ASC'
  | 'ACALA_EVM_EXECUTED_LOGS_BY_EVENT_ID_MAX_EVENT_CONTRACT_DESC'
  | 'ACALA_EVM_EXECUTED_LOGS_BY_EVENT_ID_MAX_EVENT_ID_ASC'
  | 'ACALA_EVM_EXECUTED_LOGS_BY_EVENT_ID_MAX_EVENT_ID_DESC'
  | 'ACALA_EVM_EXECUTED_LOGS_BY_EVENT_ID_MAX_ID_ASC'
  | 'ACALA_EVM_EXECUTED_LOGS_BY_EVENT_ID_MAX_ID_DESC'
  | 'ACALA_EVM_EXECUTED_LOGS_BY_EVENT_ID_MAX_TOPIC0_ASC'
  | 'ACALA_EVM_EXECUTED_LOGS_BY_EVENT_ID_MAX_TOPIC0_DESC'
  | 'ACALA_EVM_EXECUTED_LOGS_BY_EVENT_ID_MAX_TOPIC1_ASC'
  | 'ACALA_EVM_EXECUTED_LOGS_BY_EVENT_ID_MAX_TOPIC1_DESC'
  | 'ACALA_EVM_EXECUTED_LOGS_BY_EVENT_ID_MAX_TOPIC2_ASC'
  | 'ACALA_EVM_EXECUTED_LOGS_BY_EVENT_ID_MAX_TOPIC2_DESC'
  | 'ACALA_EVM_EXECUTED_LOGS_BY_EVENT_ID_MAX_TOPIC3_ASC'
  | 'ACALA_EVM_EXECUTED_LOGS_BY_EVENT_ID_MAX_TOPIC3_DESC'
  | 'ACALA_EVM_EXECUTED_LOGS_BY_EVENT_ID_MIN_CONTRACT_ASC'
  | 'ACALA_EVM_EXECUTED_LOGS_BY_EVENT_ID_MIN_CONTRACT_DESC'
  | 'ACALA_EVM_EXECUTED_LOGS_BY_EVENT_ID_MIN_EVENT_CONTRACT_ASC'
  | 'ACALA_EVM_EXECUTED_LOGS_BY_EVENT_ID_MIN_EVENT_CONTRACT_DESC'
  | 'ACALA_EVM_EXECUTED_LOGS_BY_EVENT_ID_MIN_EVENT_ID_ASC'
  | 'ACALA_EVM_EXECUTED_LOGS_BY_EVENT_ID_MIN_EVENT_ID_DESC'
  | 'ACALA_EVM_EXECUTED_LOGS_BY_EVENT_ID_MIN_ID_ASC'
  | 'ACALA_EVM_EXECUTED_LOGS_BY_EVENT_ID_MIN_ID_DESC'
  | 'ACALA_EVM_EXECUTED_LOGS_BY_EVENT_ID_MIN_TOPIC0_ASC'
  | 'ACALA_EVM_EXECUTED_LOGS_BY_EVENT_ID_MIN_TOPIC0_DESC'
  | 'ACALA_EVM_EXECUTED_LOGS_BY_EVENT_ID_MIN_TOPIC1_ASC'
  | 'ACALA_EVM_EXECUTED_LOGS_BY_EVENT_ID_MIN_TOPIC1_DESC'
  | 'ACALA_EVM_EXECUTED_LOGS_BY_EVENT_ID_MIN_TOPIC2_ASC'
  | 'ACALA_EVM_EXECUTED_LOGS_BY_EVENT_ID_MIN_TOPIC2_DESC'
  | 'ACALA_EVM_EXECUTED_LOGS_BY_EVENT_ID_MIN_TOPIC3_ASC'
  | 'ACALA_EVM_EXECUTED_LOGS_BY_EVENT_ID_MIN_TOPIC3_DESC'
  | 'ACALA_EVM_EXECUTED_LOGS_BY_EVENT_ID_STDDEV_POPULATION_CONTRACT_ASC'
  | 'ACALA_EVM_EXECUTED_LOGS_BY_EVENT_ID_STDDEV_POPULATION_CONTRACT_DESC'
  | 'ACALA_EVM_EXECUTED_LOGS_BY_EVENT_ID_STDDEV_POPULATION_EVENT_CONTRACT_ASC'
  | 'ACALA_EVM_EXECUTED_LOGS_BY_EVENT_ID_STDDEV_POPULATION_EVENT_CONTRACT_DESC'
  | 'ACALA_EVM_EXECUTED_LOGS_BY_EVENT_ID_STDDEV_POPULATION_EVENT_ID_ASC'
  | 'ACALA_EVM_EXECUTED_LOGS_BY_EVENT_ID_STDDEV_POPULATION_EVENT_ID_DESC'
  | 'ACALA_EVM_EXECUTED_LOGS_BY_EVENT_ID_STDDEV_POPULATION_ID_ASC'
  | 'ACALA_EVM_EXECUTED_LOGS_BY_EVENT_ID_STDDEV_POPULATION_ID_DESC'
  | 'ACALA_EVM_EXECUTED_LOGS_BY_EVENT_ID_STDDEV_POPULATION_TOPIC0_ASC'
  | 'ACALA_EVM_EXECUTED_LOGS_BY_EVENT_ID_STDDEV_POPULATION_TOPIC0_DESC'
  | 'ACALA_EVM_EXECUTED_LOGS_BY_EVENT_ID_STDDEV_POPULATION_TOPIC1_ASC'
  | 'ACALA_EVM_EXECUTED_LOGS_BY_EVENT_ID_STDDEV_POPULATION_TOPIC1_DESC'
  | 'ACALA_EVM_EXECUTED_LOGS_BY_EVENT_ID_STDDEV_POPULATION_TOPIC2_ASC'
  | 'ACALA_EVM_EXECUTED_LOGS_BY_EVENT_ID_STDDEV_POPULATION_TOPIC2_DESC'
  | 'ACALA_EVM_EXECUTED_LOGS_BY_EVENT_ID_STDDEV_POPULATION_TOPIC3_ASC'
  | 'ACALA_EVM_EXECUTED_LOGS_BY_EVENT_ID_STDDEV_POPULATION_TOPIC3_DESC'
  | 'ACALA_EVM_EXECUTED_LOGS_BY_EVENT_ID_STDDEV_SAMPLE_CONTRACT_ASC'
  | 'ACALA_EVM_EXECUTED_LOGS_BY_EVENT_ID_STDDEV_SAMPLE_CONTRACT_DESC'
  | 'ACALA_EVM_EXECUTED_LOGS_BY_EVENT_ID_STDDEV_SAMPLE_EVENT_CONTRACT_ASC'
  | 'ACALA_EVM_EXECUTED_LOGS_BY_EVENT_ID_STDDEV_SAMPLE_EVENT_CONTRACT_DESC'
  | 'ACALA_EVM_EXECUTED_LOGS_BY_EVENT_ID_STDDEV_SAMPLE_EVENT_ID_ASC'
  | 'ACALA_EVM_EXECUTED_LOGS_BY_EVENT_ID_STDDEV_SAMPLE_EVENT_ID_DESC'
  | 'ACALA_EVM_EXECUTED_LOGS_BY_EVENT_ID_STDDEV_SAMPLE_ID_ASC'
  | 'ACALA_EVM_EXECUTED_LOGS_BY_EVENT_ID_STDDEV_SAMPLE_ID_DESC'
  | 'ACALA_EVM_EXECUTED_LOGS_BY_EVENT_ID_STDDEV_SAMPLE_TOPIC0_ASC'
  | 'ACALA_EVM_EXECUTED_LOGS_BY_EVENT_ID_STDDEV_SAMPLE_TOPIC0_DESC'
  | 'ACALA_EVM_EXECUTED_LOGS_BY_EVENT_ID_STDDEV_SAMPLE_TOPIC1_ASC'
  | 'ACALA_EVM_EXECUTED_LOGS_BY_EVENT_ID_STDDEV_SAMPLE_TOPIC1_DESC'
  | 'ACALA_EVM_EXECUTED_LOGS_BY_EVENT_ID_STDDEV_SAMPLE_TOPIC2_ASC'
  | 'ACALA_EVM_EXECUTED_LOGS_BY_EVENT_ID_STDDEV_SAMPLE_TOPIC2_DESC'
  | 'ACALA_EVM_EXECUTED_LOGS_BY_EVENT_ID_STDDEV_SAMPLE_TOPIC3_ASC'
  | 'ACALA_EVM_EXECUTED_LOGS_BY_EVENT_ID_STDDEV_SAMPLE_TOPIC3_DESC'
  | 'ACALA_EVM_EXECUTED_LOGS_BY_EVENT_ID_SUM_CONTRACT_ASC'
  | 'ACALA_EVM_EXECUTED_LOGS_BY_EVENT_ID_SUM_CONTRACT_DESC'
  | 'ACALA_EVM_EXECUTED_LOGS_BY_EVENT_ID_SUM_EVENT_CONTRACT_ASC'
  | 'ACALA_EVM_EXECUTED_LOGS_BY_EVENT_ID_SUM_EVENT_CONTRACT_DESC'
  | 'ACALA_EVM_EXECUTED_LOGS_BY_EVENT_ID_SUM_EVENT_ID_ASC'
  | 'ACALA_EVM_EXECUTED_LOGS_BY_EVENT_ID_SUM_EVENT_ID_DESC'
  | 'ACALA_EVM_EXECUTED_LOGS_BY_EVENT_ID_SUM_ID_ASC'
  | 'ACALA_EVM_EXECUTED_LOGS_BY_EVENT_ID_SUM_ID_DESC'
  | 'ACALA_EVM_EXECUTED_LOGS_BY_EVENT_ID_SUM_TOPIC0_ASC'
  | 'ACALA_EVM_EXECUTED_LOGS_BY_EVENT_ID_SUM_TOPIC0_DESC'
  | 'ACALA_EVM_EXECUTED_LOGS_BY_EVENT_ID_SUM_TOPIC1_ASC'
  | 'ACALA_EVM_EXECUTED_LOGS_BY_EVENT_ID_SUM_TOPIC1_DESC'
  | 'ACALA_EVM_EXECUTED_LOGS_BY_EVENT_ID_SUM_TOPIC2_ASC'
  | 'ACALA_EVM_EXECUTED_LOGS_BY_EVENT_ID_SUM_TOPIC2_DESC'
  | 'ACALA_EVM_EXECUTED_LOGS_BY_EVENT_ID_SUM_TOPIC3_ASC'
  | 'ACALA_EVM_EXECUTED_LOGS_BY_EVENT_ID_SUM_TOPIC3_DESC'
  | 'ACALA_EVM_EXECUTED_LOGS_BY_EVENT_ID_VARIANCE_POPULATION_CONTRACT_ASC'
  | 'ACALA_EVM_EXECUTED_LOGS_BY_EVENT_ID_VARIANCE_POPULATION_CONTRACT_DESC'
  | 'ACALA_EVM_EXECUTED_LOGS_BY_EVENT_ID_VARIANCE_POPULATION_EVENT_CONTRACT_ASC'
  | 'ACALA_EVM_EXECUTED_LOGS_BY_EVENT_ID_VARIANCE_POPULATION_EVENT_CONTRACT_DESC'
  | 'ACALA_EVM_EXECUTED_LOGS_BY_EVENT_ID_VARIANCE_POPULATION_EVENT_ID_ASC'
  | 'ACALA_EVM_EXECUTED_LOGS_BY_EVENT_ID_VARIANCE_POPULATION_EVENT_ID_DESC'
  | 'ACALA_EVM_EXECUTED_LOGS_BY_EVENT_ID_VARIANCE_POPULATION_ID_ASC'
  | 'ACALA_EVM_EXECUTED_LOGS_BY_EVENT_ID_VARIANCE_POPULATION_ID_DESC'
  | 'ACALA_EVM_EXECUTED_LOGS_BY_EVENT_ID_VARIANCE_POPULATION_TOPIC0_ASC'
  | 'ACALA_EVM_EXECUTED_LOGS_BY_EVENT_ID_VARIANCE_POPULATION_TOPIC0_DESC'
  | 'ACALA_EVM_EXECUTED_LOGS_BY_EVENT_ID_VARIANCE_POPULATION_TOPIC1_ASC'
  | 'ACALA_EVM_EXECUTED_LOGS_BY_EVENT_ID_VARIANCE_POPULATION_TOPIC1_DESC'
  | 'ACALA_EVM_EXECUTED_LOGS_BY_EVENT_ID_VARIANCE_POPULATION_TOPIC2_ASC'
  | 'ACALA_EVM_EXECUTED_LOGS_BY_EVENT_ID_VARIANCE_POPULATION_TOPIC2_DESC'
  | 'ACALA_EVM_EXECUTED_LOGS_BY_EVENT_ID_VARIANCE_POPULATION_TOPIC3_ASC'
  | 'ACALA_EVM_EXECUTED_LOGS_BY_EVENT_ID_VARIANCE_POPULATION_TOPIC3_DESC'
  | 'ACALA_EVM_EXECUTED_LOGS_BY_EVENT_ID_VARIANCE_SAMPLE_CONTRACT_ASC'
  | 'ACALA_EVM_EXECUTED_LOGS_BY_EVENT_ID_VARIANCE_SAMPLE_CONTRACT_DESC'
  | 'ACALA_EVM_EXECUTED_LOGS_BY_EVENT_ID_VARIANCE_SAMPLE_EVENT_CONTRACT_ASC'
  | 'ACALA_EVM_EXECUTED_LOGS_BY_EVENT_ID_VARIANCE_SAMPLE_EVENT_CONTRACT_DESC'
  | 'ACALA_EVM_EXECUTED_LOGS_BY_EVENT_ID_VARIANCE_SAMPLE_EVENT_ID_ASC'
  | 'ACALA_EVM_EXECUTED_LOGS_BY_EVENT_ID_VARIANCE_SAMPLE_EVENT_ID_DESC'
  | 'ACALA_EVM_EXECUTED_LOGS_BY_EVENT_ID_VARIANCE_SAMPLE_ID_ASC'
  | 'ACALA_EVM_EXECUTED_LOGS_BY_EVENT_ID_VARIANCE_SAMPLE_ID_DESC'
  | 'ACALA_EVM_EXECUTED_LOGS_BY_EVENT_ID_VARIANCE_SAMPLE_TOPIC0_ASC'
  | 'ACALA_EVM_EXECUTED_LOGS_BY_EVENT_ID_VARIANCE_SAMPLE_TOPIC0_DESC'
  | 'ACALA_EVM_EXECUTED_LOGS_BY_EVENT_ID_VARIANCE_SAMPLE_TOPIC1_ASC'
  | 'ACALA_EVM_EXECUTED_LOGS_BY_EVENT_ID_VARIANCE_SAMPLE_TOPIC1_DESC'
  | 'ACALA_EVM_EXECUTED_LOGS_BY_EVENT_ID_VARIANCE_SAMPLE_TOPIC2_ASC'
  | 'ACALA_EVM_EXECUTED_LOGS_BY_EVENT_ID_VARIANCE_SAMPLE_TOPIC2_DESC'
  | 'ACALA_EVM_EXECUTED_LOGS_BY_EVENT_ID_VARIANCE_SAMPLE_TOPIC3_ASC'
  | 'ACALA_EVM_EXECUTED_LOGS_BY_EVENT_ID_VARIANCE_SAMPLE_TOPIC3_DESC'
  | 'ARGS_ASC'
  | 'ARGS_DESC'
  | 'BLOCK_ID_ASC'
  | 'BLOCK_ID_DESC'
  | 'CALL_ID_ASC'
  | 'CALL_ID_DESC'
  | 'EXTRINSIC_ID_ASC'
  | 'EXTRINSIC_ID_DESC'
  | 'ID_ASC'
  | 'ID_DESC'
  | 'INDEX_IN_BLOCK_ASC'
  | 'INDEX_IN_BLOCK_DESC'
  | 'NAME_ASC'
  | 'NAME_DESC'
  | 'NATURAL'
  | 'PHASE_ASC'
  | 'PHASE_DESC'
  | 'POS_ASC'
  | 'POS_DESC'
  | 'PRIMARY_KEY_ASC'
  | 'PRIMARY_KEY_DESC';

export type Extrinsic = Node & {
  __typename?: 'Extrinsic';
  /** Reads a single `Block` that is related to this `Extrinsic`. */
  blockByBlockId: Block;
  blockId: Scalars['String']['output'];
  callId: Scalars['String']['output'];
  /** Reads and enables pagination through a set of `Call`. */
  callsByExtrinsicId: CallsConnection;
  error?: Maybe<Scalars['JSON']['output']>;
  /** Reads and enables pagination through a set of `Event`. */
  eventsByExtrinsicId: EventsConnection;
  fee?: Maybe<Scalars['BigFloat']['output']>;
  hash: Scalars['String']['output'];
  id: Scalars['String']['output'];
  indexInBlock: Scalars['Int']['output'];
  /** A globally unique identifier. Can be used in various places throughout the system to identify this single value. */
  nodeId: Scalars['ID']['output'];
  pos: Scalars['Int']['output'];
  signature?: Maybe<Scalars['JSON']['output']>;
  success: Scalars['Boolean']['output'];
  tip?: Maybe<Scalars['BigFloat']['output']>;
  version: Scalars['Int']['output'];
};


export type ExtrinsicCallsByExtrinsicIdArgs = {
  after?: InputMaybe<Scalars['Cursor']['input']>;
  before?: InputMaybe<Scalars['Cursor']['input']>;
  condition?: InputMaybe<CallCondition>;
  filter?: InputMaybe<CallFilter>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<CallsOrderBy>>;
};


export type ExtrinsicEventsByExtrinsicIdArgs = {
  after?: InputMaybe<Scalars['Cursor']['input']>;
  before?: InputMaybe<Scalars['Cursor']['input']>;
  condition?: InputMaybe<EventCondition>;
  filter?: InputMaybe<EventFilter>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<EventsOrderBy>>;
};

export type ExtrinsicAggregates = {
  __typename?: 'ExtrinsicAggregates';
  /** Mean average aggregates across the matching connection (ignoring before/after/first/last/offset) */
  average?: Maybe<ExtrinsicAverageAggregates>;
  /** Distinct count aggregates across the matching connection (ignoring before/after/first/last/offset) */
  distinctCount?: Maybe<ExtrinsicDistinctCountAggregates>;
  keys?: Maybe<Array<Scalars['String']['output']>>;
  /** Maximum aggregates across the matching connection (ignoring before/after/first/last/offset) */
  max?: Maybe<ExtrinsicMaxAggregates>;
  /** Minimum aggregates across the matching connection (ignoring before/after/first/last/offset) */
  min?: Maybe<ExtrinsicMinAggregates>;
  /** Population standard deviation aggregates across the matching connection (ignoring before/after/first/last/offset) */
  stddevPopulation?: Maybe<ExtrinsicStddevPopulationAggregates>;
  /** Sample standard deviation aggregates across the matching connection (ignoring before/after/first/last/offset) */
  stddevSample?: Maybe<ExtrinsicStddevSampleAggregates>;
  /** Sum aggregates across the matching connection (ignoring before/after/first/last/offset) */
  sum?: Maybe<ExtrinsicSumAggregates>;
  /** Population variance aggregates across the matching connection (ignoring before/after/first/last/offset) */
  variancePopulation?: Maybe<ExtrinsicVariancePopulationAggregates>;
  /** Sample variance aggregates across the matching connection (ignoring before/after/first/last/offset) */
  varianceSample?: Maybe<ExtrinsicVarianceSampleAggregates>;
};

export type ExtrinsicAverageAggregates = {
  __typename?: 'ExtrinsicAverageAggregates';
  /** Mean average of fee across the matching connection */
  fee?: Maybe<Scalars['BigFloat']['output']>;
  /** Mean average of indexInBlock across the matching connection */
  indexInBlock?: Maybe<Scalars['BigFloat']['output']>;
  /** Mean average of pos across the matching connection */
  pos?: Maybe<Scalars['BigFloat']['output']>;
  /** Mean average of tip across the matching connection */
  tip?: Maybe<Scalars['BigFloat']['output']>;
  /** Mean average of version across the matching connection */
  version?: Maybe<Scalars['BigFloat']['output']>;
};

/**
 * A condition to be used against `Extrinsic` object types. All fields are tested
 * for equality and combined with a logical ‘and.’
 */
export type ExtrinsicCondition = {
  /** Checks for equality with the object’s `blockId` field. */
  blockId?: InputMaybe<Scalars['String']['input']>;
  /** Checks for equality with the object’s `callId` field. */
  callId?: InputMaybe<Scalars['String']['input']>;
  /** Checks for equality with the object’s `error` field. */
  error?: InputMaybe<Scalars['JSON']['input']>;
  /** Checks for equality with the object’s `fee` field. */
  fee?: InputMaybe<Scalars['BigFloat']['input']>;
  /** Checks for equality with the object’s `hash` field. */
  hash?: InputMaybe<Scalars['String']['input']>;
  /** Checks for equality with the object’s `id` field. */
  id?: InputMaybe<Scalars['String']['input']>;
  /** Checks for equality with the object’s `indexInBlock` field. */
  indexInBlock?: InputMaybe<Scalars['Int']['input']>;
  /** Checks for equality with the object’s `pos` field. */
  pos?: InputMaybe<Scalars['Int']['input']>;
  /** Checks for equality with the object’s `signature` field. */
  signature?: InputMaybe<Scalars['JSON']['input']>;
  /** Checks for equality with the object’s `success` field. */
  success?: InputMaybe<Scalars['Boolean']['input']>;
  /** Checks for equality with the object’s `tip` field. */
  tip?: InputMaybe<Scalars['BigFloat']['input']>;
  /** Checks for equality with the object’s `version` field. */
  version?: InputMaybe<Scalars['Int']['input']>;
};

export type ExtrinsicDistinctCountAggregates = {
  __typename?: 'ExtrinsicDistinctCountAggregates';
  /** Distinct count of blockId across the matching connection */
  blockId?: Maybe<Scalars['BigInt']['output']>;
  /** Distinct count of callId across the matching connection */
  callId?: Maybe<Scalars['BigInt']['output']>;
  /** Distinct count of error across the matching connection */
  error?: Maybe<Scalars['BigInt']['output']>;
  /** Distinct count of fee across the matching connection */
  fee?: Maybe<Scalars['BigInt']['output']>;
  /** Distinct count of hash across the matching connection */
  hash?: Maybe<Scalars['BigInt']['output']>;
  /** Distinct count of id across the matching connection */
  id?: Maybe<Scalars['BigInt']['output']>;
  /** Distinct count of indexInBlock across the matching connection */
  indexInBlock?: Maybe<Scalars['BigInt']['output']>;
  /** Distinct count of pos across the matching connection */
  pos?: Maybe<Scalars['BigInt']['output']>;
  /** Distinct count of signature across the matching connection */
  signature?: Maybe<Scalars['BigInt']['output']>;
  /** Distinct count of success across the matching connection */
  success?: Maybe<Scalars['BigInt']['output']>;
  /** Distinct count of tip across the matching connection */
  tip?: Maybe<Scalars['BigInt']['output']>;
  /** Distinct count of version across the matching connection */
  version?: Maybe<Scalars['BigInt']['output']>;
};

/** A filter to be used against `Extrinsic` object types. All fields are combined with a logical ‘and.’ */
export type ExtrinsicFilter = {
  /** Checks for all expressions in this list. */
  and?: InputMaybe<Array<ExtrinsicFilter>>;
  /** Filter by the object’s `blockId` field. */
  blockId?: InputMaybe<StringFilter>;
  /** Filter by the object’s `callId` field. */
  callId?: InputMaybe<StringFilter>;
  /** Filter by the object’s `error` field. */
  error?: InputMaybe<JsonFilter>;
  /** Filter by the object’s `fee` field. */
  fee?: InputMaybe<BigFloatFilter>;
  /** Filter by the object’s `hash` field. */
  hash?: InputMaybe<StringFilter>;
  /** Filter by the object’s `id` field. */
  id?: InputMaybe<StringFilter>;
  /** Filter by the object’s `indexInBlock` field. */
  indexInBlock?: InputMaybe<IntFilter>;
  /** Negates the expression. */
  not?: InputMaybe<ExtrinsicFilter>;
  /** Checks for any expressions in this list. */
  or?: InputMaybe<Array<ExtrinsicFilter>>;
  /** Filter by the object’s `pos` field. */
  pos?: InputMaybe<IntFilter>;
  /** Filter by the object’s `signature` field. */
  signature?: InputMaybe<JsonFilter>;
  /** Filter by the object’s `success` field. */
  success?: InputMaybe<BooleanFilter>;
  /** Filter by the object’s `tip` field. */
  tip?: InputMaybe<BigFloatFilter>;
  /** Filter by the object’s `version` field. */
  version?: InputMaybe<IntFilter>;
};

/** Grouping methods for `Extrinsic` for usage during aggregation. */
export type ExtrinsicGroupBy =
  | 'BLOCK_ID'
  | 'CALL_ID'
  | 'ERROR'
  | 'FEE'
  | 'HASH'
  | 'INDEX_IN_BLOCK'
  | 'POS'
  | 'SIGNATURE'
  | 'SUCCESS'
  | 'TIP'
  | 'VERSION';

export type ExtrinsicHavingAverageInput = {
  fee?: InputMaybe<HavingBigfloatFilter>;
  indexInBlock?: InputMaybe<HavingIntFilter>;
  pos?: InputMaybe<HavingIntFilter>;
  tip?: InputMaybe<HavingBigfloatFilter>;
  version?: InputMaybe<HavingIntFilter>;
};

export type ExtrinsicHavingDistinctCountInput = {
  fee?: InputMaybe<HavingBigfloatFilter>;
  indexInBlock?: InputMaybe<HavingIntFilter>;
  pos?: InputMaybe<HavingIntFilter>;
  tip?: InputMaybe<HavingBigfloatFilter>;
  version?: InputMaybe<HavingIntFilter>;
};

/** Conditions for `Extrinsic` aggregates. */
export type ExtrinsicHavingInput = {
  AND?: InputMaybe<Array<ExtrinsicHavingInput>>;
  OR?: InputMaybe<Array<ExtrinsicHavingInput>>;
  average?: InputMaybe<ExtrinsicHavingAverageInput>;
  distinctCount?: InputMaybe<ExtrinsicHavingDistinctCountInput>;
  max?: InputMaybe<ExtrinsicHavingMaxInput>;
  min?: InputMaybe<ExtrinsicHavingMinInput>;
  stddevPopulation?: InputMaybe<ExtrinsicHavingStddevPopulationInput>;
  stddevSample?: InputMaybe<ExtrinsicHavingStddevSampleInput>;
  sum?: InputMaybe<ExtrinsicHavingSumInput>;
  variancePopulation?: InputMaybe<ExtrinsicHavingVariancePopulationInput>;
  varianceSample?: InputMaybe<ExtrinsicHavingVarianceSampleInput>;
};

export type ExtrinsicHavingMaxInput = {
  fee?: InputMaybe<HavingBigfloatFilter>;
  indexInBlock?: InputMaybe<HavingIntFilter>;
  pos?: InputMaybe<HavingIntFilter>;
  tip?: InputMaybe<HavingBigfloatFilter>;
  version?: InputMaybe<HavingIntFilter>;
};

export type ExtrinsicHavingMinInput = {
  fee?: InputMaybe<HavingBigfloatFilter>;
  indexInBlock?: InputMaybe<HavingIntFilter>;
  pos?: InputMaybe<HavingIntFilter>;
  tip?: InputMaybe<HavingBigfloatFilter>;
  version?: InputMaybe<HavingIntFilter>;
};

export type ExtrinsicHavingStddevPopulationInput = {
  fee?: InputMaybe<HavingBigfloatFilter>;
  indexInBlock?: InputMaybe<HavingIntFilter>;
  pos?: InputMaybe<HavingIntFilter>;
  tip?: InputMaybe<HavingBigfloatFilter>;
  version?: InputMaybe<HavingIntFilter>;
};

export type ExtrinsicHavingStddevSampleInput = {
  fee?: InputMaybe<HavingBigfloatFilter>;
  indexInBlock?: InputMaybe<HavingIntFilter>;
  pos?: InputMaybe<HavingIntFilter>;
  tip?: InputMaybe<HavingBigfloatFilter>;
  version?: InputMaybe<HavingIntFilter>;
};

export type ExtrinsicHavingSumInput = {
  fee?: InputMaybe<HavingBigfloatFilter>;
  indexInBlock?: InputMaybe<HavingIntFilter>;
  pos?: InputMaybe<HavingIntFilter>;
  tip?: InputMaybe<HavingBigfloatFilter>;
  version?: InputMaybe<HavingIntFilter>;
};

export type ExtrinsicHavingVariancePopulationInput = {
  fee?: InputMaybe<HavingBigfloatFilter>;
  indexInBlock?: InputMaybe<HavingIntFilter>;
  pos?: InputMaybe<HavingIntFilter>;
  tip?: InputMaybe<HavingBigfloatFilter>;
  version?: InputMaybe<HavingIntFilter>;
};

export type ExtrinsicHavingVarianceSampleInput = {
  fee?: InputMaybe<HavingBigfloatFilter>;
  indexInBlock?: InputMaybe<HavingIntFilter>;
  pos?: InputMaybe<HavingIntFilter>;
  tip?: InputMaybe<HavingBigfloatFilter>;
  version?: InputMaybe<HavingIntFilter>;
};

export type ExtrinsicMaxAggregates = {
  __typename?: 'ExtrinsicMaxAggregates';
  /** Maximum of fee across the matching connection */
  fee?: Maybe<Scalars['BigFloat']['output']>;
  /** Maximum of indexInBlock across the matching connection */
  indexInBlock?: Maybe<Scalars['Int']['output']>;
  /** Maximum of pos across the matching connection */
  pos?: Maybe<Scalars['Int']['output']>;
  /** Maximum of tip across the matching connection */
  tip?: Maybe<Scalars['BigFloat']['output']>;
  /** Maximum of version across the matching connection */
  version?: Maybe<Scalars['Int']['output']>;
};

export type ExtrinsicMinAggregates = {
  __typename?: 'ExtrinsicMinAggregates';
  /** Minimum of fee across the matching connection */
  fee?: Maybe<Scalars['BigFloat']['output']>;
  /** Minimum of indexInBlock across the matching connection */
  indexInBlock?: Maybe<Scalars['Int']['output']>;
  /** Minimum of pos across the matching connection */
  pos?: Maybe<Scalars['Int']['output']>;
  /** Minimum of tip across the matching connection */
  tip?: Maybe<Scalars['BigFloat']['output']>;
  /** Minimum of version across the matching connection */
  version?: Maybe<Scalars['Int']['output']>;
};

export type ExtrinsicStddevPopulationAggregates = {
  __typename?: 'ExtrinsicStddevPopulationAggregates';
  /** Population standard deviation of fee across the matching connection */
  fee?: Maybe<Scalars['BigFloat']['output']>;
  /** Population standard deviation of indexInBlock across the matching connection */
  indexInBlock?: Maybe<Scalars['BigFloat']['output']>;
  /** Population standard deviation of pos across the matching connection */
  pos?: Maybe<Scalars['BigFloat']['output']>;
  /** Population standard deviation of tip across the matching connection */
  tip?: Maybe<Scalars['BigFloat']['output']>;
  /** Population standard deviation of version across the matching connection */
  version?: Maybe<Scalars['BigFloat']['output']>;
};

export type ExtrinsicStddevSampleAggregates = {
  __typename?: 'ExtrinsicStddevSampleAggregates';
  /** Sample standard deviation of fee across the matching connection */
  fee?: Maybe<Scalars['BigFloat']['output']>;
  /** Sample standard deviation of indexInBlock across the matching connection */
  indexInBlock?: Maybe<Scalars['BigFloat']['output']>;
  /** Sample standard deviation of pos across the matching connection */
  pos?: Maybe<Scalars['BigFloat']['output']>;
  /** Sample standard deviation of tip across the matching connection */
  tip?: Maybe<Scalars['BigFloat']['output']>;
  /** Sample standard deviation of version across the matching connection */
  version?: Maybe<Scalars['BigFloat']['output']>;
};

export type ExtrinsicSumAggregates = {
  __typename?: 'ExtrinsicSumAggregates';
  /** Sum of fee across the matching connection */
  fee: Scalars['BigFloat']['output'];
  /** Sum of indexInBlock across the matching connection */
  indexInBlock: Scalars['BigInt']['output'];
  /** Sum of pos across the matching connection */
  pos: Scalars['BigInt']['output'];
  /** Sum of tip across the matching connection */
  tip: Scalars['BigFloat']['output'];
  /** Sum of version across the matching connection */
  version: Scalars['BigInt']['output'];
};

export type ExtrinsicVariancePopulationAggregates = {
  __typename?: 'ExtrinsicVariancePopulationAggregates';
  /** Population variance of fee across the matching connection */
  fee?: Maybe<Scalars['BigFloat']['output']>;
  /** Population variance of indexInBlock across the matching connection */
  indexInBlock?: Maybe<Scalars['BigFloat']['output']>;
  /** Population variance of pos across the matching connection */
  pos?: Maybe<Scalars['BigFloat']['output']>;
  /** Population variance of tip across the matching connection */
  tip?: Maybe<Scalars['BigFloat']['output']>;
  /** Population variance of version across the matching connection */
  version?: Maybe<Scalars['BigFloat']['output']>;
};

export type ExtrinsicVarianceSampleAggregates = {
  __typename?: 'ExtrinsicVarianceSampleAggregates';
  /** Sample variance of fee across the matching connection */
  fee?: Maybe<Scalars['BigFloat']['output']>;
  /** Sample variance of indexInBlock across the matching connection */
  indexInBlock?: Maybe<Scalars['BigFloat']['output']>;
  /** Sample variance of pos across the matching connection */
  pos?: Maybe<Scalars['BigFloat']['output']>;
  /** Sample variance of tip across the matching connection */
  tip?: Maybe<Scalars['BigFloat']['output']>;
  /** Sample variance of version across the matching connection */
  version?: Maybe<Scalars['BigFloat']['output']>;
};

/** A connection to a list of `Extrinsic` values. */
export type ExtrinsicsConnection = {
  __typename?: 'ExtrinsicsConnection';
  /** Aggregates across the matching connection (ignoring before/after/first/last/offset) */
  aggregates?: Maybe<ExtrinsicAggregates>;
  /** A list of edges which contains the `Extrinsic` and cursor to aid in pagination. */
  edges: Array<ExtrinsicsEdge>;
  /** Grouped aggregates across the matching connection (ignoring before/after/first/last/offset) */
  groupedAggregates?: Maybe<Array<ExtrinsicAggregates>>;
  /** A list of `Extrinsic` objects. */
  nodes: Array<Extrinsic>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
  /** The count of *all* `Extrinsic` you could get from the connection. */
  totalCount: Scalars['Int']['output'];
};


/** A connection to a list of `Extrinsic` values. */
export type ExtrinsicsConnectionGroupedAggregatesArgs = {
  groupBy: Array<ExtrinsicGroupBy>;
  having?: InputMaybe<ExtrinsicHavingInput>;
};

/** A `Extrinsic` edge in the connection. */
export type ExtrinsicsEdge = {
  __typename?: 'ExtrinsicsEdge';
  /** A cursor for use in pagination. */
  cursor?: Maybe<Scalars['Cursor']['output']>;
  /** The `Extrinsic` at the end of the edge. */
  node: Extrinsic;
};

/** Methods to use when ordering `Extrinsic`. */
export type ExtrinsicsOrderBy =
  | 'BLOCK_ID_ASC'
  | 'BLOCK_ID_DESC'
  | 'CALLS_BY_EXTRINSIC_ID_AVERAGE_ARGS_ASC'
  | 'CALLS_BY_EXTRINSIC_ID_AVERAGE_ARGS_DESC'
  | 'CALLS_BY_EXTRINSIC_ID_AVERAGE_BLOCK_ID_ASC'
  | 'CALLS_BY_EXTRINSIC_ID_AVERAGE_BLOCK_ID_DESC'
  | 'CALLS_BY_EXTRINSIC_ID_AVERAGE_ERROR_ASC'
  | 'CALLS_BY_EXTRINSIC_ID_AVERAGE_ERROR_DESC'
  | 'CALLS_BY_EXTRINSIC_ID_AVERAGE_EXTRINSIC_ID_ASC'
  | 'CALLS_BY_EXTRINSIC_ID_AVERAGE_EXTRINSIC_ID_DESC'
  | 'CALLS_BY_EXTRINSIC_ID_AVERAGE_ID_ASC'
  | 'CALLS_BY_EXTRINSIC_ID_AVERAGE_ID_DESC'
  | 'CALLS_BY_EXTRINSIC_ID_AVERAGE_NAME_ASC'
  | 'CALLS_BY_EXTRINSIC_ID_AVERAGE_NAME_DESC'
  | 'CALLS_BY_EXTRINSIC_ID_AVERAGE_ORIGIN_ASC'
  | 'CALLS_BY_EXTRINSIC_ID_AVERAGE_ORIGIN_DESC'
  | 'CALLS_BY_EXTRINSIC_ID_AVERAGE_PARENT_ID_ASC'
  | 'CALLS_BY_EXTRINSIC_ID_AVERAGE_PARENT_ID_DESC'
  | 'CALLS_BY_EXTRINSIC_ID_AVERAGE_POS_ASC'
  | 'CALLS_BY_EXTRINSIC_ID_AVERAGE_POS_DESC'
  | 'CALLS_BY_EXTRINSIC_ID_AVERAGE_SUCCESS_ASC'
  | 'CALLS_BY_EXTRINSIC_ID_AVERAGE_SUCCESS_DESC'
  | 'CALLS_BY_EXTRINSIC_ID_COUNT_ASC'
  | 'CALLS_BY_EXTRINSIC_ID_COUNT_DESC'
  | 'CALLS_BY_EXTRINSIC_ID_DISTINCT_COUNT_ARGS_ASC'
  | 'CALLS_BY_EXTRINSIC_ID_DISTINCT_COUNT_ARGS_DESC'
  | 'CALLS_BY_EXTRINSIC_ID_DISTINCT_COUNT_BLOCK_ID_ASC'
  | 'CALLS_BY_EXTRINSIC_ID_DISTINCT_COUNT_BLOCK_ID_DESC'
  | 'CALLS_BY_EXTRINSIC_ID_DISTINCT_COUNT_ERROR_ASC'
  | 'CALLS_BY_EXTRINSIC_ID_DISTINCT_COUNT_ERROR_DESC'
  | 'CALLS_BY_EXTRINSIC_ID_DISTINCT_COUNT_EXTRINSIC_ID_ASC'
  | 'CALLS_BY_EXTRINSIC_ID_DISTINCT_COUNT_EXTRINSIC_ID_DESC'
  | 'CALLS_BY_EXTRINSIC_ID_DISTINCT_COUNT_ID_ASC'
  | 'CALLS_BY_EXTRINSIC_ID_DISTINCT_COUNT_ID_DESC'
  | 'CALLS_BY_EXTRINSIC_ID_DISTINCT_COUNT_NAME_ASC'
  | 'CALLS_BY_EXTRINSIC_ID_DISTINCT_COUNT_NAME_DESC'
  | 'CALLS_BY_EXTRINSIC_ID_DISTINCT_COUNT_ORIGIN_ASC'
  | 'CALLS_BY_EXTRINSIC_ID_DISTINCT_COUNT_ORIGIN_DESC'
  | 'CALLS_BY_EXTRINSIC_ID_DISTINCT_COUNT_PARENT_ID_ASC'
  | 'CALLS_BY_EXTRINSIC_ID_DISTINCT_COUNT_PARENT_ID_DESC'
  | 'CALLS_BY_EXTRINSIC_ID_DISTINCT_COUNT_POS_ASC'
  | 'CALLS_BY_EXTRINSIC_ID_DISTINCT_COUNT_POS_DESC'
  | 'CALLS_BY_EXTRINSIC_ID_DISTINCT_COUNT_SUCCESS_ASC'
  | 'CALLS_BY_EXTRINSIC_ID_DISTINCT_COUNT_SUCCESS_DESC'
  | 'CALLS_BY_EXTRINSIC_ID_MAX_ARGS_ASC'
  | 'CALLS_BY_EXTRINSIC_ID_MAX_ARGS_DESC'
  | 'CALLS_BY_EXTRINSIC_ID_MAX_BLOCK_ID_ASC'
  | 'CALLS_BY_EXTRINSIC_ID_MAX_BLOCK_ID_DESC'
  | 'CALLS_BY_EXTRINSIC_ID_MAX_ERROR_ASC'
  | 'CALLS_BY_EXTRINSIC_ID_MAX_ERROR_DESC'
  | 'CALLS_BY_EXTRINSIC_ID_MAX_EXTRINSIC_ID_ASC'
  | 'CALLS_BY_EXTRINSIC_ID_MAX_EXTRINSIC_ID_DESC'
  | 'CALLS_BY_EXTRINSIC_ID_MAX_ID_ASC'
  | 'CALLS_BY_EXTRINSIC_ID_MAX_ID_DESC'
  | 'CALLS_BY_EXTRINSIC_ID_MAX_NAME_ASC'
  | 'CALLS_BY_EXTRINSIC_ID_MAX_NAME_DESC'
  | 'CALLS_BY_EXTRINSIC_ID_MAX_ORIGIN_ASC'
  | 'CALLS_BY_EXTRINSIC_ID_MAX_ORIGIN_DESC'
  | 'CALLS_BY_EXTRINSIC_ID_MAX_PARENT_ID_ASC'
  | 'CALLS_BY_EXTRINSIC_ID_MAX_PARENT_ID_DESC'
  | 'CALLS_BY_EXTRINSIC_ID_MAX_POS_ASC'
  | 'CALLS_BY_EXTRINSIC_ID_MAX_POS_DESC'
  | 'CALLS_BY_EXTRINSIC_ID_MAX_SUCCESS_ASC'
  | 'CALLS_BY_EXTRINSIC_ID_MAX_SUCCESS_DESC'
  | 'CALLS_BY_EXTRINSIC_ID_MIN_ARGS_ASC'
  | 'CALLS_BY_EXTRINSIC_ID_MIN_ARGS_DESC'
  | 'CALLS_BY_EXTRINSIC_ID_MIN_BLOCK_ID_ASC'
  | 'CALLS_BY_EXTRINSIC_ID_MIN_BLOCK_ID_DESC'
  | 'CALLS_BY_EXTRINSIC_ID_MIN_ERROR_ASC'
  | 'CALLS_BY_EXTRINSIC_ID_MIN_ERROR_DESC'
  | 'CALLS_BY_EXTRINSIC_ID_MIN_EXTRINSIC_ID_ASC'
  | 'CALLS_BY_EXTRINSIC_ID_MIN_EXTRINSIC_ID_DESC'
  | 'CALLS_BY_EXTRINSIC_ID_MIN_ID_ASC'
  | 'CALLS_BY_EXTRINSIC_ID_MIN_ID_DESC'
  | 'CALLS_BY_EXTRINSIC_ID_MIN_NAME_ASC'
  | 'CALLS_BY_EXTRINSIC_ID_MIN_NAME_DESC'
  | 'CALLS_BY_EXTRINSIC_ID_MIN_ORIGIN_ASC'
  | 'CALLS_BY_EXTRINSIC_ID_MIN_ORIGIN_DESC'
  | 'CALLS_BY_EXTRINSIC_ID_MIN_PARENT_ID_ASC'
  | 'CALLS_BY_EXTRINSIC_ID_MIN_PARENT_ID_DESC'
  | 'CALLS_BY_EXTRINSIC_ID_MIN_POS_ASC'
  | 'CALLS_BY_EXTRINSIC_ID_MIN_POS_DESC'
  | 'CALLS_BY_EXTRINSIC_ID_MIN_SUCCESS_ASC'
  | 'CALLS_BY_EXTRINSIC_ID_MIN_SUCCESS_DESC'
  | 'CALLS_BY_EXTRINSIC_ID_STDDEV_POPULATION_ARGS_ASC'
  | 'CALLS_BY_EXTRINSIC_ID_STDDEV_POPULATION_ARGS_DESC'
  | 'CALLS_BY_EXTRINSIC_ID_STDDEV_POPULATION_BLOCK_ID_ASC'
  | 'CALLS_BY_EXTRINSIC_ID_STDDEV_POPULATION_BLOCK_ID_DESC'
  | 'CALLS_BY_EXTRINSIC_ID_STDDEV_POPULATION_ERROR_ASC'
  | 'CALLS_BY_EXTRINSIC_ID_STDDEV_POPULATION_ERROR_DESC'
  | 'CALLS_BY_EXTRINSIC_ID_STDDEV_POPULATION_EXTRINSIC_ID_ASC'
  | 'CALLS_BY_EXTRINSIC_ID_STDDEV_POPULATION_EXTRINSIC_ID_DESC'
  | 'CALLS_BY_EXTRINSIC_ID_STDDEV_POPULATION_ID_ASC'
  | 'CALLS_BY_EXTRINSIC_ID_STDDEV_POPULATION_ID_DESC'
  | 'CALLS_BY_EXTRINSIC_ID_STDDEV_POPULATION_NAME_ASC'
  | 'CALLS_BY_EXTRINSIC_ID_STDDEV_POPULATION_NAME_DESC'
  | 'CALLS_BY_EXTRINSIC_ID_STDDEV_POPULATION_ORIGIN_ASC'
  | 'CALLS_BY_EXTRINSIC_ID_STDDEV_POPULATION_ORIGIN_DESC'
  | 'CALLS_BY_EXTRINSIC_ID_STDDEV_POPULATION_PARENT_ID_ASC'
  | 'CALLS_BY_EXTRINSIC_ID_STDDEV_POPULATION_PARENT_ID_DESC'
  | 'CALLS_BY_EXTRINSIC_ID_STDDEV_POPULATION_POS_ASC'
  | 'CALLS_BY_EXTRINSIC_ID_STDDEV_POPULATION_POS_DESC'
  | 'CALLS_BY_EXTRINSIC_ID_STDDEV_POPULATION_SUCCESS_ASC'
  | 'CALLS_BY_EXTRINSIC_ID_STDDEV_POPULATION_SUCCESS_DESC'
  | 'CALLS_BY_EXTRINSIC_ID_STDDEV_SAMPLE_ARGS_ASC'
  | 'CALLS_BY_EXTRINSIC_ID_STDDEV_SAMPLE_ARGS_DESC'
  | 'CALLS_BY_EXTRINSIC_ID_STDDEV_SAMPLE_BLOCK_ID_ASC'
  | 'CALLS_BY_EXTRINSIC_ID_STDDEV_SAMPLE_BLOCK_ID_DESC'
  | 'CALLS_BY_EXTRINSIC_ID_STDDEV_SAMPLE_ERROR_ASC'
  | 'CALLS_BY_EXTRINSIC_ID_STDDEV_SAMPLE_ERROR_DESC'
  | 'CALLS_BY_EXTRINSIC_ID_STDDEV_SAMPLE_EXTRINSIC_ID_ASC'
  | 'CALLS_BY_EXTRINSIC_ID_STDDEV_SAMPLE_EXTRINSIC_ID_DESC'
  | 'CALLS_BY_EXTRINSIC_ID_STDDEV_SAMPLE_ID_ASC'
  | 'CALLS_BY_EXTRINSIC_ID_STDDEV_SAMPLE_ID_DESC'
  | 'CALLS_BY_EXTRINSIC_ID_STDDEV_SAMPLE_NAME_ASC'
  | 'CALLS_BY_EXTRINSIC_ID_STDDEV_SAMPLE_NAME_DESC'
  | 'CALLS_BY_EXTRINSIC_ID_STDDEV_SAMPLE_ORIGIN_ASC'
  | 'CALLS_BY_EXTRINSIC_ID_STDDEV_SAMPLE_ORIGIN_DESC'
  | 'CALLS_BY_EXTRINSIC_ID_STDDEV_SAMPLE_PARENT_ID_ASC'
  | 'CALLS_BY_EXTRINSIC_ID_STDDEV_SAMPLE_PARENT_ID_DESC'
  | 'CALLS_BY_EXTRINSIC_ID_STDDEV_SAMPLE_POS_ASC'
  | 'CALLS_BY_EXTRINSIC_ID_STDDEV_SAMPLE_POS_DESC'
  | 'CALLS_BY_EXTRINSIC_ID_STDDEV_SAMPLE_SUCCESS_ASC'
  | 'CALLS_BY_EXTRINSIC_ID_STDDEV_SAMPLE_SUCCESS_DESC'
  | 'CALLS_BY_EXTRINSIC_ID_SUM_ARGS_ASC'
  | 'CALLS_BY_EXTRINSIC_ID_SUM_ARGS_DESC'
  | 'CALLS_BY_EXTRINSIC_ID_SUM_BLOCK_ID_ASC'
  | 'CALLS_BY_EXTRINSIC_ID_SUM_BLOCK_ID_DESC'
  | 'CALLS_BY_EXTRINSIC_ID_SUM_ERROR_ASC'
  | 'CALLS_BY_EXTRINSIC_ID_SUM_ERROR_DESC'
  | 'CALLS_BY_EXTRINSIC_ID_SUM_EXTRINSIC_ID_ASC'
  | 'CALLS_BY_EXTRINSIC_ID_SUM_EXTRINSIC_ID_DESC'
  | 'CALLS_BY_EXTRINSIC_ID_SUM_ID_ASC'
  | 'CALLS_BY_EXTRINSIC_ID_SUM_ID_DESC'
  | 'CALLS_BY_EXTRINSIC_ID_SUM_NAME_ASC'
  | 'CALLS_BY_EXTRINSIC_ID_SUM_NAME_DESC'
  | 'CALLS_BY_EXTRINSIC_ID_SUM_ORIGIN_ASC'
  | 'CALLS_BY_EXTRINSIC_ID_SUM_ORIGIN_DESC'
  | 'CALLS_BY_EXTRINSIC_ID_SUM_PARENT_ID_ASC'
  | 'CALLS_BY_EXTRINSIC_ID_SUM_PARENT_ID_DESC'
  | 'CALLS_BY_EXTRINSIC_ID_SUM_POS_ASC'
  | 'CALLS_BY_EXTRINSIC_ID_SUM_POS_DESC'
  | 'CALLS_BY_EXTRINSIC_ID_SUM_SUCCESS_ASC'
  | 'CALLS_BY_EXTRINSIC_ID_SUM_SUCCESS_DESC'
  | 'CALLS_BY_EXTRINSIC_ID_VARIANCE_POPULATION_ARGS_ASC'
  | 'CALLS_BY_EXTRINSIC_ID_VARIANCE_POPULATION_ARGS_DESC'
  | 'CALLS_BY_EXTRINSIC_ID_VARIANCE_POPULATION_BLOCK_ID_ASC'
  | 'CALLS_BY_EXTRINSIC_ID_VARIANCE_POPULATION_BLOCK_ID_DESC'
  | 'CALLS_BY_EXTRINSIC_ID_VARIANCE_POPULATION_ERROR_ASC'
  | 'CALLS_BY_EXTRINSIC_ID_VARIANCE_POPULATION_ERROR_DESC'
  | 'CALLS_BY_EXTRINSIC_ID_VARIANCE_POPULATION_EXTRINSIC_ID_ASC'
  | 'CALLS_BY_EXTRINSIC_ID_VARIANCE_POPULATION_EXTRINSIC_ID_DESC'
  | 'CALLS_BY_EXTRINSIC_ID_VARIANCE_POPULATION_ID_ASC'
  | 'CALLS_BY_EXTRINSIC_ID_VARIANCE_POPULATION_ID_DESC'
  | 'CALLS_BY_EXTRINSIC_ID_VARIANCE_POPULATION_NAME_ASC'
  | 'CALLS_BY_EXTRINSIC_ID_VARIANCE_POPULATION_NAME_DESC'
  | 'CALLS_BY_EXTRINSIC_ID_VARIANCE_POPULATION_ORIGIN_ASC'
  | 'CALLS_BY_EXTRINSIC_ID_VARIANCE_POPULATION_ORIGIN_DESC'
  | 'CALLS_BY_EXTRINSIC_ID_VARIANCE_POPULATION_PARENT_ID_ASC'
  | 'CALLS_BY_EXTRINSIC_ID_VARIANCE_POPULATION_PARENT_ID_DESC'
  | 'CALLS_BY_EXTRINSIC_ID_VARIANCE_POPULATION_POS_ASC'
  | 'CALLS_BY_EXTRINSIC_ID_VARIANCE_POPULATION_POS_DESC'
  | 'CALLS_BY_EXTRINSIC_ID_VARIANCE_POPULATION_SUCCESS_ASC'
  | 'CALLS_BY_EXTRINSIC_ID_VARIANCE_POPULATION_SUCCESS_DESC'
  | 'CALLS_BY_EXTRINSIC_ID_VARIANCE_SAMPLE_ARGS_ASC'
  | 'CALLS_BY_EXTRINSIC_ID_VARIANCE_SAMPLE_ARGS_DESC'
  | 'CALLS_BY_EXTRINSIC_ID_VARIANCE_SAMPLE_BLOCK_ID_ASC'
  | 'CALLS_BY_EXTRINSIC_ID_VARIANCE_SAMPLE_BLOCK_ID_DESC'
  | 'CALLS_BY_EXTRINSIC_ID_VARIANCE_SAMPLE_ERROR_ASC'
  | 'CALLS_BY_EXTRINSIC_ID_VARIANCE_SAMPLE_ERROR_DESC'
  | 'CALLS_BY_EXTRINSIC_ID_VARIANCE_SAMPLE_EXTRINSIC_ID_ASC'
  | 'CALLS_BY_EXTRINSIC_ID_VARIANCE_SAMPLE_EXTRINSIC_ID_DESC'
  | 'CALLS_BY_EXTRINSIC_ID_VARIANCE_SAMPLE_ID_ASC'
  | 'CALLS_BY_EXTRINSIC_ID_VARIANCE_SAMPLE_ID_DESC'
  | 'CALLS_BY_EXTRINSIC_ID_VARIANCE_SAMPLE_NAME_ASC'
  | 'CALLS_BY_EXTRINSIC_ID_VARIANCE_SAMPLE_NAME_DESC'
  | 'CALLS_BY_EXTRINSIC_ID_VARIANCE_SAMPLE_ORIGIN_ASC'
  | 'CALLS_BY_EXTRINSIC_ID_VARIANCE_SAMPLE_ORIGIN_DESC'
  | 'CALLS_BY_EXTRINSIC_ID_VARIANCE_SAMPLE_PARENT_ID_ASC'
  | 'CALLS_BY_EXTRINSIC_ID_VARIANCE_SAMPLE_PARENT_ID_DESC'
  | 'CALLS_BY_EXTRINSIC_ID_VARIANCE_SAMPLE_POS_ASC'
  | 'CALLS_BY_EXTRINSIC_ID_VARIANCE_SAMPLE_POS_DESC'
  | 'CALLS_BY_EXTRINSIC_ID_VARIANCE_SAMPLE_SUCCESS_ASC'
  | 'CALLS_BY_EXTRINSIC_ID_VARIANCE_SAMPLE_SUCCESS_DESC'
  | 'CALL_ID_ASC'
  | 'CALL_ID_DESC'
  | 'ERROR_ASC'
  | 'ERROR_DESC'
  | 'EVENTS_BY_EXTRINSIC_ID_AVERAGE_ARGS_ASC'
  | 'EVENTS_BY_EXTRINSIC_ID_AVERAGE_ARGS_DESC'
  | 'EVENTS_BY_EXTRINSIC_ID_AVERAGE_BLOCK_ID_ASC'
  | 'EVENTS_BY_EXTRINSIC_ID_AVERAGE_BLOCK_ID_DESC'
  | 'EVENTS_BY_EXTRINSIC_ID_AVERAGE_CALL_ID_ASC'
  | 'EVENTS_BY_EXTRINSIC_ID_AVERAGE_CALL_ID_DESC'
  | 'EVENTS_BY_EXTRINSIC_ID_AVERAGE_EXTRINSIC_ID_ASC'
  | 'EVENTS_BY_EXTRINSIC_ID_AVERAGE_EXTRINSIC_ID_DESC'
  | 'EVENTS_BY_EXTRINSIC_ID_AVERAGE_ID_ASC'
  | 'EVENTS_BY_EXTRINSIC_ID_AVERAGE_ID_DESC'
  | 'EVENTS_BY_EXTRINSIC_ID_AVERAGE_INDEX_IN_BLOCK_ASC'
  | 'EVENTS_BY_EXTRINSIC_ID_AVERAGE_INDEX_IN_BLOCK_DESC'
  | 'EVENTS_BY_EXTRINSIC_ID_AVERAGE_NAME_ASC'
  | 'EVENTS_BY_EXTRINSIC_ID_AVERAGE_NAME_DESC'
  | 'EVENTS_BY_EXTRINSIC_ID_AVERAGE_PHASE_ASC'
  | 'EVENTS_BY_EXTRINSIC_ID_AVERAGE_PHASE_DESC'
  | 'EVENTS_BY_EXTRINSIC_ID_AVERAGE_POS_ASC'
  | 'EVENTS_BY_EXTRINSIC_ID_AVERAGE_POS_DESC'
  | 'EVENTS_BY_EXTRINSIC_ID_COUNT_ASC'
  | 'EVENTS_BY_EXTRINSIC_ID_COUNT_DESC'
  | 'EVENTS_BY_EXTRINSIC_ID_DISTINCT_COUNT_ARGS_ASC'
  | 'EVENTS_BY_EXTRINSIC_ID_DISTINCT_COUNT_ARGS_DESC'
  | 'EVENTS_BY_EXTRINSIC_ID_DISTINCT_COUNT_BLOCK_ID_ASC'
  | 'EVENTS_BY_EXTRINSIC_ID_DISTINCT_COUNT_BLOCK_ID_DESC'
  | 'EVENTS_BY_EXTRINSIC_ID_DISTINCT_COUNT_CALL_ID_ASC'
  | 'EVENTS_BY_EXTRINSIC_ID_DISTINCT_COUNT_CALL_ID_DESC'
  | 'EVENTS_BY_EXTRINSIC_ID_DISTINCT_COUNT_EXTRINSIC_ID_ASC'
  | 'EVENTS_BY_EXTRINSIC_ID_DISTINCT_COUNT_EXTRINSIC_ID_DESC'
  | 'EVENTS_BY_EXTRINSIC_ID_DISTINCT_COUNT_ID_ASC'
  | 'EVENTS_BY_EXTRINSIC_ID_DISTINCT_COUNT_ID_DESC'
  | 'EVENTS_BY_EXTRINSIC_ID_DISTINCT_COUNT_INDEX_IN_BLOCK_ASC'
  | 'EVENTS_BY_EXTRINSIC_ID_DISTINCT_COUNT_INDEX_IN_BLOCK_DESC'
  | 'EVENTS_BY_EXTRINSIC_ID_DISTINCT_COUNT_NAME_ASC'
  | 'EVENTS_BY_EXTRINSIC_ID_DISTINCT_COUNT_NAME_DESC'
  | 'EVENTS_BY_EXTRINSIC_ID_DISTINCT_COUNT_PHASE_ASC'
  | 'EVENTS_BY_EXTRINSIC_ID_DISTINCT_COUNT_PHASE_DESC'
  | 'EVENTS_BY_EXTRINSIC_ID_DISTINCT_COUNT_POS_ASC'
  | 'EVENTS_BY_EXTRINSIC_ID_DISTINCT_COUNT_POS_DESC'
  | 'EVENTS_BY_EXTRINSIC_ID_MAX_ARGS_ASC'
  | 'EVENTS_BY_EXTRINSIC_ID_MAX_ARGS_DESC'
  | 'EVENTS_BY_EXTRINSIC_ID_MAX_BLOCK_ID_ASC'
  | 'EVENTS_BY_EXTRINSIC_ID_MAX_BLOCK_ID_DESC'
  | 'EVENTS_BY_EXTRINSIC_ID_MAX_CALL_ID_ASC'
  | 'EVENTS_BY_EXTRINSIC_ID_MAX_CALL_ID_DESC'
  | 'EVENTS_BY_EXTRINSIC_ID_MAX_EXTRINSIC_ID_ASC'
  | 'EVENTS_BY_EXTRINSIC_ID_MAX_EXTRINSIC_ID_DESC'
  | 'EVENTS_BY_EXTRINSIC_ID_MAX_ID_ASC'
  | 'EVENTS_BY_EXTRINSIC_ID_MAX_ID_DESC'
  | 'EVENTS_BY_EXTRINSIC_ID_MAX_INDEX_IN_BLOCK_ASC'
  | 'EVENTS_BY_EXTRINSIC_ID_MAX_INDEX_IN_BLOCK_DESC'
  | 'EVENTS_BY_EXTRINSIC_ID_MAX_NAME_ASC'
  | 'EVENTS_BY_EXTRINSIC_ID_MAX_NAME_DESC'
  | 'EVENTS_BY_EXTRINSIC_ID_MAX_PHASE_ASC'
  | 'EVENTS_BY_EXTRINSIC_ID_MAX_PHASE_DESC'
  | 'EVENTS_BY_EXTRINSIC_ID_MAX_POS_ASC'
  | 'EVENTS_BY_EXTRINSIC_ID_MAX_POS_DESC'
  | 'EVENTS_BY_EXTRINSIC_ID_MIN_ARGS_ASC'
  | 'EVENTS_BY_EXTRINSIC_ID_MIN_ARGS_DESC'
  | 'EVENTS_BY_EXTRINSIC_ID_MIN_BLOCK_ID_ASC'
  | 'EVENTS_BY_EXTRINSIC_ID_MIN_BLOCK_ID_DESC'
  | 'EVENTS_BY_EXTRINSIC_ID_MIN_CALL_ID_ASC'
  | 'EVENTS_BY_EXTRINSIC_ID_MIN_CALL_ID_DESC'
  | 'EVENTS_BY_EXTRINSIC_ID_MIN_EXTRINSIC_ID_ASC'
  | 'EVENTS_BY_EXTRINSIC_ID_MIN_EXTRINSIC_ID_DESC'
  | 'EVENTS_BY_EXTRINSIC_ID_MIN_ID_ASC'
  | 'EVENTS_BY_EXTRINSIC_ID_MIN_ID_DESC'
  | 'EVENTS_BY_EXTRINSIC_ID_MIN_INDEX_IN_BLOCK_ASC'
  | 'EVENTS_BY_EXTRINSIC_ID_MIN_INDEX_IN_BLOCK_DESC'
  | 'EVENTS_BY_EXTRINSIC_ID_MIN_NAME_ASC'
  | 'EVENTS_BY_EXTRINSIC_ID_MIN_NAME_DESC'
  | 'EVENTS_BY_EXTRINSIC_ID_MIN_PHASE_ASC'
  | 'EVENTS_BY_EXTRINSIC_ID_MIN_PHASE_DESC'
  | 'EVENTS_BY_EXTRINSIC_ID_MIN_POS_ASC'
  | 'EVENTS_BY_EXTRINSIC_ID_MIN_POS_DESC'
  | 'EVENTS_BY_EXTRINSIC_ID_STDDEV_POPULATION_ARGS_ASC'
  | 'EVENTS_BY_EXTRINSIC_ID_STDDEV_POPULATION_ARGS_DESC'
  | 'EVENTS_BY_EXTRINSIC_ID_STDDEV_POPULATION_BLOCK_ID_ASC'
  | 'EVENTS_BY_EXTRINSIC_ID_STDDEV_POPULATION_BLOCK_ID_DESC'
  | 'EVENTS_BY_EXTRINSIC_ID_STDDEV_POPULATION_CALL_ID_ASC'
  | 'EVENTS_BY_EXTRINSIC_ID_STDDEV_POPULATION_CALL_ID_DESC'
  | 'EVENTS_BY_EXTRINSIC_ID_STDDEV_POPULATION_EXTRINSIC_ID_ASC'
  | 'EVENTS_BY_EXTRINSIC_ID_STDDEV_POPULATION_EXTRINSIC_ID_DESC'
  | 'EVENTS_BY_EXTRINSIC_ID_STDDEV_POPULATION_ID_ASC'
  | 'EVENTS_BY_EXTRINSIC_ID_STDDEV_POPULATION_ID_DESC'
  | 'EVENTS_BY_EXTRINSIC_ID_STDDEV_POPULATION_INDEX_IN_BLOCK_ASC'
  | 'EVENTS_BY_EXTRINSIC_ID_STDDEV_POPULATION_INDEX_IN_BLOCK_DESC'
  | 'EVENTS_BY_EXTRINSIC_ID_STDDEV_POPULATION_NAME_ASC'
  | 'EVENTS_BY_EXTRINSIC_ID_STDDEV_POPULATION_NAME_DESC'
  | 'EVENTS_BY_EXTRINSIC_ID_STDDEV_POPULATION_PHASE_ASC'
  | 'EVENTS_BY_EXTRINSIC_ID_STDDEV_POPULATION_PHASE_DESC'
  | 'EVENTS_BY_EXTRINSIC_ID_STDDEV_POPULATION_POS_ASC'
  | 'EVENTS_BY_EXTRINSIC_ID_STDDEV_POPULATION_POS_DESC'
  | 'EVENTS_BY_EXTRINSIC_ID_STDDEV_SAMPLE_ARGS_ASC'
  | 'EVENTS_BY_EXTRINSIC_ID_STDDEV_SAMPLE_ARGS_DESC'
  | 'EVENTS_BY_EXTRINSIC_ID_STDDEV_SAMPLE_BLOCK_ID_ASC'
  | 'EVENTS_BY_EXTRINSIC_ID_STDDEV_SAMPLE_BLOCK_ID_DESC'
  | 'EVENTS_BY_EXTRINSIC_ID_STDDEV_SAMPLE_CALL_ID_ASC'
  | 'EVENTS_BY_EXTRINSIC_ID_STDDEV_SAMPLE_CALL_ID_DESC'
  | 'EVENTS_BY_EXTRINSIC_ID_STDDEV_SAMPLE_EXTRINSIC_ID_ASC'
  | 'EVENTS_BY_EXTRINSIC_ID_STDDEV_SAMPLE_EXTRINSIC_ID_DESC'
  | 'EVENTS_BY_EXTRINSIC_ID_STDDEV_SAMPLE_ID_ASC'
  | 'EVENTS_BY_EXTRINSIC_ID_STDDEV_SAMPLE_ID_DESC'
  | 'EVENTS_BY_EXTRINSIC_ID_STDDEV_SAMPLE_INDEX_IN_BLOCK_ASC'
  | 'EVENTS_BY_EXTRINSIC_ID_STDDEV_SAMPLE_INDEX_IN_BLOCK_DESC'
  | 'EVENTS_BY_EXTRINSIC_ID_STDDEV_SAMPLE_NAME_ASC'
  | 'EVENTS_BY_EXTRINSIC_ID_STDDEV_SAMPLE_NAME_DESC'
  | 'EVENTS_BY_EXTRINSIC_ID_STDDEV_SAMPLE_PHASE_ASC'
  | 'EVENTS_BY_EXTRINSIC_ID_STDDEV_SAMPLE_PHASE_DESC'
  | 'EVENTS_BY_EXTRINSIC_ID_STDDEV_SAMPLE_POS_ASC'
  | 'EVENTS_BY_EXTRINSIC_ID_STDDEV_SAMPLE_POS_DESC'
  | 'EVENTS_BY_EXTRINSIC_ID_SUM_ARGS_ASC'
  | 'EVENTS_BY_EXTRINSIC_ID_SUM_ARGS_DESC'
  | 'EVENTS_BY_EXTRINSIC_ID_SUM_BLOCK_ID_ASC'
  | 'EVENTS_BY_EXTRINSIC_ID_SUM_BLOCK_ID_DESC'
  | 'EVENTS_BY_EXTRINSIC_ID_SUM_CALL_ID_ASC'
  | 'EVENTS_BY_EXTRINSIC_ID_SUM_CALL_ID_DESC'
  | 'EVENTS_BY_EXTRINSIC_ID_SUM_EXTRINSIC_ID_ASC'
  | 'EVENTS_BY_EXTRINSIC_ID_SUM_EXTRINSIC_ID_DESC'
  | 'EVENTS_BY_EXTRINSIC_ID_SUM_ID_ASC'
  | 'EVENTS_BY_EXTRINSIC_ID_SUM_ID_DESC'
  | 'EVENTS_BY_EXTRINSIC_ID_SUM_INDEX_IN_BLOCK_ASC'
  | 'EVENTS_BY_EXTRINSIC_ID_SUM_INDEX_IN_BLOCK_DESC'
  | 'EVENTS_BY_EXTRINSIC_ID_SUM_NAME_ASC'
  | 'EVENTS_BY_EXTRINSIC_ID_SUM_NAME_DESC'
  | 'EVENTS_BY_EXTRINSIC_ID_SUM_PHASE_ASC'
  | 'EVENTS_BY_EXTRINSIC_ID_SUM_PHASE_DESC'
  | 'EVENTS_BY_EXTRINSIC_ID_SUM_POS_ASC'
  | 'EVENTS_BY_EXTRINSIC_ID_SUM_POS_DESC'
  | 'EVENTS_BY_EXTRINSIC_ID_VARIANCE_POPULATION_ARGS_ASC'
  | 'EVENTS_BY_EXTRINSIC_ID_VARIANCE_POPULATION_ARGS_DESC'
  | 'EVENTS_BY_EXTRINSIC_ID_VARIANCE_POPULATION_BLOCK_ID_ASC'
  | 'EVENTS_BY_EXTRINSIC_ID_VARIANCE_POPULATION_BLOCK_ID_DESC'
  | 'EVENTS_BY_EXTRINSIC_ID_VARIANCE_POPULATION_CALL_ID_ASC'
  | 'EVENTS_BY_EXTRINSIC_ID_VARIANCE_POPULATION_CALL_ID_DESC'
  | 'EVENTS_BY_EXTRINSIC_ID_VARIANCE_POPULATION_EXTRINSIC_ID_ASC'
  | 'EVENTS_BY_EXTRINSIC_ID_VARIANCE_POPULATION_EXTRINSIC_ID_DESC'
  | 'EVENTS_BY_EXTRINSIC_ID_VARIANCE_POPULATION_ID_ASC'
  | 'EVENTS_BY_EXTRINSIC_ID_VARIANCE_POPULATION_ID_DESC'
  | 'EVENTS_BY_EXTRINSIC_ID_VARIANCE_POPULATION_INDEX_IN_BLOCK_ASC'
  | 'EVENTS_BY_EXTRINSIC_ID_VARIANCE_POPULATION_INDEX_IN_BLOCK_DESC'
  | 'EVENTS_BY_EXTRINSIC_ID_VARIANCE_POPULATION_NAME_ASC'
  | 'EVENTS_BY_EXTRINSIC_ID_VARIANCE_POPULATION_NAME_DESC'
  | 'EVENTS_BY_EXTRINSIC_ID_VARIANCE_POPULATION_PHASE_ASC'
  | 'EVENTS_BY_EXTRINSIC_ID_VARIANCE_POPULATION_PHASE_DESC'
  | 'EVENTS_BY_EXTRINSIC_ID_VARIANCE_POPULATION_POS_ASC'
  | 'EVENTS_BY_EXTRINSIC_ID_VARIANCE_POPULATION_POS_DESC'
  | 'EVENTS_BY_EXTRINSIC_ID_VARIANCE_SAMPLE_ARGS_ASC'
  | 'EVENTS_BY_EXTRINSIC_ID_VARIANCE_SAMPLE_ARGS_DESC'
  | 'EVENTS_BY_EXTRINSIC_ID_VARIANCE_SAMPLE_BLOCK_ID_ASC'
  | 'EVENTS_BY_EXTRINSIC_ID_VARIANCE_SAMPLE_BLOCK_ID_DESC'
  | 'EVENTS_BY_EXTRINSIC_ID_VARIANCE_SAMPLE_CALL_ID_ASC'
  | 'EVENTS_BY_EXTRINSIC_ID_VARIANCE_SAMPLE_CALL_ID_DESC'
  | 'EVENTS_BY_EXTRINSIC_ID_VARIANCE_SAMPLE_EXTRINSIC_ID_ASC'
  | 'EVENTS_BY_EXTRINSIC_ID_VARIANCE_SAMPLE_EXTRINSIC_ID_DESC'
  | 'EVENTS_BY_EXTRINSIC_ID_VARIANCE_SAMPLE_ID_ASC'
  | 'EVENTS_BY_EXTRINSIC_ID_VARIANCE_SAMPLE_ID_DESC'
  | 'EVENTS_BY_EXTRINSIC_ID_VARIANCE_SAMPLE_INDEX_IN_BLOCK_ASC'
  | 'EVENTS_BY_EXTRINSIC_ID_VARIANCE_SAMPLE_INDEX_IN_BLOCK_DESC'
  | 'EVENTS_BY_EXTRINSIC_ID_VARIANCE_SAMPLE_NAME_ASC'
  | 'EVENTS_BY_EXTRINSIC_ID_VARIANCE_SAMPLE_NAME_DESC'
  | 'EVENTS_BY_EXTRINSIC_ID_VARIANCE_SAMPLE_PHASE_ASC'
  | 'EVENTS_BY_EXTRINSIC_ID_VARIANCE_SAMPLE_PHASE_DESC'
  | 'EVENTS_BY_EXTRINSIC_ID_VARIANCE_SAMPLE_POS_ASC'
  | 'EVENTS_BY_EXTRINSIC_ID_VARIANCE_SAMPLE_POS_DESC'
  | 'FEE_ASC'
  | 'FEE_DESC'
  | 'HASH_ASC'
  | 'HASH_DESC'
  | 'ID_ASC'
  | 'ID_DESC'
  | 'INDEX_IN_BLOCK_ASC'
  | 'INDEX_IN_BLOCK_DESC'
  | 'NATURAL'
  | 'POS_ASC'
  | 'POS_DESC'
  | 'PRIMARY_KEY_ASC'
  | 'PRIMARY_KEY_DESC'
  | 'SIGNATURE_ASC'
  | 'SIGNATURE_DESC'
  | 'SUCCESS_ASC'
  | 'SUCCESS_DESC'
  | 'TIP_ASC'
  | 'TIP_DESC'
  | 'VERSION_ASC'
  | 'VERSION_DESC';

export type FrontierEthereumTransaction = Node & {
  __typename?: 'FrontierEthereumTransaction';
  /** Reads a single `Call` that is related to this `FrontierEthereumTransaction`. */
  callByCallId: Call;
  callId: Scalars['String']['output'];
  contract: Scalars['String']['output'];
  /** A globally unique identifier. Can be used in various places throughout the system to identify this single value. */
  nodeId: Scalars['ID']['output'];
  sighash?: Maybe<Scalars['String']['output']>;
};

export type FrontierEthereumTransactionAggregates = {
  __typename?: 'FrontierEthereumTransactionAggregates';
  /** Distinct count aggregates across the matching connection (ignoring before/after/first/last/offset) */
  distinctCount?: Maybe<FrontierEthereumTransactionDistinctCountAggregates>;
  keys?: Maybe<Array<Scalars['String']['output']>>;
};

/**
 * A condition to be used against `FrontierEthereumTransaction` object types. All
 * fields are tested for equality and combined with a logical ‘and.’
 */
export type FrontierEthereumTransactionCondition = {
  /** Checks for equality with the object’s `callId` field. */
  callId?: InputMaybe<Scalars['String']['input']>;
  /** Checks for equality with the object’s `contract` field. */
  contract?: InputMaybe<Scalars['String']['input']>;
  /** Checks for equality with the object’s `sighash` field. */
  sighash?: InputMaybe<Scalars['String']['input']>;
};

export type FrontierEthereumTransactionDistinctCountAggregates = {
  __typename?: 'FrontierEthereumTransactionDistinctCountAggregates';
  /** Distinct count of callId across the matching connection */
  callId?: Maybe<Scalars['BigInt']['output']>;
  /** Distinct count of contract across the matching connection */
  contract?: Maybe<Scalars['BigInt']['output']>;
  /** Distinct count of sighash across the matching connection */
  sighash?: Maybe<Scalars['BigInt']['output']>;
};

/** A filter to be used against `FrontierEthereumTransaction` object types. All fields are combined with a logical ‘and.’ */
export type FrontierEthereumTransactionFilter = {
  /** Checks for all expressions in this list. */
  and?: InputMaybe<Array<FrontierEthereumTransactionFilter>>;
  /** Filter by the object’s `callId` field. */
  callId?: InputMaybe<StringFilter>;
  /** Filter by the object’s `contract` field. */
  contract?: InputMaybe<StringFilter>;
  /** Negates the expression. */
  not?: InputMaybe<FrontierEthereumTransactionFilter>;
  /** Checks for any expressions in this list. */
  or?: InputMaybe<Array<FrontierEthereumTransactionFilter>>;
  /** Filter by the object’s `sighash` field. */
  sighash?: InputMaybe<StringFilter>;
};

/** Grouping methods for `FrontierEthereumTransaction` for usage during aggregation. */
export type FrontierEthereumTransactionGroupBy =
  | 'CONTRACT'
  | 'SIGHASH';

/** Conditions for `FrontierEthereumTransaction` aggregates. */
export type FrontierEthereumTransactionHavingInput = {
  AND?: InputMaybe<Array<FrontierEthereumTransactionHavingInput>>;
  OR?: InputMaybe<Array<FrontierEthereumTransactionHavingInput>>;
};

/** A connection to a list of `FrontierEthereumTransaction` values. */
export type FrontierEthereumTransactionsConnection = {
  __typename?: 'FrontierEthereumTransactionsConnection';
  /** Aggregates across the matching connection (ignoring before/after/first/last/offset) */
  aggregates?: Maybe<FrontierEthereumTransactionAggregates>;
  /** A list of edges which contains the `FrontierEthereumTransaction` and cursor to aid in pagination. */
  edges: Array<FrontierEthereumTransactionsEdge>;
  /** Grouped aggregates across the matching connection (ignoring before/after/first/last/offset) */
  groupedAggregates?: Maybe<Array<FrontierEthereumTransactionAggregates>>;
  /** A list of `FrontierEthereumTransaction` objects. */
  nodes: Array<FrontierEthereumTransaction>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
  /** The count of *all* `FrontierEthereumTransaction` you could get from the connection. */
  totalCount: Scalars['Int']['output'];
};


/** A connection to a list of `FrontierEthereumTransaction` values. */
export type FrontierEthereumTransactionsConnectionGroupedAggregatesArgs = {
  groupBy: Array<FrontierEthereumTransactionGroupBy>;
  having?: InputMaybe<FrontierEthereumTransactionHavingInput>;
};

/** A `FrontierEthereumTransaction` edge in the connection. */
export type FrontierEthereumTransactionsEdge = {
  __typename?: 'FrontierEthereumTransactionsEdge';
  /** A cursor for use in pagination. */
  cursor?: Maybe<Scalars['Cursor']['output']>;
  /** The `FrontierEthereumTransaction` at the end of the edge. */
  node: FrontierEthereumTransaction;
};

/** Methods to use when ordering `FrontierEthereumTransaction`. */
export type FrontierEthereumTransactionsOrderBy =
  | 'CALL_ID_ASC'
  | 'CALL_ID_DESC'
  | 'CONTRACT_ASC'
  | 'CONTRACT_DESC'
  | 'NATURAL'
  | 'PRIMARY_KEY_ASC'
  | 'PRIMARY_KEY_DESC'
  | 'SIGHASH_ASC'
  | 'SIGHASH_DESC';

export type FrontierEvmLog = Node & {
  __typename?: 'FrontierEvmLog';
  contract: Scalars['String']['output'];
  /** Reads a single `Event` that is related to this `FrontierEvmLog`. */
  eventByEventId: Event;
  eventId: Scalars['String']['output'];
  /** A globally unique identifier. Can be used in various places throughout the system to identify this single value. */
  nodeId: Scalars['ID']['output'];
  topic0?: Maybe<Scalars['String']['output']>;
  topic1?: Maybe<Scalars['String']['output']>;
  topic2?: Maybe<Scalars['String']['output']>;
  topic3?: Maybe<Scalars['String']['output']>;
};

export type FrontierEvmLogAggregates = {
  __typename?: 'FrontierEvmLogAggregates';
  /** Distinct count aggregates across the matching connection (ignoring before/after/first/last/offset) */
  distinctCount?: Maybe<FrontierEvmLogDistinctCountAggregates>;
  keys?: Maybe<Array<Scalars['String']['output']>>;
};

/**
 * A condition to be used against `FrontierEvmLog` object types. All fields are
 * tested for equality and combined with a logical ‘and.’
 */
export type FrontierEvmLogCondition = {
  /** Checks for equality with the object’s `contract` field. */
  contract?: InputMaybe<Scalars['String']['input']>;
  /** Checks for equality with the object’s `eventId` field. */
  eventId?: InputMaybe<Scalars['String']['input']>;
  /** Checks for equality with the object’s `topic0` field. */
  topic0?: InputMaybe<Scalars['String']['input']>;
  /** Checks for equality with the object’s `topic1` field. */
  topic1?: InputMaybe<Scalars['String']['input']>;
  /** Checks for equality with the object’s `topic2` field. */
  topic2?: InputMaybe<Scalars['String']['input']>;
  /** Checks for equality with the object’s `topic3` field. */
  topic3?: InputMaybe<Scalars['String']['input']>;
};

export type FrontierEvmLogDistinctCountAggregates = {
  __typename?: 'FrontierEvmLogDistinctCountAggregates';
  /** Distinct count of contract across the matching connection */
  contract?: Maybe<Scalars['BigInt']['output']>;
  /** Distinct count of eventId across the matching connection */
  eventId?: Maybe<Scalars['BigInt']['output']>;
  /** Distinct count of topic0 across the matching connection */
  topic0?: Maybe<Scalars['BigInt']['output']>;
  /** Distinct count of topic1 across the matching connection */
  topic1?: Maybe<Scalars['BigInt']['output']>;
  /** Distinct count of topic2 across the matching connection */
  topic2?: Maybe<Scalars['BigInt']['output']>;
  /** Distinct count of topic3 across the matching connection */
  topic3?: Maybe<Scalars['BigInt']['output']>;
};

/** A filter to be used against `FrontierEvmLog` object types. All fields are combined with a logical ‘and.’ */
export type FrontierEvmLogFilter = {
  /** Checks for all expressions in this list. */
  and?: InputMaybe<Array<FrontierEvmLogFilter>>;
  /** Filter by the object’s `contract` field. */
  contract?: InputMaybe<StringFilter>;
  /** Filter by the object’s `eventId` field. */
  eventId?: InputMaybe<StringFilter>;
  /** Negates the expression. */
  not?: InputMaybe<FrontierEvmLogFilter>;
  /** Checks for any expressions in this list. */
  or?: InputMaybe<Array<FrontierEvmLogFilter>>;
  /** Filter by the object’s `topic0` field. */
  topic0?: InputMaybe<StringFilter>;
  /** Filter by the object’s `topic1` field. */
  topic1?: InputMaybe<StringFilter>;
  /** Filter by the object’s `topic2` field. */
  topic2?: InputMaybe<StringFilter>;
  /** Filter by the object’s `topic3` field. */
  topic3?: InputMaybe<StringFilter>;
};

/** Grouping methods for `FrontierEvmLog` for usage during aggregation. */
export type FrontierEvmLogGroupBy =
  | 'CONTRACT'
  | 'TOPIC0'
  | 'TOPIC1'
  | 'TOPIC2'
  | 'TOPIC3';

/** Conditions for `FrontierEvmLog` aggregates. */
export type FrontierEvmLogHavingInput = {
  AND?: InputMaybe<Array<FrontierEvmLogHavingInput>>;
  OR?: InputMaybe<Array<FrontierEvmLogHavingInput>>;
};

/** A connection to a list of `FrontierEvmLog` values. */
export type FrontierEvmLogsConnection = {
  __typename?: 'FrontierEvmLogsConnection';
  /** Aggregates across the matching connection (ignoring before/after/first/last/offset) */
  aggregates?: Maybe<FrontierEvmLogAggregates>;
  /** A list of edges which contains the `FrontierEvmLog` and cursor to aid in pagination. */
  edges: Array<FrontierEvmLogsEdge>;
  /** Grouped aggregates across the matching connection (ignoring before/after/first/last/offset) */
  groupedAggregates?: Maybe<Array<FrontierEvmLogAggregates>>;
  /** A list of `FrontierEvmLog` objects. */
  nodes: Array<FrontierEvmLog>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
  /** The count of *all* `FrontierEvmLog` you could get from the connection. */
  totalCount: Scalars['Int']['output'];
};


/** A connection to a list of `FrontierEvmLog` values. */
export type FrontierEvmLogsConnectionGroupedAggregatesArgs = {
  groupBy: Array<FrontierEvmLogGroupBy>;
  having?: InputMaybe<FrontierEvmLogHavingInput>;
};

/** A `FrontierEvmLog` edge in the connection. */
export type FrontierEvmLogsEdge = {
  __typename?: 'FrontierEvmLogsEdge';
  /** A cursor for use in pagination. */
  cursor?: Maybe<Scalars['Cursor']['output']>;
  /** The `FrontierEvmLog` at the end of the edge. */
  node: FrontierEvmLog;
};

/** Methods to use when ordering `FrontierEvmLog`. */
export type FrontierEvmLogsOrderBy =
  | 'CONTRACT_ASC'
  | 'CONTRACT_DESC'
  | 'EVENT_ID_ASC'
  | 'EVENT_ID_DESC'
  | 'NATURAL'
  | 'PRIMARY_KEY_ASC'
  | 'PRIMARY_KEY_DESC'
  | 'TOPIC0_ASC'
  | 'TOPIC0_DESC'
  | 'TOPIC1_ASC'
  | 'TOPIC1_DESC'
  | 'TOPIC2_ASC'
  | 'TOPIC2_DESC'
  | 'TOPIC3_ASC'
  | 'TOPIC3_DESC';

export type GearMessageEnqueued = Node & {
  __typename?: 'GearMessageEnqueued';
  /** Reads a single `Event` that is related to this `GearMessageEnqueued`. */
  eventByEventId: Event;
  eventId: Scalars['String']['output'];
  /** A globally unique identifier. Can be used in various places throughout the system to identify this single value. */
  nodeId: Scalars['ID']['output'];
  program: Scalars['String']['output'];
};

export type GearMessageEnqueuedAggregates = {
  __typename?: 'GearMessageEnqueuedAggregates';
  /** Distinct count aggregates across the matching connection (ignoring before/after/first/last/offset) */
  distinctCount?: Maybe<GearMessageEnqueuedDistinctCountAggregates>;
  keys?: Maybe<Array<Scalars['String']['output']>>;
};

/**
 * A condition to be used against `GearMessageEnqueued` object types. All fields
 * are tested for equality and combined with a logical ‘and.’
 */
export type GearMessageEnqueuedCondition = {
  /** Checks for equality with the object’s `eventId` field. */
  eventId?: InputMaybe<Scalars['String']['input']>;
  /** Checks for equality with the object’s `program` field. */
  program?: InputMaybe<Scalars['String']['input']>;
};

export type GearMessageEnqueuedDistinctCountAggregates = {
  __typename?: 'GearMessageEnqueuedDistinctCountAggregates';
  /** Distinct count of eventId across the matching connection */
  eventId?: Maybe<Scalars['BigInt']['output']>;
  /** Distinct count of program across the matching connection */
  program?: Maybe<Scalars['BigInt']['output']>;
};

/** A filter to be used against `GearMessageEnqueued` object types. All fields are combined with a logical ‘and.’ */
export type GearMessageEnqueuedFilter = {
  /** Checks for all expressions in this list. */
  and?: InputMaybe<Array<GearMessageEnqueuedFilter>>;
  /** Filter by the object’s `eventId` field. */
  eventId?: InputMaybe<StringFilter>;
  /** Negates the expression. */
  not?: InputMaybe<GearMessageEnqueuedFilter>;
  /** Checks for any expressions in this list. */
  or?: InputMaybe<Array<GearMessageEnqueuedFilter>>;
  /** Filter by the object’s `program` field. */
  program?: InputMaybe<StringFilter>;
};

/** Grouping methods for `GearMessageEnqueued` for usage during aggregation. */
export type GearMessageEnqueuedGroupBy =
  | 'PROGRAM';

/** Conditions for `GearMessageEnqueued` aggregates. */
export type GearMessageEnqueuedHavingInput = {
  AND?: InputMaybe<Array<GearMessageEnqueuedHavingInput>>;
  OR?: InputMaybe<Array<GearMessageEnqueuedHavingInput>>;
};

/** A connection to a list of `GearMessageEnqueued` values. */
export type GearMessageEnqueuedsConnection = {
  __typename?: 'GearMessageEnqueuedsConnection';
  /** Aggregates across the matching connection (ignoring before/after/first/last/offset) */
  aggregates?: Maybe<GearMessageEnqueuedAggregates>;
  /** A list of edges which contains the `GearMessageEnqueued` and cursor to aid in pagination. */
  edges: Array<GearMessageEnqueuedsEdge>;
  /** Grouped aggregates across the matching connection (ignoring before/after/first/last/offset) */
  groupedAggregates?: Maybe<Array<GearMessageEnqueuedAggregates>>;
  /** A list of `GearMessageEnqueued` objects. */
  nodes: Array<GearMessageEnqueued>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
  /** The count of *all* `GearMessageEnqueued` you could get from the connection. */
  totalCount: Scalars['Int']['output'];
};


/** A connection to a list of `GearMessageEnqueued` values. */
export type GearMessageEnqueuedsConnectionGroupedAggregatesArgs = {
  groupBy: Array<GearMessageEnqueuedGroupBy>;
  having?: InputMaybe<GearMessageEnqueuedHavingInput>;
};

/** A `GearMessageEnqueued` edge in the connection. */
export type GearMessageEnqueuedsEdge = {
  __typename?: 'GearMessageEnqueuedsEdge';
  /** A cursor for use in pagination. */
  cursor?: Maybe<Scalars['Cursor']['output']>;
  /** The `GearMessageEnqueued` at the end of the edge. */
  node: GearMessageEnqueued;
};

/** Methods to use when ordering `GearMessageEnqueued`. */
export type GearMessageEnqueuedsOrderBy =
  | 'EVENT_ID_ASC'
  | 'EVENT_ID_DESC'
  | 'NATURAL'
  | 'PRIMARY_KEY_ASC'
  | 'PRIMARY_KEY_DESC'
  | 'PROGRAM_ASC'
  | 'PROGRAM_DESC';

export type GearUserMessageSent = Node & {
  __typename?: 'GearUserMessageSent';
  /** Reads a single `Event` that is related to this `GearUserMessageSent`. */
  eventByEventId: Event;
  eventId: Scalars['String']['output'];
  /** A globally unique identifier. Can be used in various places throughout the system to identify this single value. */
  nodeId: Scalars['ID']['output'];
  program: Scalars['String']['output'];
};

export type GearUserMessageSentAggregates = {
  __typename?: 'GearUserMessageSentAggregates';
  /** Distinct count aggregates across the matching connection (ignoring before/after/first/last/offset) */
  distinctCount?: Maybe<GearUserMessageSentDistinctCountAggregates>;
  keys?: Maybe<Array<Scalars['String']['output']>>;
};

/**
 * A condition to be used against `GearUserMessageSent` object types. All fields
 * are tested for equality and combined with a logical ‘and.’
 */
export type GearUserMessageSentCondition = {
  /** Checks for equality with the object’s `eventId` field. */
  eventId?: InputMaybe<Scalars['String']['input']>;
  /** Checks for equality with the object’s `program` field. */
  program?: InputMaybe<Scalars['String']['input']>;
};

export type GearUserMessageSentDistinctCountAggregates = {
  __typename?: 'GearUserMessageSentDistinctCountAggregates';
  /** Distinct count of eventId across the matching connection */
  eventId?: Maybe<Scalars['BigInt']['output']>;
  /** Distinct count of program across the matching connection */
  program?: Maybe<Scalars['BigInt']['output']>;
};

/** A filter to be used against `GearUserMessageSent` object types. All fields are combined with a logical ‘and.’ */
export type GearUserMessageSentFilter = {
  /** Checks for all expressions in this list. */
  and?: InputMaybe<Array<GearUserMessageSentFilter>>;
  /** Filter by the object’s `eventId` field. */
  eventId?: InputMaybe<StringFilter>;
  /** Negates the expression. */
  not?: InputMaybe<GearUserMessageSentFilter>;
  /** Checks for any expressions in this list. */
  or?: InputMaybe<Array<GearUserMessageSentFilter>>;
  /** Filter by the object’s `program` field. */
  program?: InputMaybe<StringFilter>;
};

/** Grouping methods for `GearUserMessageSent` for usage during aggregation. */
export type GearUserMessageSentGroupBy =
  | 'PROGRAM';

/** Conditions for `GearUserMessageSent` aggregates. */
export type GearUserMessageSentHavingInput = {
  AND?: InputMaybe<Array<GearUserMessageSentHavingInput>>;
  OR?: InputMaybe<Array<GearUserMessageSentHavingInput>>;
};

/** A connection to a list of `GearUserMessageSent` values. */
export type GearUserMessageSentsConnection = {
  __typename?: 'GearUserMessageSentsConnection';
  /** Aggregates across the matching connection (ignoring before/after/first/last/offset) */
  aggregates?: Maybe<GearUserMessageSentAggregates>;
  /** A list of edges which contains the `GearUserMessageSent` and cursor to aid in pagination. */
  edges: Array<GearUserMessageSentsEdge>;
  /** Grouped aggregates across the matching connection (ignoring before/after/first/last/offset) */
  groupedAggregates?: Maybe<Array<GearUserMessageSentAggregates>>;
  /** A list of `GearUserMessageSent` objects. */
  nodes: Array<GearUserMessageSent>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
  /** The count of *all* `GearUserMessageSent` you could get from the connection. */
  totalCount: Scalars['Int']['output'];
};


/** A connection to a list of `GearUserMessageSent` values. */
export type GearUserMessageSentsConnectionGroupedAggregatesArgs = {
  groupBy: Array<GearUserMessageSentGroupBy>;
  having?: InputMaybe<GearUserMessageSentHavingInput>;
};

/** A `GearUserMessageSent` edge in the connection. */
export type GearUserMessageSentsEdge = {
  __typename?: 'GearUserMessageSentsEdge';
  /** A cursor for use in pagination. */
  cursor?: Maybe<Scalars['Cursor']['output']>;
  /** The `GearUserMessageSent` at the end of the edge. */
  node: GearUserMessageSent;
};

/** Methods to use when ordering `GearUserMessageSent`. */
export type GearUserMessageSentsOrderBy =
  | 'EVENT_ID_ASC'
  | 'EVENT_ID_DESC'
  | 'NATURAL'
  | 'PRIMARY_KEY_ASC'
  | 'PRIMARY_KEY_DESC'
  | 'PROGRAM_ASC'
  | 'PROGRAM_DESC';

export type HavingBigfloatFilter = {
  equalTo?: InputMaybe<Scalars['BigFloat']['input']>;
  greaterThan?: InputMaybe<Scalars['BigFloat']['input']>;
  greaterThanOrEqualTo?: InputMaybe<Scalars['BigFloat']['input']>;
  lessThan?: InputMaybe<Scalars['BigFloat']['input']>;
  lessThanOrEqualTo?: InputMaybe<Scalars['BigFloat']['input']>;
  notEqualTo?: InputMaybe<Scalars['BigFloat']['input']>;
};

export type HavingDatetimeFilter = {
  equalTo?: InputMaybe<Scalars['Datetime']['input']>;
  greaterThan?: InputMaybe<Scalars['Datetime']['input']>;
  greaterThanOrEqualTo?: InputMaybe<Scalars['Datetime']['input']>;
  lessThan?: InputMaybe<Scalars['Datetime']['input']>;
  lessThanOrEqualTo?: InputMaybe<Scalars['Datetime']['input']>;
  notEqualTo?: InputMaybe<Scalars['Datetime']['input']>;
};

export type HavingIntFilter = {
  equalTo?: InputMaybe<Scalars['Int']['input']>;
  greaterThan?: InputMaybe<Scalars['Int']['input']>;
  greaterThanOrEqualTo?: InputMaybe<Scalars['Int']['input']>;
  lessThan?: InputMaybe<Scalars['Int']['input']>;
  lessThanOrEqualTo?: InputMaybe<Scalars['Int']['input']>;
  notEqualTo?: InputMaybe<Scalars['Int']['input']>;
};

/** A filter to be used against Int fields. All fields are combined with a logical ‘and.’ */
export type IntFilter = {
  /** Not equal to the specified value, treating null like an ordinary value. */
  distinctFrom?: InputMaybe<Scalars['Int']['input']>;
  /** Equal to the specified value. */
  equalTo?: InputMaybe<Scalars['Int']['input']>;
  /** Greater than the specified value. */
  greaterThan?: InputMaybe<Scalars['Int']['input']>;
  /** Greater than or equal to the specified value. */
  greaterThanOrEqualTo?: InputMaybe<Scalars['Int']['input']>;
  /** Included in the specified list. */
  in?: InputMaybe<Array<Scalars['Int']['input']>>;
  /** Is null (if `true` is specified) or is not null (if `false` is specified). */
  isNull?: InputMaybe<Scalars['Boolean']['input']>;
  /** Less than the specified value. */
  lessThan?: InputMaybe<Scalars['Int']['input']>;
  /** Less than or equal to the specified value. */
  lessThanOrEqualTo?: InputMaybe<Scalars['Int']['input']>;
  /** Equal to the specified value, treating null like an ordinary value. */
  notDistinctFrom?: InputMaybe<Scalars['Int']['input']>;
  /** Not equal to the specified value. */
  notEqualTo?: InputMaybe<Scalars['Int']['input']>;
  /** Not included in the specified list. */
  notIn?: InputMaybe<Array<Scalars['Int']['input']>>;
};

/** A filter to be used against JSON fields. All fields are combined with a logical ‘and.’ */
export type JsonFilter = {
  /** Contained by the specified JSON. */
  containedBy?: InputMaybe<Scalars['JSON']['input']>;
  /** Contains the specified JSON. */
  contains?: InputMaybe<Scalars['JSON']['input']>;
  /** Contains all of the specified keys. */
  containsAllKeys?: InputMaybe<Array<Scalars['String']['input']>>;
  /** Contains any of the specified keys. */
  containsAnyKeys?: InputMaybe<Array<Scalars['String']['input']>>;
  /** Contains the specified key. */
  containsKey?: InputMaybe<Scalars['String']['input']>;
  /** Not equal to the specified value, treating null like an ordinary value. */
  distinctFrom?: InputMaybe<Scalars['JSON']['input']>;
  /** Equal to the specified value. */
  equalTo?: InputMaybe<Scalars['JSON']['input']>;
  /** Greater than the specified value. */
  greaterThan?: InputMaybe<Scalars['JSON']['input']>;
  /** Greater than or equal to the specified value. */
  greaterThanOrEqualTo?: InputMaybe<Scalars['JSON']['input']>;
  /** Included in the specified list. */
  in?: InputMaybe<Array<Scalars['JSON']['input']>>;
  /** Is null (if `true` is specified) or is not null (if `false` is specified). */
  isNull?: InputMaybe<Scalars['Boolean']['input']>;
  /** Less than the specified value. */
  lessThan?: InputMaybe<Scalars['JSON']['input']>;
  /** Less than or equal to the specified value. */
  lessThanOrEqualTo?: InputMaybe<Scalars['JSON']['input']>;
  /** Equal to the specified value, treating null like an ordinary value. */
  notDistinctFrom?: InputMaybe<Scalars['JSON']['input']>;
  /** Not equal to the specified value. */
  notEqualTo?: InputMaybe<Scalars['JSON']['input']>;
  /** Not included in the specified list. */
  notIn?: InputMaybe<Array<Scalars['JSON']['input']>>;
};

/** A connection to a list of `Metadatum` values. */
export type MetadataConnection = {
  __typename?: 'MetadataConnection';
  /** Aggregates across the matching connection (ignoring before/after/first/last/offset) */
  aggregates?: Maybe<MetadatumAggregates>;
  /** A list of edges which contains the `Metadatum` and cursor to aid in pagination. */
  edges: Array<MetadataEdge>;
  /** Grouped aggregates across the matching connection (ignoring before/after/first/last/offset) */
  groupedAggregates?: Maybe<Array<MetadatumAggregates>>;
  /** A list of `Metadatum` objects. */
  nodes: Array<Metadatum>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
  /** The count of *all* `Metadatum` you could get from the connection. */
  totalCount: Scalars['Int']['output'];
};


/** A connection to a list of `Metadatum` values. */
export type MetadataConnectionGroupedAggregatesArgs = {
  groupBy: Array<MetadataGroupBy>;
  having?: InputMaybe<MetadataHavingInput>;
};

/** A `Metadatum` edge in the connection. */
export type MetadataEdge = {
  __typename?: 'MetadataEdge';
  /** A cursor for use in pagination. */
  cursor?: Maybe<Scalars['Cursor']['output']>;
  /** The `Metadatum` at the end of the edge. */
  node: Metadatum;
};

/** Grouping methods for `Metadatum` for usage during aggregation. */
export type MetadataGroupBy =
  | 'BLOCK_HASH'
  | 'BLOCK_HEIGHT'
  | 'HEX'
  | 'SPEC_NAME'
  | 'SPEC_VERSION';

export type MetadataHavingAverageInput = {
  blockHeight?: InputMaybe<HavingIntFilter>;
  specVersion?: InputMaybe<HavingIntFilter>;
};

export type MetadataHavingDistinctCountInput = {
  blockHeight?: InputMaybe<HavingIntFilter>;
  specVersion?: InputMaybe<HavingIntFilter>;
};

/** Conditions for `Metadatum` aggregates. */
export type MetadataHavingInput = {
  AND?: InputMaybe<Array<MetadataHavingInput>>;
  OR?: InputMaybe<Array<MetadataHavingInput>>;
  average?: InputMaybe<MetadataHavingAverageInput>;
  distinctCount?: InputMaybe<MetadataHavingDistinctCountInput>;
  max?: InputMaybe<MetadataHavingMaxInput>;
  min?: InputMaybe<MetadataHavingMinInput>;
  stddevPopulation?: InputMaybe<MetadataHavingStddevPopulationInput>;
  stddevSample?: InputMaybe<MetadataHavingStddevSampleInput>;
  sum?: InputMaybe<MetadataHavingSumInput>;
  variancePopulation?: InputMaybe<MetadataHavingVariancePopulationInput>;
  varianceSample?: InputMaybe<MetadataHavingVarianceSampleInput>;
};

export type MetadataHavingMaxInput = {
  blockHeight?: InputMaybe<HavingIntFilter>;
  specVersion?: InputMaybe<HavingIntFilter>;
};

export type MetadataHavingMinInput = {
  blockHeight?: InputMaybe<HavingIntFilter>;
  specVersion?: InputMaybe<HavingIntFilter>;
};

export type MetadataHavingStddevPopulationInput = {
  blockHeight?: InputMaybe<HavingIntFilter>;
  specVersion?: InputMaybe<HavingIntFilter>;
};

export type MetadataHavingStddevSampleInput = {
  blockHeight?: InputMaybe<HavingIntFilter>;
  specVersion?: InputMaybe<HavingIntFilter>;
};

export type MetadataHavingSumInput = {
  blockHeight?: InputMaybe<HavingIntFilter>;
  specVersion?: InputMaybe<HavingIntFilter>;
};

export type MetadataHavingVariancePopulationInput = {
  blockHeight?: InputMaybe<HavingIntFilter>;
  specVersion?: InputMaybe<HavingIntFilter>;
};

export type MetadataHavingVarianceSampleInput = {
  blockHeight?: InputMaybe<HavingIntFilter>;
  specVersion?: InputMaybe<HavingIntFilter>;
};

/** Methods to use when ordering `Metadatum`. */
export type MetadataOrderBy =
  | 'BLOCK_HASH_ASC'
  | 'BLOCK_HASH_DESC'
  | 'BLOCK_HEIGHT_ASC'
  | 'BLOCK_HEIGHT_DESC'
  | 'HEX_ASC'
  | 'HEX_DESC'
  | 'ID_ASC'
  | 'ID_DESC'
  | 'NATURAL'
  | 'PRIMARY_KEY_ASC'
  | 'PRIMARY_KEY_DESC'
  | 'SPEC_NAME_ASC'
  | 'SPEC_NAME_DESC'
  | 'SPEC_VERSION_ASC'
  | 'SPEC_VERSION_DESC';

export type Metadatum = Node & {
  __typename?: 'Metadatum';
  blockHash: Scalars['String']['output'];
  blockHeight: Scalars['Int']['output'];
  hex: Scalars['String']['output'];
  id: Scalars['String']['output'];
  /** A globally unique identifier. Can be used in various places throughout the system to identify this single value. */
  nodeId: Scalars['ID']['output'];
  specName: Scalars['String']['output'];
  specVersion?: Maybe<Scalars['Int']['output']>;
};

export type MetadatumAggregates = {
  __typename?: 'MetadatumAggregates';
  /** Mean average aggregates across the matching connection (ignoring before/after/first/last/offset) */
  average?: Maybe<MetadatumAverageAggregates>;
  /** Distinct count aggregates across the matching connection (ignoring before/after/first/last/offset) */
  distinctCount?: Maybe<MetadatumDistinctCountAggregates>;
  keys?: Maybe<Array<Scalars['String']['output']>>;
  /** Maximum aggregates across the matching connection (ignoring before/after/first/last/offset) */
  max?: Maybe<MetadatumMaxAggregates>;
  /** Minimum aggregates across the matching connection (ignoring before/after/first/last/offset) */
  min?: Maybe<MetadatumMinAggregates>;
  /** Population standard deviation aggregates across the matching connection (ignoring before/after/first/last/offset) */
  stddevPopulation?: Maybe<MetadatumStddevPopulationAggregates>;
  /** Sample standard deviation aggregates across the matching connection (ignoring before/after/first/last/offset) */
  stddevSample?: Maybe<MetadatumStddevSampleAggregates>;
  /** Sum aggregates across the matching connection (ignoring before/after/first/last/offset) */
  sum?: Maybe<MetadatumSumAggregates>;
  /** Population variance aggregates across the matching connection (ignoring before/after/first/last/offset) */
  variancePopulation?: Maybe<MetadatumVariancePopulationAggregates>;
  /** Sample variance aggregates across the matching connection (ignoring before/after/first/last/offset) */
  varianceSample?: Maybe<MetadatumVarianceSampleAggregates>;
};

export type MetadatumAverageAggregates = {
  __typename?: 'MetadatumAverageAggregates';
  /** Mean average of blockHeight across the matching connection */
  blockHeight?: Maybe<Scalars['BigFloat']['output']>;
  /** Mean average of specVersion across the matching connection */
  specVersion?: Maybe<Scalars['BigFloat']['output']>;
};

/**
 * A condition to be used against `Metadatum` object types. All fields are tested
 * for equality and combined with a logical ‘and.’
 */
export type MetadatumCondition = {
  /** Checks for equality with the object’s `blockHash` field. */
  blockHash?: InputMaybe<Scalars['String']['input']>;
  /** Checks for equality with the object’s `blockHeight` field. */
  blockHeight?: InputMaybe<Scalars['Int']['input']>;
  /** Checks for equality with the object’s `hex` field. */
  hex?: InputMaybe<Scalars['String']['input']>;
  /** Checks for equality with the object’s `id` field. */
  id?: InputMaybe<Scalars['String']['input']>;
  /** Checks for equality with the object’s `specName` field. */
  specName?: InputMaybe<Scalars['String']['input']>;
  /** Checks for equality with the object’s `specVersion` field. */
  specVersion?: InputMaybe<Scalars['Int']['input']>;
};

export type MetadatumDistinctCountAggregates = {
  __typename?: 'MetadatumDistinctCountAggregates';
  /** Distinct count of blockHash across the matching connection */
  blockHash?: Maybe<Scalars['BigInt']['output']>;
  /** Distinct count of blockHeight across the matching connection */
  blockHeight?: Maybe<Scalars['BigInt']['output']>;
  /** Distinct count of hex across the matching connection */
  hex?: Maybe<Scalars['BigInt']['output']>;
  /** Distinct count of id across the matching connection */
  id?: Maybe<Scalars['BigInt']['output']>;
  /** Distinct count of specName across the matching connection */
  specName?: Maybe<Scalars['BigInt']['output']>;
  /** Distinct count of specVersion across the matching connection */
  specVersion?: Maybe<Scalars['BigInt']['output']>;
};

/** A filter to be used against `Metadatum` object types. All fields are combined with a logical ‘and.’ */
export type MetadatumFilter = {
  /** Checks for all expressions in this list. */
  and?: InputMaybe<Array<MetadatumFilter>>;
  /** Filter by the object’s `blockHash` field. */
  blockHash?: InputMaybe<StringFilter>;
  /** Filter by the object’s `blockHeight` field. */
  blockHeight?: InputMaybe<IntFilter>;
  /** Filter by the object’s `hex` field. */
  hex?: InputMaybe<StringFilter>;
  /** Filter by the object’s `id` field. */
  id?: InputMaybe<StringFilter>;
  /** Negates the expression. */
  not?: InputMaybe<MetadatumFilter>;
  /** Checks for any expressions in this list. */
  or?: InputMaybe<Array<MetadatumFilter>>;
  /** Filter by the object’s `specName` field. */
  specName?: InputMaybe<StringFilter>;
  /** Filter by the object’s `specVersion` field. */
  specVersion?: InputMaybe<IntFilter>;
};

export type MetadatumMaxAggregates = {
  __typename?: 'MetadatumMaxAggregates';
  /** Maximum of blockHeight across the matching connection */
  blockHeight?: Maybe<Scalars['Int']['output']>;
  /** Maximum of specVersion across the matching connection */
  specVersion?: Maybe<Scalars['Int']['output']>;
};

export type MetadatumMinAggregates = {
  __typename?: 'MetadatumMinAggregates';
  /** Minimum of blockHeight across the matching connection */
  blockHeight?: Maybe<Scalars['Int']['output']>;
  /** Minimum of specVersion across the matching connection */
  specVersion?: Maybe<Scalars['Int']['output']>;
};

export type MetadatumStddevPopulationAggregates = {
  __typename?: 'MetadatumStddevPopulationAggregates';
  /** Population standard deviation of blockHeight across the matching connection */
  blockHeight?: Maybe<Scalars['BigFloat']['output']>;
  /** Population standard deviation of specVersion across the matching connection */
  specVersion?: Maybe<Scalars['BigFloat']['output']>;
};

export type MetadatumStddevSampleAggregates = {
  __typename?: 'MetadatumStddevSampleAggregates';
  /** Sample standard deviation of blockHeight across the matching connection */
  blockHeight?: Maybe<Scalars['BigFloat']['output']>;
  /** Sample standard deviation of specVersion across the matching connection */
  specVersion?: Maybe<Scalars['BigFloat']['output']>;
};

export type MetadatumSumAggregates = {
  __typename?: 'MetadatumSumAggregates';
  /** Sum of blockHeight across the matching connection */
  blockHeight: Scalars['BigInt']['output'];
  /** Sum of specVersion across the matching connection */
  specVersion: Scalars['BigInt']['output'];
};

export type MetadatumVariancePopulationAggregates = {
  __typename?: 'MetadatumVariancePopulationAggregates';
  /** Population variance of blockHeight across the matching connection */
  blockHeight?: Maybe<Scalars['BigFloat']['output']>;
  /** Population variance of specVersion across the matching connection */
  specVersion?: Maybe<Scalars['BigFloat']['output']>;
};

export type MetadatumVarianceSampleAggregates = {
  __typename?: 'MetadatumVarianceSampleAggregates';
  /** Sample variance of blockHeight across the matching connection */
  blockHeight?: Maybe<Scalars['BigFloat']['output']>;
  /** Sample variance of specVersion across the matching connection */
  specVersion?: Maybe<Scalars['BigFloat']['output']>;
};

export type Migration = Node & {
  __typename?: 'Migration';
  executedAt?: Maybe<Scalars['Datetime']['output']>;
  hash: Scalars['String']['output'];
  id: Scalars['Int']['output'];
  name: Scalars['String']['output'];
  /** A globally unique identifier. Can be used in various places throughout the system to identify this single value. */
  nodeId: Scalars['ID']['output'];
};

export type MigrationAggregates = {
  __typename?: 'MigrationAggregates';
  /** Mean average aggregates across the matching connection (ignoring before/after/first/last/offset) */
  average?: Maybe<MigrationAverageAggregates>;
  /** Distinct count aggregates across the matching connection (ignoring before/after/first/last/offset) */
  distinctCount?: Maybe<MigrationDistinctCountAggregates>;
  keys?: Maybe<Array<Scalars['String']['output']>>;
  /** Maximum aggregates across the matching connection (ignoring before/after/first/last/offset) */
  max?: Maybe<MigrationMaxAggregates>;
  /** Minimum aggregates across the matching connection (ignoring before/after/first/last/offset) */
  min?: Maybe<MigrationMinAggregates>;
  /** Population standard deviation aggregates across the matching connection (ignoring before/after/first/last/offset) */
  stddevPopulation?: Maybe<MigrationStddevPopulationAggregates>;
  /** Sample standard deviation aggregates across the matching connection (ignoring before/after/first/last/offset) */
  stddevSample?: Maybe<MigrationStddevSampleAggregates>;
  /** Sum aggregates across the matching connection (ignoring before/after/first/last/offset) */
  sum?: Maybe<MigrationSumAggregates>;
  /** Population variance aggregates across the matching connection (ignoring before/after/first/last/offset) */
  variancePopulation?: Maybe<MigrationVariancePopulationAggregates>;
  /** Sample variance aggregates across the matching connection (ignoring before/after/first/last/offset) */
  varianceSample?: Maybe<MigrationVarianceSampleAggregates>;
};

export type MigrationAverageAggregates = {
  __typename?: 'MigrationAverageAggregates';
  /** Mean average of id across the matching connection */
  id?: Maybe<Scalars['BigFloat']['output']>;
};

/**
 * A condition to be used against `Migration` object types. All fields are tested
 * for equality and combined with a logical ‘and.’
 */
export type MigrationCondition = {
  /** Checks for equality with the object’s `executedAt` field. */
  executedAt?: InputMaybe<Scalars['Datetime']['input']>;
  /** Checks for equality with the object’s `hash` field. */
  hash?: InputMaybe<Scalars['String']['input']>;
  /** Checks for equality with the object’s `id` field. */
  id?: InputMaybe<Scalars['Int']['input']>;
  /** Checks for equality with the object’s `name` field. */
  name?: InputMaybe<Scalars['String']['input']>;
};

export type MigrationDistinctCountAggregates = {
  __typename?: 'MigrationDistinctCountAggregates';
  /** Distinct count of executedAt across the matching connection */
  executedAt?: Maybe<Scalars['BigInt']['output']>;
  /** Distinct count of hash across the matching connection */
  hash?: Maybe<Scalars['BigInt']['output']>;
  /** Distinct count of id across the matching connection */
  id?: Maybe<Scalars['BigInt']['output']>;
  /** Distinct count of name across the matching connection */
  name?: Maybe<Scalars['BigInt']['output']>;
};

/** A filter to be used against `Migration` object types. All fields are combined with a logical ‘and.’ */
export type MigrationFilter = {
  /** Checks for all expressions in this list. */
  and?: InputMaybe<Array<MigrationFilter>>;
  /** Filter by the object’s `executedAt` field. */
  executedAt?: InputMaybe<DatetimeFilter>;
  /** Filter by the object’s `hash` field. */
  hash?: InputMaybe<StringFilter>;
  /** Filter by the object’s `id` field. */
  id?: InputMaybe<IntFilter>;
  /** Filter by the object’s `name` field. */
  name?: InputMaybe<StringFilter>;
  /** Negates the expression. */
  not?: InputMaybe<MigrationFilter>;
  /** Checks for any expressions in this list. */
  or?: InputMaybe<Array<MigrationFilter>>;
};

export type MigrationMaxAggregates = {
  __typename?: 'MigrationMaxAggregates';
  /** Maximum of executedAt across the matching connection */
  executedAt?: Maybe<Scalars['Datetime']['output']>;
  /** Maximum of id across the matching connection */
  id?: Maybe<Scalars['Int']['output']>;
};

export type MigrationMinAggregates = {
  __typename?: 'MigrationMinAggregates';
  /** Minimum of executedAt across the matching connection */
  executedAt?: Maybe<Scalars['Datetime']['output']>;
  /** Minimum of id across the matching connection */
  id?: Maybe<Scalars['Int']['output']>;
};

export type MigrationStddevPopulationAggregates = {
  __typename?: 'MigrationStddevPopulationAggregates';
  /** Population standard deviation of id across the matching connection */
  id?: Maybe<Scalars['BigFloat']['output']>;
};

export type MigrationStddevSampleAggregates = {
  __typename?: 'MigrationStddevSampleAggregates';
  /** Sample standard deviation of id across the matching connection */
  id?: Maybe<Scalars['BigFloat']['output']>;
};

export type MigrationSumAggregates = {
  __typename?: 'MigrationSumAggregates';
  /** Sum of id across the matching connection */
  id: Scalars['BigInt']['output'];
};

export type MigrationVariancePopulationAggregates = {
  __typename?: 'MigrationVariancePopulationAggregates';
  /** Population variance of id across the matching connection */
  id?: Maybe<Scalars['BigFloat']['output']>;
};

export type MigrationVarianceSampleAggregates = {
  __typename?: 'MigrationVarianceSampleAggregates';
  /** Sample variance of id across the matching connection */
  id?: Maybe<Scalars['BigFloat']['output']>;
};

/** A connection to a list of `Migration` values. */
export type MigrationsConnection = {
  __typename?: 'MigrationsConnection';
  /** Aggregates across the matching connection (ignoring before/after/first/last/offset) */
  aggregates?: Maybe<MigrationAggregates>;
  /** A list of edges which contains the `Migration` and cursor to aid in pagination. */
  edges: Array<MigrationsEdge>;
  /** Grouped aggregates across the matching connection (ignoring before/after/first/last/offset) */
  groupedAggregates?: Maybe<Array<MigrationAggregates>>;
  /** A list of `Migration` objects. */
  nodes: Array<Migration>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
  /** The count of *all* `Migration` you could get from the connection. */
  totalCount: Scalars['Int']['output'];
};


/** A connection to a list of `Migration` values. */
export type MigrationsConnectionGroupedAggregatesArgs = {
  groupBy: Array<MigrationsGroupBy>;
  having?: InputMaybe<MigrationsHavingInput>;
};

/** A `Migration` edge in the connection. */
export type MigrationsEdge = {
  __typename?: 'MigrationsEdge';
  /** A cursor for use in pagination. */
  cursor?: Maybe<Scalars['Cursor']['output']>;
  /** The `Migration` at the end of the edge. */
  node: Migration;
};

/** Grouping methods for `Migration` for usage during aggregation. */
export type MigrationsGroupBy =
  | 'EXECUTED_AT'
  | 'EXECUTED_AT_TRUNCATED_TO_DAY'
  | 'EXECUTED_AT_TRUNCATED_TO_HOUR'
  | 'EXECUTED_AT_TRUNCATED_TO_MONTH'
  | 'EXECUTED_AT_TRUNCATED_TO_WEEK'
  | 'HASH';

export type MigrationsHavingAverageInput = {
  executedAt?: InputMaybe<HavingDatetimeFilter>;
  id?: InputMaybe<HavingIntFilter>;
};

export type MigrationsHavingDistinctCountInput = {
  executedAt?: InputMaybe<HavingDatetimeFilter>;
  id?: InputMaybe<HavingIntFilter>;
};

/** Conditions for `Migration` aggregates. */
export type MigrationsHavingInput = {
  AND?: InputMaybe<Array<MigrationsHavingInput>>;
  OR?: InputMaybe<Array<MigrationsHavingInput>>;
  average?: InputMaybe<MigrationsHavingAverageInput>;
  distinctCount?: InputMaybe<MigrationsHavingDistinctCountInput>;
  max?: InputMaybe<MigrationsHavingMaxInput>;
  min?: InputMaybe<MigrationsHavingMinInput>;
  stddevPopulation?: InputMaybe<MigrationsHavingStddevPopulationInput>;
  stddevSample?: InputMaybe<MigrationsHavingStddevSampleInput>;
  sum?: InputMaybe<MigrationsHavingSumInput>;
  variancePopulation?: InputMaybe<MigrationsHavingVariancePopulationInput>;
  varianceSample?: InputMaybe<MigrationsHavingVarianceSampleInput>;
};

export type MigrationsHavingMaxInput = {
  executedAt?: InputMaybe<HavingDatetimeFilter>;
  id?: InputMaybe<HavingIntFilter>;
};

export type MigrationsHavingMinInput = {
  executedAt?: InputMaybe<HavingDatetimeFilter>;
  id?: InputMaybe<HavingIntFilter>;
};

export type MigrationsHavingStddevPopulationInput = {
  executedAt?: InputMaybe<HavingDatetimeFilter>;
  id?: InputMaybe<HavingIntFilter>;
};

export type MigrationsHavingStddevSampleInput = {
  executedAt?: InputMaybe<HavingDatetimeFilter>;
  id?: InputMaybe<HavingIntFilter>;
};

export type MigrationsHavingSumInput = {
  executedAt?: InputMaybe<HavingDatetimeFilter>;
  id?: InputMaybe<HavingIntFilter>;
};

export type MigrationsHavingVariancePopulationInput = {
  executedAt?: InputMaybe<HavingDatetimeFilter>;
  id?: InputMaybe<HavingIntFilter>;
};

export type MigrationsHavingVarianceSampleInput = {
  executedAt?: InputMaybe<HavingDatetimeFilter>;
  id?: InputMaybe<HavingIntFilter>;
};

/** Methods to use when ordering `Migration`. */
export type MigrationsOrderBy =
  | 'EXECUTED_AT_ASC'
  | 'EXECUTED_AT_DESC'
  | 'HASH_ASC'
  | 'HASH_DESC'
  | 'ID_ASC'
  | 'ID_DESC'
  | 'NAME_ASC'
  | 'NAME_DESC'
  | 'NATURAL'
  | 'PRIMARY_KEY_ASC'
  | 'PRIMARY_KEY_DESC';

/** An object with a globally unique `ID`. */
export type Node = {
  /** A globally unique identifier. Can be used in various places throughout the system to identify this single value. */
  nodeId: Scalars['ID']['output'];
};

/** Information about pagination in a connection. */
export type PageInfo = {
  __typename?: 'PageInfo';
  /** When paginating forwards, the cursor to continue. */
  endCursor?: Maybe<Scalars['Cursor']['output']>;
  /** When paginating forwards, are there more items? */
  hasNextPage: Scalars['Boolean']['output'];
  /** When paginating backwards, are there more items? */
  hasPreviousPage: Scalars['Boolean']['output'];
  /** When paginating backwards, the cursor to continue. */
  startCursor?: Maybe<Scalars['Cursor']['output']>;
};

/** The root query type which gives access points into the data universe. */
export type Query = Node & {
  __typename?: 'Query';
  /** Reads a single `AcalaEvmExecuted` using its globally unique `ID`. */
  acalaEvmExecuted?: Maybe<AcalaEvmExecuted>;
  acalaEvmExecutedByEventId?: Maybe<AcalaEvmExecuted>;
  /** Reads a single `AcalaEvmExecutedFailed` using its globally unique `ID`. */
  acalaEvmExecutedFailed?: Maybe<AcalaEvmExecutedFailed>;
  acalaEvmExecutedFailedByEventId?: Maybe<AcalaEvmExecutedFailed>;
  /** Reads a single `AcalaEvmExecutedFailedLog` using its globally unique `ID`. */
  acalaEvmExecutedFailedLog?: Maybe<AcalaEvmExecutedFailedLog>;
  acalaEvmExecutedFailedLogById?: Maybe<AcalaEvmExecutedFailedLog>;
  /** Reads a single `AcalaEvmExecutedLog` using its globally unique `ID`. */
  acalaEvmExecutedLog?: Maybe<AcalaEvmExecutedLog>;
  acalaEvmExecutedLogById?: Maybe<AcalaEvmExecutedLog>;
  /** Reads and enables pagination through a set of `AcalaEvmExecutedFailedLog`. */
  allAcalaEvmExecutedFailedLogs?: Maybe<AcalaEvmExecutedFailedLogsConnection>;
  /** Reads and enables pagination through a set of `AcalaEvmExecutedFailed`. */
  allAcalaEvmExecutedFaileds?: Maybe<AcalaEvmExecutedFailedsConnection>;
  /** Reads and enables pagination through a set of `AcalaEvmExecutedLog`. */
  allAcalaEvmExecutedLogs?: Maybe<AcalaEvmExecutedLogsConnection>;
  /** Reads and enables pagination through a set of `AcalaEvmExecuted`. */
  allAcalaEvmExecuteds?: Maybe<AcalaEvmExecutedsConnection>;
  /** Reads and enables pagination through a set of `Block`. */
  allBlocks?: Maybe<BlocksConnection>;
  /** Reads and enables pagination through a set of `Call`. */
  allCalls?: Maybe<CallsConnection>;
  /** Reads and enables pagination through a set of `ContractsContractEmitted`. */
  allContractsContractEmitteds?: Maybe<ContractsContractEmittedsConnection>;
  /** Reads and enables pagination through a set of `Event`. */
  allEvents?: Maybe<EventsConnection>;
  /** Reads and enables pagination through a set of `Extrinsic`. */
  allExtrinsics?: Maybe<ExtrinsicsConnection>;
  /** Reads and enables pagination through a set of `FrontierEthereumTransaction`. */
  allFrontierEthereumTransactions?: Maybe<FrontierEthereumTransactionsConnection>;
  /** Reads and enables pagination through a set of `FrontierEvmLog`. */
  allFrontierEvmLogs?: Maybe<FrontierEvmLogsConnection>;
  /** Reads and enables pagination through a set of `GearMessageEnqueued`. */
  allGearMessageEnqueueds?: Maybe<GearMessageEnqueuedsConnection>;
  /** Reads and enables pagination through a set of `GearUserMessageSent`. */
  allGearUserMessageSents?: Maybe<GearUserMessageSentsConnection>;
  /** Reads and enables pagination through a set of `Metadatum`. */
  allMetadata?: Maybe<MetadataConnection>;
  /** Reads and enables pagination through a set of `Migration`. */
  allMigrations?: Maybe<MigrationsConnection>;
  /** Reads and enables pagination through a set of `Warning`. */
  allWarnings?: Maybe<WarningsConnection>;
  /** Reads a single `Block` using its globally unique `ID`. */
  block?: Maybe<Block>;
  blockById?: Maybe<Block>;
  /** Reads a single `Call` using its globally unique `ID`. */
  call?: Maybe<Call>;
  callById?: Maybe<Call>;
  /** Reads a single `ContractsContractEmitted` using its globally unique `ID`. */
  contractsContractEmitted?: Maybe<ContractsContractEmitted>;
  contractsContractEmittedByEventId?: Maybe<ContractsContractEmitted>;
  /** Reads a single `Event` using its globally unique `ID`. */
  event?: Maybe<Event>;
  eventById?: Maybe<Event>;
  /** Reads a single `Extrinsic` using its globally unique `ID`. */
  extrinsic?: Maybe<Extrinsic>;
  extrinsicById?: Maybe<Extrinsic>;
  /** Reads a single `FrontierEthereumTransaction` using its globally unique `ID`. */
  frontierEthereumTransaction?: Maybe<FrontierEthereumTransaction>;
  frontierEthereumTransactionByCallId?: Maybe<FrontierEthereumTransaction>;
  /** Reads a single `FrontierEvmLog` using its globally unique `ID`. */
  frontierEvmLog?: Maybe<FrontierEvmLog>;
  frontierEvmLogByEventId?: Maybe<FrontierEvmLog>;
  /** Reads a single `GearMessageEnqueued` using its globally unique `ID`. */
  gearMessageEnqueued?: Maybe<GearMessageEnqueued>;
  gearMessageEnqueuedByEventId?: Maybe<GearMessageEnqueued>;
  /** Reads a single `GearUserMessageSent` using its globally unique `ID`. */
  gearUserMessageSent?: Maybe<GearUserMessageSent>;
  gearUserMessageSentByEventId?: Maybe<GearUserMessageSent>;
  /** Reads a single `Metadatum` using its globally unique `ID`. */
  metadatum?: Maybe<Metadatum>;
  metadatumById?: Maybe<Metadatum>;
  /** Reads a single `Migration` using its globally unique `ID`. */
  migration?: Maybe<Migration>;
  migrationById?: Maybe<Migration>;
  migrationByName?: Maybe<Migration>;
  /** Fetches an object given its globally unique `ID`. */
  node?: Maybe<Node>;
  /** The root query type must be a `Node` to work well with Relay 1 mutations. This just resolves to `query`. */
  nodeId: Scalars['ID']['output'];
  /**
   * Exposes the root query type nested one level down. This is helpful for Relay 1
   * which can only query top level fields if they are in a particular form.
   */
  query: Query;
};


/** The root query type which gives access points into the data universe. */
export type QueryAcalaEvmExecutedArgs = {
  nodeId: Scalars['ID']['input'];
};


/** The root query type which gives access points into the data universe. */
export type QueryAcalaEvmExecutedByEventIdArgs = {
  eventId: Scalars['String']['input'];
};


/** The root query type which gives access points into the data universe. */
export type QueryAcalaEvmExecutedFailedArgs = {
  nodeId: Scalars['ID']['input'];
};


/** The root query type which gives access points into the data universe. */
export type QueryAcalaEvmExecutedFailedByEventIdArgs = {
  eventId: Scalars['String']['input'];
};


/** The root query type which gives access points into the data universe. */
export type QueryAcalaEvmExecutedFailedLogArgs = {
  nodeId: Scalars['ID']['input'];
};


/** The root query type which gives access points into the data universe. */
export type QueryAcalaEvmExecutedFailedLogByIdArgs = {
  id: Scalars['String']['input'];
};


/** The root query type which gives access points into the data universe. */
export type QueryAcalaEvmExecutedLogArgs = {
  nodeId: Scalars['ID']['input'];
};


/** The root query type which gives access points into the data universe. */
export type QueryAcalaEvmExecutedLogByIdArgs = {
  id: Scalars['String']['input'];
};


/** The root query type which gives access points into the data universe. */
export type QueryAllAcalaEvmExecutedFailedLogsArgs = {
  after?: InputMaybe<Scalars['Cursor']['input']>;
  before?: InputMaybe<Scalars['Cursor']['input']>;
  condition?: InputMaybe<AcalaEvmExecutedFailedLogCondition>;
  filter?: InputMaybe<AcalaEvmExecutedFailedLogFilter>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<AcalaEvmExecutedFailedLogsOrderBy>>;
};


/** The root query type which gives access points into the data universe. */
export type QueryAllAcalaEvmExecutedFailedsArgs = {
  after?: InputMaybe<Scalars['Cursor']['input']>;
  before?: InputMaybe<Scalars['Cursor']['input']>;
  condition?: InputMaybe<AcalaEvmExecutedFailedCondition>;
  filter?: InputMaybe<AcalaEvmExecutedFailedFilter>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<AcalaEvmExecutedFailedsOrderBy>>;
};


/** The root query type which gives access points into the data universe. */
export type QueryAllAcalaEvmExecutedLogsArgs = {
  after?: InputMaybe<Scalars['Cursor']['input']>;
  before?: InputMaybe<Scalars['Cursor']['input']>;
  condition?: InputMaybe<AcalaEvmExecutedLogCondition>;
  filter?: InputMaybe<AcalaEvmExecutedLogFilter>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<AcalaEvmExecutedLogsOrderBy>>;
};


/** The root query type which gives access points into the data universe. */
export type QueryAllAcalaEvmExecutedsArgs = {
  after?: InputMaybe<Scalars['Cursor']['input']>;
  before?: InputMaybe<Scalars['Cursor']['input']>;
  condition?: InputMaybe<AcalaEvmExecutedCondition>;
  filter?: InputMaybe<AcalaEvmExecutedFilter>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<AcalaEvmExecutedsOrderBy>>;
};


/** The root query type which gives access points into the data universe. */
export type QueryAllBlocksArgs = {
  after?: InputMaybe<Scalars['Cursor']['input']>;
  before?: InputMaybe<Scalars['Cursor']['input']>;
  condition?: InputMaybe<BlockCondition>;
  filter?: InputMaybe<BlockFilter>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<BlocksOrderBy>>;
};


/** The root query type which gives access points into the data universe. */
export type QueryAllCallsArgs = {
  after?: InputMaybe<Scalars['Cursor']['input']>;
  before?: InputMaybe<Scalars['Cursor']['input']>;
  condition?: InputMaybe<CallCondition>;
  filter?: InputMaybe<CallFilter>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<CallsOrderBy>>;
};


/** The root query type which gives access points into the data universe. */
export type QueryAllContractsContractEmittedsArgs = {
  after?: InputMaybe<Scalars['Cursor']['input']>;
  before?: InputMaybe<Scalars['Cursor']['input']>;
  condition?: InputMaybe<ContractsContractEmittedCondition>;
  filter?: InputMaybe<ContractsContractEmittedFilter>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<ContractsContractEmittedsOrderBy>>;
};


/** The root query type which gives access points into the data universe. */
export type QueryAllEventsArgs = {
  after?: InputMaybe<Scalars['Cursor']['input']>;
  before?: InputMaybe<Scalars['Cursor']['input']>;
  condition?: InputMaybe<EventCondition>;
  filter?: InputMaybe<EventFilter>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<EventsOrderBy>>;
};


/** The root query type which gives access points into the data universe. */
export type QueryAllExtrinsicsArgs = {
  after?: InputMaybe<Scalars['Cursor']['input']>;
  before?: InputMaybe<Scalars['Cursor']['input']>;
  condition?: InputMaybe<ExtrinsicCondition>;
  filter?: InputMaybe<ExtrinsicFilter>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<ExtrinsicsOrderBy>>;
};


/** The root query type which gives access points into the data universe. */
export type QueryAllFrontierEthereumTransactionsArgs = {
  after?: InputMaybe<Scalars['Cursor']['input']>;
  before?: InputMaybe<Scalars['Cursor']['input']>;
  condition?: InputMaybe<FrontierEthereumTransactionCondition>;
  filter?: InputMaybe<FrontierEthereumTransactionFilter>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<FrontierEthereumTransactionsOrderBy>>;
};


/** The root query type which gives access points into the data universe. */
export type QueryAllFrontierEvmLogsArgs = {
  after?: InputMaybe<Scalars['Cursor']['input']>;
  before?: InputMaybe<Scalars['Cursor']['input']>;
  condition?: InputMaybe<FrontierEvmLogCondition>;
  filter?: InputMaybe<FrontierEvmLogFilter>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<FrontierEvmLogsOrderBy>>;
};


/** The root query type which gives access points into the data universe. */
export type QueryAllGearMessageEnqueuedsArgs = {
  after?: InputMaybe<Scalars['Cursor']['input']>;
  before?: InputMaybe<Scalars['Cursor']['input']>;
  condition?: InputMaybe<GearMessageEnqueuedCondition>;
  filter?: InputMaybe<GearMessageEnqueuedFilter>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<GearMessageEnqueuedsOrderBy>>;
};


/** The root query type which gives access points into the data universe. */
export type QueryAllGearUserMessageSentsArgs = {
  after?: InputMaybe<Scalars['Cursor']['input']>;
  before?: InputMaybe<Scalars['Cursor']['input']>;
  condition?: InputMaybe<GearUserMessageSentCondition>;
  filter?: InputMaybe<GearUserMessageSentFilter>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<GearUserMessageSentsOrderBy>>;
};


/** The root query type which gives access points into the data universe. */
export type QueryAllMetadataArgs = {
  after?: InputMaybe<Scalars['Cursor']['input']>;
  before?: InputMaybe<Scalars['Cursor']['input']>;
  condition?: InputMaybe<MetadatumCondition>;
  filter?: InputMaybe<MetadatumFilter>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<MetadataOrderBy>>;
};


/** The root query type which gives access points into the data universe. */
export type QueryAllMigrationsArgs = {
  after?: InputMaybe<Scalars['Cursor']['input']>;
  before?: InputMaybe<Scalars['Cursor']['input']>;
  condition?: InputMaybe<MigrationCondition>;
  filter?: InputMaybe<MigrationFilter>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<MigrationsOrderBy>>;
};


/** The root query type which gives access points into the data universe. */
export type QueryAllWarningsArgs = {
  after?: InputMaybe<Scalars['Cursor']['input']>;
  before?: InputMaybe<Scalars['Cursor']['input']>;
  condition?: InputMaybe<WarningCondition>;
  filter?: InputMaybe<WarningFilter>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<WarningsOrderBy>>;
};


/** The root query type which gives access points into the data universe. */
export type QueryBlockArgs = {
  nodeId: Scalars['ID']['input'];
};


/** The root query type which gives access points into the data universe. */
export type QueryBlockByIdArgs = {
  id: Scalars['String']['input'];
};


/** The root query type which gives access points into the data universe. */
export type QueryCallArgs = {
  nodeId: Scalars['ID']['input'];
};


/** The root query type which gives access points into the data universe. */
export type QueryCallByIdArgs = {
  id: Scalars['String']['input'];
};


/** The root query type which gives access points into the data universe. */
export type QueryContractsContractEmittedArgs = {
  nodeId: Scalars['ID']['input'];
};


/** The root query type which gives access points into the data universe. */
export type QueryContractsContractEmittedByEventIdArgs = {
  eventId: Scalars['String']['input'];
};


/** The root query type which gives access points into the data universe. */
export type QueryEventArgs = {
  nodeId: Scalars['ID']['input'];
};


/** The root query type which gives access points into the data universe. */
export type QueryEventByIdArgs = {
  id: Scalars['String']['input'];
};


/** The root query type which gives access points into the data universe. */
export type QueryExtrinsicArgs = {
  nodeId: Scalars['ID']['input'];
};


/** The root query type which gives access points into the data universe. */
export type QueryExtrinsicByIdArgs = {
  id: Scalars['String']['input'];
};


/** The root query type which gives access points into the data universe. */
export type QueryFrontierEthereumTransactionArgs = {
  nodeId: Scalars['ID']['input'];
};


/** The root query type which gives access points into the data universe. */
export type QueryFrontierEthereumTransactionByCallIdArgs = {
  callId: Scalars['String']['input'];
};


/** The root query type which gives access points into the data universe. */
export type QueryFrontierEvmLogArgs = {
  nodeId: Scalars['ID']['input'];
};


/** The root query type which gives access points into the data universe. */
export type QueryFrontierEvmLogByEventIdArgs = {
  eventId: Scalars['String']['input'];
};


/** The root query type which gives access points into the data universe. */
export type QueryGearMessageEnqueuedArgs = {
  nodeId: Scalars['ID']['input'];
};


/** The root query type which gives access points into the data universe. */
export type QueryGearMessageEnqueuedByEventIdArgs = {
  eventId: Scalars['String']['input'];
};


/** The root query type which gives access points into the data universe. */
export type QueryGearUserMessageSentArgs = {
  nodeId: Scalars['ID']['input'];
};


/** The root query type which gives access points into the data universe. */
export type QueryGearUserMessageSentByEventIdArgs = {
  eventId: Scalars['String']['input'];
};


/** The root query type which gives access points into the data universe. */
export type QueryMetadatumArgs = {
  nodeId: Scalars['ID']['input'];
};


/** The root query type which gives access points into the data universe. */
export type QueryMetadatumByIdArgs = {
  id: Scalars['String']['input'];
};


/** The root query type which gives access points into the data universe. */
export type QueryMigrationArgs = {
  nodeId: Scalars['ID']['input'];
};


/** The root query type which gives access points into the data universe. */
export type QueryMigrationByIdArgs = {
  id: Scalars['Int']['input'];
};


/** The root query type which gives access points into the data universe. */
export type QueryMigrationByNameArgs = {
  name: Scalars['String']['input'];
};


/** The root query type which gives access points into the data universe. */
export type QueryNodeArgs = {
  nodeId: Scalars['ID']['input'];
};

/** A filter to be used against String fields. All fields are combined with a logical ‘and.’ */
export type StringFilter = {
  /** Not equal to the specified value, treating null like an ordinary value. */
  distinctFrom?: InputMaybe<Scalars['String']['input']>;
  /** Not equal to the specified value, treating null like an ordinary value (case-insensitive). */
  distinctFromInsensitive?: InputMaybe<Scalars['String']['input']>;
  /** Ends with the specified string (case-sensitive). */
  endsWith?: InputMaybe<Scalars['String']['input']>;
  /** Ends with the specified string (case-insensitive). */
  endsWithInsensitive?: InputMaybe<Scalars['String']['input']>;
  /** Equal to the specified value. */
  equalTo?: InputMaybe<Scalars['String']['input']>;
  /** Equal to the specified value (case-insensitive). */
  equalToInsensitive?: InputMaybe<Scalars['String']['input']>;
  /** Greater than the specified value. */
  greaterThan?: InputMaybe<Scalars['String']['input']>;
  /** Greater than the specified value (case-insensitive). */
  greaterThanInsensitive?: InputMaybe<Scalars['String']['input']>;
  /** Greater than or equal to the specified value. */
  greaterThanOrEqualTo?: InputMaybe<Scalars['String']['input']>;
  /** Greater than or equal to the specified value (case-insensitive). */
  greaterThanOrEqualToInsensitive?: InputMaybe<Scalars['String']['input']>;
  /** Included in the specified list. */
  in?: InputMaybe<Array<Scalars['String']['input']>>;
  /** Included in the specified list (case-insensitive). */
  inInsensitive?: InputMaybe<Array<Scalars['String']['input']>>;
  /** Contains the specified string (case-sensitive). */
  includes?: InputMaybe<Scalars['String']['input']>;
  /** Contains the specified string (case-insensitive). */
  includesInsensitive?: InputMaybe<Scalars['String']['input']>;
  /** Is null (if `true` is specified) or is not null (if `false` is specified). */
  isNull?: InputMaybe<Scalars['Boolean']['input']>;
  /** Less than the specified value. */
  lessThan?: InputMaybe<Scalars['String']['input']>;
  /** Less than the specified value (case-insensitive). */
  lessThanInsensitive?: InputMaybe<Scalars['String']['input']>;
  /** Less than or equal to the specified value. */
  lessThanOrEqualTo?: InputMaybe<Scalars['String']['input']>;
  /** Less than or equal to the specified value (case-insensitive). */
  lessThanOrEqualToInsensitive?: InputMaybe<Scalars['String']['input']>;
  /** Matches the specified pattern (case-sensitive). An underscore (_) matches any single character; a percent sign (%) matches any sequence of zero or more characters. */
  like?: InputMaybe<Scalars['String']['input']>;
  /** Matches the specified pattern (case-insensitive). An underscore (_) matches any single character; a percent sign (%) matches any sequence of zero or more characters. */
  likeInsensitive?: InputMaybe<Scalars['String']['input']>;
  /** Equal to the specified value, treating null like an ordinary value. */
  notDistinctFrom?: InputMaybe<Scalars['String']['input']>;
  /** Equal to the specified value, treating null like an ordinary value (case-insensitive). */
  notDistinctFromInsensitive?: InputMaybe<Scalars['String']['input']>;
  /** Does not end with the specified string (case-sensitive). */
  notEndsWith?: InputMaybe<Scalars['String']['input']>;
  /** Does not end with the specified string (case-insensitive). */
  notEndsWithInsensitive?: InputMaybe<Scalars['String']['input']>;
  /** Not equal to the specified value. */
  notEqualTo?: InputMaybe<Scalars['String']['input']>;
  /** Not equal to the specified value (case-insensitive). */
  notEqualToInsensitive?: InputMaybe<Scalars['String']['input']>;
  /** Not included in the specified list. */
  notIn?: InputMaybe<Array<Scalars['String']['input']>>;
  /** Not included in the specified list (case-insensitive). */
  notInInsensitive?: InputMaybe<Array<Scalars['String']['input']>>;
  /** Does not contain the specified string (case-sensitive). */
  notIncludes?: InputMaybe<Scalars['String']['input']>;
  /** Does not contain the specified string (case-insensitive). */
  notIncludesInsensitive?: InputMaybe<Scalars['String']['input']>;
  /** Does not match the specified pattern (case-sensitive). An underscore (_) matches any single character; a percent sign (%) matches any sequence of zero or more characters. */
  notLike?: InputMaybe<Scalars['String']['input']>;
  /** Does not match the specified pattern (case-insensitive). An underscore (_) matches any single character; a percent sign (%) matches any sequence of zero or more characters. */
  notLikeInsensitive?: InputMaybe<Scalars['String']['input']>;
  /** Does not start with the specified string (case-sensitive). */
  notStartsWith?: InputMaybe<Scalars['String']['input']>;
  /** Does not start with the specified string (case-insensitive). */
  notStartsWithInsensitive?: InputMaybe<Scalars['String']['input']>;
  /** Starts with the specified string (case-sensitive). */
  startsWith?: InputMaybe<Scalars['String']['input']>;
  /** Starts with the specified string (case-insensitive). */
  startsWithInsensitive?: InputMaybe<Scalars['String']['input']>;
};

export type Warning = {
  __typename?: 'Warning';
  blockId?: Maybe<Scalars['String']['output']>;
  message?: Maybe<Scalars['String']['output']>;
};

export type WarningAggregates = {
  __typename?: 'WarningAggregates';
  /** Distinct count aggregates across the matching connection (ignoring before/after/first/last/offset) */
  distinctCount?: Maybe<WarningDistinctCountAggregates>;
  keys?: Maybe<Array<Scalars['String']['output']>>;
};

/** A condition to be used against `Warning` object types. All fields are tested for equality and combined with a logical ‘and.’ */
export type WarningCondition = {
  /** Checks for equality with the object’s `blockId` field. */
  blockId?: InputMaybe<Scalars['String']['input']>;
  /** Checks for equality with the object’s `message` field. */
  message?: InputMaybe<Scalars['String']['input']>;
};

export type WarningDistinctCountAggregates = {
  __typename?: 'WarningDistinctCountAggregates';
  /** Distinct count of blockId across the matching connection */
  blockId?: Maybe<Scalars['BigInt']['output']>;
  /** Distinct count of message across the matching connection */
  message?: Maybe<Scalars['BigInt']['output']>;
};

/** A filter to be used against `Warning` object types. All fields are combined with a logical ‘and.’ */
export type WarningFilter = {
  /** Checks for all expressions in this list. */
  and?: InputMaybe<Array<WarningFilter>>;
  /** Filter by the object’s `blockId` field. */
  blockId?: InputMaybe<StringFilter>;
  /** Filter by the object’s `message` field. */
  message?: InputMaybe<StringFilter>;
  /** Negates the expression. */
  not?: InputMaybe<WarningFilter>;
  /** Checks for any expressions in this list. */
  or?: InputMaybe<Array<WarningFilter>>;
};

/** Grouping methods for `Warning` for usage during aggregation. */
export type WarningGroupBy =
  | 'BLOCK_ID'
  | 'MESSAGE';

/** Conditions for `Warning` aggregates. */
export type WarningHavingInput = {
  AND?: InputMaybe<Array<WarningHavingInput>>;
  OR?: InputMaybe<Array<WarningHavingInput>>;
};

/** A connection to a list of `Warning` values. */
export type WarningsConnection = {
  __typename?: 'WarningsConnection';
  /** Aggregates across the matching connection (ignoring before/after/first/last/offset) */
  aggregates?: Maybe<WarningAggregates>;
  /** A list of edges which contains the `Warning` and cursor to aid in pagination. */
  edges: Array<WarningsEdge>;
  /** Grouped aggregates across the matching connection (ignoring before/after/first/last/offset) */
  groupedAggregates?: Maybe<Array<WarningAggregates>>;
  /** A list of `Warning` objects. */
  nodes: Array<Warning>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
  /** The count of *all* `Warning` you could get from the connection. */
  totalCount: Scalars['Int']['output'];
};


/** A connection to a list of `Warning` values. */
export type WarningsConnectionGroupedAggregatesArgs = {
  groupBy: Array<WarningGroupBy>;
  having?: InputMaybe<WarningHavingInput>;
};

/** A `Warning` edge in the connection. */
export type WarningsEdge = {
  __typename?: 'WarningsEdge';
  /** A cursor for use in pagination. */
  cursor?: Maybe<Scalars['Cursor']['output']>;
  /** The `Warning` at the end of the edge. */
  node: Warning;
};

/** Methods to use when ordering `Warning`. */
export type WarningsOrderBy =
  | 'BLOCK_ID_ASC'
  | 'BLOCK_ID_DESC'
  | 'MESSAGE_ASC'
  | 'MESSAGE_DESC'
  | 'NATURAL';

export type GetBatchQueryVariables = Exact<{
  height: Scalars['Int']['input'];
  limit: Scalars['Int']['input'];
  swapEvents: Array<Scalars['String']['input']> | Scalars['String']['input'];
}>;


export type GetBatchQuery = { __typename?: 'Query', blocks?: { __typename?: 'BlocksConnection', nodes: Array<{ __typename?: 'Block', height: number, hash: string, timestamp: any, specId: string, events: { __typename?: 'EventsConnection', nodes: Array<{ __typename?: 'Event', args?: any | null, name: string, indexInBlock: number }> } }> } | null };

export type GetCallQueryVariables = Exact<{
  id: Scalars['String']['input'];
}>;


export type GetCallQuery = { __typename?: 'Query', call?: { __typename?: 'Call', args?: any | null } | null };

export type GetExtrinsicQueryVariables = Exact<{
  id: Scalars['String']['input'];
}>;


export type GetExtrinsicQuery = { __typename?: 'Query', extrinsic?: { __typename?: 'Extrinsic', signature?: any | null } | null };


export const GetBatchDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetBatch"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"height"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"limit"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"swapEvents"}},"type":{"kind":"NonNullType","type":{"kind":"ListType","type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","alias":{"kind":"Name","value":"blocks"},"name":{"kind":"Name","value":"allBlocks"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"filter"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"height"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"greaterThanOrEqualTo"},"value":{"kind":"Variable","name":{"kind":"Name","value":"height"}}}]}}]}},{"kind":"Argument","name":{"kind":"Name","value":"first"},"value":{"kind":"Variable","name":{"kind":"Name","value":"limit"}}},{"kind":"Argument","name":{"kind":"Name","value":"orderBy"},"value":{"kind":"EnumValue","value":"HEIGHT_ASC"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"nodes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"height"}},{"kind":"Field","name":{"kind":"Name","value":"hash"}},{"kind":"Field","name":{"kind":"Name","value":"timestamp"}},{"kind":"Field","name":{"kind":"Name","value":"specId"}},{"kind":"Field","alias":{"kind":"Name","value":"events"},"name":{"kind":"Name","value":"eventsByBlockId"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"filter"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"name"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"in"},"value":{"kind":"Variable","name":{"kind":"Name","value":"swapEvents"}}}]}}]}},{"kind":"Argument","name":{"kind":"Name","value":"orderBy"},"value":{"kind":"EnumValue","value":"INDEX_IN_BLOCK_ASC"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"nodes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"args"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"indexInBlock"}}]}}]}}]}}]}}]}}]} as unknown as DocumentNode<GetBatchQuery, GetBatchQueryVariables>;
export const GetCallDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetCall"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","alias":{"kind":"Name","value":"call"},"name":{"kind":"Name","value":"callById"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"args"}}]}}]}}]} as unknown as DocumentNode<GetCallQuery, GetCallQueryVariables>;
export const GetExtrinsicDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetExtrinsic"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","alias":{"kind":"Name","value":"extrinsic"},"name":{"kind":"Name","value":"extrinsicById"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"signature"}}]}}]}}]} as unknown as DocumentNode<GetExtrinsicQuery, GetExtrinsicQueryVariables>;
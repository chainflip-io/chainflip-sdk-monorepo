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

export type AcalaEvmExecutedFailed = Node & {
  __typename?: 'AcalaEvmExecutedFailed';
  contract: Scalars['String']['output'];
  /** Reads a single `Event` that is related to this `AcalaEvmExecutedFailed`. */
  eventByEventId: Event;
  eventId: Scalars['String']['output'];
  /** A globally unique identifier. Can be used in various places throughout the system to identify this single value. */
  nodeId: Scalars['ID']['output'];
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

/** A connection to a list of `AcalaEvmExecutedFailedLog` values. */
export type AcalaEvmExecutedFailedLogsConnection = {
  __typename?: 'AcalaEvmExecutedFailedLogsConnection';
  /** A list of edges which contains the `AcalaEvmExecutedFailedLog` and cursor to aid in pagination. */
  edges: Array<AcalaEvmExecutedFailedLogsEdge>;
  /** A list of `AcalaEvmExecutedFailedLog` objects. */
  nodes: Array<AcalaEvmExecutedFailedLog>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
  /** The count of *all* `AcalaEvmExecutedFailedLog` you could get from the connection. */
  totalCount: Scalars['Int']['output'];
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
  /** A list of edges which contains the `AcalaEvmExecutedFailed` and cursor to aid in pagination. */
  edges: Array<AcalaEvmExecutedFailedsEdge>;
  /** A list of `AcalaEvmExecutedFailed` objects. */
  nodes: Array<AcalaEvmExecutedFailed>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
  /** The count of *all* `AcalaEvmExecutedFailed` you could get from the connection. */
  totalCount: Scalars['Int']['output'];
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

/** A connection to a list of `AcalaEvmExecutedLog` values. */
export type AcalaEvmExecutedLogsConnection = {
  __typename?: 'AcalaEvmExecutedLogsConnection';
  /** A list of edges which contains the `AcalaEvmExecutedLog` and cursor to aid in pagination. */
  edges: Array<AcalaEvmExecutedLogsEdge>;
  /** A list of `AcalaEvmExecutedLog` objects. */
  nodes: Array<AcalaEvmExecutedLog>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
  /** The count of *all* `AcalaEvmExecutedLog` you could get from the connection. */
  totalCount: Scalars['Int']['output'];
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
  /** A list of edges which contains the `AcalaEvmExecuted` and cursor to aid in pagination. */
  edges: Array<AcalaEvmExecutedsEdge>;
  /** A list of `AcalaEvmExecuted` objects. */
  nodes: Array<AcalaEvmExecuted>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
  /** The count of *all* `AcalaEvmExecuted` you could get from the connection. */
  totalCount: Scalars['Int']['output'];
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

export type AccountRole =
  | 'lp'
  | 'unregistered'
  | 'validator';

/** A filter to be used against AccountRole fields. All fields are combined with a logical ‘and.’ */
export type AccountRoleFilter = {
  /** Not equal to the specified value, treating null like an ordinary value. */
  distinctFrom?: InputMaybe<AccountRole>;
  /** Equal to the specified value. */
  equalTo?: InputMaybe<AccountRole>;
  /** Greater than the specified value. */
  greaterThan?: InputMaybe<AccountRole>;
  /** Greater than or equal to the specified value. */
  greaterThanOrEqualTo?: InputMaybe<AccountRole>;
  /** Included in the specified list. */
  in?: InputMaybe<Array<AccountRole>>;
  /** Is null (if `true` is specified) or is not null (if `false` is specified). */
  isNull?: InputMaybe<Scalars['Boolean']['input']>;
  /** Less than the specified value. */
  lessThan?: InputMaybe<AccountRole>;
  /** Less than or equal to the specified value. */
  lessThanOrEqualTo?: InputMaybe<AccountRole>;
  /** Equal to the specified value, treating null like an ordinary value. */
  notDistinctFrom?: InputMaybe<AccountRole>;
  /** Not equal to the specified value. */
  notEqualTo?: InputMaybe<AccountRole>;
  /** Not included in the specified list. */
  notIn?: InputMaybe<Array<AccountRole>>;
};

export type App =
  | 'ALL'
  | 'EXPLORER'
  | 'STAKE'
  | 'SWAP';

/** A filter to be used against App fields. All fields are combined with a logical ‘and.’ */
export type AppFilter = {
  /** Not equal to the specified value, treating null like an ordinary value. */
  distinctFrom?: InputMaybe<App>;
  /** Equal to the specified value. */
  equalTo?: InputMaybe<App>;
  /** Greater than the specified value. */
  greaterThan?: InputMaybe<App>;
  /** Greater than or equal to the specified value. */
  greaterThanOrEqualTo?: InputMaybe<App>;
  /** Included in the specified list. */
  in?: InputMaybe<Array<App>>;
  /** Is null (if `true` is specified) or is not null (if `false` is specified). */
  isNull?: InputMaybe<Scalars['Boolean']['input']>;
  /** Less than the specified value. */
  lessThan?: InputMaybe<App>;
  /** Less than or equal to the specified value. */
  lessThanOrEqualTo?: InputMaybe<App>;
  /** Equal to the specified value, treating null like an ordinary value. */
  notDistinctFrom?: InputMaybe<App>;
  /** Not equal to the specified value. */
  notEqualTo?: InputMaybe<App>;
  /** Not included in the specified list. */
  notIn?: InputMaybe<Array<App>>;
};

export type Auction = Node & {
  __typename?: 'Auction';
  currentHeight: Scalars['Int']['output'];
  endBlockNumber: Scalars['Int']['output'];
  id: Scalars['Int']['output'];
  minActiveBid?: Maybe<Scalars['BigFloat']['output']>;
  /** A globally unique identifier. Can be used in various places throughout the system to identify this single value. */
  nodeId: Scalars['ID']['output'];
  projectedLockup?: Maybe<Scalars['BigFloat']['output']>;
  redemptionPeriodAsPercentage: Scalars['Int']['output'];
  startBlockNumber: Scalars['Int']['output'];
  targetSetSize: Scalars['Int']['output'];
};

export type AuctionAggregates = {
  __typename?: 'AuctionAggregates';
  /** Mean average aggregates across the matching connection (ignoring before/after/first/last/offset) */
  average?: Maybe<AuctionAverageAggregates>;
  /** Distinct count aggregates across the matching connection (ignoring before/after/first/last/offset) */
  distinctCount?: Maybe<AuctionDistinctCountAggregates>;
  keys?: Maybe<Array<Scalars['String']['output']>>;
  /** Maximum aggregates across the matching connection (ignoring before/after/first/last/offset) */
  max?: Maybe<AuctionMaxAggregates>;
  /** Minimum aggregates across the matching connection (ignoring before/after/first/last/offset) */
  min?: Maybe<AuctionMinAggregates>;
  /** Population standard deviation aggregates across the matching connection (ignoring before/after/first/last/offset) */
  stddevPopulation?: Maybe<AuctionStddevPopulationAggregates>;
  /** Sample standard deviation aggregates across the matching connection (ignoring before/after/first/last/offset) */
  stddevSample?: Maybe<AuctionStddevSampleAggregates>;
  /** Sum aggregates across the matching connection (ignoring before/after/first/last/offset) */
  sum?: Maybe<AuctionSumAggregates>;
  /** Population variance aggregates across the matching connection (ignoring before/after/first/last/offset) */
  variancePopulation?: Maybe<AuctionVariancePopulationAggregates>;
  /** Sample variance aggregates across the matching connection (ignoring before/after/first/last/offset) */
  varianceSample?: Maybe<AuctionVarianceSampleAggregates>;
};

export type AuctionAverageAggregates = {
  __typename?: 'AuctionAverageAggregates';
  /** Mean average of currentHeight across the matching connection */
  currentHeight?: Maybe<Scalars['BigFloat']['output']>;
  /** Mean average of endBlockNumber across the matching connection */
  endBlockNumber?: Maybe<Scalars['BigFloat']['output']>;
  /** Mean average of id across the matching connection */
  id?: Maybe<Scalars['BigFloat']['output']>;
  /** Mean average of minActiveBid across the matching connection */
  minActiveBid?: Maybe<Scalars['BigFloat']['output']>;
  /** Mean average of projectedLockup across the matching connection */
  projectedLockup?: Maybe<Scalars['BigFloat']['output']>;
  /** Mean average of redemptionPeriodAsPercentage across the matching connection */
  redemptionPeriodAsPercentage?: Maybe<Scalars['BigFloat']['output']>;
  /** Mean average of startBlockNumber across the matching connection */
  startBlockNumber?: Maybe<Scalars['BigFloat']['output']>;
  /** Mean average of targetSetSize across the matching connection */
  targetSetSize?: Maybe<Scalars['BigFloat']['output']>;
};

/** A condition to be used against `Auction` object types. All fields are tested for equality and combined with a logical ‘and.’ */
export type AuctionCondition = {
  /** Checks for equality with the object’s `currentHeight` field. */
  currentHeight?: InputMaybe<Scalars['Int']['input']>;
  /** Checks for equality with the object’s `endBlockNumber` field. */
  endBlockNumber?: InputMaybe<Scalars['Int']['input']>;
  /** Checks for equality with the object’s `id` field. */
  id?: InputMaybe<Scalars['Int']['input']>;
  /** Checks for equality with the object’s `minActiveBid` field. */
  minActiveBid?: InputMaybe<Scalars['BigFloat']['input']>;
  /** Checks for equality with the object’s `projectedLockup` field. */
  projectedLockup?: InputMaybe<Scalars['BigFloat']['input']>;
  /** Checks for equality with the object’s `redemptionPeriodAsPercentage` field. */
  redemptionPeriodAsPercentage?: InputMaybe<Scalars['Int']['input']>;
  /** Checks for equality with the object’s `startBlockNumber` field. */
  startBlockNumber?: InputMaybe<Scalars['Int']['input']>;
  /** Checks for equality with the object’s `targetSetSize` field. */
  targetSetSize?: InputMaybe<Scalars['Int']['input']>;
};

export type AuctionDistinctCountAggregates = {
  __typename?: 'AuctionDistinctCountAggregates';
  /** Distinct count of currentHeight across the matching connection */
  currentHeight?: Maybe<Scalars['BigInt']['output']>;
  /** Distinct count of endBlockNumber across the matching connection */
  endBlockNumber?: Maybe<Scalars['BigInt']['output']>;
  /** Distinct count of id across the matching connection */
  id?: Maybe<Scalars['BigInt']['output']>;
  /** Distinct count of minActiveBid across the matching connection */
  minActiveBid?: Maybe<Scalars['BigInt']['output']>;
  /** Distinct count of projectedLockup across the matching connection */
  projectedLockup?: Maybe<Scalars['BigInt']['output']>;
  /** Distinct count of redemptionPeriodAsPercentage across the matching connection */
  redemptionPeriodAsPercentage?: Maybe<Scalars['BigInt']['output']>;
  /** Distinct count of startBlockNumber across the matching connection */
  startBlockNumber?: Maybe<Scalars['BigInt']['output']>;
  /** Distinct count of targetSetSize across the matching connection */
  targetSetSize?: Maybe<Scalars['BigInt']['output']>;
};

/** A filter to be used against `Auction` object types. All fields are combined with a logical ‘and.’ */
export type AuctionFilter = {
  /** Checks for all expressions in this list. */
  and?: InputMaybe<Array<AuctionFilter>>;
  /** Filter by the object’s `currentHeight` field. */
  currentHeight?: InputMaybe<IntFilter>;
  /** Filter by the object’s `endBlockNumber` field. */
  endBlockNumber?: InputMaybe<IntFilter>;
  /** Filter by the object’s `id` field. */
  id?: InputMaybe<IntFilter>;
  /** Filter by the object’s `minActiveBid` field. */
  minActiveBid?: InputMaybe<BigFloatFilter>;
  /** Negates the expression. */
  not?: InputMaybe<AuctionFilter>;
  /** Checks for any expressions in this list. */
  or?: InputMaybe<Array<AuctionFilter>>;
  /** Filter by the object’s `projectedLockup` field. */
  projectedLockup?: InputMaybe<BigFloatFilter>;
  /** Filter by the object’s `redemptionPeriodAsPercentage` field. */
  redemptionPeriodAsPercentage?: InputMaybe<IntFilter>;
  /** Filter by the object’s `startBlockNumber` field. */
  startBlockNumber?: InputMaybe<IntFilter>;
  /** Filter by the object’s `targetSetSize` field. */
  targetSetSize?: InputMaybe<IntFilter>;
};

/** Grouping methods for `Auction` for usage during aggregation. */
export type AuctionGroupBy =
  | 'CURRENT_HEIGHT'
  | 'END_BLOCK_NUMBER'
  | 'MIN_ACTIVE_BID'
  | 'PROJECTED_LOCKUP'
  | 'REDEMPTION_PERIOD_AS_PERCENTAGE'
  | 'START_BLOCK_NUMBER'
  | 'TARGET_SET_SIZE';

export type AuctionHavingAverageInput = {
  currentHeight?: InputMaybe<HavingIntFilter>;
  endBlockNumber?: InputMaybe<HavingIntFilter>;
  id?: InputMaybe<HavingIntFilter>;
  minActiveBid?: InputMaybe<HavingBigfloatFilter>;
  projectedLockup?: InputMaybe<HavingBigfloatFilter>;
  redemptionPeriodAsPercentage?: InputMaybe<HavingIntFilter>;
  startBlockNumber?: InputMaybe<HavingIntFilter>;
  targetSetSize?: InputMaybe<HavingIntFilter>;
};

export type AuctionHavingDistinctCountInput = {
  currentHeight?: InputMaybe<HavingIntFilter>;
  endBlockNumber?: InputMaybe<HavingIntFilter>;
  id?: InputMaybe<HavingIntFilter>;
  minActiveBid?: InputMaybe<HavingBigfloatFilter>;
  projectedLockup?: InputMaybe<HavingBigfloatFilter>;
  redemptionPeriodAsPercentage?: InputMaybe<HavingIntFilter>;
  startBlockNumber?: InputMaybe<HavingIntFilter>;
  targetSetSize?: InputMaybe<HavingIntFilter>;
};

/** Conditions for `Auction` aggregates. */
export type AuctionHavingInput = {
  AND?: InputMaybe<Array<AuctionHavingInput>>;
  OR?: InputMaybe<Array<AuctionHavingInput>>;
  average?: InputMaybe<AuctionHavingAverageInput>;
  distinctCount?: InputMaybe<AuctionHavingDistinctCountInput>;
  max?: InputMaybe<AuctionHavingMaxInput>;
  min?: InputMaybe<AuctionHavingMinInput>;
  stddevPopulation?: InputMaybe<AuctionHavingStddevPopulationInput>;
  stddevSample?: InputMaybe<AuctionHavingStddevSampleInput>;
  sum?: InputMaybe<AuctionHavingSumInput>;
  variancePopulation?: InputMaybe<AuctionHavingVariancePopulationInput>;
  varianceSample?: InputMaybe<AuctionHavingVarianceSampleInput>;
};

export type AuctionHavingMaxInput = {
  currentHeight?: InputMaybe<HavingIntFilter>;
  endBlockNumber?: InputMaybe<HavingIntFilter>;
  id?: InputMaybe<HavingIntFilter>;
  minActiveBid?: InputMaybe<HavingBigfloatFilter>;
  projectedLockup?: InputMaybe<HavingBigfloatFilter>;
  redemptionPeriodAsPercentage?: InputMaybe<HavingIntFilter>;
  startBlockNumber?: InputMaybe<HavingIntFilter>;
  targetSetSize?: InputMaybe<HavingIntFilter>;
};

export type AuctionHavingMinInput = {
  currentHeight?: InputMaybe<HavingIntFilter>;
  endBlockNumber?: InputMaybe<HavingIntFilter>;
  id?: InputMaybe<HavingIntFilter>;
  minActiveBid?: InputMaybe<HavingBigfloatFilter>;
  projectedLockup?: InputMaybe<HavingBigfloatFilter>;
  redemptionPeriodAsPercentage?: InputMaybe<HavingIntFilter>;
  startBlockNumber?: InputMaybe<HavingIntFilter>;
  targetSetSize?: InputMaybe<HavingIntFilter>;
};

export type AuctionHavingStddevPopulationInput = {
  currentHeight?: InputMaybe<HavingIntFilter>;
  endBlockNumber?: InputMaybe<HavingIntFilter>;
  id?: InputMaybe<HavingIntFilter>;
  minActiveBid?: InputMaybe<HavingBigfloatFilter>;
  projectedLockup?: InputMaybe<HavingBigfloatFilter>;
  redemptionPeriodAsPercentage?: InputMaybe<HavingIntFilter>;
  startBlockNumber?: InputMaybe<HavingIntFilter>;
  targetSetSize?: InputMaybe<HavingIntFilter>;
};

export type AuctionHavingStddevSampleInput = {
  currentHeight?: InputMaybe<HavingIntFilter>;
  endBlockNumber?: InputMaybe<HavingIntFilter>;
  id?: InputMaybe<HavingIntFilter>;
  minActiveBid?: InputMaybe<HavingBigfloatFilter>;
  projectedLockup?: InputMaybe<HavingBigfloatFilter>;
  redemptionPeriodAsPercentage?: InputMaybe<HavingIntFilter>;
  startBlockNumber?: InputMaybe<HavingIntFilter>;
  targetSetSize?: InputMaybe<HavingIntFilter>;
};

export type AuctionHavingSumInput = {
  currentHeight?: InputMaybe<HavingIntFilter>;
  endBlockNumber?: InputMaybe<HavingIntFilter>;
  id?: InputMaybe<HavingIntFilter>;
  minActiveBid?: InputMaybe<HavingBigfloatFilter>;
  projectedLockup?: InputMaybe<HavingBigfloatFilter>;
  redemptionPeriodAsPercentage?: InputMaybe<HavingIntFilter>;
  startBlockNumber?: InputMaybe<HavingIntFilter>;
  targetSetSize?: InputMaybe<HavingIntFilter>;
};

export type AuctionHavingVariancePopulationInput = {
  currentHeight?: InputMaybe<HavingIntFilter>;
  endBlockNumber?: InputMaybe<HavingIntFilter>;
  id?: InputMaybe<HavingIntFilter>;
  minActiveBid?: InputMaybe<HavingBigfloatFilter>;
  projectedLockup?: InputMaybe<HavingBigfloatFilter>;
  redemptionPeriodAsPercentage?: InputMaybe<HavingIntFilter>;
  startBlockNumber?: InputMaybe<HavingIntFilter>;
  targetSetSize?: InputMaybe<HavingIntFilter>;
};

export type AuctionHavingVarianceSampleInput = {
  currentHeight?: InputMaybe<HavingIntFilter>;
  endBlockNumber?: InputMaybe<HavingIntFilter>;
  id?: InputMaybe<HavingIntFilter>;
  minActiveBid?: InputMaybe<HavingBigfloatFilter>;
  projectedLockup?: InputMaybe<HavingBigfloatFilter>;
  redemptionPeriodAsPercentage?: InputMaybe<HavingIntFilter>;
  startBlockNumber?: InputMaybe<HavingIntFilter>;
  targetSetSize?: InputMaybe<HavingIntFilter>;
};

export type AuctionMaxAggregates = {
  __typename?: 'AuctionMaxAggregates';
  /** Maximum of currentHeight across the matching connection */
  currentHeight?: Maybe<Scalars['Int']['output']>;
  /** Maximum of endBlockNumber across the matching connection */
  endBlockNumber?: Maybe<Scalars['Int']['output']>;
  /** Maximum of id across the matching connection */
  id?: Maybe<Scalars['Int']['output']>;
  /** Maximum of minActiveBid across the matching connection */
  minActiveBid?: Maybe<Scalars['BigFloat']['output']>;
  /** Maximum of projectedLockup across the matching connection */
  projectedLockup?: Maybe<Scalars['BigFloat']['output']>;
  /** Maximum of redemptionPeriodAsPercentage across the matching connection */
  redemptionPeriodAsPercentage?: Maybe<Scalars['Int']['output']>;
  /** Maximum of startBlockNumber across the matching connection */
  startBlockNumber?: Maybe<Scalars['Int']['output']>;
  /** Maximum of targetSetSize across the matching connection */
  targetSetSize?: Maybe<Scalars['Int']['output']>;
};

export type AuctionMinAggregates = {
  __typename?: 'AuctionMinAggregates';
  /** Minimum of currentHeight across the matching connection */
  currentHeight?: Maybe<Scalars['Int']['output']>;
  /** Minimum of endBlockNumber across the matching connection */
  endBlockNumber?: Maybe<Scalars['Int']['output']>;
  /** Minimum of id across the matching connection */
  id?: Maybe<Scalars['Int']['output']>;
  /** Minimum of minActiveBid across the matching connection */
  minActiveBid?: Maybe<Scalars['BigFloat']['output']>;
  /** Minimum of projectedLockup across the matching connection */
  projectedLockup?: Maybe<Scalars['BigFloat']['output']>;
  /** Minimum of redemptionPeriodAsPercentage across the matching connection */
  redemptionPeriodAsPercentage?: Maybe<Scalars['Int']['output']>;
  /** Minimum of startBlockNumber across the matching connection */
  startBlockNumber?: Maybe<Scalars['Int']['output']>;
  /** Minimum of targetSetSize across the matching connection */
  targetSetSize?: Maybe<Scalars['Int']['output']>;
};

export type AuctionStddevPopulationAggregates = {
  __typename?: 'AuctionStddevPopulationAggregates';
  /** Population standard deviation of currentHeight across the matching connection */
  currentHeight?: Maybe<Scalars['BigFloat']['output']>;
  /** Population standard deviation of endBlockNumber across the matching connection */
  endBlockNumber?: Maybe<Scalars['BigFloat']['output']>;
  /** Population standard deviation of id across the matching connection */
  id?: Maybe<Scalars['BigFloat']['output']>;
  /** Population standard deviation of minActiveBid across the matching connection */
  minActiveBid?: Maybe<Scalars['BigFloat']['output']>;
  /** Population standard deviation of projectedLockup across the matching connection */
  projectedLockup?: Maybe<Scalars['BigFloat']['output']>;
  /** Population standard deviation of redemptionPeriodAsPercentage across the matching connection */
  redemptionPeriodAsPercentage?: Maybe<Scalars['BigFloat']['output']>;
  /** Population standard deviation of startBlockNumber across the matching connection */
  startBlockNumber?: Maybe<Scalars['BigFloat']['output']>;
  /** Population standard deviation of targetSetSize across the matching connection */
  targetSetSize?: Maybe<Scalars['BigFloat']['output']>;
};

export type AuctionStddevSampleAggregates = {
  __typename?: 'AuctionStddevSampleAggregates';
  /** Sample standard deviation of currentHeight across the matching connection */
  currentHeight?: Maybe<Scalars['BigFloat']['output']>;
  /** Sample standard deviation of endBlockNumber across the matching connection */
  endBlockNumber?: Maybe<Scalars['BigFloat']['output']>;
  /** Sample standard deviation of id across the matching connection */
  id?: Maybe<Scalars['BigFloat']['output']>;
  /** Sample standard deviation of minActiveBid across the matching connection */
  minActiveBid?: Maybe<Scalars['BigFloat']['output']>;
  /** Sample standard deviation of projectedLockup across the matching connection */
  projectedLockup?: Maybe<Scalars['BigFloat']['output']>;
  /** Sample standard deviation of redemptionPeriodAsPercentage across the matching connection */
  redemptionPeriodAsPercentage?: Maybe<Scalars['BigFloat']['output']>;
  /** Sample standard deviation of startBlockNumber across the matching connection */
  startBlockNumber?: Maybe<Scalars['BigFloat']['output']>;
  /** Sample standard deviation of targetSetSize across the matching connection */
  targetSetSize?: Maybe<Scalars['BigFloat']['output']>;
};

export type AuctionSumAggregates = {
  __typename?: 'AuctionSumAggregates';
  /** Sum of currentHeight across the matching connection */
  currentHeight: Scalars['BigInt']['output'];
  /** Sum of endBlockNumber across the matching connection */
  endBlockNumber: Scalars['BigInt']['output'];
  /** Sum of id across the matching connection */
  id: Scalars['BigInt']['output'];
  /** Sum of minActiveBid across the matching connection */
  minActiveBid: Scalars['BigFloat']['output'];
  /** Sum of projectedLockup across the matching connection */
  projectedLockup: Scalars['BigFloat']['output'];
  /** Sum of redemptionPeriodAsPercentage across the matching connection */
  redemptionPeriodAsPercentage: Scalars['BigInt']['output'];
  /** Sum of startBlockNumber across the matching connection */
  startBlockNumber: Scalars['BigInt']['output'];
  /** Sum of targetSetSize across the matching connection */
  targetSetSize: Scalars['BigInt']['output'];
};

export type AuctionVariancePopulationAggregates = {
  __typename?: 'AuctionVariancePopulationAggregates';
  /** Population variance of currentHeight across the matching connection */
  currentHeight?: Maybe<Scalars['BigFloat']['output']>;
  /** Population variance of endBlockNumber across the matching connection */
  endBlockNumber?: Maybe<Scalars['BigFloat']['output']>;
  /** Population variance of id across the matching connection */
  id?: Maybe<Scalars['BigFloat']['output']>;
  /** Population variance of minActiveBid across the matching connection */
  minActiveBid?: Maybe<Scalars['BigFloat']['output']>;
  /** Population variance of projectedLockup across the matching connection */
  projectedLockup?: Maybe<Scalars['BigFloat']['output']>;
  /** Population variance of redemptionPeriodAsPercentage across the matching connection */
  redemptionPeriodAsPercentage?: Maybe<Scalars['BigFloat']['output']>;
  /** Population variance of startBlockNumber across the matching connection */
  startBlockNumber?: Maybe<Scalars['BigFloat']['output']>;
  /** Population variance of targetSetSize across the matching connection */
  targetSetSize?: Maybe<Scalars['BigFloat']['output']>;
};

export type AuctionVarianceSampleAggregates = {
  __typename?: 'AuctionVarianceSampleAggregates';
  /** Sample variance of currentHeight across the matching connection */
  currentHeight?: Maybe<Scalars['BigFloat']['output']>;
  /** Sample variance of endBlockNumber across the matching connection */
  endBlockNumber?: Maybe<Scalars['BigFloat']['output']>;
  /** Sample variance of id across the matching connection */
  id?: Maybe<Scalars['BigFloat']['output']>;
  /** Sample variance of minActiveBid across the matching connection */
  minActiveBid?: Maybe<Scalars['BigFloat']['output']>;
  /** Sample variance of projectedLockup across the matching connection */
  projectedLockup?: Maybe<Scalars['BigFloat']['output']>;
  /** Sample variance of redemptionPeriodAsPercentage across the matching connection */
  redemptionPeriodAsPercentage?: Maybe<Scalars['BigFloat']['output']>;
  /** Sample variance of startBlockNumber across the matching connection */
  startBlockNumber?: Maybe<Scalars['BigFloat']['output']>;
  /** Sample variance of targetSetSize across the matching connection */
  targetSetSize?: Maybe<Scalars['BigFloat']['output']>;
};

/** A connection to a list of `Auction` values. */
export type AuctionsConnection = {
  __typename?: 'AuctionsConnection';
  /** Aggregates across the matching connection (ignoring before/after/first/last/offset) */
  aggregates?: Maybe<AuctionAggregates>;
  /** A list of edges which contains the `Auction` and cursor to aid in pagination. */
  edges: Array<AuctionsEdge>;
  /** Grouped aggregates across the matching connection (ignoring before/after/first/last/offset) */
  groupedAggregates?: Maybe<Array<AuctionAggregates>>;
  /** A list of `Auction` objects. */
  nodes: Array<Auction>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
  /** The count of *all* `Auction` you could get from the connection. */
  totalCount: Scalars['Int']['output'];
};


/** A connection to a list of `Auction` values. */
export type AuctionsConnectionGroupedAggregatesArgs = {
  groupBy: Array<AuctionGroupBy>;
  having?: InputMaybe<AuctionHavingInput>;
};

/** A `Auction` edge in the connection. */
export type AuctionsEdge = {
  __typename?: 'AuctionsEdge';
  /** A cursor for use in pagination. */
  cursor?: Maybe<Scalars['Cursor']['output']>;
  /** The `Auction` at the end of the edge. */
  node: Auction;
};

/** Methods to use when ordering `Auction`. */
export type AuctionsOrderBy =
  | 'CURRENT_HEIGHT_ASC'
  | 'CURRENT_HEIGHT_DESC'
  | 'END_BLOCK_NUMBER_ASC'
  | 'END_BLOCK_NUMBER_DESC'
  | 'ID_ASC'
  | 'ID_DESC'
  | 'MIN_ACTIVE_BID_ASC'
  | 'MIN_ACTIVE_BID_DESC'
  | 'NATURAL'
  | 'PRIMARY_KEY_ASC'
  | 'PRIMARY_KEY_DESC'
  | 'PROJECTED_LOCKUP_ASC'
  | 'PROJECTED_LOCKUP_DESC'
  | 'REDEMPTION_PERIOD_AS_PERCENTAGE_ASC'
  | 'REDEMPTION_PERIOD_AS_PERCENTAGE_DESC'
  | 'START_BLOCK_NUMBER_ASC'
  | 'START_BLOCK_NUMBER_DESC'
  | 'TARGET_SET_SIZE_ASC'
  | 'TARGET_SET_SIZE_DESC';

export type Banner = Node & {
  __typename?: 'Banner';
  app: App;
  message: Scalars['String']['output'];
  /** A globally unique identifier. Can be used in various places throughout the system to identify this single value. */
  nodeId: Scalars['ID']['output'];
  type: BannerType;
};

export type BannerAggregates = {
  __typename?: 'BannerAggregates';
  /** Distinct count aggregates across the matching connection (ignoring before/after/first/last/offset) */
  distinctCount?: Maybe<BannerDistinctCountAggregates>;
  keys?: Maybe<Array<Scalars['String']['output']>>;
};

/** A condition to be used against `Banner` object types. All fields are tested for equality and combined with a logical ‘and.’ */
export type BannerCondition = {
  /** Checks for equality with the object’s `app` field. */
  app?: InputMaybe<App>;
  /** Checks for equality with the object’s `message` field. */
  message?: InputMaybe<Scalars['String']['input']>;
  /** Checks for equality with the object’s `type` field. */
  type?: InputMaybe<BannerType>;
};

export type BannerDistinctCountAggregates = {
  __typename?: 'BannerDistinctCountAggregates';
  /** Distinct count of app across the matching connection */
  app?: Maybe<Scalars['BigInt']['output']>;
  /** Distinct count of message across the matching connection */
  message?: Maybe<Scalars['BigInt']['output']>;
  /** Distinct count of type across the matching connection */
  type?: Maybe<Scalars['BigInt']['output']>;
};

/** A filter to be used against `Banner` object types. All fields are combined with a logical ‘and.’ */
export type BannerFilter = {
  /** Checks for all expressions in this list. */
  and?: InputMaybe<Array<BannerFilter>>;
  /** Filter by the object’s `app` field. */
  app?: InputMaybe<AppFilter>;
  /** Filter by the object’s `message` field. */
  message?: InputMaybe<StringFilter>;
  /** Negates the expression. */
  not?: InputMaybe<BannerFilter>;
  /** Checks for any expressions in this list. */
  or?: InputMaybe<Array<BannerFilter>>;
  /** Filter by the object’s `type` field. */
  type?: InputMaybe<BannerTypeFilter>;
};

/** Grouping methods for `Banner` for usage during aggregation. */
export type BannerGroupBy =
  | 'MESSAGE'
  | 'TYPE';

/** Conditions for `Banner` aggregates. */
export type BannerHavingInput = {
  AND?: InputMaybe<Array<BannerHavingInput>>;
  OR?: InputMaybe<Array<BannerHavingInput>>;
};

export type BannerType =
  | 'INFO'
  | 'SUCCESS'
  | 'WARNING';

/** A filter to be used against BannerType fields. All fields are combined with a logical ‘and.’ */
export type BannerTypeFilter = {
  /** Not equal to the specified value, treating null like an ordinary value. */
  distinctFrom?: InputMaybe<BannerType>;
  /** Equal to the specified value. */
  equalTo?: InputMaybe<BannerType>;
  /** Greater than the specified value. */
  greaterThan?: InputMaybe<BannerType>;
  /** Greater than or equal to the specified value. */
  greaterThanOrEqualTo?: InputMaybe<BannerType>;
  /** Included in the specified list. */
  in?: InputMaybe<Array<BannerType>>;
  /** Is null (if `true` is specified) or is not null (if `false` is specified). */
  isNull?: InputMaybe<Scalars['Boolean']['input']>;
  /** Less than the specified value. */
  lessThan?: InputMaybe<BannerType>;
  /** Less than or equal to the specified value. */
  lessThanOrEqualTo?: InputMaybe<BannerType>;
  /** Equal to the specified value, treating null like an ordinary value. */
  notDistinctFrom?: InputMaybe<BannerType>;
  /** Not equal to the specified value. */
  notEqualTo?: InputMaybe<BannerType>;
  /** Not included in the specified list. */
  notIn?: InputMaybe<Array<BannerType>>;
};

/** A connection to a list of `Banner` values. */
export type BannersConnection = {
  __typename?: 'BannersConnection';
  /** Aggregates across the matching connection (ignoring before/after/first/last/offset) */
  aggregates?: Maybe<BannerAggregates>;
  /** A list of edges which contains the `Banner` and cursor to aid in pagination. */
  edges: Array<BannersEdge>;
  /** Grouped aggregates across the matching connection (ignoring before/after/first/last/offset) */
  groupedAggregates?: Maybe<Array<BannerAggregates>>;
  /** A list of `Banner` objects. */
  nodes: Array<Banner>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
  /** The count of *all* `Banner` you could get from the connection. */
  totalCount: Scalars['Int']['output'];
};


/** A connection to a list of `Banner` values. */
export type BannersConnectionGroupedAggregatesArgs = {
  groupBy: Array<BannerGroupBy>;
  having?: InputMaybe<BannerHavingInput>;
};

/** A `Banner` edge in the connection. */
export type BannersEdge = {
  __typename?: 'BannersEdge';
  /** A cursor for use in pagination. */
  cursor?: Maybe<Scalars['Cursor']['output']>;
  /** The `Banner` at the end of the edge. */
  node: Banner;
};

/** Methods to use when ordering `Banner`. */
export type BannersOrderBy =
  | 'APP_ASC'
  | 'APP_DESC'
  | 'MESSAGE_ASC'
  | 'MESSAGE_DESC'
  | 'NATURAL'
  | 'PRIMARY_KEY_ASC'
  | 'PRIMARY_KEY_DESC'
  | 'TYPE_ASC'
  | 'TYPE_DESC';

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

/** A filter to be used against BigInt fields. All fields are combined with a logical ‘and.’ */
export type BigIntFilter = {
  /** Not equal to the specified value, treating null like an ordinary value. */
  distinctFrom?: InputMaybe<Scalars['BigInt']['input']>;
  /** Equal to the specified value. */
  equalTo?: InputMaybe<Scalars['BigInt']['input']>;
  /** Greater than the specified value. */
  greaterThan?: InputMaybe<Scalars['BigInt']['input']>;
  /** Greater than or equal to the specified value. */
  greaterThanOrEqualTo?: InputMaybe<Scalars['BigInt']['input']>;
  /** Included in the specified list. */
  in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  /** Is null (if `true` is specified) or is not null (if `false` is specified). */
  isNull?: InputMaybe<Scalars['Boolean']['input']>;
  /** Less than the specified value. */
  lessThan?: InputMaybe<Scalars['BigInt']['input']>;
  /** Less than or equal to the specified value. */
  lessThanOrEqualTo?: InputMaybe<Scalars['BigInt']['input']>;
  /** Equal to the specified value, treating null like an ordinary value. */
  notDistinctFrom?: InputMaybe<Scalars['BigInt']['input']>;
  /** Not equal to the specified value. */
  notEqualTo?: InputMaybe<Scalars['BigInt']['input']>;
  /** Not included in the specified list. */
  notIn?: InputMaybe<Array<Scalars['BigInt']['input']>>;
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

/** A connection to a list of `Block` values. */
export type BlocksConnection = {
  __typename?: 'BlocksConnection';
  /** A list of edges which contains the `Block` and cursor to aid in pagination. */
  edges: Array<BlocksEdge>;
  /** A list of `Block` objects. */
  nodes: Array<Block>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
  /** The count of *all* `Block` you could get from the connection. */
  totalCount: Scalars['Int']['output'];
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

/** A connection to a list of `Call` values. */
export type CallsConnection = {
  __typename?: 'CallsConnection';
  /** A list of edges which contains the `Call` and cursor to aid in pagination. */
  edges: Array<CallsEdge>;
  /** A list of `Call` objects. */
  nodes: Array<Call>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
  /** The count of *all* `Call` you could get from the connection. */
  totalCount: Scalars['Int']['output'];
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
  | 'ERROR_ASC'
  | 'ERROR_DESC'
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

export type ChainflipAsset =
  | 'Btc'
  | 'Dot'
  | 'Eth'
  | 'Flip'
  | 'Usdc';

/** A filter to be used against ChainflipAsset fields. All fields are combined with a logical ‘and.’ */
export type ChainflipAssetFilter = {
  /** Not equal to the specified value, treating null like an ordinary value. */
  distinctFrom?: InputMaybe<ChainflipAsset>;
  /** Equal to the specified value. */
  equalTo?: InputMaybe<ChainflipAsset>;
  /** Greater than the specified value. */
  greaterThan?: InputMaybe<ChainflipAsset>;
  /** Greater than or equal to the specified value. */
  greaterThanOrEqualTo?: InputMaybe<ChainflipAsset>;
  /** Included in the specified list. */
  in?: InputMaybe<Array<ChainflipAsset>>;
  /** Is null (if `true` is specified) or is not null (if `false` is specified). */
  isNull?: InputMaybe<Scalars['Boolean']['input']>;
  /** Less than the specified value. */
  lessThan?: InputMaybe<ChainflipAsset>;
  /** Less than or equal to the specified value. */
  lessThanOrEqualTo?: InputMaybe<ChainflipAsset>;
  /** Equal to the specified value, treating null like an ordinary value. */
  notDistinctFrom?: InputMaybe<ChainflipAsset>;
  /** Not equal to the specified value. */
  notEqualTo?: InputMaybe<ChainflipAsset>;
  /** Not included in the specified list. */
  notIn?: InputMaybe<Array<ChainflipAsset>>;
};

export type ChainflipChain =
  | 'Bitcoin'
  | 'Ethereum'
  | 'Polkadot';

/** A filter to be used against ChainflipChain fields. All fields are combined with a logical ‘and.’ */
export type ChainflipChainFilter = {
  /** Not equal to the specified value, treating null like an ordinary value. */
  distinctFrom?: InputMaybe<ChainflipChain>;
  /** Equal to the specified value. */
  equalTo?: InputMaybe<ChainflipChain>;
  /** Greater than the specified value. */
  greaterThan?: InputMaybe<ChainflipChain>;
  /** Greater than or equal to the specified value. */
  greaterThanOrEqualTo?: InputMaybe<ChainflipChain>;
  /** Included in the specified list. */
  in?: InputMaybe<Array<ChainflipChain>>;
  /** Is null (if `true` is specified) or is not null (if `false` is specified). */
  isNull?: InputMaybe<Scalars['Boolean']['input']>;
  /** Less than the specified value. */
  lessThan?: InputMaybe<ChainflipChain>;
  /** Less than or equal to the specified value. */
  lessThanOrEqualTo?: InputMaybe<ChainflipChain>;
  /** Equal to the specified value, treating null like an ordinary value. */
  notDistinctFrom?: InputMaybe<ChainflipChain>;
  /** Not equal to the specified value. */
  notEqualTo?: InputMaybe<ChainflipChain>;
  /** Not included in the specified list. */
  notIn?: InputMaybe<Array<ChainflipChain>>;
};

export type Circulation = Node & {
  __typename?: 'Circulation';
  circulatingSupply: Scalars['BigFloat']['output'];
  circulatingSupplyNotStaked: Scalars['BigFloat']['output'];
  id: Scalars['Int']['output'];
  /** A globally unique identifier. Can be used in various places throughout the system to identify this single value. */
  nodeId: Scalars['ID']['output'];
  totalLocked: Scalars['BigFloat']['output'];
  totalStaked: Scalars['BigFloat']['output'];
  totalSupply: Scalars['BigFloat']['output'];
};

export type CirculationAggregates = {
  __typename?: 'CirculationAggregates';
  /** Mean average aggregates across the matching connection (ignoring before/after/first/last/offset) */
  average?: Maybe<CirculationAverageAggregates>;
  /** Distinct count aggregates across the matching connection (ignoring before/after/first/last/offset) */
  distinctCount?: Maybe<CirculationDistinctCountAggregates>;
  keys?: Maybe<Array<Scalars['String']['output']>>;
  /** Maximum aggregates across the matching connection (ignoring before/after/first/last/offset) */
  max?: Maybe<CirculationMaxAggregates>;
  /** Minimum aggregates across the matching connection (ignoring before/after/first/last/offset) */
  min?: Maybe<CirculationMinAggregates>;
  /** Population standard deviation aggregates across the matching connection (ignoring before/after/first/last/offset) */
  stddevPopulation?: Maybe<CirculationStddevPopulationAggregates>;
  /** Sample standard deviation aggregates across the matching connection (ignoring before/after/first/last/offset) */
  stddevSample?: Maybe<CirculationStddevSampleAggregates>;
  /** Sum aggregates across the matching connection (ignoring before/after/first/last/offset) */
  sum?: Maybe<CirculationSumAggregates>;
  /** Population variance aggregates across the matching connection (ignoring before/after/first/last/offset) */
  variancePopulation?: Maybe<CirculationVariancePopulationAggregates>;
  /** Sample variance aggregates across the matching connection (ignoring before/after/first/last/offset) */
  varianceSample?: Maybe<CirculationVarianceSampleAggregates>;
};

export type CirculationAverageAggregates = {
  __typename?: 'CirculationAverageAggregates';
  /** Mean average of circulatingSupply across the matching connection */
  circulatingSupply?: Maybe<Scalars['BigFloat']['output']>;
  /** Mean average of circulatingSupplyNotStaked across the matching connection */
  circulatingSupplyNotStaked?: Maybe<Scalars['BigFloat']['output']>;
  /** Mean average of id across the matching connection */
  id?: Maybe<Scalars['BigFloat']['output']>;
  /** Mean average of totalLocked across the matching connection */
  totalLocked?: Maybe<Scalars['BigFloat']['output']>;
  /** Mean average of totalStaked across the matching connection */
  totalStaked?: Maybe<Scalars['BigFloat']['output']>;
  /** Mean average of totalSupply across the matching connection */
  totalSupply?: Maybe<Scalars['BigFloat']['output']>;
};

/**
 * A condition to be used against `Circulation` object types. All fields are tested
 * for equality and combined with a logical ‘and.’
 */
export type CirculationCondition = {
  /** Checks for equality with the object’s `circulatingSupply` field. */
  circulatingSupply?: InputMaybe<Scalars['BigFloat']['input']>;
  /** Checks for equality with the object’s `circulatingSupplyNotStaked` field. */
  circulatingSupplyNotStaked?: InputMaybe<Scalars['BigFloat']['input']>;
  /** Checks for equality with the object’s `id` field. */
  id?: InputMaybe<Scalars['Int']['input']>;
  /** Checks for equality with the object’s `totalLocked` field. */
  totalLocked?: InputMaybe<Scalars['BigFloat']['input']>;
  /** Checks for equality with the object’s `totalStaked` field. */
  totalStaked?: InputMaybe<Scalars['BigFloat']['input']>;
  /** Checks for equality with the object’s `totalSupply` field. */
  totalSupply?: InputMaybe<Scalars['BigFloat']['input']>;
};

export type CirculationDistinctCountAggregates = {
  __typename?: 'CirculationDistinctCountAggregates';
  /** Distinct count of circulatingSupply across the matching connection */
  circulatingSupply?: Maybe<Scalars['BigInt']['output']>;
  /** Distinct count of circulatingSupplyNotStaked across the matching connection */
  circulatingSupplyNotStaked?: Maybe<Scalars['BigInt']['output']>;
  /** Distinct count of id across the matching connection */
  id?: Maybe<Scalars['BigInt']['output']>;
  /** Distinct count of totalLocked across the matching connection */
  totalLocked?: Maybe<Scalars['BigInt']['output']>;
  /** Distinct count of totalStaked across the matching connection */
  totalStaked?: Maybe<Scalars['BigInt']['output']>;
  /** Distinct count of totalSupply across the matching connection */
  totalSupply?: Maybe<Scalars['BigInt']['output']>;
};

/** A filter to be used against `Circulation` object types. All fields are combined with a logical ‘and.’ */
export type CirculationFilter = {
  /** Checks for all expressions in this list. */
  and?: InputMaybe<Array<CirculationFilter>>;
  /** Filter by the object’s `circulatingSupply` field. */
  circulatingSupply?: InputMaybe<BigFloatFilter>;
  /** Filter by the object’s `circulatingSupplyNotStaked` field. */
  circulatingSupplyNotStaked?: InputMaybe<BigFloatFilter>;
  /** Filter by the object’s `id` field. */
  id?: InputMaybe<IntFilter>;
  /** Negates the expression. */
  not?: InputMaybe<CirculationFilter>;
  /** Checks for any expressions in this list. */
  or?: InputMaybe<Array<CirculationFilter>>;
  /** Filter by the object’s `totalLocked` field. */
  totalLocked?: InputMaybe<BigFloatFilter>;
  /** Filter by the object’s `totalStaked` field. */
  totalStaked?: InputMaybe<BigFloatFilter>;
  /** Filter by the object’s `totalSupply` field. */
  totalSupply?: InputMaybe<BigFloatFilter>;
};

/** Grouping methods for `Circulation` for usage during aggregation. */
export type CirculationGroupBy =
  | 'CIRCULATING_SUPPLY'
  | 'CIRCULATING_SUPPLY_NOT_STAKED'
  | 'TOTAL_LOCKED'
  | 'TOTAL_STAKED'
  | 'TOTAL_SUPPLY';

export type CirculationHavingAverageInput = {
  circulatingSupply?: InputMaybe<HavingBigfloatFilter>;
  circulatingSupplyNotStaked?: InputMaybe<HavingBigfloatFilter>;
  id?: InputMaybe<HavingIntFilter>;
  totalLocked?: InputMaybe<HavingBigfloatFilter>;
  totalStaked?: InputMaybe<HavingBigfloatFilter>;
  totalSupply?: InputMaybe<HavingBigfloatFilter>;
};

export type CirculationHavingDistinctCountInput = {
  circulatingSupply?: InputMaybe<HavingBigfloatFilter>;
  circulatingSupplyNotStaked?: InputMaybe<HavingBigfloatFilter>;
  id?: InputMaybe<HavingIntFilter>;
  totalLocked?: InputMaybe<HavingBigfloatFilter>;
  totalStaked?: InputMaybe<HavingBigfloatFilter>;
  totalSupply?: InputMaybe<HavingBigfloatFilter>;
};

/** Conditions for `Circulation` aggregates. */
export type CirculationHavingInput = {
  AND?: InputMaybe<Array<CirculationHavingInput>>;
  OR?: InputMaybe<Array<CirculationHavingInput>>;
  average?: InputMaybe<CirculationHavingAverageInput>;
  distinctCount?: InputMaybe<CirculationHavingDistinctCountInput>;
  max?: InputMaybe<CirculationHavingMaxInput>;
  min?: InputMaybe<CirculationHavingMinInput>;
  stddevPopulation?: InputMaybe<CirculationHavingStddevPopulationInput>;
  stddevSample?: InputMaybe<CirculationHavingStddevSampleInput>;
  sum?: InputMaybe<CirculationHavingSumInput>;
  variancePopulation?: InputMaybe<CirculationHavingVariancePopulationInput>;
  varianceSample?: InputMaybe<CirculationHavingVarianceSampleInput>;
};

export type CirculationHavingMaxInput = {
  circulatingSupply?: InputMaybe<HavingBigfloatFilter>;
  circulatingSupplyNotStaked?: InputMaybe<HavingBigfloatFilter>;
  id?: InputMaybe<HavingIntFilter>;
  totalLocked?: InputMaybe<HavingBigfloatFilter>;
  totalStaked?: InputMaybe<HavingBigfloatFilter>;
  totalSupply?: InputMaybe<HavingBigfloatFilter>;
};

export type CirculationHavingMinInput = {
  circulatingSupply?: InputMaybe<HavingBigfloatFilter>;
  circulatingSupplyNotStaked?: InputMaybe<HavingBigfloatFilter>;
  id?: InputMaybe<HavingIntFilter>;
  totalLocked?: InputMaybe<HavingBigfloatFilter>;
  totalStaked?: InputMaybe<HavingBigfloatFilter>;
  totalSupply?: InputMaybe<HavingBigfloatFilter>;
};

export type CirculationHavingStddevPopulationInput = {
  circulatingSupply?: InputMaybe<HavingBigfloatFilter>;
  circulatingSupplyNotStaked?: InputMaybe<HavingBigfloatFilter>;
  id?: InputMaybe<HavingIntFilter>;
  totalLocked?: InputMaybe<HavingBigfloatFilter>;
  totalStaked?: InputMaybe<HavingBigfloatFilter>;
  totalSupply?: InputMaybe<HavingBigfloatFilter>;
};

export type CirculationHavingStddevSampleInput = {
  circulatingSupply?: InputMaybe<HavingBigfloatFilter>;
  circulatingSupplyNotStaked?: InputMaybe<HavingBigfloatFilter>;
  id?: InputMaybe<HavingIntFilter>;
  totalLocked?: InputMaybe<HavingBigfloatFilter>;
  totalStaked?: InputMaybe<HavingBigfloatFilter>;
  totalSupply?: InputMaybe<HavingBigfloatFilter>;
};

export type CirculationHavingSumInput = {
  circulatingSupply?: InputMaybe<HavingBigfloatFilter>;
  circulatingSupplyNotStaked?: InputMaybe<HavingBigfloatFilter>;
  id?: InputMaybe<HavingIntFilter>;
  totalLocked?: InputMaybe<HavingBigfloatFilter>;
  totalStaked?: InputMaybe<HavingBigfloatFilter>;
  totalSupply?: InputMaybe<HavingBigfloatFilter>;
};

export type CirculationHavingVariancePopulationInput = {
  circulatingSupply?: InputMaybe<HavingBigfloatFilter>;
  circulatingSupplyNotStaked?: InputMaybe<HavingBigfloatFilter>;
  id?: InputMaybe<HavingIntFilter>;
  totalLocked?: InputMaybe<HavingBigfloatFilter>;
  totalStaked?: InputMaybe<HavingBigfloatFilter>;
  totalSupply?: InputMaybe<HavingBigfloatFilter>;
};

export type CirculationHavingVarianceSampleInput = {
  circulatingSupply?: InputMaybe<HavingBigfloatFilter>;
  circulatingSupplyNotStaked?: InputMaybe<HavingBigfloatFilter>;
  id?: InputMaybe<HavingIntFilter>;
  totalLocked?: InputMaybe<HavingBigfloatFilter>;
  totalStaked?: InputMaybe<HavingBigfloatFilter>;
  totalSupply?: InputMaybe<HavingBigfloatFilter>;
};

export type CirculationMaxAggregates = {
  __typename?: 'CirculationMaxAggregates';
  /** Maximum of circulatingSupply across the matching connection */
  circulatingSupply?: Maybe<Scalars['BigFloat']['output']>;
  /** Maximum of circulatingSupplyNotStaked across the matching connection */
  circulatingSupplyNotStaked?: Maybe<Scalars['BigFloat']['output']>;
  /** Maximum of id across the matching connection */
  id?: Maybe<Scalars['Int']['output']>;
  /** Maximum of totalLocked across the matching connection */
  totalLocked?: Maybe<Scalars['BigFloat']['output']>;
  /** Maximum of totalStaked across the matching connection */
  totalStaked?: Maybe<Scalars['BigFloat']['output']>;
  /** Maximum of totalSupply across the matching connection */
  totalSupply?: Maybe<Scalars['BigFloat']['output']>;
};

export type CirculationMinAggregates = {
  __typename?: 'CirculationMinAggregates';
  /** Minimum of circulatingSupply across the matching connection */
  circulatingSupply?: Maybe<Scalars['BigFloat']['output']>;
  /** Minimum of circulatingSupplyNotStaked across the matching connection */
  circulatingSupplyNotStaked?: Maybe<Scalars['BigFloat']['output']>;
  /** Minimum of id across the matching connection */
  id?: Maybe<Scalars['Int']['output']>;
  /** Minimum of totalLocked across the matching connection */
  totalLocked?: Maybe<Scalars['BigFloat']['output']>;
  /** Minimum of totalStaked across the matching connection */
  totalStaked?: Maybe<Scalars['BigFloat']['output']>;
  /** Minimum of totalSupply across the matching connection */
  totalSupply?: Maybe<Scalars['BigFloat']['output']>;
};

export type CirculationStddevPopulationAggregates = {
  __typename?: 'CirculationStddevPopulationAggregates';
  /** Population standard deviation of circulatingSupply across the matching connection */
  circulatingSupply?: Maybe<Scalars['BigFloat']['output']>;
  /** Population standard deviation of circulatingSupplyNotStaked across the matching connection */
  circulatingSupplyNotStaked?: Maybe<Scalars['BigFloat']['output']>;
  /** Population standard deviation of id across the matching connection */
  id?: Maybe<Scalars['BigFloat']['output']>;
  /** Population standard deviation of totalLocked across the matching connection */
  totalLocked?: Maybe<Scalars['BigFloat']['output']>;
  /** Population standard deviation of totalStaked across the matching connection */
  totalStaked?: Maybe<Scalars['BigFloat']['output']>;
  /** Population standard deviation of totalSupply across the matching connection */
  totalSupply?: Maybe<Scalars['BigFloat']['output']>;
};

export type CirculationStddevSampleAggregates = {
  __typename?: 'CirculationStddevSampleAggregates';
  /** Sample standard deviation of circulatingSupply across the matching connection */
  circulatingSupply?: Maybe<Scalars['BigFloat']['output']>;
  /** Sample standard deviation of circulatingSupplyNotStaked across the matching connection */
  circulatingSupplyNotStaked?: Maybe<Scalars['BigFloat']['output']>;
  /** Sample standard deviation of id across the matching connection */
  id?: Maybe<Scalars['BigFloat']['output']>;
  /** Sample standard deviation of totalLocked across the matching connection */
  totalLocked?: Maybe<Scalars['BigFloat']['output']>;
  /** Sample standard deviation of totalStaked across the matching connection */
  totalStaked?: Maybe<Scalars['BigFloat']['output']>;
  /** Sample standard deviation of totalSupply across the matching connection */
  totalSupply?: Maybe<Scalars['BigFloat']['output']>;
};

export type CirculationSumAggregates = {
  __typename?: 'CirculationSumAggregates';
  /** Sum of circulatingSupply across the matching connection */
  circulatingSupply: Scalars['BigFloat']['output'];
  /** Sum of circulatingSupplyNotStaked across the matching connection */
  circulatingSupplyNotStaked: Scalars['BigFloat']['output'];
  /** Sum of id across the matching connection */
  id: Scalars['BigInt']['output'];
  /** Sum of totalLocked across the matching connection */
  totalLocked: Scalars['BigFloat']['output'];
  /** Sum of totalStaked across the matching connection */
  totalStaked: Scalars['BigFloat']['output'];
  /** Sum of totalSupply across the matching connection */
  totalSupply: Scalars['BigFloat']['output'];
};

export type CirculationVariancePopulationAggregates = {
  __typename?: 'CirculationVariancePopulationAggregates';
  /** Population variance of circulatingSupply across the matching connection */
  circulatingSupply?: Maybe<Scalars['BigFloat']['output']>;
  /** Population variance of circulatingSupplyNotStaked across the matching connection */
  circulatingSupplyNotStaked?: Maybe<Scalars['BigFloat']['output']>;
  /** Population variance of id across the matching connection */
  id?: Maybe<Scalars['BigFloat']['output']>;
  /** Population variance of totalLocked across the matching connection */
  totalLocked?: Maybe<Scalars['BigFloat']['output']>;
  /** Population variance of totalStaked across the matching connection */
  totalStaked?: Maybe<Scalars['BigFloat']['output']>;
  /** Population variance of totalSupply across the matching connection */
  totalSupply?: Maybe<Scalars['BigFloat']['output']>;
};

export type CirculationVarianceSampleAggregates = {
  __typename?: 'CirculationVarianceSampleAggregates';
  /** Sample variance of circulatingSupply across the matching connection */
  circulatingSupply?: Maybe<Scalars['BigFloat']['output']>;
  /** Sample variance of circulatingSupplyNotStaked across the matching connection */
  circulatingSupplyNotStaked?: Maybe<Scalars['BigFloat']['output']>;
  /** Sample variance of id across the matching connection */
  id?: Maybe<Scalars['BigFloat']['output']>;
  /** Sample variance of totalLocked across the matching connection */
  totalLocked?: Maybe<Scalars['BigFloat']['output']>;
  /** Sample variance of totalStaked across the matching connection */
  totalStaked?: Maybe<Scalars['BigFloat']['output']>;
  /** Sample variance of totalSupply across the matching connection */
  totalSupply?: Maybe<Scalars['BigFloat']['output']>;
};

/** A connection to a list of `Circulation` values. */
export type CirculationsConnection = {
  __typename?: 'CirculationsConnection';
  /** Aggregates across the matching connection (ignoring before/after/first/last/offset) */
  aggregates?: Maybe<CirculationAggregates>;
  /** A list of edges which contains the `Circulation` and cursor to aid in pagination. */
  edges: Array<CirculationsEdge>;
  /** Grouped aggregates across the matching connection (ignoring before/after/first/last/offset) */
  groupedAggregates?: Maybe<Array<CirculationAggregates>>;
  /** A list of `Circulation` objects. */
  nodes: Array<Circulation>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
  /** The count of *all* `Circulation` you could get from the connection. */
  totalCount: Scalars['Int']['output'];
};


/** A connection to a list of `Circulation` values. */
export type CirculationsConnectionGroupedAggregatesArgs = {
  groupBy: Array<CirculationGroupBy>;
  having?: InputMaybe<CirculationHavingInput>;
};

/** A `Circulation` edge in the connection. */
export type CirculationsEdge = {
  __typename?: 'CirculationsEdge';
  /** A cursor for use in pagination. */
  cursor?: Maybe<Scalars['Cursor']['output']>;
  /** The `Circulation` at the end of the edge. */
  node: Circulation;
};

/** Methods to use when ordering `Circulation`. */
export type CirculationsOrderBy =
  | 'CIRCULATING_SUPPLY_ASC'
  | 'CIRCULATING_SUPPLY_DESC'
  | 'CIRCULATING_SUPPLY_NOT_STAKED_ASC'
  | 'CIRCULATING_SUPPLY_NOT_STAKED_DESC'
  | 'ID_ASC'
  | 'ID_DESC'
  | 'NATURAL'
  | 'PRIMARY_KEY_ASC'
  | 'PRIMARY_KEY_DESC'
  | 'TOTAL_LOCKED_ASC'
  | 'TOTAL_LOCKED_DESC'
  | 'TOTAL_STAKED_ASC'
  | 'TOTAL_STAKED_DESC'
  | 'TOTAL_SUPPLY_ASC'
  | 'TOTAL_SUPPLY_DESC';

export type ContractsContractEmitted = Node & {
  __typename?: 'ContractsContractEmitted';
  contract: Scalars['String']['output'];
  /** Reads a single `Event` that is related to this `ContractsContractEmitted`. */
  eventByEventId: Event;
  eventId: Scalars['String']['output'];
  /** A globally unique identifier. Can be used in various places throughout the system to identify this single value. */
  nodeId: Scalars['ID']['output'];
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

/** A connection to a list of `ContractsContractEmitted` values. */
export type ContractsContractEmittedsConnection = {
  __typename?: 'ContractsContractEmittedsConnection';
  /** A list of edges which contains the `ContractsContractEmitted` and cursor to aid in pagination. */
  edges: Array<ContractsContractEmittedsEdge>;
  /** A list of `ContractsContractEmitted` objects. */
  nodes: Array<ContractsContractEmitted>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
  /** The count of *all* `ContractsContractEmitted` you could get from the connection. */
  totalCount: Scalars['Int']['output'];
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

export type DepositBalance = {
  __typename?: 'DepositBalance';
  amount: Scalars['BigFloat']['output'];
  asset: ChainflipAsset;
  chain: ChainflipChain;
  /** Reads a single `LpAccount` that is related to this `DepositBalance`. */
  lpAccountByLpIdSs58: LpAccount;
  lpIdSs58: Scalars['String']['output'];
};

export type DepositBalanceAggregates = {
  __typename?: 'DepositBalanceAggregates';
  /** Mean average aggregates across the matching connection (ignoring before/after/first/last/offset) */
  average?: Maybe<DepositBalanceAverageAggregates>;
  /** Distinct count aggregates across the matching connection (ignoring before/after/first/last/offset) */
  distinctCount?: Maybe<DepositBalanceDistinctCountAggregates>;
  keys?: Maybe<Array<Scalars['String']['output']>>;
  /** Maximum aggregates across the matching connection (ignoring before/after/first/last/offset) */
  max?: Maybe<DepositBalanceMaxAggregates>;
  /** Minimum aggregates across the matching connection (ignoring before/after/first/last/offset) */
  min?: Maybe<DepositBalanceMinAggregates>;
  /** Population standard deviation aggregates across the matching connection (ignoring before/after/first/last/offset) */
  stddevPopulation?: Maybe<DepositBalanceStddevPopulationAggregates>;
  /** Sample standard deviation aggregates across the matching connection (ignoring before/after/first/last/offset) */
  stddevSample?: Maybe<DepositBalanceStddevSampleAggregates>;
  /** Sum aggregates across the matching connection (ignoring before/after/first/last/offset) */
  sum?: Maybe<DepositBalanceSumAggregates>;
  /** Population variance aggregates across the matching connection (ignoring before/after/first/last/offset) */
  variancePopulation?: Maybe<DepositBalanceVariancePopulationAggregates>;
  /** Sample variance aggregates across the matching connection (ignoring before/after/first/last/offset) */
  varianceSample?: Maybe<DepositBalanceVarianceSampleAggregates>;
};

export type DepositBalanceAverageAggregates = {
  __typename?: 'DepositBalanceAverageAggregates';
  /** Mean average of amount across the matching connection */
  amount?: Maybe<Scalars['BigFloat']['output']>;
};

/**
 * A condition to be used against `DepositBalance` object types. All fields are
 * tested for equality and combined with a logical ‘and.’
 */
export type DepositBalanceCondition = {
  /** Checks for equality with the object’s `amount` field. */
  amount?: InputMaybe<Scalars['BigFloat']['input']>;
  /** Checks for equality with the object’s `asset` field. */
  asset?: InputMaybe<ChainflipAsset>;
  /** Checks for equality with the object’s `chain` field. */
  chain?: InputMaybe<ChainflipChain>;
  /** Checks for equality with the object’s `lpIdSs58` field. */
  lpIdSs58?: InputMaybe<Scalars['String']['input']>;
};

export type DepositBalanceDistinctCountAggregates = {
  __typename?: 'DepositBalanceDistinctCountAggregates';
  /** Distinct count of amount across the matching connection */
  amount?: Maybe<Scalars['BigInt']['output']>;
  /** Distinct count of asset across the matching connection */
  asset?: Maybe<Scalars['BigInt']['output']>;
  /** Distinct count of chain across the matching connection */
  chain?: Maybe<Scalars['BigInt']['output']>;
  /** Distinct count of lpIdSs58 across the matching connection */
  lpIdSs58?: Maybe<Scalars['BigInt']['output']>;
};

/** A filter to be used against `DepositBalance` object types. All fields are combined with a logical ‘and.’ */
export type DepositBalanceFilter = {
  /** Filter by the object’s `amount` field. */
  amount?: InputMaybe<BigFloatFilter>;
  /** Checks for all expressions in this list. */
  and?: InputMaybe<Array<DepositBalanceFilter>>;
  /** Filter by the object’s `asset` field. */
  asset?: InputMaybe<ChainflipAssetFilter>;
  /** Filter by the object’s `chain` field. */
  chain?: InputMaybe<ChainflipChainFilter>;
  /** Filter by the object’s `lpIdSs58` field. */
  lpIdSs58?: InputMaybe<StringFilter>;
  /** Negates the expression. */
  not?: InputMaybe<DepositBalanceFilter>;
  /** Checks for any expressions in this list. */
  or?: InputMaybe<Array<DepositBalanceFilter>>;
};

/** Grouping methods for `DepositBalance` for usage during aggregation. */
export type DepositBalanceGroupBy =
  | 'AMOUNT'
  | 'ASSET'
  | 'CHAIN'
  | 'LP_ID_SS58';

export type DepositBalanceHavingAverageInput = {
  amount?: InputMaybe<HavingBigfloatFilter>;
};

export type DepositBalanceHavingDistinctCountInput = {
  amount?: InputMaybe<HavingBigfloatFilter>;
};

/** Conditions for `DepositBalance` aggregates. */
export type DepositBalanceHavingInput = {
  AND?: InputMaybe<Array<DepositBalanceHavingInput>>;
  OR?: InputMaybe<Array<DepositBalanceHavingInput>>;
  average?: InputMaybe<DepositBalanceHavingAverageInput>;
  distinctCount?: InputMaybe<DepositBalanceHavingDistinctCountInput>;
  max?: InputMaybe<DepositBalanceHavingMaxInput>;
  min?: InputMaybe<DepositBalanceHavingMinInput>;
  stddevPopulation?: InputMaybe<DepositBalanceHavingStddevPopulationInput>;
  stddevSample?: InputMaybe<DepositBalanceHavingStddevSampleInput>;
  sum?: InputMaybe<DepositBalanceHavingSumInput>;
  variancePopulation?: InputMaybe<DepositBalanceHavingVariancePopulationInput>;
  varianceSample?: InputMaybe<DepositBalanceHavingVarianceSampleInput>;
};

export type DepositBalanceHavingMaxInput = {
  amount?: InputMaybe<HavingBigfloatFilter>;
};

export type DepositBalanceHavingMinInput = {
  amount?: InputMaybe<HavingBigfloatFilter>;
};

export type DepositBalanceHavingStddevPopulationInput = {
  amount?: InputMaybe<HavingBigfloatFilter>;
};

export type DepositBalanceHavingStddevSampleInput = {
  amount?: InputMaybe<HavingBigfloatFilter>;
};

export type DepositBalanceHavingSumInput = {
  amount?: InputMaybe<HavingBigfloatFilter>;
};

export type DepositBalanceHavingVariancePopulationInput = {
  amount?: InputMaybe<HavingBigfloatFilter>;
};

export type DepositBalanceHavingVarianceSampleInput = {
  amount?: InputMaybe<HavingBigfloatFilter>;
};

export type DepositBalanceMaxAggregates = {
  __typename?: 'DepositBalanceMaxAggregates';
  /** Maximum of amount across the matching connection */
  amount?: Maybe<Scalars['BigFloat']['output']>;
};

export type DepositBalanceMinAggregates = {
  __typename?: 'DepositBalanceMinAggregates';
  /** Minimum of amount across the matching connection */
  amount?: Maybe<Scalars['BigFloat']['output']>;
};

export type DepositBalanceStddevPopulationAggregates = {
  __typename?: 'DepositBalanceStddevPopulationAggregates';
  /** Population standard deviation of amount across the matching connection */
  amount?: Maybe<Scalars['BigFloat']['output']>;
};

export type DepositBalanceStddevSampleAggregates = {
  __typename?: 'DepositBalanceStddevSampleAggregates';
  /** Sample standard deviation of amount across the matching connection */
  amount?: Maybe<Scalars['BigFloat']['output']>;
};

export type DepositBalanceSumAggregates = {
  __typename?: 'DepositBalanceSumAggregates';
  /** Sum of amount across the matching connection */
  amount: Scalars['BigFloat']['output'];
};

export type DepositBalanceVariancePopulationAggregates = {
  __typename?: 'DepositBalanceVariancePopulationAggregates';
  /** Population variance of amount across the matching connection */
  amount?: Maybe<Scalars['BigFloat']['output']>;
};

export type DepositBalanceVarianceSampleAggregates = {
  __typename?: 'DepositBalanceVarianceSampleAggregates';
  /** Sample variance of amount across the matching connection */
  amount?: Maybe<Scalars['BigFloat']['output']>;
};

/** A connection to a list of `DepositBalance` values. */
export type DepositBalancesConnection = {
  __typename?: 'DepositBalancesConnection';
  /** Aggregates across the matching connection (ignoring before/after/first/last/offset) */
  aggregates?: Maybe<DepositBalanceAggregates>;
  /** A list of edges which contains the `DepositBalance` and cursor to aid in pagination. */
  edges: Array<DepositBalancesEdge>;
  /** Grouped aggregates across the matching connection (ignoring before/after/first/last/offset) */
  groupedAggregates?: Maybe<Array<DepositBalanceAggregates>>;
  /** A list of `DepositBalance` objects. */
  nodes: Array<DepositBalance>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
  /** The count of *all* `DepositBalance` you could get from the connection. */
  totalCount: Scalars['Int']['output'];
};


/** A connection to a list of `DepositBalance` values. */
export type DepositBalancesConnectionGroupedAggregatesArgs = {
  groupBy: Array<DepositBalanceGroupBy>;
  having?: InputMaybe<DepositBalanceHavingInput>;
};

/** A `DepositBalance` edge in the connection. */
export type DepositBalancesEdge = {
  __typename?: 'DepositBalancesEdge';
  /** A cursor for use in pagination. */
  cursor?: Maybe<Scalars['Cursor']['output']>;
  /** The `DepositBalance` at the end of the edge. */
  node: DepositBalance;
};

/** Methods to use when ordering `DepositBalance`. */
export type DepositBalancesOrderBy =
  | 'AMOUNT_ASC'
  | 'AMOUNT_DESC'
  | 'ASSET_ASC'
  | 'ASSET_DESC'
  | 'CHAIN_ASC'
  | 'CHAIN_DESC'
  | 'LP_ID_SS58_ASC'
  | 'LP_ID_SS58_DESC'
  | 'NATURAL';

export type EnvironmentAddress = Node & {
  __typename?: 'EnvironmentAddress';
  id: Scalars['Int']['output'];
  keyManagerAddress: Scalars['String']['output'];
  /** A globally unique identifier. Can be used in various places throughout the system to identify this single value. */
  nodeId: Scalars['ID']['output'];
  redemptionTax: Scalars['BigFloat']['output'];
  runtimeVersion: Scalars['Int']['output'];
  stateChainGatewayAddress: Scalars['String']['output'];
};

export type EnvironmentAddressAggregates = {
  __typename?: 'EnvironmentAddressAggregates';
  /** Mean average aggregates across the matching connection (ignoring before/after/first/last/offset) */
  average?: Maybe<EnvironmentAddressAverageAggregates>;
  /** Distinct count aggregates across the matching connection (ignoring before/after/first/last/offset) */
  distinctCount?: Maybe<EnvironmentAddressDistinctCountAggregates>;
  keys?: Maybe<Array<Scalars['String']['output']>>;
  /** Maximum aggregates across the matching connection (ignoring before/after/first/last/offset) */
  max?: Maybe<EnvironmentAddressMaxAggregates>;
  /** Minimum aggregates across the matching connection (ignoring before/after/first/last/offset) */
  min?: Maybe<EnvironmentAddressMinAggregates>;
  /** Population standard deviation aggregates across the matching connection (ignoring before/after/first/last/offset) */
  stddevPopulation?: Maybe<EnvironmentAddressStddevPopulationAggregates>;
  /** Sample standard deviation aggregates across the matching connection (ignoring before/after/first/last/offset) */
  stddevSample?: Maybe<EnvironmentAddressStddevSampleAggregates>;
  /** Sum aggregates across the matching connection (ignoring before/after/first/last/offset) */
  sum?: Maybe<EnvironmentAddressSumAggregates>;
  /** Population variance aggregates across the matching connection (ignoring before/after/first/last/offset) */
  variancePopulation?: Maybe<EnvironmentAddressVariancePopulationAggregates>;
  /** Sample variance aggregates across the matching connection (ignoring before/after/first/last/offset) */
  varianceSample?: Maybe<EnvironmentAddressVarianceSampleAggregates>;
};

export type EnvironmentAddressAverageAggregates = {
  __typename?: 'EnvironmentAddressAverageAggregates';
  /** Mean average of id across the matching connection */
  id?: Maybe<Scalars['BigFloat']['output']>;
  /** Mean average of redemptionTax across the matching connection */
  redemptionTax?: Maybe<Scalars['BigFloat']['output']>;
  /** Mean average of runtimeVersion across the matching connection */
  runtimeVersion?: Maybe<Scalars['BigFloat']['output']>;
};

/**
 * A condition to be used against `EnvironmentAddress` object types. All fields are
 * tested for equality and combined with a logical ‘and.’
 */
export type EnvironmentAddressCondition = {
  /** Checks for equality with the object’s `id` field. */
  id?: InputMaybe<Scalars['Int']['input']>;
  /** Checks for equality with the object’s `keyManagerAddress` field. */
  keyManagerAddress?: InputMaybe<Scalars['String']['input']>;
  /** Checks for equality with the object’s `redemptionTax` field. */
  redemptionTax?: InputMaybe<Scalars['BigFloat']['input']>;
  /** Checks for equality with the object’s `runtimeVersion` field. */
  runtimeVersion?: InputMaybe<Scalars['Int']['input']>;
  /** Checks for equality with the object’s `stateChainGatewayAddress` field. */
  stateChainGatewayAddress?: InputMaybe<Scalars['String']['input']>;
};

export type EnvironmentAddressDistinctCountAggregates = {
  __typename?: 'EnvironmentAddressDistinctCountAggregates';
  /** Distinct count of id across the matching connection */
  id?: Maybe<Scalars['BigInt']['output']>;
  /** Distinct count of keyManagerAddress across the matching connection */
  keyManagerAddress?: Maybe<Scalars['BigInt']['output']>;
  /** Distinct count of redemptionTax across the matching connection */
  redemptionTax?: Maybe<Scalars['BigInt']['output']>;
  /** Distinct count of runtimeVersion across the matching connection */
  runtimeVersion?: Maybe<Scalars['BigInt']['output']>;
  /** Distinct count of stateChainGatewayAddress across the matching connection */
  stateChainGatewayAddress?: Maybe<Scalars['BigInt']['output']>;
};

/** A filter to be used against `EnvironmentAddress` object types. All fields are combined with a logical ‘and.’ */
export type EnvironmentAddressFilter = {
  /** Checks for all expressions in this list. */
  and?: InputMaybe<Array<EnvironmentAddressFilter>>;
  /** Filter by the object’s `id` field. */
  id?: InputMaybe<IntFilter>;
  /** Filter by the object’s `keyManagerAddress` field. */
  keyManagerAddress?: InputMaybe<StringFilter>;
  /** Negates the expression. */
  not?: InputMaybe<EnvironmentAddressFilter>;
  /** Checks for any expressions in this list. */
  or?: InputMaybe<Array<EnvironmentAddressFilter>>;
  /** Filter by the object’s `redemptionTax` field. */
  redemptionTax?: InputMaybe<BigFloatFilter>;
  /** Filter by the object’s `runtimeVersion` field. */
  runtimeVersion?: InputMaybe<IntFilter>;
  /** Filter by the object’s `stateChainGatewayAddress` field. */
  stateChainGatewayAddress?: InputMaybe<StringFilter>;
};

/** Grouping methods for `EnvironmentAddress` for usage during aggregation. */
export type EnvironmentAddressGroupBy =
  | 'KEY_MANAGER_ADDRESS'
  | 'REDEMPTION_TAX'
  | 'RUNTIME_VERSION'
  | 'STATE_CHAIN_GATEWAY_ADDRESS';

export type EnvironmentAddressHavingAverageInput = {
  id?: InputMaybe<HavingIntFilter>;
  redemptionTax?: InputMaybe<HavingBigfloatFilter>;
  runtimeVersion?: InputMaybe<HavingIntFilter>;
};

export type EnvironmentAddressHavingDistinctCountInput = {
  id?: InputMaybe<HavingIntFilter>;
  redemptionTax?: InputMaybe<HavingBigfloatFilter>;
  runtimeVersion?: InputMaybe<HavingIntFilter>;
};

/** Conditions for `EnvironmentAddress` aggregates. */
export type EnvironmentAddressHavingInput = {
  AND?: InputMaybe<Array<EnvironmentAddressHavingInput>>;
  OR?: InputMaybe<Array<EnvironmentAddressHavingInput>>;
  average?: InputMaybe<EnvironmentAddressHavingAverageInput>;
  distinctCount?: InputMaybe<EnvironmentAddressHavingDistinctCountInput>;
  max?: InputMaybe<EnvironmentAddressHavingMaxInput>;
  min?: InputMaybe<EnvironmentAddressHavingMinInput>;
  stddevPopulation?: InputMaybe<EnvironmentAddressHavingStddevPopulationInput>;
  stddevSample?: InputMaybe<EnvironmentAddressHavingStddevSampleInput>;
  sum?: InputMaybe<EnvironmentAddressHavingSumInput>;
  variancePopulation?: InputMaybe<EnvironmentAddressHavingVariancePopulationInput>;
  varianceSample?: InputMaybe<EnvironmentAddressHavingVarianceSampleInput>;
};

export type EnvironmentAddressHavingMaxInput = {
  id?: InputMaybe<HavingIntFilter>;
  redemptionTax?: InputMaybe<HavingBigfloatFilter>;
  runtimeVersion?: InputMaybe<HavingIntFilter>;
};

export type EnvironmentAddressHavingMinInput = {
  id?: InputMaybe<HavingIntFilter>;
  redemptionTax?: InputMaybe<HavingBigfloatFilter>;
  runtimeVersion?: InputMaybe<HavingIntFilter>;
};

export type EnvironmentAddressHavingStddevPopulationInput = {
  id?: InputMaybe<HavingIntFilter>;
  redemptionTax?: InputMaybe<HavingBigfloatFilter>;
  runtimeVersion?: InputMaybe<HavingIntFilter>;
};

export type EnvironmentAddressHavingStddevSampleInput = {
  id?: InputMaybe<HavingIntFilter>;
  redemptionTax?: InputMaybe<HavingBigfloatFilter>;
  runtimeVersion?: InputMaybe<HavingIntFilter>;
};

export type EnvironmentAddressHavingSumInput = {
  id?: InputMaybe<HavingIntFilter>;
  redemptionTax?: InputMaybe<HavingBigfloatFilter>;
  runtimeVersion?: InputMaybe<HavingIntFilter>;
};

export type EnvironmentAddressHavingVariancePopulationInput = {
  id?: InputMaybe<HavingIntFilter>;
  redemptionTax?: InputMaybe<HavingBigfloatFilter>;
  runtimeVersion?: InputMaybe<HavingIntFilter>;
};

export type EnvironmentAddressHavingVarianceSampleInput = {
  id?: InputMaybe<HavingIntFilter>;
  redemptionTax?: InputMaybe<HavingBigfloatFilter>;
  runtimeVersion?: InputMaybe<HavingIntFilter>;
};

export type EnvironmentAddressMaxAggregates = {
  __typename?: 'EnvironmentAddressMaxAggregates';
  /** Maximum of id across the matching connection */
  id?: Maybe<Scalars['Int']['output']>;
  /** Maximum of redemptionTax across the matching connection */
  redemptionTax?: Maybe<Scalars['BigFloat']['output']>;
  /** Maximum of runtimeVersion across the matching connection */
  runtimeVersion?: Maybe<Scalars['Int']['output']>;
};

export type EnvironmentAddressMinAggregates = {
  __typename?: 'EnvironmentAddressMinAggregates';
  /** Minimum of id across the matching connection */
  id?: Maybe<Scalars['Int']['output']>;
  /** Minimum of redemptionTax across the matching connection */
  redemptionTax?: Maybe<Scalars['BigFloat']['output']>;
  /** Minimum of runtimeVersion across the matching connection */
  runtimeVersion?: Maybe<Scalars['Int']['output']>;
};

export type EnvironmentAddressStddevPopulationAggregates = {
  __typename?: 'EnvironmentAddressStddevPopulationAggregates';
  /** Population standard deviation of id across the matching connection */
  id?: Maybe<Scalars['BigFloat']['output']>;
  /** Population standard deviation of redemptionTax across the matching connection */
  redemptionTax?: Maybe<Scalars['BigFloat']['output']>;
  /** Population standard deviation of runtimeVersion across the matching connection */
  runtimeVersion?: Maybe<Scalars['BigFloat']['output']>;
};

export type EnvironmentAddressStddevSampleAggregates = {
  __typename?: 'EnvironmentAddressStddevSampleAggregates';
  /** Sample standard deviation of id across the matching connection */
  id?: Maybe<Scalars['BigFloat']['output']>;
  /** Sample standard deviation of redemptionTax across the matching connection */
  redemptionTax?: Maybe<Scalars['BigFloat']['output']>;
  /** Sample standard deviation of runtimeVersion across the matching connection */
  runtimeVersion?: Maybe<Scalars['BigFloat']['output']>;
};

export type EnvironmentAddressSumAggregates = {
  __typename?: 'EnvironmentAddressSumAggregates';
  /** Sum of id across the matching connection */
  id: Scalars['BigInt']['output'];
  /** Sum of redemptionTax across the matching connection */
  redemptionTax: Scalars['BigFloat']['output'];
  /** Sum of runtimeVersion across the matching connection */
  runtimeVersion: Scalars['BigInt']['output'];
};

export type EnvironmentAddressVariancePopulationAggregates = {
  __typename?: 'EnvironmentAddressVariancePopulationAggregates';
  /** Population variance of id across the matching connection */
  id?: Maybe<Scalars['BigFloat']['output']>;
  /** Population variance of redemptionTax across the matching connection */
  redemptionTax?: Maybe<Scalars['BigFloat']['output']>;
  /** Population variance of runtimeVersion across the matching connection */
  runtimeVersion?: Maybe<Scalars['BigFloat']['output']>;
};

export type EnvironmentAddressVarianceSampleAggregates = {
  __typename?: 'EnvironmentAddressVarianceSampleAggregates';
  /** Sample variance of id across the matching connection */
  id?: Maybe<Scalars['BigFloat']['output']>;
  /** Sample variance of redemptionTax across the matching connection */
  redemptionTax?: Maybe<Scalars['BigFloat']['output']>;
  /** Sample variance of runtimeVersion across the matching connection */
  runtimeVersion?: Maybe<Scalars['BigFloat']['output']>;
};

/** A connection to a list of `EnvironmentAddress` values. */
export type EnvironmentAddressesConnection = {
  __typename?: 'EnvironmentAddressesConnection';
  /** Aggregates across the matching connection (ignoring before/after/first/last/offset) */
  aggregates?: Maybe<EnvironmentAddressAggregates>;
  /** A list of edges which contains the `EnvironmentAddress` and cursor to aid in pagination. */
  edges: Array<EnvironmentAddressesEdge>;
  /** Grouped aggregates across the matching connection (ignoring before/after/first/last/offset) */
  groupedAggregates?: Maybe<Array<EnvironmentAddressAggregates>>;
  /** A list of `EnvironmentAddress` objects. */
  nodes: Array<EnvironmentAddress>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
  /** The count of *all* `EnvironmentAddress` you could get from the connection. */
  totalCount: Scalars['Int']['output'];
};


/** A connection to a list of `EnvironmentAddress` values. */
export type EnvironmentAddressesConnectionGroupedAggregatesArgs = {
  groupBy: Array<EnvironmentAddressGroupBy>;
  having?: InputMaybe<EnvironmentAddressHavingInput>;
};

/** A `EnvironmentAddress` edge in the connection. */
export type EnvironmentAddressesEdge = {
  __typename?: 'EnvironmentAddressesEdge';
  /** A cursor for use in pagination. */
  cursor?: Maybe<Scalars['Cursor']['output']>;
  /** The `EnvironmentAddress` at the end of the edge. */
  node: EnvironmentAddress;
};

/** Methods to use when ordering `EnvironmentAddress`. */
export type EnvironmentAddressesOrderBy =
  | 'ID_ASC'
  | 'ID_DESC'
  | 'KEY_MANAGER_ADDRESS_ASC'
  | 'KEY_MANAGER_ADDRESS_DESC'
  | 'NATURAL'
  | 'PRIMARY_KEY_ASC'
  | 'PRIMARY_KEY_DESC'
  | 'REDEMPTION_TAX_ASC'
  | 'REDEMPTION_TAX_DESC'
  | 'RUNTIME_VERSION_ASC'
  | 'RUNTIME_VERSION_DESC'
  | 'STATE_CHAIN_GATEWAY_ADDRESS_ASC'
  | 'STATE_CHAIN_GATEWAY_ADDRESS_DESC';

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

/** A connection to a list of `Event` values. */
export type EventsConnection = {
  __typename?: 'EventsConnection';
  /** A list of edges which contains the `Event` and cursor to aid in pagination. */
  edges: Array<EventsEdge>;
  /** A list of `Event` objects. */
  nodes: Array<Event>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
  /** The count of *all* `Event` you could get from the connection. */
  totalCount: Scalars['Int']['output'];
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

export type ExecutedRedemption = Node & {
  __typename?: 'ExecutedRedemption';
  amount: Scalars['BigFloat']['output'];
  block: Scalars['String']['output'];
  blockTimestamp: Scalars['String']['output'];
  logIndex: Scalars['BigInt']['output'];
  /** A globally unique identifier. Can be used in various places throughout the system to identify this single value. */
  nodeId: Scalars['ID']['output'];
  txHash: Scalars['String']['output'];
  txId: Scalars['String']['output'];
  validatorIdHex: Scalars['String']['output'];
};

export type ExecutedRedemptionAggregates = {
  __typename?: 'ExecutedRedemptionAggregates';
  /** Mean average aggregates across the matching connection (ignoring before/after/first/last/offset) */
  average?: Maybe<ExecutedRedemptionAverageAggregates>;
  /** Distinct count aggregates across the matching connection (ignoring before/after/first/last/offset) */
  distinctCount?: Maybe<ExecutedRedemptionDistinctCountAggregates>;
  keys?: Maybe<Array<Scalars['String']['output']>>;
  /** Maximum aggregates across the matching connection (ignoring before/after/first/last/offset) */
  max?: Maybe<ExecutedRedemptionMaxAggregates>;
  /** Minimum aggregates across the matching connection (ignoring before/after/first/last/offset) */
  min?: Maybe<ExecutedRedemptionMinAggregates>;
  /** Population standard deviation aggregates across the matching connection (ignoring before/after/first/last/offset) */
  stddevPopulation?: Maybe<ExecutedRedemptionStddevPopulationAggregates>;
  /** Sample standard deviation aggregates across the matching connection (ignoring before/after/first/last/offset) */
  stddevSample?: Maybe<ExecutedRedemptionStddevSampleAggregates>;
  /** Sum aggregates across the matching connection (ignoring before/after/first/last/offset) */
  sum?: Maybe<ExecutedRedemptionSumAggregates>;
  /** Population variance aggregates across the matching connection (ignoring before/after/first/last/offset) */
  variancePopulation?: Maybe<ExecutedRedemptionVariancePopulationAggregates>;
  /** Sample variance aggregates across the matching connection (ignoring before/after/first/last/offset) */
  varianceSample?: Maybe<ExecutedRedemptionVarianceSampleAggregates>;
};

export type ExecutedRedemptionAverageAggregates = {
  __typename?: 'ExecutedRedemptionAverageAggregates';
  /** Mean average of amount across the matching connection */
  amount?: Maybe<Scalars['BigFloat']['output']>;
  /** Mean average of logIndex across the matching connection */
  logIndex?: Maybe<Scalars['BigFloat']['output']>;
};

/**
 * A condition to be used against `ExecutedRedemption` object types. All fields are
 * tested for equality and combined with a logical ‘and.’
 */
export type ExecutedRedemptionCondition = {
  /** Checks for equality with the object’s `amount` field. */
  amount?: InputMaybe<Scalars['BigFloat']['input']>;
  /** Checks for equality with the object’s `block` field. */
  block?: InputMaybe<Scalars['String']['input']>;
  /** Checks for equality with the object’s `blockTimestamp` field. */
  blockTimestamp?: InputMaybe<Scalars['String']['input']>;
  /** Checks for equality with the object’s `logIndex` field. */
  logIndex?: InputMaybe<Scalars['BigInt']['input']>;
  /** Checks for equality with the object’s `txHash` field. */
  txHash?: InputMaybe<Scalars['String']['input']>;
  /** Checks for equality with the object’s `txId` field. */
  txId?: InputMaybe<Scalars['String']['input']>;
  /** Checks for equality with the object’s `validatorIdHex` field. */
  validatorIdHex?: InputMaybe<Scalars['String']['input']>;
};

export type ExecutedRedemptionDistinctCountAggregates = {
  __typename?: 'ExecutedRedemptionDistinctCountAggregates';
  /** Distinct count of amount across the matching connection */
  amount?: Maybe<Scalars['BigInt']['output']>;
  /** Distinct count of block across the matching connection */
  block?: Maybe<Scalars['BigInt']['output']>;
  /** Distinct count of blockTimestamp across the matching connection */
  blockTimestamp?: Maybe<Scalars['BigInt']['output']>;
  /** Distinct count of logIndex across the matching connection */
  logIndex?: Maybe<Scalars['BigInt']['output']>;
  /** Distinct count of txHash across the matching connection */
  txHash?: Maybe<Scalars['BigInt']['output']>;
  /** Distinct count of txId across the matching connection */
  txId?: Maybe<Scalars['BigInt']['output']>;
  /** Distinct count of validatorIdHex across the matching connection */
  validatorIdHex?: Maybe<Scalars['BigInt']['output']>;
};

/** A filter to be used against `ExecutedRedemption` object types. All fields are combined with a logical ‘and.’ */
export type ExecutedRedemptionFilter = {
  /** Filter by the object’s `amount` field. */
  amount?: InputMaybe<BigFloatFilter>;
  /** Checks for all expressions in this list. */
  and?: InputMaybe<Array<ExecutedRedemptionFilter>>;
  /** Filter by the object’s `block` field. */
  block?: InputMaybe<StringFilter>;
  /** Filter by the object’s `blockTimestamp` field. */
  blockTimestamp?: InputMaybe<StringFilter>;
  /** Filter by the object’s `logIndex` field. */
  logIndex?: InputMaybe<BigIntFilter>;
  /** Negates the expression. */
  not?: InputMaybe<ExecutedRedemptionFilter>;
  /** Checks for any expressions in this list. */
  or?: InputMaybe<Array<ExecutedRedemptionFilter>>;
  /** Filter by the object’s `txHash` field. */
  txHash?: InputMaybe<StringFilter>;
  /** Filter by the object’s `txId` field. */
  txId?: InputMaybe<StringFilter>;
  /** Filter by the object’s `validatorIdHex` field. */
  validatorIdHex?: InputMaybe<StringFilter>;
};

/** Grouping methods for `ExecutedRedemption` for usage during aggregation. */
export type ExecutedRedemptionGroupBy =
  | 'AMOUNT'
  | 'BLOCK'
  | 'BLOCK_TIMESTAMP'
  | 'LOG_INDEX'
  | 'TX_HASH'
  | 'TX_ID'
  | 'VALIDATOR_ID_HEX';

export type ExecutedRedemptionHavingAverageInput = {
  amount?: InputMaybe<HavingBigfloatFilter>;
  logIndex?: InputMaybe<HavingBigintFilter>;
};

export type ExecutedRedemptionHavingDistinctCountInput = {
  amount?: InputMaybe<HavingBigfloatFilter>;
  logIndex?: InputMaybe<HavingBigintFilter>;
};

/** Conditions for `ExecutedRedemption` aggregates. */
export type ExecutedRedemptionHavingInput = {
  AND?: InputMaybe<Array<ExecutedRedemptionHavingInput>>;
  OR?: InputMaybe<Array<ExecutedRedemptionHavingInput>>;
  average?: InputMaybe<ExecutedRedemptionHavingAverageInput>;
  distinctCount?: InputMaybe<ExecutedRedemptionHavingDistinctCountInput>;
  max?: InputMaybe<ExecutedRedemptionHavingMaxInput>;
  min?: InputMaybe<ExecutedRedemptionHavingMinInput>;
  stddevPopulation?: InputMaybe<ExecutedRedemptionHavingStddevPopulationInput>;
  stddevSample?: InputMaybe<ExecutedRedemptionHavingStddevSampleInput>;
  sum?: InputMaybe<ExecutedRedemptionHavingSumInput>;
  variancePopulation?: InputMaybe<ExecutedRedemptionHavingVariancePopulationInput>;
  varianceSample?: InputMaybe<ExecutedRedemptionHavingVarianceSampleInput>;
};

export type ExecutedRedemptionHavingMaxInput = {
  amount?: InputMaybe<HavingBigfloatFilter>;
  logIndex?: InputMaybe<HavingBigintFilter>;
};

export type ExecutedRedemptionHavingMinInput = {
  amount?: InputMaybe<HavingBigfloatFilter>;
  logIndex?: InputMaybe<HavingBigintFilter>;
};

export type ExecutedRedemptionHavingStddevPopulationInput = {
  amount?: InputMaybe<HavingBigfloatFilter>;
  logIndex?: InputMaybe<HavingBigintFilter>;
};

export type ExecutedRedemptionHavingStddevSampleInput = {
  amount?: InputMaybe<HavingBigfloatFilter>;
  logIndex?: InputMaybe<HavingBigintFilter>;
};

export type ExecutedRedemptionHavingSumInput = {
  amount?: InputMaybe<HavingBigfloatFilter>;
  logIndex?: InputMaybe<HavingBigintFilter>;
};

export type ExecutedRedemptionHavingVariancePopulationInput = {
  amount?: InputMaybe<HavingBigfloatFilter>;
  logIndex?: InputMaybe<HavingBigintFilter>;
};

export type ExecutedRedemptionHavingVarianceSampleInput = {
  amount?: InputMaybe<HavingBigfloatFilter>;
  logIndex?: InputMaybe<HavingBigintFilter>;
};

export type ExecutedRedemptionMaxAggregates = {
  __typename?: 'ExecutedRedemptionMaxAggregates';
  /** Maximum of amount across the matching connection */
  amount?: Maybe<Scalars['BigFloat']['output']>;
  /** Maximum of logIndex across the matching connection */
  logIndex?: Maybe<Scalars['BigInt']['output']>;
};

export type ExecutedRedemptionMinAggregates = {
  __typename?: 'ExecutedRedemptionMinAggregates';
  /** Minimum of amount across the matching connection */
  amount?: Maybe<Scalars['BigFloat']['output']>;
  /** Minimum of logIndex across the matching connection */
  logIndex?: Maybe<Scalars['BigInt']['output']>;
};

export type ExecutedRedemptionStddevPopulationAggregates = {
  __typename?: 'ExecutedRedemptionStddevPopulationAggregates';
  /** Population standard deviation of amount across the matching connection */
  amount?: Maybe<Scalars['BigFloat']['output']>;
  /** Population standard deviation of logIndex across the matching connection */
  logIndex?: Maybe<Scalars['BigFloat']['output']>;
};

export type ExecutedRedemptionStddevSampleAggregates = {
  __typename?: 'ExecutedRedemptionStddevSampleAggregates';
  /** Sample standard deviation of amount across the matching connection */
  amount?: Maybe<Scalars['BigFloat']['output']>;
  /** Sample standard deviation of logIndex across the matching connection */
  logIndex?: Maybe<Scalars['BigFloat']['output']>;
};

export type ExecutedRedemptionSumAggregates = {
  __typename?: 'ExecutedRedemptionSumAggregates';
  /** Sum of amount across the matching connection */
  amount: Scalars['BigFloat']['output'];
  /** Sum of logIndex across the matching connection */
  logIndex: Scalars['BigFloat']['output'];
};

export type ExecutedRedemptionVariancePopulationAggregates = {
  __typename?: 'ExecutedRedemptionVariancePopulationAggregates';
  /** Population variance of amount across the matching connection */
  amount?: Maybe<Scalars['BigFloat']['output']>;
  /** Population variance of logIndex across the matching connection */
  logIndex?: Maybe<Scalars['BigFloat']['output']>;
};

export type ExecutedRedemptionVarianceSampleAggregates = {
  __typename?: 'ExecutedRedemptionVarianceSampleAggregates';
  /** Sample variance of amount across the matching connection */
  amount?: Maybe<Scalars['BigFloat']['output']>;
  /** Sample variance of logIndex across the matching connection */
  logIndex?: Maybe<Scalars['BigFloat']['output']>;
};

/** A connection to a list of `ExecutedRedemption` values. */
export type ExecutedRedemptionsConnection = {
  __typename?: 'ExecutedRedemptionsConnection';
  /** Aggregates across the matching connection (ignoring before/after/first/last/offset) */
  aggregates?: Maybe<ExecutedRedemptionAggregates>;
  /** A list of edges which contains the `ExecutedRedemption` and cursor to aid in pagination. */
  edges: Array<ExecutedRedemptionsEdge>;
  /** Grouped aggregates across the matching connection (ignoring before/after/first/last/offset) */
  groupedAggregates?: Maybe<Array<ExecutedRedemptionAggregates>>;
  /** A list of `ExecutedRedemption` objects. */
  nodes: Array<ExecutedRedemption>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
  /** The count of *all* `ExecutedRedemption` you could get from the connection. */
  totalCount: Scalars['Int']['output'];
};


/** A connection to a list of `ExecutedRedemption` values. */
export type ExecutedRedemptionsConnectionGroupedAggregatesArgs = {
  groupBy: Array<ExecutedRedemptionGroupBy>;
  having?: InputMaybe<ExecutedRedemptionHavingInput>;
};

/** A `ExecutedRedemption` edge in the connection. */
export type ExecutedRedemptionsEdge = {
  __typename?: 'ExecutedRedemptionsEdge';
  /** A cursor for use in pagination. */
  cursor?: Maybe<Scalars['Cursor']['output']>;
  /** The `ExecutedRedemption` at the end of the edge. */
  node: ExecutedRedemption;
};

/** Methods to use when ordering `ExecutedRedemption`. */
export type ExecutedRedemptionsOrderBy =
  | 'AMOUNT_ASC'
  | 'AMOUNT_DESC'
  | 'BLOCK_ASC'
  | 'BLOCK_DESC'
  | 'BLOCK_TIMESTAMP_ASC'
  | 'BLOCK_TIMESTAMP_DESC'
  | 'LOG_INDEX_ASC'
  | 'LOG_INDEX_DESC'
  | 'NATURAL'
  | 'PRIMARY_KEY_ASC'
  | 'PRIMARY_KEY_DESC'
  | 'TX_HASH_ASC'
  | 'TX_HASH_DESC'
  | 'TX_ID_ASC'
  | 'TX_ID_DESC'
  | 'VALIDATOR_ID_HEX_ASC'
  | 'VALIDATOR_ID_HEX_DESC';

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

/** A connection to a list of `Extrinsic` values. */
export type ExtrinsicsConnection = {
  __typename?: 'ExtrinsicsConnection';
  /** A list of edges which contains the `Extrinsic` and cursor to aid in pagination. */
  edges: Array<ExtrinsicsEdge>;
  /** A list of `Extrinsic` objects. */
  nodes: Array<Extrinsic>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
  /** The count of *all* `Extrinsic` you could get from the connection. */
  totalCount: Scalars['Int']['output'];
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
  | 'CALL_ID_ASC'
  | 'CALL_ID_DESC'
  | 'ERROR_ASC'
  | 'ERROR_DESC'
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

/** A connection to a list of `FlipSupply` values. */
export type FlipSuppliesConnection = {
  __typename?: 'FlipSuppliesConnection';
  /** Aggregates across the matching connection (ignoring before/after/first/last/offset) */
  aggregates?: Maybe<FlipSupplyAggregates>;
  /** A list of edges which contains the `FlipSupply` and cursor to aid in pagination. */
  edges: Array<FlipSuppliesEdge>;
  /** Grouped aggregates across the matching connection (ignoring before/after/first/last/offset) */
  groupedAggregates?: Maybe<Array<FlipSupplyAggregates>>;
  /** A list of `FlipSupply` objects. */
  nodes: Array<FlipSupply>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
  /** The count of *all* `FlipSupply` you could get from the connection. */
  totalCount: Scalars['Int']['output'];
};


/** A connection to a list of `FlipSupply` values. */
export type FlipSuppliesConnectionGroupedAggregatesArgs = {
  groupBy: Array<FlipSupplyGroupBy>;
  having?: InputMaybe<FlipSupplyHavingInput>;
};

/** A `FlipSupply` edge in the connection. */
export type FlipSuppliesEdge = {
  __typename?: 'FlipSuppliesEdge';
  /** A cursor for use in pagination. */
  cursor?: Maybe<Scalars['Cursor']['output']>;
  /** The `FlipSupply` at the end of the edge. */
  node: FlipSupply;
};

/** Methods to use when ordering `FlipSupply`. */
export type FlipSuppliesOrderBy =
  | 'ANNUAL_SYSTEM_COMPOUNDED_REWARDS_ASC'
  | 'ANNUAL_SYSTEM_COMPOUNDED_REWARDS_DESC'
  | 'AUTHORITY_EMISSION_PER_BLOCK_ASC'
  | 'AUTHORITY_EMISSION_PER_BLOCK_DESC'
  | 'BACKUP_NODE_EMISSION_PER_BLOCK_ASC'
  | 'BACKUP_NODE_EMISSION_PER_BLOCK_DESC'
  | 'ID_ASC'
  | 'ID_DESC'
  | 'NATURAL'
  | 'OFFCHAIN_FUNDS_ASC'
  | 'OFFCHAIN_FUNDS_DESC'
  | 'PRIMARY_KEY_ASC'
  | 'PRIMARY_KEY_DESC'
  | 'START_BLOCK_HEIGHT_ASC'
  | 'START_BLOCK_HEIGHT_DESC'
  | 'START_BLOCK_TIMESTAMP_ASC'
  | 'START_BLOCK_TIMESTAMP_DESC'
  | 'TOTAL_ANNUAL_EMISSION_ASC'
  | 'TOTAL_ANNUAL_EMISSION_DESC'
  | 'TOTAL_ISSUANCE_ASC'
  | 'TOTAL_ISSUANCE_DESC';

export type FlipSupply = Node & {
  __typename?: 'FlipSupply';
  annualSystemCompoundedRewards: Scalars['String']['output'];
  authorityEmissionPerBlock: Scalars['BigFloat']['output'];
  backupNodeEmissionPerBlock: Scalars['BigFloat']['output'];
  id: Scalars['Int']['output'];
  /** A globally unique identifier. Can be used in various places throughout the system to identify this single value. */
  nodeId: Scalars['ID']['output'];
  offchainFunds: Scalars['String']['output'];
  startBlockHeight: Scalars['Int']['output'];
  startBlockTimestamp: Scalars['BigInt']['output'];
  totalAnnualEmission: Scalars['BigFloat']['output'];
  totalIssuance: Scalars['String']['output'];
};

export type FlipSupplyAggregates = {
  __typename?: 'FlipSupplyAggregates';
  /** Mean average aggregates across the matching connection (ignoring before/after/first/last/offset) */
  average?: Maybe<FlipSupplyAverageAggregates>;
  /** Distinct count aggregates across the matching connection (ignoring before/after/first/last/offset) */
  distinctCount?: Maybe<FlipSupplyDistinctCountAggregates>;
  keys?: Maybe<Array<Scalars['String']['output']>>;
  /** Maximum aggregates across the matching connection (ignoring before/after/first/last/offset) */
  max?: Maybe<FlipSupplyMaxAggregates>;
  /** Minimum aggregates across the matching connection (ignoring before/after/first/last/offset) */
  min?: Maybe<FlipSupplyMinAggregates>;
  /** Population standard deviation aggregates across the matching connection (ignoring before/after/first/last/offset) */
  stddevPopulation?: Maybe<FlipSupplyStddevPopulationAggregates>;
  /** Sample standard deviation aggregates across the matching connection (ignoring before/after/first/last/offset) */
  stddevSample?: Maybe<FlipSupplyStddevSampleAggregates>;
  /** Sum aggregates across the matching connection (ignoring before/after/first/last/offset) */
  sum?: Maybe<FlipSupplySumAggregates>;
  /** Population variance aggregates across the matching connection (ignoring before/after/first/last/offset) */
  variancePopulation?: Maybe<FlipSupplyVariancePopulationAggregates>;
  /** Sample variance aggregates across the matching connection (ignoring before/after/first/last/offset) */
  varianceSample?: Maybe<FlipSupplyVarianceSampleAggregates>;
};

export type FlipSupplyAverageAggregates = {
  __typename?: 'FlipSupplyAverageAggregates';
  /** Mean average of authorityEmissionPerBlock across the matching connection */
  authorityEmissionPerBlock?: Maybe<Scalars['BigFloat']['output']>;
  /** Mean average of backupNodeEmissionPerBlock across the matching connection */
  backupNodeEmissionPerBlock?: Maybe<Scalars['BigFloat']['output']>;
  /** Mean average of id across the matching connection */
  id?: Maybe<Scalars['BigFloat']['output']>;
  /** Mean average of startBlockHeight across the matching connection */
  startBlockHeight?: Maybe<Scalars['BigFloat']['output']>;
  /** Mean average of startBlockTimestamp across the matching connection */
  startBlockTimestamp?: Maybe<Scalars['BigFloat']['output']>;
  /** Mean average of totalAnnualEmission across the matching connection */
  totalAnnualEmission?: Maybe<Scalars['BigFloat']['output']>;
};

/**
 * A condition to be used against `FlipSupply` object types. All fields are tested
 * for equality and combined with a logical ‘and.’
 */
export type FlipSupplyCondition = {
  /** Checks for equality with the object’s `annualSystemCompoundedRewards` field. */
  annualSystemCompoundedRewards?: InputMaybe<Scalars['String']['input']>;
  /** Checks for equality with the object’s `authorityEmissionPerBlock` field. */
  authorityEmissionPerBlock?: InputMaybe<Scalars['BigFloat']['input']>;
  /** Checks for equality with the object’s `backupNodeEmissionPerBlock` field. */
  backupNodeEmissionPerBlock?: InputMaybe<Scalars['BigFloat']['input']>;
  /** Checks for equality with the object’s `id` field. */
  id?: InputMaybe<Scalars['Int']['input']>;
  /** Checks for equality with the object’s `offchainFunds` field. */
  offchainFunds?: InputMaybe<Scalars['String']['input']>;
  /** Checks for equality with the object’s `startBlockHeight` field. */
  startBlockHeight?: InputMaybe<Scalars['Int']['input']>;
  /** Checks for equality with the object’s `startBlockTimestamp` field. */
  startBlockTimestamp?: InputMaybe<Scalars['BigInt']['input']>;
  /** Checks for equality with the object’s `totalAnnualEmission` field. */
  totalAnnualEmission?: InputMaybe<Scalars['BigFloat']['input']>;
  /** Checks for equality with the object’s `totalIssuance` field. */
  totalIssuance?: InputMaybe<Scalars['String']['input']>;
};

export type FlipSupplyDistinctCountAggregates = {
  __typename?: 'FlipSupplyDistinctCountAggregates';
  /** Distinct count of annualSystemCompoundedRewards across the matching connection */
  annualSystemCompoundedRewards?: Maybe<Scalars['BigInt']['output']>;
  /** Distinct count of authorityEmissionPerBlock across the matching connection */
  authorityEmissionPerBlock?: Maybe<Scalars['BigInt']['output']>;
  /** Distinct count of backupNodeEmissionPerBlock across the matching connection */
  backupNodeEmissionPerBlock?: Maybe<Scalars['BigInt']['output']>;
  /** Distinct count of id across the matching connection */
  id?: Maybe<Scalars['BigInt']['output']>;
  /** Distinct count of offchainFunds across the matching connection */
  offchainFunds?: Maybe<Scalars['BigInt']['output']>;
  /** Distinct count of startBlockHeight across the matching connection */
  startBlockHeight?: Maybe<Scalars['BigInt']['output']>;
  /** Distinct count of startBlockTimestamp across the matching connection */
  startBlockTimestamp?: Maybe<Scalars['BigInt']['output']>;
  /** Distinct count of totalAnnualEmission across the matching connection */
  totalAnnualEmission?: Maybe<Scalars['BigInt']['output']>;
  /** Distinct count of totalIssuance across the matching connection */
  totalIssuance?: Maybe<Scalars['BigInt']['output']>;
};

/** A filter to be used against `FlipSupply` object types. All fields are combined with a logical ‘and.’ */
export type FlipSupplyFilter = {
  /** Checks for all expressions in this list. */
  and?: InputMaybe<Array<FlipSupplyFilter>>;
  /** Filter by the object’s `annualSystemCompoundedRewards` field. */
  annualSystemCompoundedRewards?: InputMaybe<StringFilter>;
  /** Filter by the object’s `authorityEmissionPerBlock` field. */
  authorityEmissionPerBlock?: InputMaybe<BigFloatFilter>;
  /** Filter by the object’s `backupNodeEmissionPerBlock` field. */
  backupNodeEmissionPerBlock?: InputMaybe<BigFloatFilter>;
  /** Filter by the object’s `id` field. */
  id?: InputMaybe<IntFilter>;
  /** Negates the expression. */
  not?: InputMaybe<FlipSupplyFilter>;
  /** Filter by the object’s `offchainFunds` field. */
  offchainFunds?: InputMaybe<StringFilter>;
  /** Checks for any expressions in this list. */
  or?: InputMaybe<Array<FlipSupplyFilter>>;
  /** Filter by the object’s `startBlockHeight` field. */
  startBlockHeight?: InputMaybe<IntFilter>;
  /** Filter by the object’s `startBlockTimestamp` field. */
  startBlockTimestamp?: InputMaybe<BigIntFilter>;
  /** Filter by the object’s `totalAnnualEmission` field. */
  totalAnnualEmission?: InputMaybe<BigFloatFilter>;
  /** Filter by the object’s `totalIssuance` field. */
  totalIssuance?: InputMaybe<StringFilter>;
};

/** Grouping methods for `FlipSupply` for usage during aggregation. */
export type FlipSupplyGroupBy =
  | 'ANNUAL_SYSTEM_COMPOUNDED_REWARDS'
  | 'AUTHORITY_EMISSION_PER_BLOCK'
  | 'BACKUP_NODE_EMISSION_PER_BLOCK'
  | 'OFFCHAIN_FUNDS'
  | 'START_BLOCK_HEIGHT'
  | 'START_BLOCK_TIMESTAMP'
  | 'TOTAL_ANNUAL_EMISSION'
  | 'TOTAL_ISSUANCE';

export type FlipSupplyHavingAverageInput = {
  authorityEmissionPerBlock?: InputMaybe<HavingBigfloatFilter>;
  backupNodeEmissionPerBlock?: InputMaybe<HavingBigfloatFilter>;
  id?: InputMaybe<HavingIntFilter>;
  startBlockHeight?: InputMaybe<HavingIntFilter>;
  startBlockTimestamp?: InputMaybe<HavingBigintFilter>;
  totalAnnualEmission?: InputMaybe<HavingBigfloatFilter>;
};

export type FlipSupplyHavingDistinctCountInput = {
  authorityEmissionPerBlock?: InputMaybe<HavingBigfloatFilter>;
  backupNodeEmissionPerBlock?: InputMaybe<HavingBigfloatFilter>;
  id?: InputMaybe<HavingIntFilter>;
  startBlockHeight?: InputMaybe<HavingIntFilter>;
  startBlockTimestamp?: InputMaybe<HavingBigintFilter>;
  totalAnnualEmission?: InputMaybe<HavingBigfloatFilter>;
};

/** Conditions for `FlipSupply` aggregates. */
export type FlipSupplyHavingInput = {
  AND?: InputMaybe<Array<FlipSupplyHavingInput>>;
  OR?: InputMaybe<Array<FlipSupplyHavingInput>>;
  average?: InputMaybe<FlipSupplyHavingAverageInput>;
  distinctCount?: InputMaybe<FlipSupplyHavingDistinctCountInput>;
  max?: InputMaybe<FlipSupplyHavingMaxInput>;
  min?: InputMaybe<FlipSupplyHavingMinInput>;
  stddevPopulation?: InputMaybe<FlipSupplyHavingStddevPopulationInput>;
  stddevSample?: InputMaybe<FlipSupplyHavingStddevSampleInput>;
  sum?: InputMaybe<FlipSupplyHavingSumInput>;
  variancePopulation?: InputMaybe<FlipSupplyHavingVariancePopulationInput>;
  varianceSample?: InputMaybe<FlipSupplyHavingVarianceSampleInput>;
};

export type FlipSupplyHavingMaxInput = {
  authorityEmissionPerBlock?: InputMaybe<HavingBigfloatFilter>;
  backupNodeEmissionPerBlock?: InputMaybe<HavingBigfloatFilter>;
  id?: InputMaybe<HavingIntFilter>;
  startBlockHeight?: InputMaybe<HavingIntFilter>;
  startBlockTimestamp?: InputMaybe<HavingBigintFilter>;
  totalAnnualEmission?: InputMaybe<HavingBigfloatFilter>;
};

export type FlipSupplyHavingMinInput = {
  authorityEmissionPerBlock?: InputMaybe<HavingBigfloatFilter>;
  backupNodeEmissionPerBlock?: InputMaybe<HavingBigfloatFilter>;
  id?: InputMaybe<HavingIntFilter>;
  startBlockHeight?: InputMaybe<HavingIntFilter>;
  startBlockTimestamp?: InputMaybe<HavingBigintFilter>;
  totalAnnualEmission?: InputMaybe<HavingBigfloatFilter>;
};

export type FlipSupplyHavingStddevPopulationInput = {
  authorityEmissionPerBlock?: InputMaybe<HavingBigfloatFilter>;
  backupNodeEmissionPerBlock?: InputMaybe<HavingBigfloatFilter>;
  id?: InputMaybe<HavingIntFilter>;
  startBlockHeight?: InputMaybe<HavingIntFilter>;
  startBlockTimestamp?: InputMaybe<HavingBigintFilter>;
  totalAnnualEmission?: InputMaybe<HavingBigfloatFilter>;
};

export type FlipSupplyHavingStddevSampleInput = {
  authorityEmissionPerBlock?: InputMaybe<HavingBigfloatFilter>;
  backupNodeEmissionPerBlock?: InputMaybe<HavingBigfloatFilter>;
  id?: InputMaybe<HavingIntFilter>;
  startBlockHeight?: InputMaybe<HavingIntFilter>;
  startBlockTimestamp?: InputMaybe<HavingBigintFilter>;
  totalAnnualEmission?: InputMaybe<HavingBigfloatFilter>;
};

export type FlipSupplyHavingSumInput = {
  authorityEmissionPerBlock?: InputMaybe<HavingBigfloatFilter>;
  backupNodeEmissionPerBlock?: InputMaybe<HavingBigfloatFilter>;
  id?: InputMaybe<HavingIntFilter>;
  startBlockHeight?: InputMaybe<HavingIntFilter>;
  startBlockTimestamp?: InputMaybe<HavingBigintFilter>;
  totalAnnualEmission?: InputMaybe<HavingBigfloatFilter>;
};

export type FlipSupplyHavingVariancePopulationInput = {
  authorityEmissionPerBlock?: InputMaybe<HavingBigfloatFilter>;
  backupNodeEmissionPerBlock?: InputMaybe<HavingBigfloatFilter>;
  id?: InputMaybe<HavingIntFilter>;
  startBlockHeight?: InputMaybe<HavingIntFilter>;
  startBlockTimestamp?: InputMaybe<HavingBigintFilter>;
  totalAnnualEmission?: InputMaybe<HavingBigfloatFilter>;
};

export type FlipSupplyHavingVarianceSampleInput = {
  authorityEmissionPerBlock?: InputMaybe<HavingBigfloatFilter>;
  backupNodeEmissionPerBlock?: InputMaybe<HavingBigfloatFilter>;
  id?: InputMaybe<HavingIntFilter>;
  startBlockHeight?: InputMaybe<HavingIntFilter>;
  startBlockTimestamp?: InputMaybe<HavingBigintFilter>;
  totalAnnualEmission?: InputMaybe<HavingBigfloatFilter>;
};

export type FlipSupplyMaxAggregates = {
  __typename?: 'FlipSupplyMaxAggregates';
  /** Maximum of authorityEmissionPerBlock across the matching connection */
  authorityEmissionPerBlock?: Maybe<Scalars['BigFloat']['output']>;
  /** Maximum of backupNodeEmissionPerBlock across the matching connection */
  backupNodeEmissionPerBlock?: Maybe<Scalars['BigFloat']['output']>;
  /** Maximum of id across the matching connection */
  id?: Maybe<Scalars['Int']['output']>;
  /** Maximum of startBlockHeight across the matching connection */
  startBlockHeight?: Maybe<Scalars['Int']['output']>;
  /** Maximum of startBlockTimestamp across the matching connection */
  startBlockTimestamp?: Maybe<Scalars['BigInt']['output']>;
  /** Maximum of totalAnnualEmission across the matching connection */
  totalAnnualEmission?: Maybe<Scalars['BigFloat']['output']>;
};

export type FlipSupplyMinAggregates = {
  __typename?: 'FlipSupplyMinAggregates';
  /** Minimum of authorityEmissionPerBlock across the matching connection */
  authorityEmissionPerBlock?: Maybe<Scalars['BigFloat']['output']>;
  /** Minimum of backupNodeEmissionPerBlock across the matching connection */
  backupNodeEmissionPerBlock?: Maybe<Scalars['BigFloat']['output']>;
  /** Minimum of id across the matching connection */
  id?: Maybe<Scalars['Int']['output']>;
  /** Minimum of startBlockHeight across the matching connection */
  startBlockHeight?: Maybe<Scalars['Int']['output']>;
  /** Minimum of startBlockTimestamp across the matching connection */
  startBlockTimestamp?: Maybe<Scalars['BigInt']['output']>;
  /** Minimum of totalAnnualEmission across the matching connection */
  totalAnnualEmission?: Maybe<Scalars['BigFloat']['output']>;
};

export type FlipSupplyStddevPopulationAggregates = {
  __typename?: 'FlipSupplyStddevPopulationAggregates';
  /** Population standard deviation of authorityEmissionPerBlock across the matching connection */
  authorityEmissionPerBlock?: Maybe<Scalars['BigFloat']['output']>;
  /** Population standard deviation of backupNodeEmissionPerBlock across the matching connection */
  backupNodeEmissionPerBlock?: Maybe<Scalars['BigFloat']['output']>;
  /** Population standard deviation of id across the matching connection */
  id?: Maybe<Scalars['BigFloat']['output']>;
  /** Population standard deviation of startBlockHeight across the matching connection */
  startBlockHeight?: Maybe<Scalars['BigFloat']['output']>;
  /** Population standard deviation of startBlockTimestamp across the matching connection */
  startBlockTimestamp?: Maybe<Scalars['BigFloat']['output']>;
  /** Population standard deviation of totalAnnualEmission across the matching connection */
  totalAnnualEmission?: Maybe<Scalars['BigFloat']['output']>;
};

export type FlipSupplyStddevSampleAggregates = {
  __typename?: 'FlipSupplyStddevSampleAggregates';
  /** Sample standard deviation of authorityEmissionPerBlock across the matching connection */
  authorityEmissionPerBlock?: Maybe<Scalars['BigFloat']['output']>;
  /** Sample standard deviation of backupNodeEmissionPerBlock across the matching connection */
  backupNodeEmissionPerBlock?: Maybe<Scalars['BigFloat']['output']>;
  /** Sample standard deviation of id across the matching connection */
  id?: Maybe<Scalars['BigFloat']['output']>;
  /** Sample standard deviation of startBlockHeight across the matching connection */
  startBlockHeight?: Maybe<Scalars['BigFloat']['output']>;
  /** Sample standard deviation of startBlockTimestamp across the matching connection */
  startBlockTimestamp?: Maybe<Scalars['BigFloat']['output']>;
  /** Sample standard deviation of totalAnnualEmission across the matching connection */
  totalAnnualEmission?: Maybe<Scalars['BigFloat']['output']>;
};

export type FlipSupplySumAggregates = {
  __typename?: 'FlipSupplySumAggregates';
  /** Sum of authorityEmissionPerBlock across the matching connection */
  authorityEmissionPerBlock: Scalars['BigFloat']['output'];
  /** Sum of backupNodeEmissionPerBlock across the matching connection */
  backupNodeEmissionPerBlock: Scalars['BigFloat']['output'];
  /** Sum of id across the matching connection */
  id: Scalars['BigInt']['output'];
  /** Sum of startBlockHeight across the matching connection */
  startBlockHeight: Scalars['BigInt']['output'];
  /** Sum of startBlockTimestamp across the matching connection */
  startBlockTimestamp: Scalars['BigFloat']['output'];
  /** Sum of totalAnnualEmission across the matching connection */
  totalAnnualEmission: Scalars['BigFloat']['output'];
};

export type FlipSupplyVariancePopulationAggregates = {
  __typename?: 'FlipSupplyVariancePopulationAggregates';
  /** Population variance of authorityEmissionPerBlock across the matching connection */
  authorityEmissionPerBlock?: Maybe<Scalars['BigFloat']['output']>;
  /** Population variance of backupNodeEmissionPerBlock across the matching connection */
  backupNodeEmissionPerBlock?: Maybe<Scalars['BigFloat']['output']>;
  /** Population variance of id across the matching connection */
  id?: Maybe<Scalars['BigFloat']['output']>;
  /** Population variance of startBlockHeight across the matching connection */
  startBlockHeight?: Maybe<Scalars['BigFloat']['output']>;
  /** Population variance of startBlockTimestamp across the matching connection */
  startBlockTimestamp?: Maybe<Scalars['BigFloat']['output']>;
  /** Population variance of totalAnnualEmission across the matching connection */
  totalAnnualEmission?: Maybe<Scalars['BigFloat']['output']>;
};

export type FlipSupplyVarianceSampleAggregates = {
  __typename?: 'FlipSupplyVarianceSampleAggregates';
  /** Sample variance of authorityEmissionPerBlock across the matching connection */
  authorityEmissionPerBlock?: Maybe<Scalars['BigFloat']['output']>;
  /** Sample variance of backupNodeEmissionPerBlock across the matching connection */
  backupNodeEmissionPerBlock?: Maybe<Scalars['BigFloat']['output']>;
  /** Sample variance of id across the matching connection */
  id?: Maybe<Scalars['BigFloat']['output']>;
  /** Sample variance of startBlockHeight across the matching connection */
  startBlockHeight?: Maybe<Scalars['BigFloat']['output']>;
  /** Sample variance of startBlockTimestamp across the matching connection */
  startBlockTimestamp?: Maybe<Scalars['BigFloat']['output']>;
  /** Sample variance of totalAnnualEmission across the matching connection */
  totalAnnualEmission?: Maybe<Scalars['BigFloat']['output']>;
};

/** A filter to be used against Float fields. All fields are combined with a logical ‘and.’ */
export type FloatFilter = {
  /** Not equal to the specified value, treating null like an ordinary value. */
  distinctFrom?: InputMaybe<Scalars['Float']['input']>;
  /** Equal to the specified value. */
  equalTo?: InputMaybe<Scalars['Float']['input']>;
  /** Greater than the specified value. */
  greaterThan?: InputMaybe<Scalars['Float']['input']>;
  /** Greater than or equal to the specified value. */
  greaterThanOrEqualTo?: InputMaybe<Scalars['Float']['input']>;
  /** Included in the specified list. */
  in?: InputMaybe<Array<Scalars['Float']['input']>>;
  /** Is null (if `true` is specified) or is not null (if `false` is specified). */
  isNull?: InputMaybe<Scalars['Boolean']['input']>;
  /** Less than the specified value. */
  lessThan?: InputMaybe<Scalars['Float']['input']>;
  /** Less than or equal to the specified value. */
  lessThanOrEqualTo?: InputMaybe<Scalars['Float']['input']>;
  /** Equal to the specified value, treating null like an ordinary value. */
  notDistinctFrom?: InputMaybe<Scalars['Float']['input']>;
  /** Not equal to the specified value. */
  notEqualTo?: InputMaybe<Scalars['Float']['input']>;
  /** Not included in the specified list. */
  notIn?: InputMaybe<Array<Scalars['Float']['input']>>;
};

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

/** A connection to a list of `FrontierEthereumTransaction` values. */
export type FrontierEthereumTransactionsConnection = {
  __typename?: 'FrontierEthereumTransactionsConnection';
  /** A list of edges which contains the `FrontierEthereumTransaction` and cursor to aid in pagination. */
  edges: Array<FrontierEthereumTransactionsEdge>;
  /** A list of `FrontierEthereumTransaction` objects. */
  nodes: Array<FrontierEthereumTransaction>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
  /** The count of *all* `FrontierEthereumTransaction` you could get from the connection. */
  totalCount: Scalars['Int']['output'];
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

/** A connection to a list of `FrontierEvmLog` values. */
export type FrontierEvmLogsConnection = {
  __typename?: 'FrontierEvmLogsConnection';
  /** A list of edges which contains the `FrontierEvmLog` and cursor to aid in pagination. */
  edges: Array<FrontierEvmLogsEdge>;
  /** A list of `FrontierEvmLog` objects. */
  nodes: Array<FrontierEvmLog>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
  /** The count of *all* `FrontierEvmLog` you could get from the connection. */
  totalCount: Scalars['Int']['output'];
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

export type FundingEvent = Node & {
  __typename?: 'FundingEvent';
  amount: Scalars['BigFloat']['output'];
  block: Scalars['String']['output'];
  blockTimestamp: Scalars['String']['output'];
  funder: Scalars['String']['output'];
  logIndex: Scalars['BigInt']['output'];
  /** A globally unique identifier. Can be used in various places throughout the system to identify this single value. */
  nodeId: Scalars['ID']['output'];
  txHash: Scalars['String']['output'];
  txId: Scalars['String']['output'];
  validatorIdHex: Scalars['String']['output'];
};

export type FundingEventAggregates = {
  __typename?: 'FundingEventAggregates';
  /** Mean average aggregates across the matching connection (ignoring before/after/first/last/offset) */
  average?: Maybe<FundingEventAverageAggregates>;
  /** Distinct count aggregates across the matching connection (ignoring before/after/first/last/offset) */
  distinctCount?: Maybe<FundingEventDistinctCountAggregates>;
  keys?: Maybe<Array<Scalars['String']['output']>>;
  /** Maximum aggregates across the matching connection (ignoring before/after/first/last/offset) */
  max?: Maybe<FundingEventMaxAggregates>;
  /** Minimum aggregates across the matching connection (ignoring before/after/first/last/offset) */
  min?: Maybe<FundingEventMinAggregates>;
  /** Population standard deviation aggregates across the matching connection (ignoring before/after/first/last/offset) */
  stddevPopulation?: Maybe<FundingEventStddevPopulationAggregates>;
  /** Sample standard deviation aggregates across the matching connection (ignoring before/after/first/last/offset) */
  stddevSample?: Maybe<FundingEventStddevSampleAggregates>;
  /** Sum aggregates across the matching connection (ignoring before/after/first/last/offset) */
  sum?: Maybe<FundingEventSumAggregates>;
  /** Population variance aggregates across the matching connection (ignoring before/after/first/last/offset) */
  variancePopulation?: Maybe<FundingEventVariancePopulationAggregates>;
  /** Sample variance aggregates across the matching connection (ignoring before/after/first/last/offset) */
  varianceSample?: Maybe<FundingEventVarianceSampleAggregates>;
};

export type FundingEventAverageAggregates = {
  __typename?: 'FundingEventAverageAggregates';
  /** Mean average of amount across the matching connection */
  amount?: Maybe<Scalars['BigFloat']['output']>;
  /** Mean average of logIndex across the matching connection */
  logIndex?: Maybe<Scalars['BigFloat']['output']>;
};

/**
 * A condition to be used against `FundingEvent` object types. All fields are
 * tested for equality and combined with a logical ‘and.’
 */
export type FundingEventCondition = {
  /** Checks for equality with the object’s `amount` field. */
  amount?: InputMaybe<Scalars['BigFloat']['input']>;
  /** Checks for equality with the object’s `block` field. */
  block?: InputMaybe<Scalars['String']['input']>;
  /** Checks for equality with the object’s `blockTimestamp` field. */
  blockTimestamp?: InputMaybe<Scalars['String']['input']>;
  /** Checks for equality with the object’s `funder` field. */
  funder?: InputMaybe<Scalars['String']['input']>;
  /** Checks for equality with the object’s `logIndex` field. */
  logIndex?: InputMaybe<Scalars['BigInt']['input']>;
  /** Checks for equality with the object’s `txHash` field. */
  txHash?: InputMaybe<Scalars['String']['input']>;
  /** Checks for equality with the object’s `txId` field. */
  txId?: InputMaybe<Scalars['String']['input']>;
  /** Checks for equality with the object’s `validatorIdHex` field. */
  validatorIdHex?: InputMaybe<Scalars['String']['input']>;
};

export type FundingEventDistinctCountAggregates = {
  __typename?: 'FundingEventDistinctCountAggregates';
  /** Distinct count of amount across the matching connection */
  amount?: Maybe<Scalars['BigInt']['output']>;
  /** Distinct count of block across the matching connection */
  block?: Maybe<Scalars['BigInt']['output']>;
  /** Distinct count of blockTimestamp across the matching connection */
  blockTimestamp?: Maybe<Scalars['BigInt']['output']>;
  /** Distinct count of funder across the matching connection */
  funder?: Maybe<Scalars['BigInt']['output']>;
  /** Distinct count of logIndex across the matching connection */
  logIndex?: Maybe<Scalars['BigInt']['output']>;
  /** Distinct count of txHash across the matching connection */
  txHash?: Maybe<Scalars['BigInt']['output']>;
  /** Distinct count of txId across the matching connection */
  txId?: Maybe<Scalars['BigInt']['output']>;
  /** Distinct count of validatorIdHex across the matching connection */
  validatorIdHex?: Maybe<Scalars['BigInt']['output']>;
};

/** A filter to be used against `FundingEvent` object types. All fields are combined with a logical ‘and.’ */
export type FundingEventFilter = {
  /** Filter by the object’s `amount` field. */
  amount?: InputMaybe<BigFloatFilter>;
  /** Checks for all expressions in this list. */
  and?: InputMaybe<Array<FundingEventFilter>>;
  /** Filter by the object’s `block` field. */
  block?: InputMaybe<StringFilter>;
  /** Filter by the object’s `blockTimestamp` field. */
  blockTimestamp?: InputMaybe<StringFilter>;
  /** Filter by the object’s `funder` field. */
  funder?: InputMaybe<StringFilter>;
  /** Filter by the object’s `logIndex` field. */
  logIndex?: InputMaybe<BigIntFilter>;
  /** Negates the expression. */
  not?: InputMaybe<FundingEventFilter>;
  /** Checks for any expressions in this list. */
  or?: InputMaybe<Array<FundingEventFilter>>;
  /** Filter by the object’s `txHash` field. */
  txHash?: InputMaybe<StringFilter>;
  /** Filter by the object’s `txId` field. */
  txId?: InputMaybe<StringFilter>;
  /** Filter by the object’s `validatorIdHex` field. */
  validatorIdHex?: InputMaybe<StringFilter>;
};

/** Grouping methods for `FundingEvent` for usage during aggregation. */
export type FundingEventGroupBy =
  | 'AMOUNT'
  | 'BLOCK'
  | 'BLOCK_TIMESTAMP'
  | 'FUNDER'
  | 'LOG_INDEX'
  | 'TX_HASH'
  | 'TX_ID'
  | 'VALIDATOR_ID_HEX';

export type FundingEventHavingAverageInput = {
  amount?: InputMaybe<HavingBigfloatFilter>;
  logIndex?: InputMaybe<HavingBigintFilter>;
};

export type FundingEventHavingDistinctCountInput = {
  amount?: InputMaybe<HavingBigfloatFilter>;
  logIndex?: InputMaybe<HavingBigintFilter>;
};

/** Conditions for `FundingEvent` aggregates. */
export type FundingEventHavingInput = {
  AND?: InputMaybe<Array<FundingEventHavingInput>>;
  OR?: InputMaybe<Array<FundingEventHavingInput>>;
  average?: InputMaybe<FundingEventHavingAverageInput>;
  distinctCount?: InputMaybe<FundingEventHavingDistinctCountInput>;
  max?: InputMaybe<FundingEventHavingMaxInput>;
  min?: InputMaybe<FundingEventHavingMinInput>;
  stddevPopulation?: InputMaybe<FundingEventHavingStddevPopulationInput>;
  stddevSample?: InputMaybe<FundingEventHavingStddevSampleInput>;
  sum?: InputMaybe<FundingEventHavingSumInput>;
  variancePopulation?: InputMaybe<FundingEventHavingVariancePopulationInput>;
  varianceSample?: InputMaybe<FundingEventHavingVarianceSampleInput>;
};

export type FundingEventHavingMaxInput = {
  amount?: InputMaybe<HavingBigfloatFilter>;
  logIndex?: InputMaybe<HavingBigintFilter>;
};

export type FundingEventHavingMinInput = {
  amount?: InputMaybe<HavingBigfloatFilter>;
  logIndex?: InputMaybe<HavingBigintFilter>;
};

export type FundingEventHavingStddevPopulationInput = {
  amount?: InputMaybe<HavingBigfloatFilter>;
  logIndex?: InputMaybe<HavingBigintFilter>;
};

export type FundingEventHavingStddevSampleInput = {
  amount?: InputMaybe<HavingBigfloatFilter>;
  logIndex?: InputMaybe<HavingBigintFilter>;
};

export type FundingEventHavingSumInput = {
  amount?: InputMaybe<HavingBigfloatFilter>;
  logIndex?: InputMaybe<HavingBigintFilter>;
};

export type FundingEventHavingVariancePopulationInput = {
  amount?: InputMaybe<HavingBigfloatFilter>;
  logIndex?: InputMaybe<HavingBigintFilter>;
};

export type FundingEventHavingVarianceSampleInput = {
  amount?: InputMaybe<HavingBigfloatFilter>;
  logIndex?: InputMaybe<HavingBigintFilter>;
};

export type FundingEventMaxAggregates = {
  __typename?: 'FundingEventMaxAggregates';
  /** Maximum of amount across the matching connection */
  amount?: Maybe<Scalars['BigFloat']['output']>;
  /** Maximum of logIndex across the matching connection */
  logIndex?: Maybe<Scalars['BigInt']['output']>;
};

export type FundingEventMinAggregates = {
  __typename?: 'FundingEventMinAggregates';
  /** Minimum of amount across the matching connection */
  amount?: Maybe<Scalars['BigFloat']['output']>;
  /** Minimum of logIndex across the matching connection */
  logIndex?: Maybe<Scalars['BigInt']['output']>;
};

export type FundingEventStddevPopulationAggregates = {
  __typename?: 'FundingEventStddevPopulationAggregates';
  /** Population standard deviation of amount across the matching connection */
  amount?: Maybe<Scalars['BigFloat']['output']>;
  /** Population standard deviation of logIndex across the matching connection */
  logIndex?: Maybe<Scalars['BigFloat']['output']>;
};

export type FundingEventStddevSampleAggregates = {
  __typename?: 'FundingEventStddevSampleAggregates';
  /** Sample standard deviation of amount across the matching connection */
  amount?: Maybe<Scalars['BigFloat']['output']>;
  /** Sample standard deviation of logIndex across the matching connection */
  logIndex?: Maybe<Scalars['BigFloat']['output']>;
};

export type FundingEventSumAggregates = {
  __typename?: 'FundingEventSumAggregates';
  /** Sum of amount across the matching connection */
  amount: Scalars['BigFloat']['output'];
  /** Sum of logIndex across the matching connection */
  logIndex: Scalars['BigFloat']['output'];
};

export type FundingEventVariancePopulationAggregates = {
  __typename?: 'FundingEventVariancePopulationAggregates';
  /** Population variance of amount across the matching connection */
  amount?: Maybe<Scalars['BigFloat']['output']>;
  /** Population variance of logIndex across the matching connection */
  logIndex?: Maybe<Scalars['BigFloat']['output']>;
};

export type FundingEventVarianceSampleAggregates = {
  __typename?: 'FundingEventVarianceSampleAggregates';
  /** Sample variance of amount across the matching connection */
  amount?: Maybe<Scalars['BigFloat']['output']>;
  /** Sample variance of logIndex across the matching connection */
  logIndex?: Maybe<Scalars['BigFloat']['output']>;
};

/** A connection to a list of `FundingEvent` values. */
export type FundingEventsConnection = {
  __typename?: 'FundingEventsConnection';
  /** Aggregates across the matching connection (ignoring before/after/first/last/offset) */
  aggregates?: Maybe<FundingEventAggregates>;
  /** A list of edges which contains the `FundingEvent` and cursor to aid in pagination. */
  edges: Array<FundingEventsEdge>;
  /** Grouped aggregates across the matching connection (ignoring before/after/first/last/offset) */
  groupedAggregates?: Maybe<Array<FundingEventAggregates>>;
  /** A list of `FundingEvent` objects. */
  nodes: Array<FundingEvent>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
  /** The count of *all* `FundingEvent` you could get from the connection. */
  totalCount: Scalars['Int']['output'];
};


/** A connection to a list of `FundingEvent` values. */
export type FundingEventsConnectionGroupedAggregatesArgs = {
  groupBy: Array<FundingEventGroupBy>;
  having?: InputMaybe<FundingEventHavingInput>;
};

/** A `FundingEvent` edge in the connection. */
export type FundingEventsEdge = {
  __typename?: 'FundingEventsEdge';
  /** A cursor for use in pagination. */
  cursor?: Maybe<Scalars['Cursor']['output']>;
  /** The `FundingEvent` at the end of the edge. */
  node: FundingEvent;
};

/** Methods to use when ordering `FundingEvent`. */
export type FundingEventsOrderBy =
  | 'AMOUNT_ASC'
  | 'AMOUNT_DESC'
  | 'BLOCK_ASC'
  | 'BLOCK_DESC'
  | 'BLOCK_TIMESTAMP_ASC'
  | 'BLOCK_TIMESTAMP_DESC'
  | 'FUNDER_ASC'
  | 'FUNDER_DESC'
  | 'LOG_INDEX_ASC'
  | 'LOG_INDEX_DESC'
  | 'NATURAL'
  | 'PRIMARY_KEY_ASC'
  | 'PRIMARY_KEY_DESC'
  | 'TX_HASH_ASC'
  | 'TX_HASH_DESC'
  | 'TX_ID_ASC'
  | 'TX_ID_DESC'
  | 'VALIDATOR_ID_HEX_ASC'
  | 'VALIDATOR_ID_HEX_DESC';

export type GearMessageEnqueued = Node & {
  __typename?: 'GearMessageEnqueued';
  /** Reads a single `Event` that is related to this `GearMessageEnqueued`. */
  eventByEventId: Event;
  eventId: Scalars['String']['output'];
  /** A globally unique identifier. Can be used in various places throughout the system to identify this single value. */
  nodeId: Scalars['ID']['output'];
  program: Scalars['String']['output'];
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

/** A connection to a list of `GearMessageEnqueued` values. */
export type GearMessageEnqueuedsConnection = {
  __typename?: 'GearMessageEnqueuedsConnection';
  /** A list of edges which contains the `GearMessageEnqueued` and cursor to aid in pagination. */
  edges: Array<GearMessageEnqueuedsEdge>;
  /** A list of `GearMessageEnqueued` objects. */
  nodes: Array<GearMessageEnqueued>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
  /** The count of *all* `GearMessageEnqueued` you could get from the connection. */
  totalCount: Scalars['Int']['output'];
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

/** A connection to a list of `GearUserMessageSent` values. */
export type GearUserMessageSentsConnection = {
  __typename?: 'GearUserMessageSentsConnection';
  /** A list of edges which contains the `GearUserMessageSent` and cursor to aid in pagination. */
  edges: Array<GearUserMessageSentsEdge>;
  /** A list of `GearUserMessageSent` objects. */
  nodes: Array<GearUserMessageSent>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
  /** The count of *all* `GearUserMessageSent` you could get from the connection. */
  totalCount: Scalars['Int']['output'];
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

export type HavingBigintFilter = {
  equalTo?: InputMaybe<Scalars['BigInt']['input']>;
  greaterThan?: InputMaybe<Scalars['BigInt']['input']>;
  greaterThanOrEqualTo?: InputMaybe<Scalars['BigInt']['input']>;
  lessThan?: InputMaybe<Scalars['BigInt']['input']>;
  lessThanOrEqualTo?: InputMaybe<Scalars['BigInt']['input']>;
  notEqualTo?: InputMaybe<Scalars['BigInt']['input']>;
};

export type HavingDatetimeFilter = {
  equalTo?: InputMaybe<Scalars['Datetime']['input']>;
  greaterThan?: InputMaybe<Scalars['Datetime']['input']>;
  greaterThanOrEqualTo?: InputMaybe<Scalars['Datetime']['input']>;
  lessThan?: InputMaybe<Scalars['Datetime']['input']>;
  lessThanOrEqualTo?: InputMaybe<Scalars['Datetime']['input']>;
  notEqualTo?: InputMaybe<Scalars['Datetime']['input']>;
};

export type HavingFloatFilter = {
  equalTo?: InputMaybe<Scalars['Float']['input']>;
  greaterThan?: InputMaybe<Scalars['Float']['input']>;
  greaterThanOrEqualTo?: InputMaybe<Scalars['Float']['input']>;
  lessThan?: InputMaybe<Scalars['Float']['input']>;
  lessThanOrEqualTo?: InputMaybe<Scalars['Float']['input']>;
  notEqualTo?: InputMaybe<Scalars['Float']['input']>;
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

export type LpAccount = Node & {
  __typename?: 'LpAccount';
  alias?: Maybe<Scalars['String']['output']>;
  /** Reads and enables pagination through a set of `DepositBalance`. */
  depositBalancesByLpIdSs58: DepositBalancesConnection;
  idSs58: Scalars['String']['output'];
  /** A globally unique identifier. Can be used in various places throughout the system to identify this single value. */
  nodeId: Scalars['ID']['output'];
};


export type LpAccountDepositBalancesByLpIdSs58Args = {
  after?: InputMaybe<Scalars['Cursor']['input']>;
  before?: InputMaybe<Scalars['Cursor']['input']>;
  condition?: InputMaybe<DepositBalanceCondition>;
  filter?: InputMaybe<DepositBalanceFilter>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<DepositBalancesOrderBy>>;
};

export type LpAccountAggregates = {
  __typename?: 'LpAccountAggregates';
  /** Distinct count aggregates across the matching connection (ignoring before/after/first/last/offset) */
  distinctCount?: Maybe<LpAccountDistinctCountAggregates>;
  keys?: Maybe<Array<Scalars['String']['output']>>;
};

/**
 * A condition to be used against `LpAccount` object types. All fields are tested
 * for equality and combined with a logical ‘and.’
 */
export type LpAccountCondition = {
  /** Checks for equality with the object’s `alias` field. */
  alias?: InputMaybe<Scalars['String']['input']>;
  /** Checks for equality with the object’s `idSs58` field. */
  idSs58?: InputMaybe<Scalars['String']['input']>;
};

export type LpAccountDistinctCountAggregates = {
  __typename?: 'LpAccountDistinctCountAggregates';
  /** Distinct count of alias across the matching connection */
  alias?: Maybe<Scalars['BigInt']['output']>;
  /** Distinct count of idSs58 across the matching connection */
  idSs58?: Maybe<Scalars['BigInt']['output']>;
};

/** A filter to be used against `LpAccount` object types. All fields are combined with a logical ‘and.’ */
export type LpAccountFilter = {
  /** Filter by the object’s `alias` field. */
  alias?: InputMaybe<StringFilter>;
  /** Checks for all expressions in this list. */
  and?: InputMaybe<Array<LpAccountFilter>>;
  /** Filter by the object’s `idSs58` field. */
  idSs58?: InputMaybe<StringFilter>;
  /** Negates the expression. */
  not?: InputMaybe<LpAccountFilter>;
  /** Checks for any expressions in this list. */
  or?: InputMaybe<Array<LpAccountFilter>>;
};

/** Grouping methods for `LpAccount` for usage during aggregation. */
export type LpAccountGroupBy =
  | 'ALIAS';

/** Conditions for `LpAccount` aggregates. */
export type LpAccountHavingInput = {
  AND?: InputMaybe<Array<LpAccountHavingInput>>;
  OR?: InputMaybe<Array<LpAccountHavingInput>>;
};

/** A connection to a list of `LpAccount` values. */
export type LpAccountsConnection = {
  __typename?: 'LpAccountsConnection';
  /** Aggregates across the matching connection (ignoring before/after/first/last/offset) */
  aggregates?: Maybe<LpAccountAggregates>;
  /** A list of edges which contains the `LpAccount` and cursor to aid in pagination. */
  edges: Array<LpAccountsEdge>;
  /** Grouped aggregates across the matching connection (ignoring before/after/first/last/offset) */
  groupedAggregates?: Maybe<Array<LpAccountAggregates>>;
  /** A list of `LpAccount` objects. */
  nodes: Array<LpAccount>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
  /** The count of *all* `LpAccount` you could get from the connection. */
  totalCount: Scalars['Int']['output'];
};


/** A connection to a list of `LpAccount` values. */
export type LpAccountsConnectionGroupedAggregatesArgs = {
  groupBy: Array<LpAccountGroupBy>;
  having?: InputMaybe<LpAccountHavingInput>;
};

/** A `LpAccount` edge in the connection. */
export type LpAccountsEdge = {
  __typename?: 'LpAccountsEdge';
  /** A cursor for use in pagination. */
  cursor?: Maybe<Scalars['Cursor']['output']>;
  /** The `LpAccount` at the end of the edge. */
  node: LpAccount;
};

/** Methods to use when ordering `LpAccount`. */
export type LpAccountsOrderBy =
  | 'ALIAS_ASC'
  | 'ALIAS_DESC'
  | 'DEPOSIT_BALANCES_BY_LP_ID_SS58_AVERAGE_AMOUNT_ASC'
  | 'DEPOSIT_BALANCES_BY_LP_ID_SS58_AVERAGE_AMOUNT_DESC'
  | 'DEPOSIT_BALANCES_BY_LP_ID_SS58_AVERAGE_ASSET_ASC'
  | 'DEPOSIT_BALANCES_BY_LP_ID_SS58_AVERAGE_ASSET_DESC'
  | 'DEPOSIT_BALANCES_BY_LP_ID_SS58_AVERAGE_CHAIN_ASC'
  | 'DEPOSIT_BALANCES_BY_LP_ID_SS58_AVERAGE_CHAIN_DESC'
  | 'DEPOSIT_BALANCES_BY_LP_ID_SS58_AVERAGE_LP_ID_SS58_ASC'
  | 'DEPOSIT_BALANCES_BY_LP_ID_SS58_AVERAGE_LP_ID_SS58_DESC'
  | 'DEPOSIT_BALANCES_BY_LP_ID_SS58_COUNT_ASC'
  | 'DEPOSIT_BALANCES_BY_LP_ID_SS58_COUNT_DESC'
  | 'DEPOSIT_BALANCES_BY_LP_ID_SS58_DISTINCT_COUNT_AMOUNT_ASC'
  | 'DEPOSIT_BALANCES_BY_LP_ID_SS58_DISTINCT_COUNT_AMOUNT_DESC'
  | 'DEPOSIT_BALANCES_BY_LP_ID_SS58_DISTINCT_COUNT_ASSET_ASC'
  | 'DEPOSIT_BALANCES_BY_LP_ID_SS58_DISTINCT_COUNT_ASSET_DESC'
  | 'DEPOSIT_BALANCES_BY_LP_ID_SS58_DISTINCT_COUNT_CHAIN_ASC'
  | 'DEPOSIT_BALANCES_BY_LP_ID_SS58_DISTINCT_COUNT_CHAIN_DESC'
  | 'DEPOSIT_BALANCES_BY_LP_ID_SS58_DISTINCT_COUNT_LP_ID_SS58_ASC'
  | 'DEPOSIT_BALANCES_BY_LP_ID_SS58_DISTINCT_COUNT_LP_ID_SS58_DESC'
  | 'DEPOSIT_BALANCES_BY_LP_ID_SS58_MAX_AMOUNT_ASC'
  | 'DEPOSIT_BALANCES_BY_LP_ID_SS58_MAX_AMOUNT_DESC'
  | 'DEPOSIT_BALANCES_BY_LP_ID_SS58_MAX_ASSET_ASC'
  | 'DEPOSIT_BALANCES_BY_LP_ID_SS58_MAX_ASSET_DESC'
  | 'DEPOSIT_BALANCES_BY_LP_ID_SS58_MAX_CHAIN_ASC'
  | 'DEPOSIT_BALANCES_BY_LP_ID_SS58_MAX_CHAIN_DESC'
  | 'DEPOSIT_BALANCES_BY_LP_ID_SS58_MAX_LP_ID_SS58_ASC'
  | 'DEPOSIT_BALANCES_BY_LP_ID_SS58_MAX_LP_ID_SS58_DESC'
  | 'DEPOSIT_BALANCES_BY_LP_ID_SS58_MIN_AMOUNT_ASC'
  | 'DEPOSIT_BALANCES_BY_LP_ID_SS58_MIN_AMOUNT_DESC'
  | 'DEPOSIT_BALANCES_BY_LP_ID_SS58_MIN_ASSET_ASC'
  | 'DEPOSIT_BALANCES_BY_LP_ID_SS58_MIN_ASSET_DESC'
  | 'DEPOSIT_BALANCES_BY_LP_ID_SS58_MIN_CHAIN_ASC'
  | 'DEPOSIT_BALANCES_BY_LP_ID_SS58_MIN_CHAIN_DESC'
  | 'DEPOSIT_BALANCES_BY_LP_ID_SS58_MIN_LP_ID_SS58_ASC'
  | 'DEPOSIT_BALANCES_BY_LP_ID_SS58_MIN_LP_ID_SS58_DESC'
  | 'DEPOSIT_BALANCES_BY_LP_ID_SS58_STDDEV_POPULATION_AMOUNT_ASC'
  | 'DEPOSIT_BALANCES_BY_LP_ID_SS58_STDDEV_POPULATION_AMOUNT_DESC'
  | 'DEPOSIT_BALANCES_BY_LP_ID_SS58_STDDEV_POPULATION_ASSET_ASC'
  | 'DEPOSIT_BALANCES_BY_LP_ID_SS58_STDDEV_POPULATION_ASSET_DESC'
  | 'DEPOSIT_BALANCES_BY_LP_ID_SS58_STDDEV_POPULATION_CHAIN_ASC'
  | 'DEPOSIT_BALANCES_BY_LP_ID_SS58_STDDEV_POPULATION_CHAIN_DESC'
  | 'DEPOSIT_BALANCES_BY_LP_ID_SS58_STDDEV_POPULATION_LP_ID_SS58_ASC'
  | 'DEPOSIT_BALANCES_BY_LP_ID_SS58_STDDEV_POPULATION_LP_ID_SS58_DESC'
  | 'DEPOSIT_BALANCES_BY_LP_ID_SS58_STDDEV_SAMPLE_AMOUNT_ASC'
  | 'DEPOSIT_BALANCES_BY_LP_ID_SS58_STDDEV_SAMPLE_AMOUNT_DESC'
  | 'DEPOSIT_BALANCES_BY_LP_ID_SS58_STDDEV_SAMPLE_ASSET_ASC'
  | 'DEPOSIT_BALANCES_BY_LP_ID_SS58_STDDEV_SAMPLE_ASSET_DESC'
  | 'DEPOSIT_BALANCES_BY_LP_ID_SS58_STDDEV_SAMPLE_CHAIN_ASC'
  | 'DEPOSIT_BALANCES_BY_LP_ID_SS58_STDDEV_SAMPLE_CHAIN_DESC'
  | 'DEPOSIT_BALANCES_BY_LP_ID_SS58_STDDEV_SAMPLE_LP_ID_SS58_ASC'
  | 'DEPOSIT_BALANCES_BY_LP_ID_SS58_STDDEV_SAMPLE_LP_ID_SS58_DESC'
  | 'DEPOSIT_BALANCES_BY_LP_ID_SS58_SUM_AMOUNT_ASC'
  | 'DEPOSIT_BALANCES_BY_LP_ID_SS58_SUM_AMOUNT_DESC'
  | 'DEPOSIT_BALANCES_BY_LP_ID_SS58_SUM_ASSET_ASC'
  | 'DEPOSIT_BALANCES_BY_LP_ID_SS58_SUM_ASSET_DESC'
  | 'DEPOSIT_BALANCES_BY_LP_ID_SS58_SUM_CHAIN_ASC'
  | 'DEPOSIT_BALANCES_BY_LP_ID_SS58_SUM_CHAIN_DESC'
  | 'DEPOSIT_BALANCES_BY_LP_ID_SS58_SUM_LP_ID_SS58_ASC'
  | 'DEPOSIT_BALANCES_BY_LP_ID_SS58_SUM_LP_ID_SS58_DESC'
  | 'DEPOSIT_BALANCES_BY_LP_ID_SS58_VARIANCE_POPULATION_AMOUNT_ASC'
  | 'DEPOSIT_BALANCES_BY_LP_ID_SS58_VARIANCE_POPULATION_AMOUNT_DESC'
  | 'DEPOSIT_BALANCES_BY_LP_ID_SS58_VARIANCE_POPULATION_ASSET_ASC'
  | 'DEPOSIT_BALANCES_BY_LP_ID_SS58_VARIANCE_POPULATION_ASSET_DESC'
  | 'DEPOSIT_BALANCES_BY_LP_ID_SS58_VARIANCE_POPULATION_CHAIN_ASC'
  | 'DEPOSIT_BALANCES_BY_LP_ID_SS58_VARIANCE_POPULATION_CHAIN_DESC'
  | 'DEPOSIT_BALANCES_BY_LP_ID_SS58_VARIANCE_POPULATION_LP_ID_SS58_ASC'
  | 'DEPOSIT_BALANCES_BY_LP_ID_SS58_VARIANCE_POPULATION_LP_ID_SS58_DESC'
  | 'DEPOSIT_BALANCES_BY_LP_ID_SS58_VARIANCE_SAMPLE_AMOUNT_ASC'
  | 'DEPOSIT_BALANCES_BY_LP_ID_SS58_VARIANCE_SAMPLE_AMOUNT_DESC'
  | 'DEPOSIT_BALANCES_BY_LP_ID_SS58_VARIANCE_SAMPLE_ASSET_ASC'
  | 'DEPOSIT_BALANCES_BY_LP_ID_SS58_VARIANCE_SAMPLE_ASSET_DESC'
  | 'DEPOSIT_BALANCES_BY_LP_ID_SS58_VARIANCE_SAMPLE_CHAIN_ASC'
  | 'DEPOSIT_BALANCES_BY_LP_ID_SS58_VARIANCE_SAMPLE_CHAIN_DESC'
  | 'DEPOSIT_BALANCES_BY_LP_ID_SS58_VARIANCE_SAMPLE_LP_ID_SS58_ASC'
  | 'DEPOSIT_BALANCES_BY_LP_ID_SS58_VARIANCE_SAMPLE_LP_ID_SS58_DESC'
  | 'ID_SS58_ASC'
  | 'ID_SS58_DESC'
  | 'NATURAL'
  | 'PRIMARY_KEY_ASC'
  | 'PRIMARY_KEY_DESC';

/** A connection to a list of `Metadatum` values. */
export type MetadataConnection = {
  __typename?: 'MetadataConnection';
  /** A list of edges which contains the `Metadatum` and cursor to aid in pagination. */
  edges: Array<MetadataEdge>;
  /** A list of `Metadatum` objects. */
  nodes: Array<Metadatum>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
  /** The count of *all* `Metadatum` you could get from the connection. */
  totalCount: Scalars['Int']['output'];
};

/** A `Metadatum` edge in the connection. */
export type MetadataEdge = {
  __typename?: 'MetadataEdge';
  /** A cursor for use in pagination. */
  cursor?: Maybe<Scalars['Cursor']['output']>;
  /** The `Metadatum` at the end of the edge. */
  node: Metadatum;
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

export type Migration = Node & {
  __typename?: 'Migration';
  executedAt?: Maybe<Scalars['Datetime']['output']>;
  hash: Scalars['String']['output'];
  id: Scalars['Int']['output'];
  name: Scalars['String']['output'];
  /** A globally unique identifier. Can be used in various places throughout the system to identify this single value. */
  nodeId: Scalars['ID']['output'];
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

/** A connection to a list of `Migration` values. */
export type MigrationsConnection = {
  __typename?: 'MigrationsConnection';
  /** A list of edges which contains the `Migration` and cursor to aid in pagination. */
  edges: Array<MigrationsEdge>;
  /** A list of `Migration` objects. */
  nodes: Array<Migration>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
  /** The count of *all* `Migration` you could get from the connection. */
  totalCount: Scalars['Int']['output'];
};

/** A `Migration` edge in the connection. */
export type MigrationsEdge = {
  __typename?: 'MigrationsEdge';
  /** A cursor for use in pagination. */
  cursor?: Maybe<Scalars['Cursor']['output']>;
  /** The `Migration` at the end of the edge. */
  node: Migration;
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

export type PendingDeposit = {
  __typename?: 'PendingDeposit';
  amount: Scalars['String']['output'];
  confirmations: Scalars['Int']['output'];
};

export type PendingDepositsInput = {
  address: Scalars['String']['input'];
  asset: Scalars['String']['input'];
  chain: Scalars['String']['input'];
};

export type Pool = Node & {
  __typename?: 'Pool';
  baseAsset: ChainflipAsset;
  baseLiquidityAmount: Scalars['BigFloat']['output'];
  id: Scalars['Int']['output'];
  liquidityFeeHundredthPips: Scalars['Int']['output'];
  /** A globally unique identifier. Can be used in various places throughout the system to identify this single value. */
  nodeId: Scalars['ID']['output'];
  price: Scalars['Float']['output'];
  quoteAsset: ChainflipAsset;
  quoteLiquidityAmount: Scalars['BigFloat']['output'];
  rangeOrderPrice: Scalars['Float']['output'];
};

export type PoolAggregates = {
  __typename?: 'PoolAggregates';
  /** Mean average aggregates across the matching connection (ignoring before/after/first/last/offset) */
  average?: Maybe<PoolAverageAggregates>;
  /** Distinct count aggregates across the matching connection (ignoring before/after/first/last/offset) */
  distinctCount?: Maybe<PoolDistinctCountAggregates>;
  keys?: Maybe<Array<Scalars['String']['output']>>;
  /** Maximum aggregates across the matching connection (ignoring before/after/first/last/offset) */
  max?: Maybe<PoolMaxAggregates>;
  /** Minimum aggregates across the matching connection (ignoring before/after/first/last/offset) */
  min?: Maybe<PoolMinAggregates>;
  /** Population standard deviation aggregates across the matching connection (ignoring before/after/first/last/offset) */
  stddevPopulation?: Maybe<PoolStddevPopulationAggregates>;
  /** Sample standard deviation aggregates across the matching connection (ignoring before/after/first/last/offset) */
  stddevSample?: Maybe<PoolStddevSampleAggregates>;
  /** Sum aggregates across the matching connection (ignoring before/after/first/last/offset) */
  sum?: Maybe<PoolSumAggregates>;
  /** Population variance aggregates across the matching connection (ignoring before/after/first/last/offset) */
  variancePopulation?: Maybe<PoolVariancePopulationAggregates>;
  /** Sample variance aggregates across the matching connection (ignoring before/after/first/last/offset) */
  varianceSample?: Maybe<PoolVarianceSampleAggregates>;
};

export type PoolAverageAggregates = {
  __typename?: 'PoolAverageAggregates';
  /** Mean average of baseLiquidityAmount across the matching connection */
  baseLiquidityAmount?: Maybe<Scalars['BigFloat']['output']>;
  /** Mean average of id across the matching connection */
  id?: Maybe<Scalars['BigFloat']['output']>;
  /** Mean average of liquidityFeeHundredthPips across the matching connection */
  liquidityFeeHundredthPips?: Maybe<Scalars['BigFloat']['output']>;
  /** Mean average of price across the matching connection */
  price?: Maybe<Scalars['Float']['output']>;
  /** Mean average of quoteLiquidityAmount across the matching connection */
  quoteLiquidityAmount?: Maybe<Scalars['BigFloat']['output']>;
  /** Mean average of rangeOrderPrice across the matching connection */
  rangeOrderPrice?: Maybe<Scalars['Float']['output']>;
};

/** A condition to be used against `Pool` object types. All fields are tested for equality and combined with a logical ‘and.’ */
export type PoolCondition = {
  /** Checks for equality with the object’s `baseAsset` field. */
  baseAsset?: InputMaybe<ChainflipAsset>;
  /** Checks for equality with the object’s `baseLiquidityAmount` field. */
  baseLiquidityAmount?: InputMaybe<Scalars['BigFloat']['input']>;
  /** Checks for equality with the object’s `id` field. */
  id?: InputMaybe<Scalars['Int']['input']>;
  /** Checks for equality with the object’s `liquidityFeeHundredthPips` field. */
  liquidityFeeHundredthPips?: InputMaybe<Scalars['Int']['input']>;
  /** Checks for equality with the object’s `price` field. */
  price?: InputMaybe<Scalars['Float']['input']>;
  /** Checks for equality with the object’s `quoteAsset` field. */
  quoteAsset?: InputMaybe<ChainflipAsset>;
  /** Checks for equality with the object’s `quoteLiquidityAmount` field. */
  quoteLiquidityAmount?: InputMaybe<Scalars['BigFloat']['input']>;
  /** Checks for equality with the object’s `rangeOrderPrice` field. */
  rangeOrderPrice?: InputMaybe<Scalars['Float']['input']>;
};

export type PoolDistinctCountAggregates = {
  __typename?: 'PoolDistinctCountAggregates';
  /** Distinct count of baseAsset across the matching connection */
  baseAsset?: Maybe<Scalars['BigInt']['output']>;
  /** Distinct count of baseLiquidityAmount across the matching connection */
  baseLiquidityAmount?: Maybe<Scalars['BigInt']['output']>;
  /** Distinct count of id across the matching connection */
  id?: Maybe<Scalars['BigInt']['output']>;
  /** Distinct count of liquidityFeeHundredthPips across the matching connection */
  liquidityFeeHundredthPips?: Maybe<Scalars['BigInt']['output']>;
  /** Distinct count of price across the matching connection */
  price?: Maybe<Scalars['BigInt']['output']>;
  /** Distinct count of quoteAsset across the matching connection */
  quoteAsset?: Maybe<Scalars['BigInt']['output']>;
  /** Distinct count of quoteLiquidityAmount across the matching connection */
  quoteLiquidityAmount?: Maybe<Scalars['BigInt']['output']>;
  /** Distinct count of rangeOrderPrice across the matching connection */
  rangeOrderPrice?: Maybe<Scalars['BigInt']['output']>;
};

/** A filter to be used against `Pool` object types. All fields are combined with a logical ‘and.’ */
export type PoolFilter = {
  /** Checks for all expressions in this list. */
  and?: InputMaybe<Array<PoolFilter>>;
  /** Filter by the object’s `baseAsset` field. */
  baseAsset?: InputMaybe<ChainflipAssetFilter>;
  /** Filter by the object’s `baseLiquidityAmount` field. */
  baseLiquidityAmount?: InputMaybe<BigFloatFilter>;
  /** Filter by the object’s `id` field. */
  id?: InputMaybe<IntFilter>;
  /** Filter by the object’s `liquidityFeeHundredthPips` field. */
  liquidityFeeHundredthPips?: InputMaybe<IntFilter>;
  /** Negates the expression. */
  not?: InputMaybe<PoolFilter>;
  /** Checks for any expressions in this list. */
  or?: InputMaybe<Array<PoolFilter>>;
  /** Filter by the object’s `price` field. */
  price?: InputMaybe<FloatFilter>;
  /** Filter by the object’s `quoteAsset` field. */
  quoteAsset?: InputMaybe<ChainflipAssetFilter>;
  /** Filter by the object’s `quoteLiquidityAmount` field. */
  quoteLiquidityAmount?: InputMaybe<BigFloatFilter>;
  /** Filter by the object’s `rangeOrderPrice` field. */
  rangeOrderPrice?: InputMaybe<FloatFilter>;
};

/** Grouping methods for `Pool` for usage during aggregation. */
export type PoolGroupBy =
  | 'BASE_ASSET'
  | 'BASE_LIQUIDITY_AMOUNT'
  | 'LIQUIDITY_FEE_HUNDREDTH_PIPS'
  | 'PRICE'
  | 'QUOTE_ASSET'
  | 'QUOTE_LIQUIDITY_AMOUNT'
  | 'RANGE_ORDER_PRICE';

export type PoolHavingAverageInput = {
  baseLiquidityAmount?: InputMaybe<HavingBigfloatFilter>;
  id?: InputMaybe<HavingIntFilter>;
  liquidityFeeHundredthPips?: InputMaybe<HavingIntFilter>;
  price?: InputMaybe<HavingFloatFilter>;
  quoteLiquidityAmount?: InputMaybe<HavingBigfloatFilter>;
  rangeOrderPrice?: InputMaybe<HavingFloatFilter>;
};

export type PoolHavingDistinctCountInput = {
  baseLiquidityAmount?: InputMaybe<HavingBigfloatFilter>;
  id?: InputMaybe<HavingIntFilter>;
  liquidityFeeHundredthPips?: InputMaybe<HavingIntFilter>;
  price?: InputMaybe<HavingFloatFilter>;
  quoteLiquidityAmount?: InputMaybe<HavingBigfloatFilter>;
  rangeOrderPrice?: InputMaybe<HavingFloatFilter>;
};

/** Conditions for `Pool` aggregates. */
export type PoolHavingInput = {
  AND?: InputMaybe<Array<PoolHavingInput>>;
  OR?: InputMaybe<Array<PoolHavingInput>>;
  average?: InputMaybe<PoolHavingAverageInput>;
  distinctCount?: InputMaybe<PoolHavingDistinctCountInput>;
  max?: InputMaybe<PoolHavingMaxInput>;
  min?: InputMaybe<PoolHavingMinInput>;
  stddevPopulation?: InputMaybe<PoolHavingStddevPopulationInput>;
  stddevSample?: InputMaybe<PoolHavingStddevSampleInput>;
  sum?: InputMaybe<PoolHavingSumInput>;
  variancePopulation?: InputMaybe<PoolHavingVariancePopulationInput>;
  varianceSample?: InputMaybe<PoolHavingVarianceSampleInput>;
};

export type PoolHavingMaxInput = {
  baseLiquidityAmount?: InputMaybe<HavingBigfloatFilter>;
  id?: InputMaybe<HavingIntFilter>;
  liquidityFeeHundredthPips?: InputMaybe<HavingIntFilter>;
  price?: InputMaybe<HavingFloatFilter>;
  quoteLiquidityAmount?: InputMaybe<HavingBigfloatFilter>;
  rangeOrderPrice?: InputMaybe<HavingFloatFilter>;
};

export type PoolHavingMinInput = {
  baseLiquidityAmount?: InputMaybe<HavingBigfloatFilter>;
  id?: InputMaybe<HavingIntFilter>;
  liquidityFeeHundredthPips?: InputMaybe<HavingIntFilter>;
  price?: InputMaybe<HavingFloatFilter>;
  quoteLiquidityAmount?: InputMaybe<HavingBigfloatFilter>;
  rangeOrderPrice?: InputMaybe<HavingFloatFilter>;
};

export type PoolHavingStddevPopulationInput = {
  baseLiquidityAmount?: InputMaybe<HavingBigfloatFilter>;
  id?: InputMaybe<HavingIntFilter>;
  liquidityFeeHundredthPips?: InputMaybe<HavingIntFilter>;
  price?: InputMaybe<HavingFloatFilter>;
  quoteLiquidityAmount?: InputMaybe<HavingBigfloatFilter>;
  rangeOrderPrice?: InputMaybe<HavingFloatFilter>;
};

export type PoolHavingStddevSampleInput = {
  baseLiquidityAmount?: InputMaybe<HavingBigfloatFilter>;
  id?: InputMaybe<HavingIntFilter>;
  liquidityFeeHundredthPips?: InputMaybe<HavingIntFilter>;
  price?: InputMaybe<HavingFloatFilter>;
  quoteLiquidityAmount?: InputMaybe<HavingBigfloatFilter>;
  rangeOrderPrice?: InputMaybe<HavingFloatFilter>;
};

export type PoolHavingSumInput = {
  baseLiquidityAmount?: InputMaybe<HavingBigfloatFilter>;
  id?: InputMaybe<HavingIntFilter>;
  liquidityFeeHundredthPips?: InputMaybe<HavingIntFilter>;
  price?: InputMaybe<HavingFloatFilter>;
  quoteLiquidityAmount?: InputMaybe<HavingBigfloatFilter>;
  rangeOrderPrice?: InputMaybe<HavingFloatFilter>;
};

export type PoolHavingVariancePopulationInput = {
  baseLiquidityAmount?: InputMaybe<HavingBigfloatFilter>;
  id?: InputMaybe<HavingIntFilter>;
  liquidityFeeHundredthPips?: InputMaybe<HavingIntFilter>;
  price?: InputMaybe<HavingFloatFilter>;
  quoteLiquidityAmount?: InputMaybe<HavingBigfloatFilter>;
  rangeOrderPrice?: InputMaybe<HavingFloatFilter>;
};

export type PoolHavingVarianceSampleInput = {
  baseLiquidityAmount?: InputMaybe<HavingBigfloatFilter>;
  id?: InputMaybe<HavingIntFilter>;
  liquidityFeeHundredthPips?: InputMaybe<HavingIntFilter>;
  price?: InputMaybe<HavingFloatFilter>;
  quoteLiquidityAmount?: InputMaybe<HavingBigfloatFilter>;
  rangeOrderPrice?: InputMaybe<HavingFloatFilter>;
};

export type PoolMaxAggregates = {
  __typename?: 'PoolMaxAggregates';
  /** Maximum of baseLiquidityAmount across the matching connection */
  baseLiquidityAmount?: Maybe<Scalars['BigFloat']['output']>;
  /** Maximum of id across the matching connection */
  id?: Maybe<Scalars['Int']['output']>;
  /** Maximum of liquidityFeeHundredthPips across the matching connection */
  liquidityFeeHundredthPips?: Maybe<Scalars['Int']['output']>;
  /** Maximum of price across the matching connection */
  price?: Maybe<Scalars['Float']['output']>;
  /** Maximum of quoteLiquidityAmount across the matching connection */
  quoteLiquidityAmount?: Maybe<Scalars['BigFloat']['output']>;
  /** Maximum of rangeOrderPrice across the matching connection */
  rangeOrderPrice?: Maybe<Scalars['Float']['output']>;
};

export type PoolMinAggregates = {
  __typename?: 'PoolMinAggregates';
  /** Minimum of baseLiquidityAmount across the matching connection */
  baseLiquidityAmount?: Maybe<Scalars['BigFloat']['output']>;
  /** Minimum of id across the matching connection */
  id?: Maybe<Scalars['Int']['output']>;
  /** Minimum of liquidityFeeHundredthPips across the matching connection */
  liquidityFeeHundredthPips?: Maybe<Scalars['Int']['output']>;
  /** Minimum of price across the matching connection */
  price?: Maybe<Scalars['Float']['output']>;
  /** Minimum of quoteLiquidityAmount across the matching connection */
  quoteLiquidityAmount?: Maybe<Scalars['BigFloat']['output']>;
  /** Minimum of rangeOrderPrice across the matching connection */
  rangeOrderPrice?: Maybe<Scalars['Float']['output']>;
};

export type PoolStddevPopulationAggregates = {
  __typename?: 'PoolStddevPopulationAggregates';
  /** Population standard deviation of baseLiquidityAmount across the matching connection */
  baseLiquidityAmount?: Maybe<Scalars['BigFloat']['output']>;
  /** Population standard deviation of id across the matching connection */
  id?: Maybe<Scalars['BigFloat']['output']>;
  /** Population standard deviation of liquidityFeeHundredthPips across the matching connection */
  liquidityFeeHundredthPips?: Maybe<Scalars['BigFloat']['output']>;
  /** Population standard deviation of price across the matching connection */
  price?: Maybe<Scalars['Float']['output']>;
  /** Population standard deviation of quoteLiquidityAmount across the matching connection */
  quoteLiquidityAmount?: Maybe<Scalars['BigFloat']['output']>;
  /** Population standard deviation of rangeOrderPrice across the matching connection */
  rangeOrderPrice?: Maybe<Scalars['Float']['output']>;
};

export type PoolStddevSampleAggregates = {
  __typename?: 'PoolStddevSampleAggregates';
  /** Sample standard deviation of baseLiquidityAmount across the matching connection */
  baseLiquidityAmount?: Maybe<Scalars['BigFloat']['output']>;
  /** Sample standard deviation of id across the matching connection */
  id?: Maybe<Scalars['BigFloat']['output']>;
  /** Sample standard deviation of liquidityFeeHundredthPips across the matching connection */
  liquidityFeeHundredthPips?: Maybe<Scalars['BigFloat']['output']>;
  /** Sample standard deviation of price across the matching connection */
  price?: Maybe<Scalars['Float']['output']>;
  /** Sample standard deviation of quoteLiquidityAmount across the matching connection */
  quoteLiquidityAmount?: Maybe<Scalars['BigFloat']['output']>;
  /** Sample standard deviation of rangeOrderPrice across the matching connection */
  rangeOrderPrice?: Maybe<Scalars['Float']['output']>;
};

export type PoolSumAggregates = {
  __typename?: 'PoolSumAggregates';
  /** Sum of baseLiquidityAmount across the matching connection */
  baseLiquidityAmount: Scalars['BigFloat']['output'];
  /** Sum of id across the matching connection */
  id: Scalars['BigInt']['output'];
  /** Sum of liquidityFeeHundredthPips across the matching connection */
  liquidityFeeHundredthPips: Scalars['BigInt']['output'];
  /** Sum of price across the matching connection */
  price: Scalars['Float']['output'];
  /** Sum of quoteLiquidityAmount across the matching connection */
  quoteLiquidityAmount: Scalars['BigFloat']['output'];
  /** Sum of rangeOrderPrice across the matching connection */
  rangeOrderPrice: Scalars['Float']['output'];
};

export type PoolVariancePopulationAggregates = {
  __typename?: 'PoolVariancePopulationAggregates';
  /** Population variance of baseLiquidityAmount across the matching connection */
  baseLiquidityAmount?: Maybe<Scalars['BigFloat']['output']>;
  /** Population variance of id across the matching connection */
  id?: Maybe<Scalars['BigFloat']['output']>;
  /** Population variance of liquidityFeeHundredthPips across the matching connection */
  liquidityFeeHundredthPips?: Maybe<Scalars['BigFloat']['output']>;
  /** Population variance of price across the matching connection */
  price?: Maybe<Scalars['Float']['output']>;
  /** Population variance of quoteLiquidityAmount across the matching connection */
  quoteLiquidityAmount?: Maybe<Scalars['BigFloat']['output']>;
  /** Population variance of rangeOrderPrice across the matching connection */
  rangeOrderPrice?: Maybe<Scalars['Float']['output']>;
};

export type PoolVarianceSampleAggregates = {
  __typename?: 'PoolVarianceSampleAggregates';
  /** Sample variance of baseLiquidityAmount across the matching connection */
  baseLiquidityAmount?: Maybe<Scalars['BigFloat']['output']>;
  /** Sample variance of id across the matching connection */
  id?: Maybe<Scalars['BigFloat']['output']>;
  /** Sample variance of liquidityFeeHundredthPips across the matching connection */
  liquidityFeeHundredthPips?: Maybe<Scalars['BigFloat']['output']>;
  /** Sample variance of price across the matching connection */
  price?: Maybe<Scalars['Float']['output']>;
  /** Sample variance of quoteLiquidityAmount across the matching connection */
  quoteLiquidityAmount?: Maybe<Scalars['BigFloat']['output']>;
  /** Sample variance of rangeOrderPrice across the matching connection */
  rangeOrderPrice?: Maybe<Scalars['Float']['output']>;
};

/** A connection to a list of `Pool` values. */
export type PoolsConnection = {
  __typename?: 'PoolsConnection';
  /** Aggregates across the matching connection (ignoring before/after/first/last/offset) */
  aggregates?: Maybe<PoolAggregates>;
  /** A list of edges which contains the `Pool` and cursor to aid in pagination. */
  edges: Array<PoolsEdge>;
  /** Grouped aggregates across the matching connection (ignoring before/after/first/last/offset) */
  groupedAggregates?: Maybe<Array<PoolAggregates>>;
  /** A list of `Pool` objects. */
  nodes: Array<Pool>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
  /** The count of *all* `Pool` you could get from the connection. */
  totalCount: Scalars['Int']['output'];
};


/** A connection to a list of `Pool` values. */
export type PoolsConnectionGroupedAggregatesArgs = {
  groupBy: Array<PoolGroupBy>;
  having?: InputMaybe<PoolHavingInput>;
};

/** A `Pool` edge in the connection. */
export type PoolsEdge = {
  __typename?: 'PoolsEdge';
  /** A cursor for use in pagination. */
  cursor?: Maybe<Scalars['Cursor']['output']>;
  /** The `Pool` at the end of the edge. */
  node: Pool;
};

/** Methods to use when ordering `Pool`. */
export type PoolsOrderBy =
  | 'BASE_ASSET_ASC'
  | 'BASE_ASSET_DESC'
  | 'BASE_LIQUIDITY_AMOUNT_ASC'
  | 'BASE_LIQUIDITY_AMOUNT_DESC'
  | 'ID_ASC'
  | 'ID_DESC'
  | 'LIQUIDITY_FEE_HUNDREDTH_PIPS_ASC'
  | 'LIQUIDITY_FEE_HUNDREDTH_PIPS_DESC'
  | 'NATURAL'
  | 'PRICE_ASC'
  | 'PRICE_DESC'
  | 'PRIMARY_KEY_ASC'
  | 'PRIMARY_KEY_DESC'
  | 'QUOTE_ASSET_ASC'
  | 'QUOTE_ASSET_DESC'
  | 'QUOTE_LIQUIDITY_AMOUNT_ASC'
  | 'QUOTE_LIQUIDITY_AMOUNT_DESC'
  | 'RANGE_ORDER_PRICE_ASC'
  | 'RANGE_ORDER_PRICE_DESC';

export type PriceQueryInput = {
  address: Scalars['String']['input'];
  chainId: Scalars['String']['input'];
  date?: InputMaybe<Scalars['Datetime']['input']>;
};

/** The root query type which gives access points into the data universe. */
export type Query = Node & {
  __typename?: 'Query';
  /** Reads a single `_PrismaMigration` using its globally unique `ID`. */
  _prismaMigration?: Maybe<_PrismaMigration>;
  _prismaMigrationById?: Maybe<_PrismaMigration>;
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
  /** Reads and enables pagination through a set of `Auction`. */
  allAuctions?: Maybe<AuctionsConnection>;
  /** Reads and enables pagination through a set of `Banner`. */
  allBanners?: Maybe<BannersConnection>;
  /** Reads and enables pagination through a set of `Block`. */
  allBlocks?: Maybe<BlocksConnection>;
  /** Reads and enables pagination through a set of `Call`. */
  allCalls?: Maybe<CallsConnection>;
  /** Reads and enables pagination through a set of `Circulation`. */
  allCirculations?: Maybe<CirculationsConnection>;
  /** Reads and enables pagination through a set of `ContractsContractEmitted`. */
  allContractsContractEmitteds?: Maybe<ContractsContractEmittedsConnection>;
  /** Reads and enables pagination through a set of `DepositBalance`. */
  allDepositBalances?: Maybe<DepositBalancesConnection>;
  /** Reads and enables pagination through a set of `EnvironmentAddress`. */
  allEnvironmentAddresses?: Maybe<EnvironmentAddressesConnection>;
  /** Reads and enables pagination through a set of `Event`. */
  allEvents?: Maybe<EventsConnection>;
  /** Reads and enables pagination through a set of `ExecutedRedemption`. */
  allExecutedRedemptions?: Maybe<ExecutedRedemptionsConnection>;
  /** Reads and enables pagination through a set of `Extrinsic`. */
  allExtrinsics?: Maybe<ExtrinsicsConnection>;
  /** Reads and enables pagination through a set of `FlipSupply`. */
  allFlipSupplies?: Maybe<FlipSuppliesConnection>;
  /** Reads and enables pagination through a set of `FrontierEthereumTransaction`. */
  allFrontierEthereumTransactions?: Maybe<FrontierEthereumTransactionsConnection>;
  /** Reads and enables pagination through a set of `FrontierEvmLog`. */
  allFrontierEvmLogs?: Maybe<FrontierEvmLogsConnection>;
  /** Reads and enables pagination through a set of `FundingEvent`. */
  allFundingEvents?: Maybe<FundingEventsConnection>;
  /** Reads and enables pagination through a set of `GearMessageEnqueued`. */
  allGearMessageEnqueueds?: Maybe<GearMessageEnqueuedsConnection>;
  /** Reads and enables pagination through a set of `GearUserMessageSent`. */
  allGearUserMessageSents?: Maybe<GearUserMessageSentsConnection>;
  /** Reads and enables pagination through a set of `LpAccount`. */
  allLpAccounts?: Maybe<LpAccountsConnection>;
  /** Reads and enables pagination through a set of `Metadatum`. */
  allMetadata?: Maybe<MetadataConnection>;
  /** Reads and enables pagination through a set of `Migration`. */
  allMigrations?: Maybe<MigrationsConnection>;
  /** Reads and enables pagination through a set of `Pool`. */
  allPools?: Maybe<PoolsConnection>;
  /** Reads and enables pagination through a set of `_PrismaMigration`. */
  allPrismaMigrations?: Maybe<_PrismaMigrationsConnection>;
  /** Reads and enables pagination through a set of `RegisteredRedemption`. */
  allRegisteredRedemptions?: Maybe<RegisteredRedemptionsConnection>;
  /** Reads and enables pagination through a set of `TokenPrice`. */
  allTokenPrices?: Maybe<TokenPricesConnection>;
  /** Reads and enables pagination through a set of `Validator`. */
  allValidators?: Maybe<ValidatorsConnection>;
  /** Reads and enables pagination through a set of `Warning`. */
  allWarnings?: Maybe<WarningsConnection>;
  /** Reads a single `Auction` using its globally unique `ID`. */
  auction?: Maybe<Auction>;
  auctionById?: Maybe<Auction>;
  /** Reads a single `Banner` using its globally unique `ID`. */
  banner?: Maybe<Banner>;
  bannerByApp?: Maybe<Banner>;
  /** Reads a single `Block` using its globally unique `ID`. */
  block?: Maybe<Block>;
  blockById?: Maybe<Block>;
  /** Reads a single `Call` using its globally unique `ID`. */
  call?: Maybe<Call>;
  callById?: Maybe<Call>;
  /** Reads a single `Circulation` using its globally unique `ID`. */
  circulation?: Maybe<Circulation>;
  circulationById?: Maybe<Circulation>;
  /** Reads a single `ContractsContractEmitted` using its globally unique `ID`. */
  contractsContractEmitted?: Maybe<ContractsContractEmitted>;
  contractsContractEmittedByEventId?: Maybe<ContractsContractEmitted>;
  /** Reads a single `EnvironmentAddress` using its globally unique `ID`. */
  environmentAddress?: Maybe<EnvironmentAddress>;
  environmentAddressById?: Maybe<EnvironmentAddress>;
  /** Reads a single `Event` using its globally unique `ID`. */
  event?: Maybe<Event>;
  eventById?: Maybe<Event>;
  /** Reads a single `ExecutedRedemption` using its globally unique `ID`. */
  executedRedemption?: Maybe<ExecutedRedemption>;
  executedRedemptionByTxHashAndLogIndex?: Maybe<ExecutedRedemption>;
  /** Reads a single `Extrinsic` using its globally unique `ID`. */
  extrinsic?: Maybe<Extrinsic>;
  extrinsicById?: Maybe<Extrinsic>;
  /** Reads a single `FlipSupply` using its globally unique `ID`. */
  flipSupply?: Maybe<FlipSupply>;
  flipSupplyById?: Maybe<FlipSupply>;
  /** Reads a single `FrontierEthereumTransaction` using its globally unique `ID`. */
  frontierEthereumTransaction?: Maybe<FrontierEthereumTransaction>;
  frontierEthereumTransactionByCallId?: Maybe<FrontierEthereumTransaction>;
  /** Reads a single `FrontierEvmLog` using its globally unique `ID`. */
  frontierEvmLog?: Maybe<FrontierEvmLog>;
  frontierEvmLogByEventId?: Maybe<FrontierEvmLog>;
  /** Reads a single `FundingEvent` using its globally unique `ID`. */
  fundingEvent?: Maybe<FundingEvent>;
  fundingEventByTxHashAndLogIndex?: Maybe<FundingEvent>;
  /** Reads a single `GearMessageEnqueued` using its globally unique `ID`. */
  gearMessageEnqueued?: Maybe<GearMessageEnqueued>;
  gearMessageEnqueuedByEventId?: Maybe<GearMessageEnqueued>;
  /** Reads a single `GearUserMessageSent` using its globally unique `ID`. */
  gearUserMessageSent?: Maybe<GearUserMessageSent>;
  gearUserMessageSentByEventId?: Maybe<GearUserMessageSent>;
  getTokenPrices: Array<TokenPrice>;
  /** Reads a single `LpAccount` using its globally unique `ID`. */
  lpAccount?: Maybe<LpAccount>;
  lpAccountByIdSs58?: Maybe<LpAccount>;
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
  pendingDeposits: Array<Maybe<PendingDeposit>>;
  /** Reads a single `Pool` using its globally unique `ID`. */
  pool?: Maybe<Pool>;
  poolById?: Maybe<Pool>;
  /**
   * Exposes the root query type nested one level down. This is helpful for Relay 1
   * which can only query top level fields if they are in a particular form.
   */
  query: Query;
  /** Reads a single `RegisteredRedemption` using its globally unique `ID`. */
  registeredRedemption?: Maybe<RegisteredRedemption>;
  registeredRedemptionByTxHashAndLogIndex?: Maybe<RegisteredRedemption>;
  /** Reads a single `TokenPrice` using its globally unique `ID`. */
  tokenPrice?: Maybe<TokenPrice>;
  tokenPriceByChainIdAndAddress?: Maybe<TokenPrice>;
  /** Reads a single `Validator` using its globally unique `ID`. */
  validator?: Maybe<Validator>;
  validatorByIdHex?: Maybe<Validator>;
  validatorsByWalletAddress: Array<Validator>;
};


/** The root query type which gives access points into the data universe. */
export type Query_PrismaMigrationArgs = {
  nodeId: Scalars['ID']['input'];
};


/** The root query type which gives access points into the data universe. */
export type Query_PrismaMigrationByIdArgs = {
  id: Scalars['String']['input'];
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
export type QueryAllAuctionsArgs = {
  after?: InputMaybe<Scalars['Cursor']['input']>;
  before?: InputMaybe<Scalars['Cursor']['input']>;
  condition?: InputMaybe<AuctionCondition>;
  filter?: InputMaybe<AuctionFilter>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<AuctionsOrderBy>>;
};


/** The root query type which gives access points into the data universe. */
export type QueryAllBannersArgs = {
  after?: InputMaybe<Scalars['Cursor']['input']>;
  before?: InputMaybe<Scalars['Cursor']['input']>;
  condition?: InputMaybe<BannerCondition>;
  filter?: InputMaybe<BannerFilter>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<BannersOrderBy>>;
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
export type QueryAllCirculationsArgs = {
  after?: InputMaybe<Scalars['Cursor']['input']>;
  before?: InputMaybe<Scalars['Cursor']['input']>;
  condition?: InputMaybe<CirculationCondition>;
  filter?: InputMaybe<CirculationFilter>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<CirculationsOrderBy>>;
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
export type QueryAllDepositBalancesArgs = {
  after?: InputMaybe<Scalars['Cursor']['input']>;
  before?: InputMaybe<Scalars['Cursor']['input']>;
  condition?: InputMaybe<DepositBalanceCondition>;
  filter?: InputMaybe<DepositBalanceFilter>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<DepositBalancesOrderBy>>;
};


/** The root query type which gives access points into the data universe. */
export type QueryAllEnvironmentAddressesArgs = {
  after?: InputMaybe<Scalars['Cursor']['input']>;
  before?: InputMaybe<Scalars['Cursor']['input']>;
  condition?: InputMaybe<EnvironmentAddressCondition>;
  filter?: InputMaybe<EnvironmentAddressFilter>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<EnvironmentAddressesOrderBy>>;
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
export type QueryAllExecutedRedemptionsArgs = {
  after?: InputMaybe<Scalars['Cursor']['input']>;
  before?: InputMaybe<Scalars['Cursor']['input']>;
  condition?: InputMaybe<ExecutedRedemptionCondition>;
  filter?: InputMaybe<ExecutedRedemptionFilter>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<ExecutedRedemptionsOrderBy>>;
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
export type QueryAllFlipSuppliesArgs = {
  after?: InputMaybe<Scalars['Cursor']['input']>;
  before?: InputMaybe<Scalars['Cursor']['input']>;
  condition?: InputMaybe<FlipSupplyCondition>;
  filter?: InputMaybe<FlipSupplyFilter>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<FlipSuppliesOrderBy>>;
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
export type QueryAllFundingEventsArgs = {
  after?: InputMaybe<Scalars['Cursor']['input']>;
  before?: InputMaybe<Scalars['Cursor']['input']>;
  condition?: InputMaybe<FundingEventCondition>;
  filter?: InputMaybe<FundingEventFilter>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<FundingEventsOrderBy>>;
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
export type QueryAllLpAccountsArgs = {
  after?: InputMaybe<Scalars['Cursor']['input']>;
  before?: InputMaybe<Scalars['Cursor']['input']>;
  condition?: InputMaybe<LpAccountCondition>;
  filter?: InputMaybe<LpAccountFilter>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<LpAccountsOrderBy>>;
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
export type QueryAllPoolsArgs = {
  after?: InputMaybe<Scalars['Cursor']['input']>;
  before?: InputMaybe<Scalars['Cursor']['input']>;
  condition?: InputMaybe<PoolCondition>;
  filter?: InputMaybe<PoolFilter>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<PoolsOrderBy>>;
};


/** The root query type which gives access points into the data universe. */
export type QueryAllPrismaMigrationsArgs = {
  after?: InputMaybe<Scalars['Cursor']['input']>;
  before?: InputMaybe<Scalars['Cursor']['input']>;
  condition?: InputMaybe<_PrismaMigrationCondition>;
  filter?: InputMaybe<_PrismaMigrationFilter>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<_PrismaMigrationsOrderBy>>;
};


/** The root query type which gives access points into the data universe. */
export type QueryAllRegisteredRedemptionsArgs = {
  after?: InputMaybe<Scalars['Cursor']['input']>;
  before?: InputMaybe<Scalars['Cursor']['input']>;
  condition?: InputMaybe<RegisteredRedemptionCondition>;
  filter?: InputMaybe<RegisteredRedemptionFilter>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<RegisteredRedemptionsOrderBy>>;
};


/** The root query type which gives access points into the data universe. */
export type QueryAllTokenPricesArgs = {
  after?: InputMaybe<Scalars['Cursor']['input']>;
  before?: InputMaybe<Scalars['Cursor']['input']>;
  condition?: InputMaybe<TokenPriceCondition>;
  filter?: InputMaybe<TokenPriceFilter>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<TokenPricesOrderBy>>;
};


/** The root query type which gives access points into the data universe. */
export type QueryAllValidatorsArgs = {
  after?: InputMaybe<Scalars['Cursor']['input']>;
  before?: InputMaybe<Scalars['Cursor']['input']>;
  condition?: InputMaybe<ValidatorCondition>;
  filter?: InputMaybe<ValidatorFilter>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<ValidatorsOrderBy>>;
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
export type QueryAuctionArgs = {
  nodeId: Scalars['ID']['input'];
};


/** The root query type which gives access points into the data universe. */
export type QueryAuctionByIdArgs = {
  id: Scalars['Int']['input'];
};


/** The root query type which gives access points into the data universe. */
export type QueryBannerArgs = {
  nodeId: Scalars['ID']['input'];
};


/** The root query type which gives access points into the data universe. */
export type QueryBannerByAppArgs = {
  app: App;
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
export type QueryCirculationArgs = {
  nodeId: Scalars['ID']['input'];
};


/** The root query type which gives access points into the data universe. */
export type QueryCirculationByIdArgs = {
  id: Scalars['Int']['input'];
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
export type QueryEnvironmentAddressArgs = {
  nodeId: Scalars['ID']['input'];
};


/** The root query type which gives access points into the data universe. */
export type QueryEnvironmentAddressByIdArgs = {
  id: Scalars['Int']['input'];
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
export type QueryExecutedRedemptionArgs = {
  nodeId: Scalars['ID']['input'];
};


/** The root query type which gives access points into the data universe. */
export type QueryExecutedRedemptionByTxHashAndLogIndexArgs = {
  logIndex: Scalars['BigInt']['input'];
  txHash: Scalars['String']['input'];
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
export type QueryFlipSupplyArgs = {
  nodeId: Scalars['ID']['input'];
};


/** The root query type which gives access points into the data universe. */
export type QueryFlipSupplyByIdArgs = {
  id: Scalars['Int']['input'];
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
export type QueryFundingEventArgs = {
  nodeId: Scalars['ID']['input'];
};


/** The root query type which gives access points into the data universe. */
export type QueryFundingEventByTxHashAndLogIndexArgs = {
  logIndex: Scalars['BigInt']['input'];
  txHash: Scalars['String']['input'];
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
export type QueryGetTokenPricesArgs = {
  input: Array<PriceQueryInput>;
};


/** The root query type which gives access points into the data universe. */
export type QueryLpAccountArgs = {
  nodeId: Scalars['ID']['input'];
};


/** The root query type which gives access points into the data universe. */
export type QueryLpAccountByIdSs58Args = {
  idSs58: Scalars['String']['input'];
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


/** The root query type which gives access points into the data universe. */
export type QueryPendingDepositsArgs = {
  input: PendingDepositsInput;
};


/** The root query type which gives access points into the data universe. */
export type QueryPoolArgs = {
  nodeId: Scalars['ID']['input'];
};


/** The root query type which gives access points into the data universe. */
export type QueryPoolByIdArgs = {
  id: Scalars['Int']['input'];
};


/** The root query type which gives access points into the data universe. */
export type QueryRegisteredRedemptionArgs = {
  nodeId: Scalars['ID']['input'];
};


/** The root query type which gives access points into the data universe. */
export type QueryRegisteredRedemptionByTxHashAndLogIndexArgs = {
  logIndex: Scalars['BigInt']['input'];
  txHash: Scalars['String']['input'];
};


/** The root query type which gives access points into the data universe. */
export type QueryTokenPriceArgs = {
  nodeId: Scalars['ID']['input'];
};


/** The root query type which gives access points into the data universe. */
export type QueryTokenPriceByChainIdAndAddressArgs = {
  address: Scalars['String']['input'];
  chainId: Scalars['String']['input'];
};


/** The root query type which gives access points into the data universe. */
export type QueryValidatorArgs = {
  nodeId: Scalars['ID']['input'];
};


/** The root query type which gives access points into the data universe. */
export type QueryValidatorByIdHexArgs = {
  idHex: Scalars['String']['input'];
};


/** The root query type which gives access points into the data universe. */
export type QueryValidatorsByWalletAddressArgs = {
  input: ValidatorsByWalletAddressInput;
};

export type RegisteredRedemption = Node & {
  __typename?: 'RegisteredRedemption';
  amount: Scalars['BigFloat']['output'];
  block: Scalars['String']['output'];
  blockTimestamp: Scalars['String']['output'];
  expiryTime: Scalars['String']['output'];
  logIndex: Scalars['BigInt']['output'];
  /** A globally unique identifier. Can be used in various places throughout the system to identify this single value. */
  nodeId: Scalars['ID']['output'];
  redeemAddress: Scalars['String']['output'];
  startTime: Scalars['String']['output'];
  txHash: Scalars['String']['output'];
  txId: Scalars['String']['output'];
  validatorIdHex: Scalars['String']['output'];
};

export type RegisteredRedemptionAggregates = {
  __typename?: 'RegisteredRedemptionAggregates';
  /** Mean average aggregates across the matching connection (ignoring before/after/first/last/offset) */
  average?: Maybe<RegisteredRedemptionAverageAggregates>;
  /** Distinct count aggregates across the matching connection (ignoring before/after/first/last/offset) */
  distinctCount?: Maybe<RegisteredRedemptionDistinctCountAggregates>;
  keys?: Maybe<Array<Scalars['String']['output']>>;
  /** Maximum aggregates across the matching connection (ignoring before/after/first/last/offset) */
  max?: Maybe<RegisteredRedemptionMaxAggregates>;
  /** Minimum aggregates across the matching connection (ignoring before/after/first/last/offset) */
  min?: Maybe<RegisteredRedemptionMinAggregates>;
  /** Population standard deviation aggregates across the matching connection (ignoring before/after/first/last/offset) */
  stddevPopulation?: Maybe<RegisteredRedemptionStddevPopulationAggregates>;
  /** Sample standard deviation aggregates across the matching connection (ignoring before/after/first/last/offset) */
  stddevSample?: Maybe<RegisteredRedemptionStddevSampleAggregates>;
  /** Sum aggregates across the matching connection (ignoring before/after/first/last/offset) */
  sum?: Maybe<RegisteredRedemptionSumAggregates>;
  /** Population variance aggregates across the matching connection (ignoring before/after/first/last/offset) */
  variancePopulation?: Maybe<RegisteredRedemptionVariancePopulationAggregates>;
  /** Sample variance aggregates across the matching connection (ignoring before/after/first/last/offset) */
  varianceSample?: Maybe<RegisteredRedemptionVarianceSampleAggregates>;
};

export type RegisteredRedemptionAverageAggregates = {
  __typename?: 'RegisteredRedemptionAverageAggregates';
  /** Mean average of amount across the matching connection */
  amount?: Maybe<Scalars['BigFloat']['output']>;
  /** Mean average of logIndex across the matching connection */
  logIndex?: Maybe<Scalars['BigFloat']['output']>;
};

/**
 * A condition to be used against `RegisteredRedemption` object types. All fields
 * are tested for equality and combined with a logical ‘and.’
 */
export type RegisteredRedemptionCondition = {
  /** Checks for equality with the object’s `amount` field. */
  amount?: InputMaybe<Scalars['BigFloat']['input']>;
  /** Checks for equality with the object’s `block` field. */
  block?: InputMaybe<Scalars['String']['input']>;
  /** Checks for equality with the object’s `blockTimestamp` field. */
  blockTimestamp?: InputMaybe<Scalars['String']['input']>;
  /** Checks for equality with the object’s `expiryTime` field. */
  expiryTime?: InputMaybe<Scalars['String']['input']>;
  /** Checks for equality with the object’s `logIndex` field. */
  logIndex?: InputMaybe<Scalars['BigInt']['input']>;
  /** Checks for equality with the object’s `redeemAddress` field. */
  redeemAddress?: InputMaybe<Scalars['String']['input']>;
  /** Checks for equality with the object’s `startTime` field. */
  startTime?: InputMaybe<Scalars['String']['input']>;
  /** Checks for equality with the object’s `txHash` field. */
  txHash?: InputMaybe<Scalars['String']['input']>;
  /** Checks for equality with the object’s `txId` field. */
  txId?: InputMaybe<Scalars['String']['input']>;
  /** Checks for equality with the object’s `validatorIdHex` field. */
  validatorIdHex?: InputMaybe<Scalars['String']['input']>;
};

export type RegisteredRedemptionDistinctCountAggregates = {
  __typename?: 'RegisteredRedemptionDistinctCountAggregates';
  /** Distinct count of amount across the matching connection */
  amount?: Maybe<Scalars['BigInt']['output']>;
  /** Distinct count of block across the matching connection */
  block?: Maybe<Scalars['BigInt']['output']>;
  /** Distinct count of blockTimestamp across the matching connection */
  blockTimestamp?: Maybe<Scalars['BigInt']['output']>;
  /** Distinct count of expiryTime across the matching connection */
  expiryTime?: Maybe<Scalars['BigInt']['output']>;
  /** Distinct count of logIndex across the matching connection */
  logIndex?: Maybe<Scalars['BigInt']['output']>;
  /** Distinct count of redeemAddress across the matching connection */
  redeemAddress?: Maybe<Scalars['BigInt']['output']>;
  /** Distinct count of startTime across the matching connection */
  startTime?: Maybe<Scalars['BigInt']['output']>;
  /** Distinct count of txHash across the matching connection */
  txHash?: Maybe<Scalars['BigInt']['output']>;
  /** Distinct count of txId across the matching connection */
  txId?: Maybe<Scalars['BigInt']['output']>;
  /** Distinct count of validatorIdHex across the matching connection */
  validatorIdHex?: Maybe<Scalars['BigInt']['output']>;
};

/** A filter to be used against `RegisteredRedemption` object types. All fields are combined with a logical ‘and.’ */
export type RegisteredRedemptionFilter = {
  /** Filter by the object’s `amount` field. */
  amount?: InputMaybe<BigFloatFilter>;
  /** Checks for all expressions in this list. */
  and?: InputMaybe<Array<RegisteredRedemptionFilter>>;
  /** Filter by the object’s `block` field. */
  block?: InputMaybe<StringFilter>;
  /** Filter by the object’s `blockTimestamp` field. */
  blockTimestamp?: InputMaybe<StringFilter>;
  /** Filter by the object’s `expiryTime` field. */
  expiryTime?: InputMaybe<StringFilter>;
  /** Filter by the object’s `logIndex` field. */
  logIndex?: InputMaybe<BigIntFilter>;
  /** Negates the expression. */
  not?: InputMaybe<RegisteredRedemptionFilter>;
  /** Checks for any expressions in this list. */
  or?: InputMaybe<Array<RegisteredRedemptionFilter>>;
  /** Filter by the object’s `redeemAddress` field. */
  redeemAddress?: InputMaybe<StringFilter>;
  /** Filter by the object’s `startTime` field. */
  startTime?: InputMaybe<StringFilter>;
  /** Filter by the object’s `txHash` field. */
  txHash?: InputMaybe<StringFilter>;
  /** Filter by the object’s `txId` field. */
  txId?: InputMaybe<StringFilter>;
  /** Filter by the object’s `validatorIdHex` field. */
  validatorIdHex?: InputMaybe<StringFilter>;
};

/** Grouping methods for `RegisteredRedemption` for usage during aggregation. */
export type RegisteredRedemptionGroupBy =
  | 'AMOUNT'
  | 'BLOCK'
  | 'BLOCK_TIMESTAMP'
  | 'EXPIRY_TIME'
  | 'LOG_INDEX'
  | 'REDEEM_ADDRESS'
  | 'START_TIME'
  | 'TX_HASH'
  | 'TX_ID'
  | 'VALIDATOR_ID_HEX';

export type RegisteredRedemptionHavingAverageInput = {
  amount?: InputMaybe<HavingBigfloatFilter>;
  logIndex?: InputMaybe<HavingBigintFilter>;
};

export type RegisteredRedemptionHavingDistinctCountInput = {
  amount?: InputMaybe<HavingBigfloatFilter>;
  logIndex?: InputMaybe<HavingBigintFilter>;
};

/** Conditions for `RegisteredRedemption` aggregates. */
export type RegisteredRedemptionHavingInput = {
  AND?: InputMaybe<Array<RegisteredRedemptionHavingInput>>;
  OR?: InputMaybe<Array<RegisteredRedemptionHavingInput>>;
  average?: InputMaybe<RegisteredRedemptionHavingAverageInput>;
  distinctCount?: InputMaybe<RegisteredRedemptionHavingDistinctCountInput>;
  max?: InputMaybe<RegisteredRedemptionHavingMaxInput>;
  min?: InputMaybe<RegisteredRedemptionHavingMinInput>;
  stddevPopulation?: InputMaybe<RegisteredRedemptionHavingStddevPopulationInput>;
  stddevSample?: InputMaybe<RegisteredRedemptionHavingStddevSampleInput>;
  sum?: InputMaybe<RegisteredRedemptionHavingSumInput>;
  variancePopulation?: InputMaybe<RegisteredRedemptionHavingVariancePopulationInput>;
  varianceSample?: InputMaybe<RegisteredRedemptionHavingVarianceSampleInput>;
};

export type RegisteredRedemptionHavingMaxInput = {
  amount?: InputMaybe<HavingBigfloatFilter>;
  logIndex?: InputMaybe<HavingBigintFilter>;
};

export type RegisteredRedemptionHavingMinInput = {
  amount?: InputMaybe<HavingBigfloatFilter>;
  logIndex?: InputMaybe<HavingBigintFilter>;
};

export type RegisteredRedemptionHavingStddevPopulationInput = {
  amount?: InputMaybe<HavingBigfloatFilter>;
  logIndex?: InputMaybe<HavingBigintFilter>;
};

export type RegisteredRedemptionHavingStddevSampleInput = {
  amount?: InputMaybe<HavingBigfloatFilter>;
  logIndex?: InputMaybe<HavingBigintFilter>;
};

export type RegisteredRedemptionHavingSumInput = {
  amount?: InputMaybe<HavingBigfloatFilter>;
  logIndex?: InputMaybe<HavingBigintFilter>;
};

export type RegisteredRedemptionHavingVariancePopulationInput = {
  amount?: InputMaybe<HavingBigfloatFilter>;
  logIndex?: InputMaybe<HavingBigintFilter>;
};

export type RegisteredRedemptionHavingVarianceSampleInput = {
  amount?: InputMaybe<HavingBigfloatFilter>;
  logIndex?: InputMaybe<HavingBigintFilter>;
};

export type RegisteredRedemptionMaxAggregates = {
  __typename?: 'RegisteredRedemptionMaxAggregates';
  /** Maximum of amount across the matching connection */
  amount?: Maybe<Scalars['BigFloat']['output']>;
  /** Maximum of logIndex across the matching connection */
  logIndex?: Maybe<Scalars['BigInt']['output']>;
};

export type RegisteredRedemptionMinAggregates = {
  __typename?: 'RegisteredRedemptionMinAggregates';
  /** Minimum of amount across the matching connection */
  amount?: Maybe<Scalars['BigFloat']['output']>;
  /** Minimum of logIndex across the matching connection */
  logIndex?: Maybe<Scalars['BigInt']['output']>;
};

export type RegisteredRedemptionStddevPopulationAggregates = {
  __typename?: 'RegisteredRedemptionStddevPopulationAggregates';
  /** Population standard deviation of amount across the matching connection */
  amount?: Maybe<Scalars['BigFloat']['output']>;
  /** Population standard deviation of logIndex across the matching connection */
  logIndex?: Maybe<Scalars['BigFloat']['output']>;
};

export type RegisteredRedemptionStddevSampleAggregates = {
  __typename?: 'RegisteredRedemptionStddevSampleAggregates';
  /** Sample standard deviation of amount across the matching connection */
  amount?: Maybe<Scalars['BigFloat']['output']>;
  /** Sample standard deviation of logIndex across the matching connection */
  logIndex?: Maybe<Scalars['BigFloat']['output']>;
};

export type RegisteredRedemptionSumAggregates = {
  __typename?: 'RegisteredRedemptionSumAggregates';
  /** Sum of amount across the matching connection */
  amount: Scalars['BigFloat']['output'];
  /** Sum of logIndex across the matching connection */
  logIndex: Scalars['BigFloat']['output'];
};

export type RegisteredRedemptionVariancePopulationAggregates = {
  __typename?: 'RegisteredRedemptionVariancePopulationAggregates';
  /** Population variance of amount across the matching connection */
  amount?: Maybe<Scalars['BigFloat']['output']>;
  /** Population variance of logIndex across the matching connection */
  logIndex?: Maybe<Scalars['BigFloat']['output']>;
};

export type RegisteredRedemptionVarianceSampleAggregates = {
  __typename?: 'RegisteredRedemptionVarianceSampleAggregates';
  /** Sample variance of amount across the matching connection */
  amount?: Maybe<Scalars['BigFloat']['output']>;
  /** Sample variance of logIndex across the matching connection */
  logIndex?: Maybe<Scalars['BigFloat']['output']>;
};

/** A connection to a list of `RegisteredRedemption` values. */
export type RegisteredRedemptionsConnection = {
  __typename?: 'RegisteredRedemptionsConnection';
  /** Aggregates across the matching connection (ignoring before/after/first/last/offset) */
  aggregates?: Maybe<RegisteredRedemptionAggregates>;
  /** A list of edges which contains the `RegisteredRedemption` and cursor to aid in pagination. */
  edges: Array<RegisteredRedemptionsEdge>;
  /** Grouped aggregates across the matching connection (ignoring before/after/first/last/offset) */
  groupedAggregates?: Maybe<Array<RegisteredRedemptionAggregates>>;
  /** A list of `RegisteredRedemption` objects. */
  nodes: Array<RegisteredRedemption>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
  /** The count of *all* `RegisteredRedemption` you could get from the connection. */
  totalCount: Scalars['Int']['output'];
};


/** A connection to a list of `RegisteredRedemption` values. */
export type RegisteredRedemptionsConnectionGroupedAggregatesArgs = {
  groupBy: Array<RegisteredRedemptionGroupBy>;
  having?: InputMaybe<RegisteredRedemptionHavingInput>;
};

/** A `RegisteredRedemption` edge in the connection. */
export type RegisteredRedemptionsEdge = {
  __typename?: 'RegisteredRedemptionsEdge';
  /** A cursor for use in pagination. */
  cursor?: Maybe<Scalars['Cursor']['output']>;
  /** The `RegisteredRedemption` at the end of the edge. */
  node: RegisteredRedemption;
};

/** Methods to use when ordering `RegisteredRedemption`. */
export type RegisteredRedemptionsOrderBy =
  | 'AMOUNT_ASC'
  | 'AMOUNT_DESC'
  | 'BLOCK_ASC'
  | 'BLOCK_DESC'
  | 'BLOCK_TIMESTAMP_ASC'
  | 'BLOCK_TIMESTAMP_DESC'
  | 'EXPIRY_TIME_ASC'
  | 'EXPIRY_TIME_DESC'
  | 'LOG_INDEX_ASC'
  | 'LOG_INDEX_DESC'
  | 'NATURAL'
  | 'PRIMARY_KEY_ASC'
  | 'PRIMARY_KEY_DESC'
  | 'REDEEM_ADDRESS_ASC'
  | 'REDEEM_ADDRESS_DESC'
  | 'START_TIME_ASC'
  | 'START_TIME_DESC'
  | 'TX_HASH_ASC'
  | 'TX_HASH_DESC'
  | 'TX_ID_ASC'
  | 'TX_ID_DESC'
  | 'VALIDATOR_ID_HEX_ASC'
  | 'VALIDATOR_ID_HEX_DESC';

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

export type TokenPrice = Node & {
  __typename?: 'TokenPrice';
  address: Scalars['String']['output'];
  chainId: Scalars['String']['output'];
  createdAt: Scalars['Datetime']['output'];
  /** A globally unique identifier. Can be used in various places throughout the system to identify this single value. */
  nodeId: Scalars['ID']['output'];
  updatedAt: Scalars['Datetime']['output'];
  usdPrice: Scalars['Float']['output'];
};

export type TokenPriceAggregates = {
  __typename?: 'TokenPriceAggregates';
  /** Mean average aggregates across the matching connection (ignoring before/after/first/last/offset) */
  average?: Maybe<TokenPriceAverageAggregates>;
  /** Distinct count aggregates across the matching connection (ignoring before/after/first/last/offset) */
  distinctCount?: Maybe<TokenPriceDistinctCountAggregates>;
  keys?: Maybe<Array<Scalars['String']['output']>>;
  /** Maximum aggregates across the matching connection (ignoring before/after/first/last/offset) */
  max?: Maybe<TokenPriceMaxAggregates>;
  /** Minimum aggregates across the matching connection (ignoring before/after/first/last/offset) */
  min?: Maybe<TokenPriceMinAggregates>;
  /** Population standard deviation aggregates across the matching connection (ignoring before/after/first/last/offset) */
  stddevPopulation?: Maybe<TokenPriceStddevPopulationAggregates>;
  /** Sample standard deviation aggregates across the matching connection (ignoring before/after/first/last/offset) */
  stddevSample?: Maybe<TokenPriceStddevSampleAggregates>;
  /** Sum aggregates across the matching connection (ignoring before/after/first/last/offset) */
  sum?: Maybe<TokenPriceSumAggregates>;
  /** Population variance aggregates across the matching connection (ignoring before/after/first/last/offset) */
  variancePopulation?: Maybe<TokenPriceVariancePopulationAggregates>;
  /** Sample variance aggregates across the matching connection (ignoring before/after/first/last/offset) */
  varianceSample?: Maybe<TokenPriceVarianceSampleAggregates>;
};

export type TokenPriceAverageAggregates = {
  __typename?: 'TokenPriceAverageAggregates';
  /** Mean average of usdPrice across the matching connection */
  usdPrice?: Maybe<Scalars['Float']['output']>;
};

/**
 * A condition to be used against `TokenPrice` object types. All fields are tested
 * for equality and combined with a logical ‘and.’
 */
export type TokenPriceCondition = {
  /** Checks for equality with the object’s `address` field. */
  address?: InputMaybe<Scalars['String']['input']>;
  /** Checks for equality with the object’s `chainId` field. */
  chainId?: InputMaybe<Scalars['String']['input']>;
  /** Checks for equality with the object’s `createdAt` field. */
  createdAt?: InputMaybe<Scalars['Datetime']['input']>;
  /** Checks for equality with the object’s `updatedAt` field. */
  updatedAt?: InputMaybe<Scalars['Datetime']['input']>;
  /** Checks for equality with the object’s `usdPrice` field. */
  usdPrice?: InputMaybe<Scalars['Float']['input']>;
};

export type TokenPriceDistinctCountAggregates = {
  __typename?: 'TokenPriceDistinctCountAggregates';
  /** Distinct count of address across the matching connection */
  address?: Maybe<Scalars['BigInt']['output']>;
  /** Distinct count of chainId across the matching connection */
  chainId?: Maybe<Scalars['BigInt']['output']>;
  /** Distinct count of createdAt across the matching connection */
  createdAt?: Maybe<Scalars['BigInt']['output']>;
  /** Distinct count of updatedAt across the matching connection */
  updatedAt?: Maybe<Scalars['BigInt']['output']>;
  /** Distinct count of usdPrice across the matching connection */
  usdPrice?: Maybe<Scalars['BigInt']['output']>;
};

/** A filter to be used against `TokenPrice` object types. All fields are combined with a logical ‘and.’ */
export type TokenPriceFilter = {
  /** Filter by the object’s `address` field. */
  address?: InputMaybe<StringFilter>;
  /** Checks for all expressions in this list. */
  and?: InputMaybe<Array<TokenPriceFilter>>;
  /** Filter by the object’s `chainId` field. */
  chainId?: InputMaybe<StringFilter>;
  /** Filter by the object’s `createdAt` field. */
  createdAt?: InputMaybe<DatetimeFilter>;
  /** Negates the expression. */
  not?: InputMaybe<TokenPriceFilter>;
  /** Checks for any expressions in this list. */
  or?: InputMaybe<Array<TokenPriceFilter>>;
  /** Filter by the object’s `updatedAt` field. */
  updatedAt?: InputMaybe<DatetimeFilter>;
  /** Filter by the object’s `usdPrice` field. */
  usdPrice?: InputMaybe<FloatFilter>;
};

/** Grouping methods for `TokenPrice` for usage during aggregation. */
export type TokenPriceGroupBy =
  | 'ADDRESS'
  | 'CHAIN_ID'
  | 'CREATED_AT'
  | 'CREATED_AT_TRUNCATED_TO_DAY'
  | 'CREATED_AT_TRUNCATED_TO_HOUR'
  | 'UPDATED_AT'
  | 'UPDATED_AT_TRUNCATED_TO_DAY'
  | 'UPDATED_AT_TRUNCATED_TO_HOUR'
  | 'USD_PRICE';

export type TokenPriceHavingAverageInput = {
  createdAt?: InputMaybe<HavingDatetimeFilter>;
  updatedAt?: InputMaybe<HavingDatetimeFilter>;
  usdPrice?: InputMaybe<HavingFloatFilter>;
};

export type TokenPriceHavingDistinctCountInput = {
  createdAt?: InputMaybe<HavingDatetimeFilter>;
  updatedAt?: InputMaybe<HavingDatetimeFilter>;
  usdPrice?: InputMaybe<HavingFloatFilter>;
};

/** Conditions for `TokenPrice` aggregates. */
export type TokenPriceHavingInput = {
  AND?: InputMaybe<Array<TokenPriceHavingInput>>;
  OR?: InputMaybe<Array<TokenPriceHavingInput>>;
  average?: InputMaybe<TokenPriceHavingAverageInput>;
  distinctCount?: InputMaybe<TokenPriceHavingDistinctCountInput>;
  max?: InputMaybe<TokenPriceHavingMaxInput>;
  min?: InputMaybe<TokenPriceHavingMinInput>;
  stddevPopulation?: InputMaybe<TokenPriceHavingStddevPopulationInput>;
  stddevSample?: InputMaybe<TokenPriceHavingStddevSampleInput>;
  sum?: InputMaybe<TokenPriceHavingSumInput>;
  variancePopulation?: InputMaybe<TokenPriceHavingVariancePopulationInput>;
  varianceSample?: InputMaybe<TokenPriceHavingVarianceSampleInput>;
};

export type TokenPriceHavingMaxInput = {
  createdAt?: InputMaybe<HavingDatetimeFilter>;
  updatedAt?: InputMaybe<HavingDatetimeFilter>;
  usdPrice?: InputMaybe<HavingFloatFilter>;
};

export type TokenPriceHavingMinInput = {
  createdAt?: InputMaybe<HavingDatetimeFilter>;
  updatedAt?: InputMaybe<HavingDatetimeFilter>;
  usdPrice?: InputMaybe<HavingFloatFilter>;
};

export type TokenPriceHavingStddevPopulationInput = {
  createdAt?: InputMaybe<HavingDatetimeFilter>;
  updatedAt?: InputMaybe<HavingDatetimeFilter>;
  usdPrice?: InputMaybe<HavingFloatFilter>;
};

export type TokenPriceHavingStddevSampleInput = {
  createdAt?: InputMaybe<HavingDatetimeFilter>;
  updatedAt?: InputMaybe<HavingDatetimeFilter>;
  usdPrice?: InputMaybe<HavingFloatFilter>;
};

export type TokenPriceHavingSumInput = {
  createdAt?: InputMaybe<HavingDatetimeFilter>;
  updatedAt?: InputMaybe<HavingDatetimeFilter>;
  usdPrice?: InputMaybe<HavingFloatFilter>;
};

export type TokenPriceHavingVariancePopulationInput = {
  createdAt?: InputMaybe<HavingDatetimeFilter>;
  updatedAt?: InputMaybe<HavingDatetimeFilter>;
  usdPrice?: InputMaybe<HavingFloatFilter>;
};

export type TokenPriceHavingVarianceSampleInput = {
  createdAt?: InputMaybe<HavingDatetimeFilter>;
  updatedAt?: InputMaybe<HavingDatetimeFilter>;
  usdPrice?: InputMaybe<HavingFloatFilter>;
};

export type TokenPriceMaxAggregates = {
  __typename?: 'TokenPriceMaxAggregates';
  /** Maximum of usdPrice across the matching connection */
  usdPrice?: Maybe<Scalars['Float']['output']>;
};

export type TokenPriceMinAggregates = {
  __typename?: 'TokenPriceMinAggregates';
  /** Minimum of usdPrice across the matching connection */
  usdPrice?: Maybe<Scalars['Float']['output']>;
};

export type TokenPriceStddevPopulationAggregates = {
  __typename?: 'TokenPriceStddevPopulationAggregates';
  /** Population standard deviation of usdPrice across the matching connection */
  usdPrice?: Maybe<Scalars['Float']['output']>;
};

export type TokenPriceStddevSampleAggregates = {
  __typename?: 'TokenPriceStddevSampleAggregates';
  /** Sample standard deviation of usdPrice across the matching connection */
  usdPrice?: Maybe<Scalars['Float']['output']>;
};

export type TokenPriceSumAggregates = {
  __typename?: 'TokenPriceSumAggregates';
  /** Sum of usdPrice across the matching connection */
  usdPrice: Scalars['Float']['output'];
};

export type TokenPriceVariancePopulationAggregates = {
  __typename?: 'TokenPriceVariancePopulationAggregates';
  /** Population variance of usdPrice across the matching connection */
  usdPrice?: Maybe<Scalars['Float']['output']>;
};

export type TokenPriceVarianceSampleAggregates = {
  __typename?: 'TokenPriceVarianceSampleAggregates';
  /** Sample variance of usdPrice across the matching connection */
  usdPrice?: Maybe<Scalars['Float']['output']>;
};

/** A connection to a list of `TokenPrice` values. */
export type TokenPricesConnection = {
  __typename?: 'TokenPricesConnection';
  /** Aggregates across the matching connection (ignoring before/after/first/last/offset) */
  aggregates?: Maybe<TokenPriceAggregates>;
  /** A list of edges which contains the `TokenPrice` and cursor to aid in pagination. */
  edges: Array<TokenPricesEdge>;
  /** Grouped aggregates across the matching connection (ignoring before/after/first/last/offset) */
  groupedAggregates?: Maybe<Array<TokenPriceAggregates>>;
  /** A list of `TokenPrice` objects. */
  nodes: Array<TokenPrice>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
  /** The count of *all* `TokenPrice` you could get from the connection. */
  totalCount: Scalars['Int']['output'];
};


/** A connection to a list of `TokenPrice` values. */
export type TokenPricesConnectionGroupedAggregatesArgs = {
  groupBy: Array<TokenPriceGroupBy>;
  having?: InputMaybe<TokenPriceHavingInput>;
};

/** A `TokenPrice` edge in the connection. */
export type TokenPricesEdge = {
  __typename?: 'TokenPricesEdge';
  /** A cursor for use in pagination. */
  cursor?: Maybe<Scalars['Cursor']['output']>;
  /** The `TokenPrice` at the end of the edge. */
  node: TokenPrice;
};

/** Methods to use when ordering `TokenPrice`. */
export type TokenPricesOrderBy =
  | 'ADDRESS_ASC'
  | 'ADDRESS_DESC'
  | 'CHAIN_ID_ASC'
  | 'CHAIN_ID_DESC'
  | 'CREATED_AT_ASC'
  | 'CREATED_AT_DESC'
  | 'NATURAL'
  | 'PRIMARY_KEY_ASC'
  | 'PRIMARY_KEY_DESC'
  | 'UPDATED_AT_ASC'
  | 'UPDATED_AT_DESC'
  | 'USD_PRICE_ASC'
  | 'USD_PRICE_DESC';

export type Validator = Node & {
  __typename?: 'Validator';
  alias?: Maybe<Scalars['String']['output']>;
  apyBp?: Maybe<Scalars['Int']['output']>;
  boundRedeemAddress?: Maybe<Scalars['String']['output']>;
  firstFundingTimestamp: Scalars['String']['output'];
  idHex: Scalars['String']['output'];
  idSs58: Scalars['String']['output'];
  isBidding: Scalars['Boolean']['output'];
  isCurrentAuthority: Scalars['Boolean']['output'];
  isCurrentBackup: Scalars['Boolean']['output'];
  isKeyholder: Scalars['Boolean']['output'];
  isOnline: Scalars['Boolean']['output'];
  isQualified: Scalars['Boolean']['output'];
  latestFundingTimestamp: Scalars['String']['output'];
  lockedBalance: Scalars['BigFloat']['output'];
  /** A globally unique identifier. Can be used in various places throughout the system to identify this single value. */
  nodeId: Scalars['ID']['output'];
  processorId?: Maybe<Scalars['Int']['output']>;
  reputationPoints: Scalars['Int']['output'];
  role: AccountRole;
  totalRewards?: Maybe<Scalars['String']['output']>;
  unlockedBalance: Scalars['BigFloat']['output'];
};

export type ValidatorAggregates = {
  __typename?: 'ValidatorAggregates';
  /** Mean average aggregates across the matching connection (ignoring before/after/first/last/offset) */
  average?: Maybe<ValidatorAverageAggregates>;
  /** Distinct count aggregates across the matching connection (ignoring before/after/first/last/offset) */
  distinctCount?: Maybe<ValidatorDistinctCountAggregates>;
  keys?: Maybe<Array<Scalars['String']['output']>>;
  /** Maximum aggregates across the matching connection (ignoring before/after/first/last/offset) */
  max?: Maybe<ValidatorMaxAggregates>;
  /** Minimum aggregates across the matching connection (ignoring before/after/first/last/offset) */
  min?: Maybe<ValidatorMinAggregates>;
  /** Population standard deviation aggregates across the matching connection (ignoring before/after/first/last/offset) */
  stddevPopulation?: Maybe<ValidatorStddevPopulationAggregates>;
  /** Sample standard deviation aggregates across the matching connection (ignoring before/after/first/last/offset) */
  stddevSample?: Maybe<ValidatorStddevSampleAggregates>;
  /** Sum aggregates across the matching connection (ignoring before/after/first/last/offset) */
  sum?: Maybe<ValidatorSumAggregates>;
  /** Population variance aggregates across the matching connection (ignoring before/after/first/last/offset) */
  variancePopulation?: Maybe<ValidatorVariancePopulationAggregates>;
  /** Sample variance aggregates across the matching connection (ignoring before/after/first/last/offset) */
  varianceSample?: Maybe<ValidatorVarianceSampleAggregates>;
};

export type ValidatorAverageAggregates = {
  __typename?: 'ValidatorAverageAggregates';
  /** Mean average of apyBp across the matching connection */
  apyBp?: Maybe<Scalars['BigFloat']['output']>;
  /** Mean average of lockedBalance across the matching connection */
  lockedBalance?: Maybe<Scalars['BigFloat']['output']>;
  /** Mean average of processorId across the matching connection */
  processorId?: Maybe<Scalars['BigFloat']['output']>;
  /** Mean average of reputationPoints across the matching connection */
  reputationPoints?: Maybe<Scalars['BigFloat']['output']>;
  /** Mean average of unlockedBalance across the matching connection */
  unlockedBalance?: Maybe<Scalars['BigFloat']['output']>;
};

/**
 * A condition to be used against `Validator` object types. All fields are tested
 * for equality and combined with a logical ‘and.’
 */
export type ValidatorCondition = {
  /** Checks for equality with the object’s `alias` field. */
  alias?: InputMaybe<Scalars['String']['input']>;
  /** Checks for equality with the object’s `apyBp` field. */
  apyBp?: InputMaybe<Scalars['Int']['input']>;
  /** Checks for equality with the object’s `boundRedeemAddress` field. */
  boundRedeemAddress?: InputMaybe<Scalars['String']['input']>;
  /** Checks for equality with the object’s `firstFundingTimestamp` field. */
  firstFundingTimestamp?: InputMaybe<Scalars['String']['input']>;
  /** Checks for equality with the object’s `idHex` field. */
  idHex?: InputMaybe<Scalars['String']['input']>;
  /** Checks for equality with the object’s `idSs58` field. */
  idSs58?: InputMaybe<Scalars['String']['input']>;
  /** Checks for equality with the object’s `isBidding` field. */
  isBidding?: InputMaybe<Scalars['Boolean']['input']>;
  /** Checks for equality with the object’s `isCurrentAuthority` field. */
  isCurrentAuthority?: InputMaybe<Scalars['Boolean']['input']>;
  /** Checks for equality with the object’s `isCurrentBackup` field. */
  isCurrentBackup?: InputMaybe<Scalars['Boolean']['input']>;
  /** Checks for equality with the object’s `isKeyholder` field. */
  isKeyholder?: InputMaybe<Scalars['Boolean']['input']>;
  /** Checks for equality with the object’s `isOnline` field. */
  isOnline?: InputMaybe<Scalars['Boolean']['input']>;
  /** Checks for equality with the object’s `isQualified` field. */
  isQualified?: InputMaybe<Scalars['Boolean']['input']>;
  /** Checks for equality with the object’s `latestFundingTimestamp` field. */
  latestFundingTimestamp?: InputMaybe<Scalars['String']['input']>;
  /** Checks for equality with the object’s `lockedBalance` field. */
  lockedBalance?: InputMaybe<Scalars['BigFloat']['input']>;
  /** Checks for equality with the object’s `processorId` field. */
  processorId?: InputMaybe<Scalars['Int']['input']>;
  /** Checks for equality with the object’s `reputationPoints` field. */
  reputationPoints?: InputMaybe<Scalars['Int']['input']>;
  /** Checks for equality with the object’s `role` field. */
  role?: InputMaybe<AccountRole>;
  /** Checks for equality with the object’s `totalRewards` field. */
  totalRewards?: InputMaybe<Scalars['String']['input']>;
  /** Checks for equality with the object’s `unlockedBalance` field. */
  unlockedBalance?: InputMaybe<Scalars['BigFloat']['input']>;
};

export type ValidatorDistinctCountAggregates = {
  __typename?: 'ValidatorDistinctCountAggregates';
  /** Distinct count of alias across the matching connection */
  alias?: Maybe<Scalars['BigInt']['output']>;
  /** Distinct count of apyBp across the matching connection */
  apyBp?: Maybe<Scalars['BigInt']['output']>;
  /** Distinct count of boundRedeemAddress across the matching connection */
  boundRedeemAddress?: Maybe<Scalars['BigInt']['output']>;
  /** Distinct count of firstFundingTimestamp across the matching connection */
  firstFundingTimestamp?: Maybe<Scalars['BigInt']['output']>;
  /** Distinct count of idHex across the matching connection */
  idHex?: Maybe<Scalars['BigInt']['output']>;
  /** Distinct count of idSs58 across the matching connection */
  idSs58?: Maybe<Scalars['BigInt']['output']>;
  /** Distinct count of isBidding across the matching connection */
  isBidding?: Maybe<Scalars['BigInt']['output']>;
  /** Distinct count of isCurrentAuthority across the matching connection */
  isCurrentAuthority?: Maybe<Scalars['BigInt']['output']>;
  /** Distinct count of isCurrentBackup across the matching connection */
  isCurrentBackup?: Maybe<Scalars['BigInt']['output']>;
  /** Distinct count of isKeyholder across the matching connection */
  isKeyholder?: Maybe<Scalars['BigInt']['output']>;
  /** Distinct count of isOnline across the matching connection */
  isOnline?: Maybe<Scalars['BigInt']['output']>;
  /** Distinct count of isQualified across the matching connection */
  isQualified?: Maybe<Scalars['BigInt']['output']>;
  /** Distinct count of latestFundingTimestamp across the matching connection */
  latestFundingTimestamp?: Maybe<Scalars['BigInt']['output']>;
  /** Distinct count of lockedBalance across the matching connection */
  lockedBalance?: Maybe<Scalars['BigInt']['output']>;
  /** Distinct count of processorId across the matching connection */
  processorId?: Maybe<Scalars['BigInt']['output']>;
  /** Distinct count of reputationPoints across the matching connection */
  reputationPoints?: Maybe<Scalars['BigInt']['output']>;
  /** Distinct count of role across the matching connection */
  role?: Maybe<Scalars['BigInt']['output']>;
  /** Distinct count of totalRewards across the matching connection */
  totalRewards?: Maybe<Scalars['BigInt']['output']>;
  /** Distinct count of unlockedBalance across the matching connection */
  unlockedBalance?: Maybe<Scalars['BigInt']['output']>;
};

/** A filter to be used against `Validator` object types. All fields are combined with a logical ‘and.’ */
export type ValidatorFilter = {
  /** Filter by the object’s `alias` field. */
  alias?: InputMaybe<StringFilter>;
  /** Checks for all expressions in this list. */
  and?: InputMaybe<Array<ValidatorFilter>>;
  /** Filter by the object’s `apyBp` field. */
  apyBp?: InputMaybe<IntFilter>;
  /** Filter by the object’s `boundRedeemAddress` field. */
  boundRedeemAddress?: InputMaybe<StringFilter>;
  /** Filter by the object’s `firstFundingTimestamp` field. */
  firstFundingTimestamp?: InputMaybe<StringFilter>;
  /** Filter by the object’s `idHex` field. */
  idHex?: InputMaybe<StringFilter>;
  /** Filter by the object’s `idSs58` field. */
  idSs58?: InputMaybe<StringFilter>;
  /** Filter by the object’s `isBidding` field. */
  isBidding?: InputMaybe<BooleanFilter>;
  /** Filter by the object’s `isCurrentAuthority` field. */
  isCurrentAuthority?: InputMaybe<BooleanFilter>;
  /** Filter by the object’s `isCurrentBackup` field. */
  isCurrentBackup?: InputMaybe<BooleanFilter>;
  /** Filter by the object’s `isKeyholder` field. */
  isKeyholder?: InputMaybe<BooleanFilter>;
  /** Filter by the object’s `isOnline` field. */
  isOnline?: InputMaybe<BooleanFilter>;
  /** Filter by the object’s `isQualified` field. */
  isQualified?: InputMaybe<BooleanFilter>;
  /** Filter by the object’s `latestFundingTimestamp` field. */
  latestFundingTimestamp?: InputMaybe<StringFilter>;
  /** Filter by the object’s `lockedBalance` field. */
  lockedBalance?: InputMaybe<BigFloatFilter>;
  /** Negates the expression. */
  not?: InputMaybe<ValidatorFilter>;
  /** Checks for any expressions in this list. */
  or?: InputMaybe<Array<ValidatorFilter>>;
  /** Filter by the object’s `processorId` field. */
  processorId?: InputMaybe<IntFilter>;
  /** Filter by the object’s `reputationPoints` field. */
  reputationPoints?: InputMaybe<IntFilter>;
  /** Filter by the object’s `role` field. */
  role?: InputMaybe<AccountRoleFilter>;
  /** Filter by the object’s `totalRewards` field. */
  totalRewards?: InputMaybe<StringFilter>;
  /** Filter by the object’s `unlockedBalance` field. */
  unlockedBalance?: InputMaybe<BigFloatFilter>;
};

/** Grouping methods for `Validator` for usage during aggregation. */
export type ValidatorGroupBy =
  | 'ALIAS'
  | 'APY_BP'
  | 'BOUND_REDEEM_ADDRESS'
  | 'FIRST_FUNDING_TIMESTAMP'
  | 'IS_BIDDING'
  | 'IS_CURRENT_AUTHORITY'
  | 'IS_CURRENT_BACKUP'
  | 'IS_KEYHOLDER'
  | 'IS_ONLINE'
  | 'IS_QUALIFIED'
  | 'LATEST_FUNDING_TIMESTAMP'
  | 'LOCKED_BALANCE'
  | 'REPUTATION_POINTS'
  | 'ROLE'
  | 'TOTAL_REWARDS'
  | 'UNLOCKED_BALANCE';

export type ValidatorHavingAverageInput = {
  apyBp?: InputMaybe<HavingIntFilter>;
  lockedBalance?: InputMaybe<HavingBigfloatFilter>;
  processorId?: InputMaybe<HavingIntFilter>;
  reputationPoints?: InputMaybe<HavingIntFilter>;
  unlockedBalance?: InputMaybe<HavingBigfloatFilter>;
};

export type ValidatorHavingDistinctCountInput = {
  apyBp?: InputMaybe<HavingIntFilter>;
  lockedBalance?: InputMaybe<HavingBigfloatFilter>;
  processorId?: InputMaybe<HavingIntFilter>;
  reputationPoints?: InputMaybe<HavingIntFilter>;
  unlockedBalance?: InputMaybe<HavingBigfloatFilter>;
};

/** Conditions for `Validator` aggregates. */
export type ValidatorHavingInput = {
  AND?: InputMaybe<Array<ValidatorHavingInput>>;
  OR?: InputMaybe<Array<ValidatorHavingInput>>;
  average?: InputMaybe<ValidatorHavingAverageInput>;
  distinctCount?: InputMaybe<ValidatorHavingDistinctCountInput>;
  max?: InputMaybe<ValidatorHavingMaxInput>;
  min?: InputMaybe<ValidatorHavingMinInput>;
  stddevPopulation?: InputMaybe<ValidatorHavingStddevPopulationInput>;
  stddevSample?: InputMaybe<ValidatorHavingStddevSampleInput>;
  sum?: InputMaybe<ValidatorHavingSumInput>;
  variancePopulation?: InputMaybe<ValidatorHavingVariancePopulationInput>;
  varianceSample?: InputMaybe<ValidatorHavingVarianceSampleInput>;
};

export type ValidatorHavingMaxInput = {
  apyBp?: InputMaybe<HavingIntFilter>;
  lockedBalance?: InputMaybe<HavingBigfloatFilter>;
  processorId?: InputMaybe<HavingIntFilter>;
  reputationPoints?: InputMaybe<HavingIntFilter>;
  unlockedBalance?: InputMaybe<HavingBigfloatFilter>;
};

export type ValidatorHavingMinInput = {
  apyBp?: InputMaybe<HavingIntFilter>;
  lockedBalance?: InputMaybe<HavingBigfloatFilter>;
  processorId?: InputMaybe<HavingIntFilter>;
  reputationPoints?: InputMaybe<HavingIntFilter>;
  unlockedBalance?: InputMaybe<HavingBigfloatFilter>;
};

export type ValidatorHavingStddevPopulationInput = {
  apyBp?: InputMaybe<HavingIntFilter>;
  lockedBalance?: InputMaybe<HavingBigfloatFilter>;
  processorId?: InputMaybe<HavingIntFilter>;
  reputationPoints?: InputMaybe<HavingIntFilter>;
  unlockedBalance?: InputMaybe<HavingBigfloatFilter>;
};

export type ValidatorHavingStddevSampleInput = {
  apyBp?: InputMaybe<HavingIntFilter>;
  lockedBalance?: InputMaybe<HavingBigfloatFilter>;
  processorId?: InputMaybe<HavingIntFilter>;
  reputationPoints?: InputMaybe<HavingIntFilter>;
  unlockedBalance?: InputMaybe<HavingBigfloatFilter>;
};

export type ValidatorHavingSumInput = {
  apyBp?: InputMaybe<HavingIntFilter>;
  lockedBalance?: InputMaybe<HavingBigfloatFilter>;
  processorId?: InputMaybe<HavingIntFilter>;
  reputationPoints?: InputMaybe<HavingIntFilter>;
  unlockedBalance?: InputMaybe<HavingBigfloatFilter>;
};

export type ValidatorHavingVariancePopulationInput = {
  apyBp?: InputMaybe<HavingIntFilter>;
  lockedBalance?: InputMaybe<HavingBigfloatFilter>;
  processorId?: InputMaybe<HavingIntFilter>;
  reputationPoints?: InputMaybe<HavingIntFilter>;
  unlockedBalance?: InputMaybe<HavingBigfloatFilter>;
};

export type ValidatorHavingVarianceSampleInput = {
  apyBp?: InputMaybe<HavingIntFilter>;
  lockedBalance?: InputMaybe<HavingBigfloatFilter>;
  processorId?: InputMaybe<HavingIntFilter>;
  reputationPoints?: InputMaybe<HavingIntFilter>;
  unlockedBalance?: InputMaybe<HavingBigfloatFilter>;
};

export type ValidatorMaxAggregates = {
  __typename?: 'ValidatorMaxAggregates';
  /** Maximum of apyBp across the matching connection */
  apyBp?: Maybe<Scalars['Int']['output']>;
  /** Maximum of lockedBalance across the matching connection */
  lockedBalance?: Maybe<Scalars['BigFloat']['output']>;
  /** Maximum of processorId across the matching connection */
  processorId?: Maybe<Scalars['Int']['output']>;
  /** Maximum of reputationPoints across the matching connection */
  reputationPoints?: Maybe<Scalars['Int']['output']>;
  /** Maximum of unlockedBalance across the matching connection */
  unlockedBalance?: Maybe<Scalars['BigFloat']['output']>;
};

export type ValidatorMinAggregates = {
  __typename?: 'ValidatorMinAggregates';
  /** Minimum of apyBp across the matching connection */
  apyBp?: Maybe<Scalars['Int']['output']>;
  /** Minimum of lockedBalance across the matching connection */
  lockedBalance?: Maybe<Scalars['BigFloat']['output']>;
  /** Minimum of processorId across the matching connection */
  processorId?: Maybe<Scalars['Int']['output']>;
  /** Minimum of reputationPoints across the matching connection */
  reputationPoints?: Maybe<Scalars['Int']['output']>;
  /** Minimum of unlockedBalance across the matching connection */
  unlockedBalance?: Maybe<Scalars['BigFloat']['output']>;
};

export type ValidatorStddevPopulationAggregates = {
  __typename?: 'ValidatorStddevPopulationAggregates';
  /** Population standard deviation of apyBp across the matching connection */
  apyBp?: Maybe<Scalars['BigFloat']['output']>;
  /** Population standard deviation of lockedBalance across the matching connection */
  lockedBalance?: Maybe<Scalars['BigFloat']['output']>;
  /** Population standard deviation of processorId across the matching connection */
  processorId?: Maybe<Scalars['BigFloat']['output']>;
  /** Population standard deviation of reputationPoints across the matching connection */
  reputationPoints?: Maybe<Scalars['BigFloat']['output']>;
  /** Population standard deviation of unlockedBalance across the matching connection */
  unlockedBalance?: Maybe<Scalars['BigFloat']['output']>;
};

export type ValidatorStddevSampleAggregates = {
  __typename?: 'ValidatorStddevSampleAggregates';
  /** Sample standard deviation of apyBp across the matching connection */
  apyBp?: Maybe<Scalars['BigFloat']['output']>;
  /** Sample standard deviation of lockedBalance across the matching connection */
  lockedBalance?: Maybe<Scalars['BigFloat']['output']>;
  /** Sample standard deviation of processorId across the matching connection */
  processorId?: Maybe<Scalars['BigFloat']['output']>;
  /** Sample standard deviation of reputationPoints across the matching connection */
  reputationPoints?: Maybe<Scalars['BigFloat']['output']>;
  /** Sample standard deviation of unlockedBalance across the matching connection */
  unlockedBalance?: Maybe<Scalars['BigFloat']['output']>;
};

export type ValidatorSumAggregates = {
  __typename?: 'ValidatorSumAggregates';
  /** Sum of apyBp across the matching connection */
  apyBp: Scalars['BigInt']['output'];
  /** Sum of lockedBalance across the matching connection */
  lockedBalance: Scalars['BigFloat']['output'];
  /** Sum of processorId across the matching connection */
  processorId: Scalars['BigInt']['output'];
  /** Sum of reputationPoints across the matching connection */
  reputationPoints: Scalars['BigInt']['output'];
  /** Sum of unlockedBalance across the matching connection */
  unlockedBalance: Scalars['BigFloat']['output'];
};

export type ValidatorVariancePopulationAggregates = {
  __typename?: 'ValidatorVariancePopulationAggregates';
  /** Population variance of apyBp across the matching connection */
  apyBp?: Maybe<Scalars['BigFloat']['output']>;
  /** Population variance of lockedBalance across the matching connection */
  lockedBalance?: Maybe<Scalars['BigFloat']['output']>;
  /** Population variance of processorId across the matching connection */
  processorId?: Maybe<Scalars['BigFloat']['output']>;
  /** Population variance of reputationPoints across the matching connection */
  reputationPoints?: Maybe<Scalars['BigFloat']['output']>;
  /** Population variance of unlockedBalance across the matching connection */
  unlockedBalance?: Maybe<Scalars['BigFloat']['output']>;
};

export type ValidatorVarianceSampleAggregates = {
  __typename?: 'ValidatorVarianceSampleAggregates';
  /** Sample variance of apyBp across the matching connection */
  apyBp?: Maybe<Scalars['BigFloat']['output']>;
  /** Sample variance of lockedBalance across the matching connection */
  lockedBalance?: Maybe<Scalars['BigFloat']['output']>;
  /** Sample variance of processorId across the matching connection */
  processorId?: Maybe<Scalars['BigFloat']['output']>;
  /** Sample variance of reputationPoints across the matching connection */
  reputationPoints?: Maybe<Scalars['BigFloat']['output']>;
  /** Sample variance of unlockedBalance across the matching connection */
  unlockedBalance?: Maybe<Scalars['BigFloat']['output']>;
};

export type ValidatorsByWalletAddressInput = {
  address: Scalars['String']['input'];
};

/** A connection to a list of `Validator` values. */
export type ValidatorsConnection = {
  __typename?: 'ValidatorsConnection';
  /** Aggregates across the matching connection (ignoring before/after/first/last/offset) */
  aggregates?: Maybe<ValidatorAggregates>;
  /** A list of edges which contains the `Validator` and cursor to aid in pagination. */
  edges: Array<ValidatorsEdge>;
  /** Grouped aggregates across the matching connection (ignoring before/after/first/last/offset) */
  groupedAggregates?: Maybe<Array<ValidatorAggregates>>;
  /** A list of `Validator` objects. */
  nodes: Array<Validator>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
  /** The count of *all* `Validator` you could get from the connection. */
  totalCount: Scalars['Int']['output'];
};


/** A connection to a list of `Validator` values. */
export type ValidatorsConnectionGroupedAggregatesArgs = {
  groupBy: Array<ValidatorGroupBy>;
  having?: InputMaybe<ValidatorHavingInput>;
};

/** A `Validator` edge in the connection. */
export type ValidatorsEdge = {
  __typename?: 'ValidatorsEdge';
  /** A cursor for use in pagination. */
  cursor?: Maybe<Scalars['Cursor']['output']>;
  /** The `Validator` at the end of the edge. */
  node: Validator;
};

/** Methods to use when ordering `Validator`. */
export type ValidatorsOrderBy =
  | 'ALIAS_ASC'
  | 'ALIAS_DESC'
  | 'APY_BP_ASC'
  | 'APY_BP_DESC'
  | 'BOUND_REDEEM_ADDRESS_ASC'
  | 'BOUND_REDEEM_ADDRESS_DESC'
  | 'FIRST_FUNDING_TIMESTAMP_ASC'
  | 'FIRST_FUNDING_TIMESTAMP_DESC'
  | 'ID_HEX_ASC'
  | 'ID_HEX_DESC'
  | 'ID_SS58_ASC'
  | 'ID_SS58_DESC'
  | 'IS_BIDDING_ASC'
  | 'IS_BIDDING_DESC'
  | 'IS_CURRENT_AUTHORITY_ASC'
  | 'IS_CURRENT_AUTHORITY_DESC'
  | 'IS_CURRENT_BACKUP_ASC'
  | 'IS_CURRENT_BACKUP_DESC'
  | 'IS_KEYHOLDER_ASC'
  | 'IS_KEYHOLDER_DESC'
  | 'IS_ONLINE_ASC'
  | 'IS_ONLINE_DESC'
  | 'IS_QUALIFIED_ASC'
  | 'IS_QUALIFIED_DESC'
  | 'LATEST_FUNDING_TIMESTAMP_ASC'
  | 'LATEST_FUNDING_TIMESTAMP_DESC'
  | 'LOCKED_BALANCE_ASC'
  | 'LOCKED_BALANCE_DESC'
  | 'NATURAL'
  | 'PRIMARY_KEY_ASC'
  | 'PRIMARY_KEY_DESC'
  | 'PROCESSOR_ID_ASC'
  | 'PROCESSOR_ID_DESC'
  | 'REPUTATION_POINTS_ASC'
  | 'REPUTATION_POINTS_DESC'
  | 'ROLE_ASC'
  | 'ROLE_DESC'
  | 'TOTAL_REWARDS_ASC'
  | 'TOTAL_REWARDS_DESC'
  | 'UNLOCKED_BALANCE_ASC'
  | 'UNLOCKED_BALANCE_DESC';

export type Warning = {
  __typename?: 'Warning';
  blockId?: Maybe<Scalars['String']['output']>;
  message?: Maybe<Scalars['String']['output']>;
};

/** A condition to be used against `Warning` object types. All fields are tested for equality and combined with a logical ‘and.’ */
export type WarningCondition = {
  /** Checks for equality with the object’s `blockId` field. */
  blockId?: InputMaybe<Scalars['String']['input']>;
  /** Checks for equality with the object’s `message` field. */
  message?: InputMaybe<Scalars['String']['input']>;
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

/** A connection to a list of `Warning` values. */
export type WarningsConnection = {
  __typename?: 'WarningsConnection';
  /** A list of edges which contains the `Warning` and cursor to aid in pagination. */
  edges: Array<WarningsEdge>;
  /** A list of `Warning` objects. */
  nodes: Array<Warning>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
  /** The count of *all* `Warning` you could get from the connection. */
  totalCount: Scalars['Int']['output'];
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

export type _PrismaMigration = Node & {
  __typename?: '_PrismaMigration';
  appliedStepsCount: Scalars['Int']['output'];
  checksum: Scalars['String']['output'];
  finishedAt?: Maybe<Scalars['Datetime']['output']>;
  id: Scalars['String']['output'];
  logs?: Maybe<Scalars['String']['output']>;
  migrationName: Scalars['String']['output'];
  /** A globally unique identifier. Can be used in various places throughout the system to identify this single value. */
  nodeId: Scalars['ID']['output'];
  rolledBackAt?: Maybe<Scalars['Datetime']['output']>;
  startedAt: Scalars['Datetime']['output'];
};

export type _PrismaMigrationAggregates = {
  __typename?: '_PrismaMigrationAggregates';
  /** Mean average aggregates across the matching connection (ignoring before/after/first/last/offset) */
  average?: Maybe<_PrismaMigrationAverageAggregates>;
  /** Distinct count aggregates across the matching connection (ignoring before/after/first/last/offset) */
  distinctCount?: Maybe<_PrismaMigrationDistinctCountAggregates>;
  keys?: Maybe<Array<Scalars['String']['output']>>;
  /** Maximum aggregates across the matching connection (ignoring before/after/first/last/offset) */
  max?: Maybe<_PrismaMigrationMaxAggregates>;
  /** Minimum aggregates across the matching connection (ignoring before/after/first/last/offset) */
  min?: Maybe<_PrismaMigrationMinAggregates>;
  /** Population standard deviation aggregates across the matching connection (ignoring before/after/first/last/offset) */
  stddevPopulation?: Maybe<_PrismaMigrationStddevPopulationAggregates>;
  /** Sample standard deviation aggregates across the matching connection (ignoring before/after/first/last/offset) */
  stddevSample?: Maybe<_PrismaMigrationStddevSampleAggregates>;
  /** Sum aggregates across the matching connection (ignoring before/after/first/last/offset) */
  sum?: Maybe<_PrismaMigrationSumAggregates>;
  /** Population variance aggregates across the matching connection (ignoring before/after/first/last/offset) */
  variancePopulation?: Maybe<_PrismaMigrationVariancePopulationAggregates>;
  /** Sample variance aggregates across the matching connection (ignoring before/after/first/last/offset) */
  varianceSample?: Maybe<_PrismaMigrationVarianceSampleAggregates>;
};

export type _PrismaMigrationAverageAggregates = {
  __typename?: '_PrismaMigrationAverageAggregates';
  /** Mean average of appliedStepsCount across the matching connection */
  appliedStepsCount?: Maybe<Scalars['BigFloat']['output']>;
};

/**
 * A condition to be used against `_PrismaMigration` object types. All fields are
 * tested for equality and combined with a logical ‘and.’
 */
export type _PrismaMigrationCondition = {
  /** Checks for equality with the object’s `appliedStepsCount` field. */
  appliedStepsCount?: InputMaybe<Scalars['Int']['input']>;
  /** Checks for equality with the object’s `checksum` field. */
  checksum?: InputMaybe<Scalars['String']['input']>;
  /** Checks for equality with the object’s `finishedAt` field. */
  finishedAt?: InputMaybe<Scalars['Datetime']['input']>;
  /** Checks for equality with the object’s `id` field. */
  id?: InputMaybe<Scalars['String']['input']>;
  /** Checks for equality with the object’s `logs` field. */
  logs?: InputMaybe<Scalars['String']['input']>;
  /** Checks for equality with the object’s `migrationName` field. */
  migrationName?: InputMaybe<Scalars['String']['input']>;
  /** Checks for equality with the object’s `rolledBackAt` field. */
  rolledBackAt?: InputMaybe<Scalars['Datetime']['input']>;
  /** Checks for equality with the object’s `startedAt` field. */
  startedAt?: InputMaybe<Scalars['Datetime']['input']>;
};

export type _PrismaMigrationDistinctCountAggregates = {
  __typename?: '_PrismaMigrationDistinctCountAggregates';
  /** Distinct count of appliedStepsCount across the matching connection */
  appliedStepsCount?: Maybe<Scalars['BigInt']['output']>;
  /** Distinct count of checksum across the matching connection */
  checksum?: Maybe<Scalars['BigInt']['output']>;
  /** Distinct count of finishedAt across the matching connection */
  finishedAt?: Maybe<Scalars['BigInt']['output']>;
  /** Distinct count of id across the matching connection */
  id?: Maybe<Scalars['BigInt']['output']>;
  /** Distinct count of logs across the matching connection */
  logs?: Maybe<Scalars['BigInt']['output']>;
  /** Distinct count of migrationName across the matching connection */
  migrationName?: Maybe<Scalars['BigInt']['output']>;
  /** Distinct count of rolledBackAt across the matching connection */
  rolledBackAt?: Maybe<Scalars['BigInt']['output']>;
  /** Distinct count of startedAt across the matching connection */
  startedAt?: Maybe<Scalars['BigInt']['output']>;
};

/** A filter to be used against `_PrismaMigration` object types. All fields are combined with a logical ‘and.’ */
export type _PrismaMigrationFilter = {
  /** Checks for all expressions in this list. */
  and?: InputMaybe<Array<_PrismaMigrationFilter>>;
  /** Filter by the object’s `appliedStepsCount` field. */
  appliedStepsCount?: InputMaybe<IntFilter>;
  /** Filter by the object’s `checksum` field. */
  checksum?: InputMaybe<StringFilter>;
  /** Filter by the object’s `finishedAt` field. */
  finishedAt?: InputMaybe<DatetimeFilter>;
  /** Filter by the object’s `id` field. */
  id?: InputMaybe<StringFilter>;
  /** Filter by the object’s `logs` field. */
  logs?: InputMaybe<StringFilter>;
  /** Filter by the object’s `migrationName` field. */
  migrationName?: InputMaybe<StringFilter>;
  /** Negates the expression. */
  not?: InputMaybe<_PrismaMigrationFilter>;
  /** Checks for any expressions in this list. */
  or?: InputMaybe<Array<_PrismaMigrationFilter>>;
  /** Filter by the object’s `rolledBackAt` field. */
  rolledBackAt?: InputMaybe<DatetimeFilter>;
  /** Filter by the object’s `startedAt` field. */
  startedAt?: InputMaybe<DatetimeFilter>;
};

export type _PrismaMigrationMaxAggregates = {
  __typename?: '_PrismaMigrationMaxAggregates';
  /** Maximum of appliedStepsCount across the matching connection */
  appliedStepsCount?: Maybe<Scalars['Int']['output']>;
};

export type _PrismaMigrationMinAggregates = {
  __typename?: '_PrismaMigrationMinAggregates';
  /** Minimum of appliedStepsCount across the matching connection */
  appliedStepsCount?: Maybe<Scalars['Int']['output']>;
};

export type _PrismaMigrationStddevPopulationAggregates = {
  __typename?: '_PrismaMigrationStddevPopulationAggregates';
  /** Population standard deviation of appliedStepsCount across the matching connection */
  appliedStepsCount?: Maybe<Scalars['BigFloat']['output']>;
};

export type _PrismaMigrationStddevSampleAggregates = {
  __typename?: '_PrismaMigrationStddevSampleAggregates';
  /** Sample standard deviation of appliedStepsCount across the matching connection */
  appliedStepsCount?: Maybe<Scalars['BigFloat']['output']>;
};

export type _PrismaMigrationSumAggregates = {
  __typename?: '_PrismaMigrationSumAggregates';
  /** Sum of appliedStepsCount across the matching connection */
  appliedStepsCount: Scalars['BigInt']['output'];
};

export type _PrismaMigrationVariancePopulationAggregates = {
  __typename?: '_PrismaMigrationVariancePopulationAggregates';
  /** Population variance of appliedStepsCount across the matching connection */
  appliedStepsCount?: Maybe<Scalars['BigFloat']['output']>;
};

export type _PrismaMigrationVarianceSampleAggregates = {
  __typename?: '_PrismaMigrationVarianceSampleAggregates';
  /** Sample variance of appliedStepsCount across the matching connection */
  appliedStepsCount?: Maybe<Scalars['BigFloat']['output']>;
};

/** A connection to a list of `_PrismaMigration` values. */
export type _PrismaMigrationsConnection = {
  __typename?: '_PrismaMigrationsConnection';
  /** Aggregates across the matching connection (ignoring before/after/first/last/offset) */
  aggregates?: Maybe<_PrismaMigrationAggregates>;
  /** A list of edges which contains the `_PrismaMigration` and cursor to aid in pagination. */
  edges: Array<_PrismaMigrationsEdge>;
  /** Grouped aggregates across the matching connection (ignoring before/after/first/last/offset) */
  groupedAggregates?: Maybe<Array<_PrismaMigrationAggregates>>;
  /** A list of `_PrismaMigration` objects. */
  nodes: Array<_PrismaMigration>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
  /** The count of *all* `_PrismaMigration` you could get from the connection. */
  totalCount: Scalars['Int']['output'];
};


/** A connection to a list of `_PrismaMigration` values. */
export type _PrismaMigrationsConnectionGroupedAggregatesArgs = {
  groupBy: Array<_PrismaMigrationsGroupBy>;
  having?: InputMaybe<_PrismaMigrationsHavingInput>;
};

/** A `_PrismaMigration` edge in the connection. */
export type _PrismaMigrationsEdge = {
  __typename?: '_PrismaMigrationsEdge';
  /** A cursor for use in pagination. */
  cursor?: Maybe<Scalars['Cursor']['output']>;
  /** The `_PrismaMigration` at the end of the edge. */
  node: _PrismaMigration;
};

/** Grouping methods for `_PrismaMigration` for usage during aggregation. */
export type _PrismaMigrationsGroupBy =
  | 'APPLIED_STEPS_COUNT'
  | 'CHECKSUM'
  | 'FINISHED_AT'
  | 'FINISHED_AT_TRUNCATED_TO_DAY'
  | 'FINISHED_AT_TRUNCATED_TO_HOUR'
  | 'LOGS'
  | 'MIGRATION_NAME'
  | 'ROLLED_BACK_AT'
  | 'ROLLED_BACK_AT_TRUNCATED_TO_DAY'
  | 'ROLLED_BACK_AT_TRUNCATED_TO_HOUR'
  | 'STARTED_AT'
  | 'STARTED_AT_TRUNCATED_TO_DAY'
  | 'STARTED_AT_TRUNCATED_TO_HOUR';

export type _PrismaMigrationsHavingAverageInput = {
  appliedStepsCount?: InputMaybe<HavingIntFilter>;
  finishedAt?: InputMaybe<HavingDatetimeFilter>;
  rolledBackAt?: InputMaybe<HavingDatetimeFilter>;
  startedAt?: InputMaybe<HavingDatetimeFilter>;
};

export type _PrismaMigrationsHavingDistinctCountInput = {
  appliedStepsCount?: InputMaybe<HavingIntFilter>;
  finishedAt?: InputMaybe<HavingDatetimeFilter>;
  rolledBackAt?: InputMaybe<HavingDatetimeFilter>;
  startedAt?: InputMaybe<HavingDatetimeFilter>;
};

/** Conditions for `_PrismaMigration` aggregates. */
export type _PrismaMigrationsHavingInput = {
  AND?: InputMaybe<Array<_PrismaMigrationsHavingInput>>;
  OR?: InputMaybe<Array<_PrismaMigrationsHavingInput>>;
  average?: InputMaybe<_PrismaMigrationsHavingAverageInput>;
  distinctCount?: InputMaybe<_PrismaMigrationsHavingDistinctCountInput>;
  max?: InputMaybe<_PrismaMigrationsHavingMaxInput>;
  min?: InputMaybe<_PrismaMigrationsHavingMinInput>;
  stddevPopulation?: InputMaybe<_PrismaMigrationsHavingStddevPopulationInput>;
  stddevSample?: InputMaybe<_PrismaMigrationsHavingStddevSampleInput>;
  sum?: InputMaybe<_PrismaMigrationsHavingSumInput>;
  variancePopulation?: InputMaybe<_PrismaMigrationsHavingVariancePopulationInput>;
  varianceSample?: InputMaybe<_PrismaMigrationsHavingVarianceSampleInput>;
};

export type _PrismaMigrationsHavingMaxInput = {
  appliedStepsCount?: InputMaybe<HavingIntFilter>;
  finishedAt?: InputMaybe<HavingDatetimeFilter>;
  rolledBackAt?: InputMaybe<HavingDatetimeFilter>;
  startedAt?: InputMaybe<HavingDatetimeFilter>;
};

export type _PrismaMigrationsHavingMinInput = {
  appliedStepsCount?: InputMaybe<HavingIntFilter>;
  finishedAt?: InputMaybe<HavingDatetimeFilter>;
  rolledBackAt?: InputMaybe<HavingDatetimeFilter>;
  startedAt?: InputMaybe<HavingDatetimeFilter>;
};

export type _PrismaMigrationsHavingStddevPopulationInput = {
  appliedStepsCount?: InputMaybe<HavingIntFilter>;
  finishedAt?: InputMaybe<HavingDatetimeFilter>;
  rolledBackAt?: InputMaybe<HavingDatetimeFilter>;
  startedAt?: InputMaybe<HavingDatetimeFilter>;
};

export type _PrismaMigrationsHavingStddevSampleInput = {
  appliedStepsCount?: InputMaybe<HavingIntFilter>;
  finishedAt?: InputMaybe<HavingDatetimeFilter>;
  rolledBackAt?: InputMaybe<HavingDatetimeFilter>;
  startedAt?: InputMaybe<HavingDatetimeFilter>;
};

export type _PrismaMigrationsHavingSumInput = {
  appliedStepsCount?: InputMaybe<HavingIntFilter>;
  finishedAt?: InputMaybe<HavingDatetimeFilter>;
  rolledBackAt?: InputMaybe<HavingDatetimeFilter>;
  startedAt?: InputMaybe<HavingDatetimeFilter>;
};

export type _PrismaMigrationsHavingVariancePopulationInput = {
  appliedStepsCount?: InputMaybe<HavingIntFilter>;
  finishedAt?: InputMaybe<HavingDatetimeFilter>;
  rolledBackAt?: InputMaybe<HavingDatetimeFilter>;
  startedAt?: InputMaybe<HavingDatetimeFilter>;
};

export type _PrismaMigrationsHavingVarianceSampleInput = {
  appliedStepsCount?: InputMaybe<HavingIntFilter>;
  finishedAt?: InputMaybe<HavingDatetimeFilter>;
  rolledBackAt?: InputMaybe<HavingDatetimeFilter>;
  startedAt?: InputMaybe<HavingDatetimeFilter>;
};

/** Methods to use when ordering `_PrismaMigration`. */
export type _PrismaMigrationsOrderBy =
  | 'APPLIED_STEPS_COUNT_ASC'
  | 'APPLIED_STEPS_COUNT_DESC'
  | 'CHECKSUM_ASC'
  | 'CHECKSUM_DESC'
  | 'FINISHED_AT_ASC'
  | 'FINISHED_AT_DESC'
  | 'ID_ASC'
  | 'ID_DESC'
  | 'LOGS_ASC'
  | 'LOGS_DESC'
  | 'MIGRATION_NAME_ASC'
  | 'MIGRATION_NAME_DESC'
  | 'NATURAL'
  | 'PRIMARY_KEY_ASC'
  | 'PRIMARY_KEY_DESC'
  | 'ROLLED_BACK_AT_ASC'
  | 'ROLLED_BACK_AT_DESC'
  | 'STARTED_AT_ASC'
  | 'STARTED_AT_DESC';

export type GetBatchQueryVariables = Exact<{
  height: Scalars['Int']['input'];
  limit: Scalars['Int']['input'];
  swapEvents: Array<Scalars['String']['input']> | Scalars['String']['input'];
}>;


export type GetBatchQuery = { __typename?: 'Query', blocks?: { __typename?: 'BlocksConnection', nodes: Array<{ __typename?: 'Block', height: number, hash: string, timestamp: any, specId: string, events: { __typename?: 'EventsConnection', nodes: Array<{ __typename?: 'Event', args?: any | null, name: string, indexInBlock: number }> } }> } | null };

export type GetTokenPriceQueryVariables = Exact<{
  address: Scalars['String']['input'];
  chainId: Scalars['String']['input'];
}>;


export type GetTokenPriceQuery = { __typename?: 'Query', tokenPrice: Array<{ __typename?: 'TokenPrice', chainId: string, address: string, usdPrice: number }> };


export const GetBatchDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetBatch"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"height"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"limit"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"swapEvents"}},"type":{"kind":"NonNullType","type":{"kind":"ListType","type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","alias":{"kind":"Name","value":"blocks"},"name":{"kind":"Name","value":"allBlocks"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"filter"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"height"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"greaterThanOrEqualTo"},"value":{"kind":"Variable","name":{"kind":"Name","value":"height"}}}]}}]}},{"kind":"Argument","name":{"kind":"Name","value":"first"},"value":{"kind":"Variable","name":{"kind":"Name","value":"limit"}}},{"kind":"Argument","name":{"kind":"Name","value":"orderBy"},"value":{"kind":"EnumValue","value":"HEIGHT_ASC"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"nodes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"height"}},{"kind":"Field","name":{"kind":"Name","value":"hash"}},{"kind":"Field","name":{"kind":"Name","value":"timestamp"}},{"kind":"Field","name":{"kind":"Name","value":"specId"}},{"kind":"Field","alias":{"kind":"Name","value":"events"},"name":{"kind":"Name","value":"eventsByBlockId"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"filter"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"name"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"in"},"value":{"kind":"Variable","name":{"kind":"Name","value":"swapEvents"}}}]}}]}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"nodes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"args"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"indexInBlock"}}]}}]}}]}}]}}]}}]} as unknown as DocumentNode<GetBatchQuery, GetBatchQueryVariables>;
export const GetTokenPriceDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetTokenPrice"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"address"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"chainId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","alias":{"kind":"Name","value":"tokenPrice"},"name":{"kind":"Name","value":"getTokenPrices"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"ListValue","values":[{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"address"},"value":{"kind":"Variable","name":{"kind":"Name","value":"address"}}},{"kind":"ObjectField","name":{"kind":"Name","value":"chainId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"chainId"}}}]}]}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"chainId"}},{"kind":"Field","name":{"kind":"Name","value":"address"}},{"kind":"Field","name":{"kind":"Name","value":"usdPrice"}}]}}]}}]} as unknown as DocumentNode<GetTokenPriceQuery, GetTokenPriceQueryVariables>;
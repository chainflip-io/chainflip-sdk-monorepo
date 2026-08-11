import pg from 'pg';
import env from './config/env.js';
import { handleExit } from './utils/function.js';
import logger, { inspectError } from './utils/logger.js';

export type Event = {
  name: string;
  indexInBlock: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  args: any;
};

export type Block = {
  height: number;
  hash: string;
  timestamp: string;
  specId: string;
  events: Event[];
};

// `timestamp` is rendered as an ISO string rather than returned as a `timestamptz`
// so the value does not pass through the process's local time zone.
const GET_BLOCKS = `
  SELECT
    b.height,
    b.hash,
    to_char(b."timestamp" AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "timestamp",
    b.spec_id AS "specId",
    COALESCE(e.events, '[]'::json) AS events
  FROM (
    SELECT id, height, hash, "timestamp", spec_id
    FROM block
    WHERE height >= $1
    ORDER BY height ASC
    LIMIT $2
  ) b
  LEFT JOIN LATERAL (
    SELECT json_agg(
      json_build_object('name', ev.name, 'args', ev.args, 'indexInBlock', ev.index_in_block)
      ORDER BY ev.index_in_block ASC
    ) AS events
    FROM event ev
    WHERE ev.block_id = b.id AND ev.name = ANY($3::text[])
  ) e ON TRUE
  ORDER BY b.height ASC
`;

export class IndexerClient {
  private readonly pool: pg.Pool;

  constructor(connectionString: string, timeout: number) {
    this.pool = new pg.Pool({
      connectionString,
      connectionTimeoutMillis: timeout,
      statement_timeout: timeout,
      query_timeout: timeout * 2,
    });
    this.pool.on('error', (error) => {
      logger.error('indexer pool error', { error: inspectError(error) });
    });
  }

  async getBlocks(height: number, limit: number, eventNames: string[]): Promise<Block[]> {
    try {
      const { rows } = await this.pool.query<Block>(GET_BLOCKS, [height, limit, eventNames]);
      return rows;
    } catch (error) {
      logger.error('failed to fetch blocks', {
        error: inspectError(error),
        height,
        limit,
        eventCount: eventNames.length,
      });
      throw error;
    }
  }

  end() {
    return this.pool.end();
  }
}

const indexerClient = new IndexerClient(env.INDEXER_DATABASE_URL, env.INDEXER_QUERY_TIMEOUT);

handleExit(() => indexerClient.end());

export default indexerClient;

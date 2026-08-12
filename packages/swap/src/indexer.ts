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

type ArchiveState = {
  lastArchivedBlock: number | null;
  hasArchiveTable: boolean;
};

const GET_WATERMARK = `SELECT last_archived_block FROM archive_progress WHERE id = 1`;
const NO_ARCHIVE_TABLE = new Set(['42P01', '42501']); // 42P01: table does not exist, 42501: permission denied

// TODO(indexer-migration): remove legacy after indexer migration
const getBlocksQuery = (schema: 'partitioned' | 'legacy') => `
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
    WHERE ev.block_id = b.id
      ${schema === 'partitioned' ? 'AND ev.block_height = b.height' : ''}
      AND ev.name = ANY($3::text[])
  ) e ON TRUE
  ORDER BY b.height ASC
`;

export class IndexerClient {
  private readonly pool: pg.Pool;

  constructor(
    connectionString: string,
    timeout: number,
    private readonly watermarkCacheTtl = 60_000,
  ) {
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

  private cachedState: (ArchiveState & { readAt: number }) | undefined;

  private async getArchiveState(): Promise<ArchiveState> {
    const cached = this.cachedState;
    if (cached && Date.now() - cached.readAt < this.watermarkCacheTtl) return cached;

    let state: ArchiveState;
    try {
      const { rows } = await this.pool.query<{ last_archived_block: string | null }>(GET_WATERMARK);
      const raw = rows[0]?.last_archived_block ?? null;
      state = { lastArchivedBlock: raw === null ? null : Number(raw), hasArchiveTable: true };
    } catch (error) {
      if (!NO_ARCHIVE_TABLE.has((error as { code?: string }).code ?? '')) throw error;
      state = { lastArchivedBlock: null, hasArchiveTable: false };
    }

    this.cachedState = { ...state, readAt: Date.now() };
    return state;
  }

  async getBlocks(height: number, limit: number, eventNames: string[]): Promise<Block[]> {
    const { lastArchivedBlock, hasArchiveTable } = await this.getArchiveState();
    if (lastArchivedBlock !== null && height <= lastArchivedBlock) {
      throw new Error(
        `block ${height} is at or below the archive watermark ${lastArchivedBlock}: it exists ` +
          `only in the S3 Iceberg archive, not the hot indexer database`,
      );
    }

    try {
      const { rows } = await this.pool.query<Block>(
        hasArchiveTable ? getBlocksQuery('partitioned') : getBlocksQuery('legacy'),
        [height, limit, eventNames],
      );
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

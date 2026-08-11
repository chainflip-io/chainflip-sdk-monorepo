import { Client } from 'pg';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { IndexerClient } from '../indexer.js';

const LEGACY_SCHEMA = 'squid_archive_test';
const PARTITIONED_SCHEMA = 'squid_archive_test_partitioned';

// Dropped rather than CREATE IF NOT EXISTS: a run that dies before afterAll leaves the
// schema behind, and IF NOT EXISTS would then silently keep the stale table shape.
const ddl = (schema: string, partitioned: boolean) => `
  DROP SCHEMA IF EXISTS ${schema} CASCADE;
  CREATE SCHEMA ${schema};

  CREATE TABLE ${schema}.block (
    id char(16) primary key,
    height integer not null,
    hash char(66) not null,
    parent_hash char(66) not null,
    state_root char(66) not null,
    extrinsics_root char(66) not null,
    timestamp timestamptz not null,
    validator varchar,
    spec_id text not null
  );

  CREATE TABLE ${schema}.event (
    id char(23) primary key,
    block_id char(16) not null references ${schema}.block on delete cascade,
    ${partitioned ? 'block_height integer not null,' : ''}
    index_in_block integer not null,
    phase varchar not null,
    extrinsic_id char(23),
    call_id varchar(30),
    name varchar not null,
    args jsonb,
    pos integer not null
  );
`;

const ARCHIVE_PROGRESS_DDL = (schema: string) => `
  CREATE TABLE IF NOT EXISTS ${schema}.archive_progress (
    id int PRIMARY KEY DEFAULT 1,
    last_archived_block integer,
    updated_at timestamptz NOT NULL DEFAULT now(),
    CHECK (id = 1))`;

const archiveUrl = (timezone?: string, schema = LEGACY_SCHEMA) => {
  const url = new URL(process.env.DATABASE_URL!);
  const options = [`search_path=${schema}`, ...(timezone ? [`timezone=${timezone}`] : [])]
    .map((option) => `-c ${option}`)
    .join(' ');
  url.search = `options=${encodeURIComponent(options)}`;
  return url.toString();
};

const blockId = (height: number) => String(height).padStart(10, '0').concat('-aaaaa');

const insertBlock = (admin: Client, height: number, timestamp: string, schema = LEGACY_SCHEMA) =>
  admin.query(
    `INSERT INTO ${schema}.block
       (id, height, hash, parent_hash, state_root, extrinsics_root, timestamp, spec_id)
     VALUES ($1, $2, repeat('a', 66), repeat('b', 66), repeat('c', 66), repeat('d', 66), $3, $4)`,
    [blockId(height), height, timestamp, `chainflip-node@${height}`],
  );

const insertEvent = (
  admin: Client,
  height: number,
  indexInBlock: number,
  name: string,
  args: unknown,
  schema = LEGACY_SCHEMA,
) =>
  admin.query(
    `INSERT INTO ${schema}.event
       (id, block_id, ${schema === PARTITIONED_SCHEMA ? 'block_height,' : ''} index_in_block, phase, name, args, pos)
     VALUES ($1, $2, ${schema === PARTITIONED_SCHEMA ? '$6,' : ''} $3, 'ApplyExtrinsic', $4, $5, $3)`,
    [
      `${String(height).padStart(10, '0')}-${String(indexInBlock).padStart(6, '0')}-aaaaa`,
      blockId(height),
      indexInBlock,
      name,
      JSON.stringify(args),
      ...(schema === PARTITIONED_SCHEMA ? [height] : []),
    ],
  );

describe(IndexerClient, () => {
  let admin: Client;
  let client: IndexerClient;

  beforeAll(async () => {
    admin = new Client({ connectionString: process.env.DATABASE_URL });
    await admin.connect();
    await admin.query(ddl(LEGACY_SCHEMA, false));
    await admin.query(ddl(PARTITIONED_SCHEMA, true));
    client = new IndexerClient(archiveUrl(), 5_000, 0);
  });

  afterAll(async () => {
    await client.end();
    await admin.query(`DROP SCHEMA ${LEGACY_SCHEMA} CASCADE`);
    await admin.query(`DROP SCHEMA ${PARTITIONED_SCHEMA} CASCADE`);
    await admin.end();
  });

  beforeEach(async () => {
    await admin.query(`TRUNCATE ${LEGACY_SCHEMA}.block CASCADE`);
  });

  it('returns blocks from the requested height in ascending order, honouring the limit', async () => {
    for (const height of [102, 100, 101, 103]) {
      await insertBlock(admin, height, '2024-08-26T00:00:00Z');
    }

    const blocks = await client.getBlocks(101, 2, []);

    expect(blocks.map((block) => block.height)).toEqual([101, 102]);
  });

  it('returns only the requested events, ordered by index in block', async () => {
    await insertBlock(admin, 100, '2024-08-26T00:00:00Z');
    await insertEvent(admin, 100, 9, 'System.ExtrinsicSuccess', {});
    await insertEvent(admin, 100, 7, 'Swapping.SwapScheduled', { swapId: '1' });
    await insertEvent(admin, 100, 2, 'Swapping.SwapExecuted', { swapId: '2' });

    const [block] = await client.getBlocks(100, 10, [
      'Swapping.SwapScheduled',
      'Swapping.SwapExecuted',
    ]);

    expect(block.events).toEqual([
      { name: 'Swapping.SwapExecuted', indexInBlock: 2, args: { swapId: '2' } },
      { name: 'Swapping.SwapScheduled', indexInBlock: 7, args: { swapId: '1' } },
    ]);
  });

  it('returns an empty array for a block with no matching events', async () => {
    await insertBlock(admin, 100, '2024-08-26T00:00:00Z');
    await insertEvent(admin, 100, 0, 'System.ExtrinsicSuccess', {});

    const [block] = await client.getBlocks(100, 10, ['Swapping.SwapExecuted']);

    expect(block.events).toEqual([]);
  });

  it('serialises the timestamp as a UTC ISO string regardless of the session timezone', async () => {
    await insertBlock(admin, 100, '2024-08-26T00:00:00.123Z');

    const shifted = new IndexerClient(archiveUrl('America/Los_Angeles'), 5_000, 0);

    try {
      const [fromDefault] = await client.getBlocks(100, 10, []);
      const [fromShifted] = await shifted.getBlocks(100, 10, []);

      expect(fromDefault.timestamp).toBe('2024-08-26T00:00:00.123Z');
      expect(fromShifted.timestamp).toBe(fromDefault.timestamp);
    } finally {
      await shifted.end();
    }
  });

  it('exposes the block fields the event handlers read', async () => {
    await insertBlock(admin, 100, '2024-08-26T00:00:00Z');

    const [block] = await client.getBlocks(100, 10, []);

    expect(block).toEqual({
      height: 100,
      hash: 'a'.repeat(66),
      timestamp: '2024-08-26T00:00:00.000Z',
      specId: 'chainflip-node@100',
      events: [],
    });
  });

  it('uses the query without block_height when archive_progress does not exist', async () => {
    // the unpartitioned schema has no event.block_height, so picking the partitioned
    // variant here would fail outright rather than return a row
    await insertBlock(admin, 100, '2024-08-26T00:00:00Z');

    await expect(client.getBlocks(100, 10, [])).resolves.toHaveLength(1);
  });

  describe('post-migration archive', () => {
    let migrated: IndexerClient;

    const setWatermark = (value: number | null) =>
      admin.query(
        `${ARCHIVE_PROGRESS_DDL(PARTITIONED_SCHEMA)};
         INSERT INTO ${PARTITIONED_SCHEMA}.archive_progress (id, last_archived_block)
           VALUES (1, ${value ?? 'NULL'})
           ON CONFLICT (id) DO UPDATE SET last_archived_block = excluded.last_archived_block`,
      );

    beforeAll(() => {
      migrated = new IndexerClient(archiveUrl(undefined, PARTITIONED_SCHEMA), 5_000, 0);
    });

    afterAll(() => migrated.end());

    beforeEach(async () => {
      await admin.query(`TRUNCATE ${PARTITIONED_SCHEMA}.block CASCADE`);
      await admin.query(`DROP TABLE IF EXISTS ${PARTITIONED_SCHEMA}.archive_progress`);
    });

    it('returns the same filtered, ordered events as the unpartitioned query', async () => {
      await setWatermark(null);
      const insert = (h: number, i: number, name: string, args: unknown) =>
        insertEvent(admin, h, i, name, args, PARTITIONED_SCHEMA);
      await insertBlock(admin, 100, '2024-08-26T00:00:00Z', PARTITIONED_SCHEMA);
      await insert(100, 9, 'System.ExtrinsicSuccess', {});
      await insert(100, 7, 'Swapping.SwapScheduled', { swapId: '1' });
      await insert(100, 2, 'Swapping.SwapExecuted', { swapId: '2' });

      const [block] = await migrated.getBlocks(100, 10, [
        'Swapping.SwapScheduled',
        'Swapping.SwapExecuted',
      ]);

      expect(block.events).toEqual([
        { name: 'Swapping.SwapExecuted', indexInBlock: 2, args: { swapId: '2' } },
        { name: 'Swapping.SwapScheduled', indexInBlock: 7, args: { swapId: '1' } },
      ]);
    });

    // The two queries are result-equivalent on real data, so nothing else here can tell
    // which one ran. A row whose block_height disagrees with its block is impossible in
    // production (the composite FK forbids it) but is a clean discriminator: only the
    // partitioned query, which constrains block_height, filters it out.
    it('constrains block_height, which is what lets the partitioned schema prune', async () => {
      await setWatermark(null);
      await insertBlock(admin, 100, '2024-08-26T00:00:00Z', PARTITIONED_SCHEMA);
      await admin.query(
        `INSERT INTO ${PARTITIONED_SCHEMA}.event
           (id, block_id, block_height, index_in_block, phase, name, args, pos)
         VALUES ('0000000100-000001-aaaaa', $1, 999, 1, 'ApplyExtrinsic', 'Swapping.SwapExecuted', '{}', 1)`,
        [blockId(100)],
      );

      const [block] = await migrated.getBlocks(100, 10, ['Swapping.SwapExecuted']);

      expect(block.events).toEqual([]);
    });

    it('reads the hot database when nothing has been archived yet', async () => {
      await setWatermark(null);
      await insertBlock(admin, 100, '2024-08-26T00:00:00Z', PARTITIONED_SCHEMA);

      await expect(migrated.getBlocks(100, 10, [])).resolves.toHaveLength(1);
    });

    it('reads the hot database for heights above the watermark', async () => {
      await setWatermark(99);
      await insertBlock(admin, 100, '2024-08-26T00:00:00Z', PARTITIONED_SCHEMA);

      await expect(migrated.getBlocks(100, 10, [])).resolves.toHaveLength(1);
    });

    it('refuses heights at the watermark, which are archived to S3 only', async () => {
      await setWatermark(100);
      await insertBlock(admin, 100, '2024-08-26T00:00:00Z', PARTITIONED_SCHEMA);

      await expect(migrated.getBlocks(100, 10, [])).rejects.toThrow(
        /only in the S3 Iceberg archive/,
      );
      await expect(migrated.getBlocks(100, 10, [])).rejects.toThrow(/watermark 100/);
    });

    it('refuses heights below the watermark', async () => {
      await setWatermark(500);

      await expect(migrated.getBlocks(100, 10, [])).rejects.toThrow(/block 100 .* watermark 500/);
    });

    it('reports reaching the tip when the hot database is empty and nothing is archived', async () => {
      await setWatermark(null);

      await expect(migrated.getBlocks(100, 10, [])).resolves.toEqual([]);
    });

    it('caches the watermark for the ttl, then picks up an advance on the next read', async () => {
      const caching = new IndexerClient(archiveUrl(undefined, PARTITIONED_SCHEMA), 5_000, 150);

      try {
        await setWatermark(null);
        await insertBlock(admin, 100, '2024-08-26T00:00:00Z', PARTITIONED_SCHEMA);
        await expect(caching.getBlocks(100, 10, [])).resolves.toHaveLength(1);

        await setWatermark(500);
        await expect(caching.getBlocks(100, 10, [])).resolves.toHaveLength(1);

        await new Promise((resolve) => {
          setTimeout(resolve, 250);
        });
        await expect(caching.getBlocks(100, 10, [])).rejects.toThrow(
          /only in the S3 Iceberg archive/,
        );
      } finally {
        await caching.end();
      }
    });
  });
});

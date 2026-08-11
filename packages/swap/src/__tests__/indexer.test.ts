import { Client } from 'pg';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { IndexerClient } from '../indexer.js';

const SCHEMA = 'squid_archive_test';

const DDL = `
  CREATE SCHEMA IF NOT EXISTS ${SCHEMA};

  CREATE TABLE IF NOT EXISTS ${SCHEMA}.block (
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

  CREATE TABLE IF NOT EXISTS ${SCHEMA}.event (
    id char(23) primary key,
    block_id char(16) not null references ${SCHEMA}.block on delete cascade,
    index_in_block integer not null,
    phase varchar not null,
    extrinsic_id char(23),
    call_id varchar(30),
    name varchar not null,
    args jsonb,
    pos integer not null
  );
`;

const archiveUrl = (timezone?: string) => {
  const url = new URL(process.env.DATABASE_URL!);
  const options = [`search_path=${SCHEMA}`, ...(timezone ? [`timezone=${timezone}`] : [])]
    .map((option) => `-c ${option}`)
    .join(' ');
  url.search = `options=${encodeURIComponent(options)}`;
  return url.toString();
};

const blockId = (height: number) => String(height).padStart(10, '0').concat('-aaaaa');

const insertBlock = (admin: Client, height: number, timestamp: string) =>
  admin.query(
    `INSERT INTO ${SCHEMA}.block
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
) =>
  admin.query(
    `INSERT INTO ${SCHEMA}.event
       (id, block_id, index_in_block, phase, name, args, pos)
     VALUES ($1, $2, $3, 'ApplyExtrinsic', $4, $5, $3)`,
    [
      `${String(height).padStart(10, '0')}-${String(indexInBlock).padStart(6, '0')}-aaaaa`,
      blockId(height),
      indexInBlock,
      name,
      JSON.stringify(args),
    ],
  );

describe(IndexerClient, () => {
  let admin: Client;
  let client: IndexerClient;

  beforeAll(async () => {
    admin = new Client({ connectionString: process.env.DATABASE_URL });
    await admin.connect();
    await admin.query(DDL);
    client = new IndexerClient(archiveUrl(), 5_000);
  });

  afterAll(async () => {
    await client.end();
    await admin.query(`DROP SCHEMA ${SCHEMA} CASCADE`);
    await admin.end();
  });

  beforeEach(async () => {
    await admin.query(`TRUNCATE ${SCHEMA}.block CASCADE`);
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

    const shifted = new IndexerClient(archiveUrl('America/Los_Angeles'), 5_000);

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
});

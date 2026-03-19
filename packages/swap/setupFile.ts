/* eslint-disable n/no-process-env */
// eslint-disable-next-line import/no-extraneous-dependencies
import { PrismaClient } from '@prisma/swapping';
import { randomUUID } from 'crypto';
import { Redis } from 'ioredis';
import { beforeAll, vi } from 'vitest';

vi.mock('./src/config/env.js');
vi.mock('./src/pricing/index.js');

const dbUrl = new URL(process.env.DATABASE_URL!);
const tempDbUrl = new URL(process.env.DATABASE_URL!);

tempDbUrl.pathname += `_vitest_${process.env.VITEST_POOL_ID}`;

process.env.DATABASE_URL = tempDbUrl.toString();

const withMutex = async (cb: () => Promise<void>) => {
  const redis = new Redis('redis://localhost:6379');
  const id = randomUUID();

  let locked = false;
  const vitexMutex = 'vitex_mutex';

  try {
    while (!locked) {
      await redis.call('SET', vitexMutex, id, 'NX', 'PX', '30000');
      const lockOwner = await redis.get(vitexMutex);
      locked = lockOwner === id;
    }

    await cb();

    const unlockScript = `
    if redis.call("get", KEYS[1]) == ARGV[1] then
      return redis.call("del", KEYS[1])
    else
      return 0
    end
    `;
    await redis.eval(unlockScript, 1, vitexMutex, id);
  } finally {
    await redis.quit();
  }
};

const dbExists = async (client: PrismaClient, dbName: string): Promise<boolean> => {
  const result = await client.$queryRaw<{ exists: boolean }[]>`
    SELECT EXISTS(SELECT 1 FROM pg_database WHERE datname = ${dbName})
  `;
  return result[0]?.exists ?? false;
};

const truncateAllTables = async (client: PrismaClient): Promise<void> => {
  const tables = await client.$queryRaw<{ schemaname: string; tablename: string }[]>`
    SELECT schemaname, tablename
    FROM pg_tables
    WHERE schemaname IN ('public', 'private')
    AND tablename != '_prisma_migrations'
  `;
  if (tables.length > 0) {
    const tableList = tables.map((t) => `"${t.schemaname}"."${t.tablename}"`).join(', ');
    await client.$executeRawUnsafe(`TRUNCATE ${tableList} CASCADE`);
  }
};

beforeAll(async () => {
  const tempDbName = tempDbUrl.pathname.slice(1);
  const templateDbName = dbUrl.pathname.slice(1);

  await withMutex(async () => {
    const adminClient = new PrismaClient({ datasourceUrl: dbUrl.toString() });
    try {
      const exists = await dbExists(adminClient, tempDbName);
      if (!exists) {
        await adminClient.$queryRawUnsafe(
          `CREATE DATABASE "${tempDbName}" TEMPLATE "${templateDbName}"`,
        );
      }
    } finally {
      await adminClient.$disconnect();
    }
  });

  // Truncate tables to ensure clean state (works for both new and existing DBs)
  const tempClient = new PrismaClient({ datasourceUrl: tempDbUrl.toString() });
  await truncateAllTables(tempClient);
  await tempClient.$disconnect();

  global.fetch = vi
    .fn()
    .mockRejectedValue(new Error('fetch is not implemented in this environment'));
});

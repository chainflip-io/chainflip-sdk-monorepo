/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable no-param-reassign */
/* eslint-disable n/no-process-env */
import 'dotenv/config';
import { PrismaClient } from '.prisma/client';
import { exec } from 'child_process';
import { randomUUID } from 'crypto';
import { promisify } from 'util';
import type { Environment } from 'vitest/environments';

const env: Environment = {
  name: 'custom',
  transformMode: 'ssr',
  async setup(global) {
    const { vi } = await import('vitest');
    const execAsync = promisify(exec);

    const dbName = randomUUID();
    const main = `postgresql://${process.env.DB_USER}:${process.env.DB_PASS}@127.0.0.1:5432/swap_test`;
    await execAsync(`DATABASE_URL=${main} pnpm prisma migrate deploy`);
    const client = new PrismaClient({ datasourceUrl: main });
    await client.$executeRawUnsafe(
      `CREATE DATABASE "${dbName}" WITH TEMPLATE swap_test OWNER postgres`,
    );

    process.env.DATABASE_URL = `postgresql://${process.env.DB_USER}:${process.env.DB_PASS}@127.0.0.1:5432/${dbName}`;

    global.fetch = vi
      .fn()
      .mockRejectedValue(new Error('fetch is not implemented in this environment'));

    // custom setup
    return {
      async teardown() {
        await client.$executeRawUnsafe(`DROP DATABASE "${dbName}" WITH (FORCE)`);
      },
    };
  },
};

export default env;

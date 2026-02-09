/* eslint-disable n/no-process-env */
import 'dotenv/config';
import { exec } from 'child_process';
import { Client } from 'pg';
import { promisify } from 'util';
import type { TestProject } from 'vitest/node';

const dbUrl = new URL(
  process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/swap',
);
const DB_USER = dbUrl.username;
const DB_PASS = dbUrl.password;
const DB_HOST = dbUrl.host;
const DB_NAME = dbUrl.pathname.split('/')[1];

process.env.DATABASE_URL = `postgresql://${DB_USER}:${DB_PASS}@${DB_HOST}/${DB_NAME}_test?schema=public`;

const execAsync = promisify(exec);

export async function setup({ provide: _provide }: TestProject) {
  await execAsync('pnpm prisma migrate reset --force');
  const pg = new Client(process.env.DATABASE_URL!);
  try {
    await pg.connect();
    const { rows } = await pg.query<{ datname: string }>(
      String.raw`select datname from pg_database where datname like '%\_vitest\_%'`,
    );
    await Promise.all(
      rows.map(({ datname }) => pg.query(`drop database "${datname}" with (force)`)),
    );
  } finally {
    await pg.end();
  }
}

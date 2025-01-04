import 'dotenv/config';
import { exec } from 'child_process';
import { promisify } from 'util';
import type { GlobalSetupContext } from 'vitest/node';

const execAsync = promisify(exec);

export async function setup({ provide: _provide }: GlobalSetupContext) {
  await execAsync('pnpm prisma migrate reset --force');
}

//  export async function teardown() {
//   console.log('teardown servers etc.');
//  }

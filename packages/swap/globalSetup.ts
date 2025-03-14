import 'dotenv/config';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function setup() {
  await execAsync('pnpm prisma migrate reset --force');
}

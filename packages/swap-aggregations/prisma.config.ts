import 'dotenv/config';
import { defineConfig } from 'prisma/config';

// Prisma CLI config for the swap-aggregations service (migrations, client generation).
const url = process.env.INTEGRATORS_DATABASE_URL ?? '';

// Migrating with any other schema would put our `_prisma_migrations` table next to the swap
// service's in `public` and break both packages' migration history.
if (url && new URL(url).searchParams.get('schema') !== 'integrators') {
  throw new Error('INTEGRATORS_DATABASE_URL must end with `?schema=integrators`');
}

export default defineConfig({
  schema: './prisma/schema.prisma',
  datasource: { url },
});

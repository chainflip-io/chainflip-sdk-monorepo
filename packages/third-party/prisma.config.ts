import 'dotenv/config';
import { defineConfig } from 'prisma/config';

const url = process.env.THIRD_PARTY_DATABASE_URL ?? '';

// Migrating with any other schema would put our `_prisma_migrations` table next to the swap
// service's in `public` and break both packages' migration history.
if (url && new URL(url).searchParams.get('schema') !== 'third_party') {
  throw new Error('THIRD_PARTY_DATABASE_URL must end with `?schema=third_party`');
}

export default defineConfig({
  schema: './prisma/schema.prisma',
  datasource: { url },
});

import 'dotenv/config';
import { defineConfig } from 'prisma/config';

// Only used by the integrators service (see src/integrators). Nothing here is published to npm.
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

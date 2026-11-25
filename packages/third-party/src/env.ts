import { z } from 'zod';

const envVar = z.string().trim();

const csvSet = envVar.default('').transform(
  (value) =>
    new Set(
      value
        .split(',')
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean),
    ),
);

const thirdPartyDatabaseUrl = envVar
  .url()
  .refine((url) => /^postgres(ql)?:\/\//.test(url), 'must be a postgres connection string')
  // keeps our `_prisma_migrations` table out of the swap service's `public` schema
  .refine(
    (url) => new URL(url).searchParams.get('schema') === 'third_party',
    'must end with `?schema=third_party`',
  );

const schema = z.object({
  // the routes are only served on mainnet, see server.ts
  CHAINFLIP_NETWORK: z.enum(['backspin', 'sisyphos', 'perseverance', 'mainnet']),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('production'),
  THIRD_PARTY_APP_PORT: envVar.default('8080').transform(Number),
  // must end with `?schema=third_party`, see prisma/schema.prisma
  THIRD_PARTY_DATABASE_URL: thirdPartyDatabaseUrl,
  // origins allowed by CORS, e.g. `https://swap.chainflip.io`. empty = allow all (local dev only)
  THIRD_PARTY_ALLOWED_ORIGINS: csvSet,
  LOG_LEVEL: envVar.default('info'),
  // max requests per client IP per minute across all /third-party routes
  THIRD_PARTY_RATE_LIMIT_PER_MINUTE: envVar
    .default('120')
    .transform(Number)
    .pipe(z.number().int().positive()),
});

export type Env = z.output<typeof schema>;

const env: Env = schema.parse(process.env);

export default env;

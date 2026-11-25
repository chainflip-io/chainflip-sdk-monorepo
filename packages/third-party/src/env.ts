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
  NODE_ENV: z.enum(['development', 'production', 'test']).default('production'),
  THIRD_PARTY_APP_PORT: envVar.default('8080').transform(Number),
  // must end with `?schema=third_party`, see prisma/schema.prisma
  THIRD_PARTY_DATABASE_URL: thirdPartyDatabaseUrl,
  // origins allowed by CORS, e.g. `https://swap.chainflip.io`. empty = allow all (local dev only)
  THIRD_PARTY_ALLOWED_ORIGINS: csvSet,
  LOG_LEVEL: envVar.default('info'),
  // max requests per client IP per minute across all /v2/third-party routes
  THIRD_PARTY_RATE_LIMIT_PER_MINUTE: envVar
    .default('120')
    .transform(Number)
    .pipe(z.number().int().positive()),
  SWAPKIT_API_URL: envVar.url().default('https://api.swapkit.dev'),
  // sent as the `x-api-key` header; only this pod ever sees it
  SWAPKIT_API_KEY: envVar.min(1),
  // our fee in bps (0-1000), forced on every quote regardless of what the browser sends.
  // default matches the frontend's AFFILIATE_FEE_BPS. payout addresses are configured per provider
  // in the SwapKit dashboard, not here.
  SWAPKIT_AFFILIATE_FEE_BPS: envVar
    .default('30')
    .transform(Number)
    .pipe(z.number().int().min(0).max(1000)),
});

export type Env = z.output<typeof schema>;

const env: Env = schema.parse(process.env);

export default env;

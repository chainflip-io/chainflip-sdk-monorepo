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

const integratorsDatabaseUrl = envVar
  .url()
  .refine((url) => /^postgres(ql)?:\/\//.test(url), 'must be a postgres connection string')
  // keeps our `_prisma_migrations` table out of the swap service's `public` schema
  .refine(
    (url) => new URL(url).searchParams.get('schema') === 'integrators',
    'must end with `?schema=integrators`',
  );

const schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('production'),
  INTEGRATORS_APP_PORT: envVar.default('8080').transform(Number),
  // must end with `?schema=integrators`, see prisma/schema.prisma
  INTEGRATORS_DATABASE_URL: integratorsDatabaseUrl,
  // origins allowed by CORS, e.g. `https://swap.chainflip.io`. empty = allow all (local dev only)
  INTEGRATORS_ALLOWED_ORIGINS: csvSet,
  LOG_LEVEL: envVar.default('info'),
  SWAPKIT_API_URL: envVar.url().default('https://api.swapkit.dev'),
  // optional until the SwapKit client is implemented; sent as the `x-api-key` header
  SWAPKIT_API_KEY: envVar.optional(),
  // our fee in bps (0-1000). when unset, the fee tiers configured in the SwapKit dashboard apply.
  // fee payout addresses are configured per provider in the dashboard, not here.
  SWAPKIT_AFFILIATE_FEE_BPS: envVar
    .optional()
    .transform((value) => (value ? Number(value) : undefined))
    .pipe(z.number().int().min(0).max(1000).optional()),
});

export type Env = z.output<typeof schema>;

const env: Env = schema.parse(process.env);

export default env;

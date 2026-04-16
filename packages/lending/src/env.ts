import { z } from 'zod';

const urlWithProtocol = <T extends string>(protocol: T) =>
  envVar
    .url()
    .refine((url): url is `${T}://${string}` | `${T}s://${string}` =>
      new RegExp(String.raw`^${protocol}s?://`).test(url),
    );
const envVar = z.string().trim();
const optionalBoolean = envVar.optional().transform((value) => value?.toUpperCase() === 'TRUE');
const httpUrl = urlWithProtocol('http');
const optionalNumber = (defaultValue: number) =>
  envVar.optional().transform((n) => Number(n) || defaultValue);
const nodeEnv = z.enum(['development', 'production', 'test']);


const envSchema = z.object({
  START_PROCESSOR: optionalBoolean,
  START_HTTP_SERVICE: optionalBoolean,
  DATABASE_URL: z.string().url(), 
  LENDING_APP_PORT: optionalNumber(3000),
  INGEST_GATEWAY_URL: httpUrl,
  PROCESSOR_BATCH_SIZE: optionalNumber(50),
  PROCESSOR_TRANSACTION_TIMEOUT: optionalNumber(10_000),
  NODE_ENV: nodeEnv.default('production'),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
});

export type Env = z.infer<typeof envSchema>;

export const env: Env = envSchema.parse(process.env);
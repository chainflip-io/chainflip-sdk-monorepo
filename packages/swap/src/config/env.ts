import { z } from 'zod';

const httpUrl = z.string().url().startsWith('http');
const wsUrl = z.string().url().startsWith('ws');

const optionalBoolean = z
  .string()
  .optional()
  .transform((value) => value?.toUpperCase() === 'TRUE');

const optionalNumber = (defaultValue: number) =>
  z
    .string()
    .optional()
    .transform((n) => Number(n) || defaultValue);

const chainflipNetwork = z.enum([
  'backspin',
  'sisyphos',
  'perseverance',
  'mainnet',
]);

const nodeEnv = z.enum(['development', 'production', 'test']);

export default z
  .object({
    RPC_NODE_HTTP_URL: httpUrl,
    START_HTTP_SERVICE: optionalBoolean,
    START_PROCESSOR: optionalBoolean,
    SWAPPING_APP_PORT: optionalNumber(8080),
    BITCOIN_DEPOSIT_TRACKER_URL: httpUrl.optional(),
    RPC_BROKER_HTTPS_URL: httpUrl,
    RPC_NODE_WSS_URL: wsUrl,
    CHAINFLIP_NETWORK: chainflipNetwork,
    QUOTE_TIMEOUT: optionalNumber(1000),
    NODE_ENV: nodeEnv.default('production'),
    CHAINALYSIS_API_KEY: z.string().optional(),
    INGEST_GATEWAY_URL: httpUrl,
    PROCESSOR_BATCH_SIZE: optionalNumber(50),
    PROCESSOR_TRANSACTION_TIMEOUT: optionalNumber(10_000),
  })
  // eslint-disable-next-line n/no-process-env
  .parse(process.env);

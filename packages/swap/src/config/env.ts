import { z } from 'zod';
import { InternalAssets } from '@/shared/enums';

const envVar = z.string().trim();

const urlWithProtocol = <T extends string>(protocol: T) =>
  envVar
    .url()
    .refine((url): url is `${T}://${string}` | `${T}s://${string}` =>
      new RegExp(String.raw`^${protocol}s?://`).test(url),
    );

const httpUrl = urlWithProtocol('http');
const wsUrl = urlWithProtocol('ws');
const redisUrl = urlWithProtocol('redis');

const optionalBoolean = envVar.optional().transform((value) => value?.toUpperCase() === 'TRUE');

const optionalNumber = (defaultValue: number) =>
  envVar.optional().transform((n) => Number(n) || defaultValue);

const optionalString = (defaultValue: string) => envVar.default(defaultValue);

const chainflipNetwork = z.enum(['backspin', 'sisyphos', 'perseverance', 'mainnet']);

const nodeEnv = z.enum(['development', 'production', 'test']);

export default z
  .object({
    RPC_NODE_HTTP_URL: httpUrl,
    START_HTTP_SERVICE: optionalBoolean,
    START_PROCESSOR: optionalBoolean,
    SWAPPING_APP_PORT: optionalNumber(8080),
    RPC_BROKER_HTTPS_URL: httpUrl,
    RPC_NODE_WSS_URL: wsUrl,
    CHAINFLIP_NETWORK: chainflipNetwork,
    QUOTE_TIMEOUT: optionalNumber(1000),
    NODE_ENV: nodeEnv.default('production'),
    INGEST_GATEWAY_URL: httpUrl,
    PROCESSOR_BATCH_SIZE: optionalNumber(50),
    PROCESSOR_TRANSACTION_TIMEOUT: optionalNumber(10_000),
    REDIS_URL: redisUrl.optional(),
    MAINTENANCE_MODE: optionalBoolean,
    LIQUIDITY_WARNING_THRESHOLD: optionalNumber(-5),
    COINGECKO_API_KEY: z.string().optional(),
    DCA_USD_CHUNK_SIZE: optionalString('{}').transform((string) => {
      try {
        return z
          .array(
            z.object({
              asset: z.nativeEnum(InternalAssets),
              usdChunkSize: z.number(),
            }),
          )
          .parse(JSON.parse(string));
      } catch (err) {
        const error = err as Error;
        // eslint-disable-next-line no-console
        console.warn({
          message: `Could not parse DCA_USD_CHUNK_SIZE variable. error: "${error?.message}"`,
        });
        return undefined;
      }
    }),
    DCA_CHUNK_INTERVAL_SECONDS: optionalNumber(2),
    DISABLED_INTERNAL_ASSETS: optionalString('').transform((string) =>
      string.split(',').map((asset) => {
        if (asset && !(asset in InternalAssets)) {
          // eslint-disable-next-line no-console
          console.warn({
            message: `unexpected value in DISABLED_INTERNAL_ASSETS variable: "${asset}"`,
          });
        }
        return asset;
      }),
    ),
    MAX_CHANNELS_OPEN_PER_ADDRESS: optionalNumber(25),
    // in case we want to disable quoting as a part of maintenance mode
    DISABLE_QUOTING: optionalBoolean,
    DISABLE_BOOST_QUOTING: optionalBoolean,
    ELLIPTIC_API_KEY: z.string().optional(),
    ELLIPTIC_API_SECRET: z.string().optional(),
    ELLIPTIC_RISK_SCORE_TOLERANCE: optionalNumber(9),
  })
  // eslint-disable-next-line n/no-process-env
  .parse(process.env);

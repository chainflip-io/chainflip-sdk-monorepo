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

const internalAssetCsv = (name: string) =>
  optionalString('').transform((string) =>
    string.split(',').map((asset) => {
      if (asset && !(asset in InternalAssets)) {
        // eslint-disable-next-line no-console
        console.warn({
          message: `unexpected value in ${name} variable: "${asset}"`,
        });
      }
      return asset;
    }),
  );

export default z
  .object({
    RPC_NODE_HTTP_URL: httpUrl,
    START_HTTP_SERVICE: optionalBoolean,
    START_PROCESSOR: optionalBoolean,
    SWAPPING_APP_PORT: optionalNumber(8080),
    RPC_BROKER_HTTPS_URL: httpUrl,
    RPC_NODE_WSS_URL: wsUrl,
    SOLANA_RPC_HTTP_URL: httpUrl.optional(),
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
    DCA_DEFAULT_CHUNK_SIZE_USD: optionalNumber(3000),
    DCA_CHUNK_SIZE_USD: optionalString('{}').transform((string) => {
      try {
        return z.record(z.nativeEnum(InternalAssets), z.number()).parse(JSON.parse(string));
      } catch (err) {
        const error = err as Error;
        // eslint-disable-next-line no-console
        console.warn({
          message: `Could not parse DCA_USD_CHUNK_SIZE variable. error: "${error?.message}"`,
        });
        return undefined;
      }
    }),
    DCA_CHUNK_PRICE_IMPACT_PERCENT: optionalString('{ "Flip": 0.25 }').transform((string) => {
      try {
        return z.record(z.nativeEnum(InternalAssets), z.number()).parse(JSON.parse(string));
      } catch (err) {
        const error = err as Error;
        // eslint-disable-next-line no-console
        console.warn({
          message: `Could not parse DCA_CHUNK_PRICE_IMPACT_PERCENT variable. error: "${error?.message}"`,
        });
        return undefined;
      }
    }),
    DCA_CHUNK_INTERVAL_BLOCKS: optionalNumber(2),
    FULLY_DISABLED_INTERNAL_ASSETS: internalAssetCsv('FULLY_DISABLED_INTERNAL_ASSETS'),
    DISABLED_DEPOSIT_INTERNAL_ASSETS: internalAssetCsv('DISABLED_DEPOSIT_INTERNAL_ASSETS'),
    DISABLED_DESTINATION_INTERNAL_ASSETS: internalAssetCsv('DISABLED_DESTINATION_INTERNAL_ASSETS'),
    MAX_CHANNELS_OPEN_PER_ADDRESS: optionalNumber(25),
    DISABLE_DCA_QUOTING: optionalBoolean,
    // in case we want to disable quoting as a part of maintenance mode
    DISABLE_QUOTING: optionalBoolean,
    DISABLE_BOOST_QUOTING: optionalBoolean,
    ELLIPTIC_API_KEY: z.string().optional(),
    ELLIPTIC_API_SECRET: z.string().optional(),
    ELLIPTIC_RISK_SCORE_TOLERANCE: optionalNumber(9),
    STABLE_COIN_SLIPPAGE_MIN_PRICE: optionalNumber(0.995).describe(
      'The targeted minimum price for stable coin swaps when providing a slippage recommendation',
    ),
    SOLANA_TX_REF_QUEUE_INTERVAL: optionalNumber(1000),
    QUOTER_BALANCE_TRACKER_ACTIVE: optionalBoolean.default('true'),
  })
  // eslint-disable-next-line n/no-process-env
  .parse(process.env);

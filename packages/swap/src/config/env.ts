import {
  ChainflipAsset,
  chainflipAssets,
  ChainflipNetwork,
  chainflipNetworks,
  InternalAssetMap,
} from '@chainflip/utils/chainflip';
import { z } from 'zod';
import { envSafeAssetBlacklist } from '@/shared/consts.js';
import { isNotNullish } from '@/shared/guards.js';

const logWarning = (message: string, meta: Record<string, unknown>) =>
  // eslint-disable-next-line no-console
  console.warn({ message, ...meta });

const chainflipNetwork = z.enum(chainflipNetworks);

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

const nodeEnv = z.enum(['development', 'production', 'test']);

const internalAssetCsv = (name: string) =>
  optionalString('').transform(
    (string) =>
      new Set(
        string.split(',').filter((asset): asset is ChainflipAsset => {
          if (!asset) return false;
          const isValid = chainflipAssets.includes(asset as ChainflipAsset);
          if (!isValid) {
            logWarning('incorrect asset in internal asset csv', {
              asset,
              name,
            });
          }
          return isValid;
        }),
      ),
  );

const internalAssetMap = <Z extends z.ZodTypeAny>(
  name: string,
  defaultValue: Partial<InternalAssetMap<z.output<Z>>>,
  valueSchema: Z,
) =>
  optionalString(JSON.stringify(defaultValue)).transform((string) => {
    const assetsSchema = z.enum(chainflipAssets);
    return Object.fromEntries(
      Object.entries(JSON.parse(string))
        .map(([key, value]) => {
          const parsedKey = assetsSchema.safeParse(key);
          if (!parsedKey.success) {
            logWarning('invalid asset in internal asset map', {
              name,
              key,
              error: parsedKey.error.message,
            });
            return null;
          }
          const parsedValue = valueSchema.safeParse(value);
          if (!parsedValue.success) {
            logWarning('invalid value in internal asset map', {
              name,
              key: parsedKey.data,
              value,
              error: parsedValue.error.message,
            });
            return null;
          }

          return [parsedKey.data, parsedValue.data] as const;
        })
        .filter(isNotNullish),
    );
  });

export default z
  .object({
    RPC_NODE_HTTP_URL: httpUrl,
    START_HTTP_SERVICE: optionalBoolean,
    START_PROCESSOR: optionalBoolean,
    SWAPPING_APP_PORT: optionalNumber(8080),
    RPC_BROKER_HTTPS_URL: httpUrl,
    RPC_NODE_WSS_URL: wsUrl,
    SOLANA_RPC_HTTP_URL: httpUrl.optional(),
    BITCOIN_RPC_HTTP_URL: httpUrl.optional(),
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
    DCA_DEFAULT_SELL_CHUNK_SIZE_USD: optionalNumber(10000),
    DCA_SELL_CHUNK_SIZE_USD: internalAssetMap('DCA_SELL_CHUNK_SIZE_USD', {}, z.number()),
    DCA_BUY_CHUNK_SIZE_USD: internalAssetMap('DCA_BUY_CHUNK_SIZE_USD', {}, z.number()),
    DCA_100K_USD_PRICE_IMPACT_PERCENT: internalAssetMap(
      'DCA_100K_USD_PRICE_IMPACT_PERCENT',
      {},
      z.number(),
    ),
    QUOTING_BASE_SLIPPAGE: internalAssetMap('QUOTING_BASE_SLIPPAGE', {}, z.number()),
    QUOTER_DCA_V2_DEPOSIT_ASSETS: internalAssetCsv('QUOTER_DCA_V2_DEPOSIT_ASSETS'),
    QUOTER_DCA_V2_DESTINATION_ASSETS: internalAssetCsv('QUOTER_DCA_V2_DESTINATION_ASSETS'),
    QUOTER_DCA_V2_MAX_USD_VALUE: envVar
      .optional()
      .transform((value) => Number(value) || undefined)
      .describe(
        'The upper limit in USD value for DCA v2 eligibility. If undefined, DCA v2 is disabled.',
      ),
    DCA_CHUNK_INTERVAL_BLOCKS: optionalNumber(2),
    FULLY_DISABLED_INTERNAL_ASSETS: internalAssetCsv('FULLY_DISABLED_INTERNAL_ASSETS').transform(
      (set) =>
        new Set([
          ...set,
          // eslint-disable-next-line n/no-process-env
          ...envSafeAssetBlacklist(process.env.CHAINFLIP_NETWORK as ChainflipNetwork),
        ]),
    ),
    DCA_DISABLED_INTERNAL_ASSETS: internalAssetCsv('DCA_DISABLED_INTERNAL_ASSETS'),
    DISABLED_DEPOSIT_INTERNAL_ASSETS: internalAssetCsv('DISABLED_DEPOSIT_INTERNAL_ASSETS'),
    DISABLED_DESTINATION_INTERNAL_ASSETS: internalAssetCsv('DISABLED_DESTINATION_INTERNAL_ASSETS'),
    MAX_CHANNELS_OPEN_PER_ADDRESS: optionalNumber(25),
    DISABLE_DCA_QUOTING: optionalBoolean,
    // in case we want to disable quoting as a part of maintenance mode
    DISABLE_QUOTING: optionalBoolean,
    DISABLE_BOOST_QUOTING: optionalBoolean,
    STABLE_COIN_SLIPPAGE_MIN_PRICE: optionalNumber(0.995).describe(
      'The targeted minimum price for stable coin swaps when providing a slippage recommendation',
    ),
    SOLANA_TX_REF_QUEUE_INTERVAL: optionalNumber(1000),
    QUOTER_BALANCE_TRACKER_ACTIVE: optionalBoolean.default('true'),
    QUOTER_BALANCE_TOLERANCE_PERCENT: optionalNumber(10),
    QUOTER_USE_MEV_FACTOR: optionalBoolean,
    BROKER_COMMISSION_BPS: optionalNumber(0),
    RPC_COMMISSION_BROKER_HTTPS_URL: httpUrl.optional(),
    DISABLE_RECOMMENDED_LIVE_PRICE_SLIPPAGE: optionalBoolean,
    RATE_LIMIT_WINDOW_MS: optionalNumber(60_000),
    RATE_LIMIT_MAX_REQUESTS: optionalNumber(200),
  })
  // eslint-disable-next-line n/no-process-env
  .parse(process.env);

import {
  ChainflipAsset,
  chainflipAssets,
  chainflipNetworks,
  InternalAssetMap,
} from '@chainflip/utils/chainflip';
import { z } from 'zod';

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
            // eslint-disable-next-line no-console -- prevents a circular dependency
            console.warn({ message: `unexpected value in ${name} variable: "${asset}"` });
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
    try {
      return z.record(z.enum(chainflipAssets), valueSchema).parse(JSON.parse(string));
    } catch (err) {
      const error = err as Error;
      // eslint-disable-next-line no-console
      console.warn({
        message: `Could not parse ${name} variable. error: "${error?.message}"`,
      });
      return {};
    }
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
    DCA_DEFAULT_CHUNK_SIZE_USD: optionalNumber(3000),
    DCA_CHUNK_SIZE_USD: internalAssetMap('DCA_CHUNK_SIZE_USD', {}, z.number()),
    DCA_CHUNK_PRICE_IMPACT_PERCENT: internalAssetMap(
      'DCA_CHUNK_PRICE_IMPACT_PERCENT',
      { Flip: 0.25 },
      z.number(),
    ),
    QUOTING_BASE_SLIPPAGE: internalAssetMap('QUOTING_BASE_SLIPPAGE', {}, z.number()),
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
    QUOTER_BALANCE_TOLERANCE_PERCENT: optionalNumber(10),
    QUOTER_USE_AUGMENT: optionalBoolean,
    BROKER_COMMISSION_BPS: optionalNumber(0),
    RPC_COMMISSION_BROKER_HTTPS_URL: httpUrl.optional(),
    ON_CHAIN_DEFAULT_NETWORK_FEE_BPS: optionalNumber(5).transform((n) => BigInt(n)),
    ON_CHAIN_STABLECOIN_NETWORK_FEE_BPS: optionalNumber(5).transform((n) => BigInt(n)),
    MINIMUM_NETWORK_FEE_USDC: optionalNumber(0.5).transform((v) => BigInt(v * 1e6)),
  })
  // eslint-disable-next-line n/no-process-env
  .parse(process.env);

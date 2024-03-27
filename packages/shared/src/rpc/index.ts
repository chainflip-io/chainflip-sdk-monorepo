import axios from 'axios';
import { z } from 'zod';
import { ChainflipNetwork, ChainflipNetworks, UncheckedAssetAndChain } from '../enums';
import { hexString } from '../parsers';

const numberOrHex = z.union([z.string(), z.number()]).transform((str) => BigInt(str));

type CamelCase<T> = T extends string
  ? T extends `${infer F}_${infer R}`
    ? `${F}${Capitalize<CamelCase<R>>}`
    : T
  : never;

type CamelCaseRecord<T> =
  T extends Record<string, unknown> ? { [K in keyof T as CamelCase<K>]: CamelCaseRecord<T[K]> } : T;

const camelCase = <T extends string>(str: T): CamelCase<T> =>
  str.replace(/_([a-z])/g, (_, char) => char.toUpperCase()) as CamelCase<T>;

const camelCaseKeys = <T>(obj: T): CamelCaseRecord<T> => {
  if (typeof obj !== 'object' || obj === null) return obj as CamelCaseRecord<T>;

  return Object.fromEntries(
    Object.entries(obj).map(([key, value]) => [camelCase(key), camelCaseKeys(value)]),
  ) as CamelCaseRecord<T>;
};

const RPC_URLS: Record<ChainflipNetwork, string> = {
  [ChainflipNetworks.backspin]: 'https://backspin-rpc.staging',
  [ChainflipNetworks.sisyphos]: 'https://archive.sisyphos.chainflip.io',
  [ChainflipNetworks.perseverance]: 'https://archive.perseverance.chainflip.io',
  [ChainflipNetworks.mainnet]: 'https://mainnet-rpc.chainflip.io',
};

export type RpcConfig = { rpcUrl: string } | { network: ChainflipNetwork };

type RpcParams = {
  cf_environment: [at?: string];
  cf_swapping_environment: [at?: string];
  cf_ingress_egress_environment: [at?: string];
  cf_funding_environment: [at?: string];
  cf_pool_info: [at?: string];
  cf_swap_rate: [
    fromAsset: UncheckedAssetAndChain,
    toAsset: UncheckedAssetAndChain,
    amount: `0x${string}`,
    at?: string,
  ];
  state_getMetadata: [at?: string];
};

type RpcMethod = keyof RpcParams;

const createRequest =
  <M extends RpcMethod, R extends z.ZodTypeAny>(method: M, responseParser: R) =>
  async (
    urlOrNetwork: RpcConfig,
    ...params: RpcParams[M]
  ): Promise<CamelCaseRecord<z.output<R>>> => {
    const url = 'network' in urlOrNetwork ? RPC_URLS[urlOrNetwork.network] : urlOrNetwork.rpcUrl;
    const { data } = await axios.post(url, {
      jsonrpc: '2.0',
      method,
      params,
      id: 1,
    });

    const result = responseParser.safeParse(data.result);

    if (result.success) {
      return camelCaseKeys(result.data);
    }

    throw new Error(`RPC request "${method}" failed`, { cause: data.error });
  };

const fundingEnvironment = z.object({
  redemption_tax: numberOrHex,
  minimum_funding_amount: numberOrHex,
});
export const getFundingEnvironment = createRequest('cf_funding_environment', fundingEnvironment);

const chainAssetMapFactory = <Z extends z.ZodTypeAny>(parser: Z, defaultValue: z.input<Z>) =>
  z.object({
    Bitcoin: z.object({ BTC: parser }),
    Ethereum: z.object({
      ETH: parser,
      USDC: parser,
      FLIP: parser,
      USDT: parser.default(defaultValue), // TODO: remove default once usdt is available on all networks
    }),
    Polkadot: z.object({ DOT: parser }),
    Arbitrum: z
      .object({ ETH: parser, USDC: parser })
      .default({ ETH: defaultValue, USDC: defaultValue }), // TODO: remove default once arbitrum is available on all networks
  });

const chainMapFactory = <Z extends z.ZodTypeAny>(parser: Z, defaultValue: z.input<Z>) =>
  z.object({
    Bitcoin: parser,
    Ethereum: parser,
    Polkadot: parser,
    Arbitrum: parser.default(defaultValue), // TODO: remove once arbitrum is available on all networks
  });
const chainNumberNullableMap = chainMapFactory(numberOrHex.nullable(), null);

const swappingEnvironment = z.object({
  maximum_swap_amounts: chainAssetMapFactory(numberOrHex.nullable(), null),
});

export const getSwappingEnvironment = createRequest('cf_swapping_environment', swappingEnvironment);

type Rename<T, U extends Record<string, string>> = Omit<T, keyof U> & {
  [K in keyof U as NonNullable<U[K]>]: K extends keyof T ? T[K] : never;
};

const rename =
  <const U extends Record<string, string>>(mapping: U) =>
  <T>(obj: T): Rename<T, U> =>
    Object.fromEntries(
      Object.entries(obj as Record<string, unknown>).map(([key, value]) => [
        key in mapping ? mapping[key] : key,
        value,
      ]),
    ) as Rename<T, U>;

const ingressEgressEnvironment = z
  .object({
    minimum_deposit_amounts: chainAssetMapFactory(numberOrHex, 0),
    ingress_fees: chainAssetMapFactory(numberOrHex.nullable(), null),
    egress_fees: chainAssetMapFactory(numberOrHex.nullable(), null),
    witness_safety_margins: chainNumberNullableMap,
    egress_dust_limits: chainAssetMapFactory(numberOrHex, 1),
    // TODO(1.3): remove optional and default value
    channel_opening_fees: chainMapFactory(numberOrHex, 0)
      .optional()
      .default({ Bitcoin: 0, Ethereum: 0, Polkadot: 0, Arbitrum: 0 }),
  })
  .transform(rename({ egress_dust_limits: 'minimum_egress_amounts' }));

export const getIngressEgressEnvironment = createRequest(
  'cf_ingress_egress_environment',
  ingressEgressEnvironment,
);

const rpcAsset = z.union([
  z.literal('BTC'),
  z.object({ chain: z.literal('Bitcoin'), asset: z.literal('BTC') }),
  z.literal('DOT'),
  z.object({ chain: z.literal('Polkadot'), asset: z.literal('DOT') }),
  z.literal('FLIP'),
  z.object({ chain: z.literal('Ethereum'), asset: z.literal('FLIP') }),
  z.literal('ETH'),
  z.object({ chain: z.literal('Ethereum'), asset: z.literal('ETH') }),
  z.literal('USDC'),
  z.object({ chain: z.literal('Ethereum'), asset: z.literal('USDC') }),
  z.object({ chain: z.literal('Ethereum'), asset: z.literal('USDT') }),
  z.object({ chain: z.literal('Arbitrum'), asset: z.literal('ETH') }),
  z.object({ chain: z.literal('Arbitrum'), asset: z.literal('USDC') }),
]);

const poolInfo = z.intersection(
  z.object({
    limit_order_fee_hundredth_pips: z.number(),
    range_order_fee_hundredth_pips: z.number(),
  }),
  z.union([
    z.object({ quote_asset: rpcAsset }),
    z.object({ pair_asset: rpcAsset }).transform(({ pair_asset }) => ({ quote_asset: pair_asset })),
  ]),
);

const feesInfo = z.object({
  Bitcoin: z.object({ BTC: poolInfo }),
  Ethereum: z.object({ ETH: poolInfo, FLIP: poolInfo }),
  Polkadot: z.object({ DOT: poolInfo }),
  Arbitrum: z.object({ ETH: poolInfo, USDC: poolInfo }).optional(),
});

const poolsEnvironment = z.object({ fees: feesInfo });

export const getPoolsEnvironment = createRequest('cf_pool_info', poolsEnvironment);

const environment = z.object({
  ingress_egress: ingressEgressEnvironment,
  swapping: swappingEnvironment,
  funding: fundingEnvironment,
  // pools: poolsEnvironment,
});

export const getEnvironment = createRequest('cf_environment', environment);

export type RpcEnvironment = z.input<typeof environment>;

export type Environment = Awaited<ReturnType<typeof getEnvironment>>;

const swapRate = z.object({
  output: numberOrHex,
});
export const getSwapRate = createRequest('cf_swap_rate', swapRate);

export const getMetadata = createRequest('state_getMetadata', hexString);

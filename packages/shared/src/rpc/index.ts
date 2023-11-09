import axios from 'axios';
import { z } from 'zod';
import { ChainflipNetwork, ChainflipNetworks } from '../enums';

const numberOrHex = z
  .union([z.string(), z.number()])
  .transform((str) => BigInt(str));

type CamelCase<T> = T extends string
  ? T extends `${infer F}_${infer R}`
    ? `${F}${Capitalize<CamelCase<R>>}`
    : T
  : never;

type CamelCaseRecord<T> = T extends Record<string, unknown>
  ? { [K in keyof T as CamelCase<K>]: CamelCaseRecord<T[K]> }
  : T;

const camelCase = <T extends string>(str: T): CamelCase<T> =>
  str.replace(/_([a-z])/g, (_, char) => char.toUpperCase()) as CamelCase<T>;

const camelCaseKeys = <T>(obj: T): CamelCaseRecord<T> => {
  if (typeof obj !== 'object' || obj === null) return obj as CamelCaseRecord<T>;

  return Object.fromEntries(
    Object.entries(obj).map(([key, value]) => [
      camelCase(key),
      camelCaseKeys(value),
    ]),
  ) as CamelCaseRecord<T>;
};

const RPC_URLS: Record<ChainflipNetwork, string> = {
  [ChainflipNetworks.backspin]: 'https://backspin-rpc.staging',
  [ChainflipNetworks.sisyphos]: 'https://sisyphos.chainflip.xyz',
  [ChainflipNetworks.perseverance]: 'https://perseverance.chainflip.xyz',
  [ChainflipNetworks.mainnet]: 'https://mainnet-rpc.chainflip.io',
};

export type RpcConfig = { rpcUrl: string } | { network: ChainflipNetwork };

const createRequest =
  <P extends z.ZodTypeAny, R extends z.ZodTypeAny>(
    method: string,
    responseParser: R,
    paramsParser?: P,
  ) =>
  async (
    urlOrNetwork: RpcConfig,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    params: z.input<P> extends any ? void : z.input<P>,
  ): Promise<CamelCaseRecord<z.output<R>>> => {
    const url =
      'network' in urlOrNetwork
        ? RPC_URLS[urlOrNetwork.network]
        : urlOrNetwork.rpcUrl;
    const { data } = await axios.post(url, {
      jsonrpc: '2.0',
      method,
      params: paramsParser?.parse(params),
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
export const getFundingEnvironment = createRequest(
  'cf_funding_environment',
  fundingEnvironment,
);

const chainAssetMap = <Z extends z.ZodTypeAny>(parser: Z) =>
  z.object({
    Bitcoin: z.object({ BTC: parser }),
    Ethereum: z.object({ ETH: parser, USDC: parser, FLIP: parser }),
    Polkadot: z.object({ DOT: parser }),
  });

export type ChainAssetMap<T> = {
  Bitcoin: {
    BTC: T;
  };
  Ethereum: {
    ETH: T;
    USDC: T;
    FLIP: T;
  };
  Polkadot: {
    DOT: T;
  };
};

const chainAssetNumberMap = chainAssetMap(numberOrHex);

const swappingEnvironment = z.object({
  minimum_swap_amounts: chainAssetNumberMap,
});
export const getSwappingEnvironment = createRequest(
  'cf_swapping_environment',
  swappingEnvironment,
);

const ingressEgressEnvironment = z.object({
  minimum_deposit_amounts: chainAssetNumberMap,
});

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
]);

const poolInfo = z.object({
  limit_order_fee_hundredth_pips: z.number(),
  range_order_fee_hundredth_pips: z.number(),
  pair_asset: rpcAsset,
});

const feesInfo = z.object({
  Bitcoin: z.object({ BTC: poolInfo }),
  Ethereum: z.object({ ETH: poolInfo, FLIP: poolInfo }),
  Polkadot: z.object({ DOT: poolInfo }),
});

const poolsEnvironment = z.object({ fees: feesInfo });

export const getPoolsEnvironment = createRequest(
  'cf_pool_info',
  poolsEnvironment,
);

export const getEnvironment = createRequest(
  'cf_environment',
  z.object({
    ingress_egress: ingressEgressEnvironment,
    swapping: swappingEnvironment,
    funding: fundingEnvironment,
    pools: poolsEnvironment,
  }),
);

export type Environment = Awaited<ReturnType<typeof getEnvironment>>;

import HttpClient from '@chainflip/rpc/HttpClient';
import {
  assetConstants,
  ChainflipAsset,
  chainflipAssets,
  internalAssetToRpcAsset,
  readAssetValue,
  InternalAssetMap,
  AnyChainflipAsset,
  isLegacyChainflipAsset,
  isLegacyChainflipChain,
  AnyChainflipChain,
} from '@chainflip/utils/chainflip';
import { isNotNullish } from '@/shared/guards.js';
import {
  BoostPoolsDepth,
  getAllBoostPoolsDepth,
  getEnvironment,
  getPoolDepth as getPoolDepthRpc,
  getAccounts as getAccountsRpc,
  getAccountInfo as getAccountInfoRpc,
} from '@/shared/rpc/index.js';
import { validateSwapAmount as validateAmount } from '@/shared/rpc/utils.js';
import { memoize } from './function.js';
import env from '../config/env.js';

const cachedGetEnvironment = memoize(getEnvironment, 6_000);

type Result = { success: true } | { success: false; reason: string };

const rpcConfig = { rpcUrl: env.RPC_NODE_HTTP_URL };

export const validateSwapAmount = async (
  asset: ChainflipAsset,
  amount: bigint,
): Promise<Result> => {
  const environment = await cachedGetEnvironment(rpcConfig);

  return validateAmount(environment, asset, amount);
};

export const getMinimumEgressAmount = async (asset: ChainflipAsset): Promise<bigint> => {
  const environment = await cachedGetEnvironment(rpcConfig);

  return readAssetValue(environment.ingressEgress.minimumEgressAmounts, asset);
};

export const getWitnessSafetyMargin = async (chain: AnyChainflipChain): Promise<bigint | null> => {
  if (isLegacyChainflipChain(chain)) return null;

  const environment = await cachedGetEnvironment(rpcConfig);

  const result = environment.ingressEgress.witnessSafetyMargins[chain];

  return result !== null ? BigInt(result) : null;
};

export const getBoostDelay = async (chain: AnyChainflipChain): Promise<number> => {
  if (isLegacyChainflipChain(chain)) return 0;
  const environment = await cachedGetEnvironment(rpcConfig);
  return environment.ingressEgress.boostDelays?.[chain] ?? 0;
};

export const getIngressDelay = async (chain: AnyChainflipChain): Promise<number> => {
  if (isLegacyChainflipChain(chain)) return 0;

  const environment = await cachedGetEnvironment(rpcConfig);

  const result = environment.ingressEgress.ingressDelays?.[chain];

  return isNotNullish(result) ? Number(result) : 0;
};

export const getIngressFee = async (asset: ChainflipAsset): Promise<bigint | null> => {
  const environment = await cachedGetEnvironment(rpcConfig);

  return readAssetValue(environment.ingressEgress.ingressFees, asset);
};

export const getEgressFee = async (asset: ChainflipAsset): Promise<bigint | null> => {
  const environment = await cachedGetEnvironment(rpcConfig);

  return readAssetValue(environment.ingressEgress.egressFees, asset);
};

export const getRequiredBlockConfirmations = async (
  asset: AnyChainflipAsset,
): Promise<number | null> => {
  if (isLegacyChainflipAsset(asset)) return null;
  const environment = await cachedGetEnvironment(rpcConfig);
  const { chain } = assetConstants[asset];
  const safetyMargin = environment.ingressEgress.witnessSafetyMargins[chain];

  return safetyMargin ? Number(safetyMargin) + 1 : null;
};

export const getNetworkFees = async () => {
  const environment = await cachedGetEnvironment(rpcConfig);

  return environment.swapping.networkFees;
};

export const getAccounts = async () => {
  const accounts = await getAccountsRpc(rpcConfig);

  return accounts.map((account) => ({
    idSs58: account[0],
    alias: account[1],
  }));
};

export const getAccountInfo = async (idSs58: string) => {
  const accounts = await getAccountInfoRpc(rpcConfig, idSs58);

  return accounts;
};

export const getPoolDepth = async (
  fromAsset: ChainflipAsset,
  toAsset: ChainflipAsset,
  tickRange: {
    start: number;
    end: number;
  },
) => {
  const depth = await getPoolDepthRpc(
    rpcConfig,
    internalAssetToRpcAsset[fromAsset],
    internalAssetToRpcAsset[toAsset],
    tickRange,
  );
  return {
    quoteLiquidityAmount: !depth
      ? 0n
      : BigInt(depth.bids.limitOrders.depth) + BigInt(depth.bids.rangeOrders.depth),
    baseLiquidityAmount: !depth
      ? 0n
      : BigInt(depth.asks.limitOrders.depth) + BigInt(depth.asks.rangeOrders.depth),
  };
};

export const getBoostPoolsDepth = async ({
  asset,
}: {
  asset?: ChainflipAsset;
}): Promise<BoostPoolsDepth> => {
  const allBoostPoolsDepth = await getAllBoostPoolsDepth(rpcConfig);

  if (asset) {
    return allBoostPoolsDepth
      .filter((boostPoolDepth) => boostPoolDepth.asset === asset)
      .sort((a, b) => (a.tier < b.tier ? -1 : 1));
  }

  return allBoostPoolsDepth;
};

export const getLpBalances = async <T extends string>(
  accountIds: Set<T> | T[],
): Promise<(readonly [T, InternalAssetMap<bigint>])[]> => {
  const client = new HttpClient(env.RPC_NODE_HTTP_URL);
  const accounts = await Promise.all(
    accountIds.values().map(async (id) => {
      const totalBalances = await client.sendRequest('lp_total_balances', id);

      const internalAssetMapBalances = Object.fromEntries(
        chainflipAssets.map((asset) => [asset, readAssetValue(totalBalances, asset)]),
      ) as InternalAssetMap<bigint>;

      return [id, internalAssetMapBalances] as const;
    }),
  );

  return accounts.filter(isNotNullish);
};

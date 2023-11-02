import { Asset, ChainflipNetwork, assetChains } from '@/shared/enums';
import {
  getIngressEgressEnvironment,
  getSwappingEnvironment,
  type ChainAssetMap,
} from '@/shared/rpc';

const readAssetMinimum = (minimums: ChainAssetMap<bigint>, asset: Asset) => {
  const chain = assetChains[asset];
  const chainMinimums = minimums[chain];
  return chainMinimums[asset as keyof typeof chainMinimums];
};

export const getMinimumDepositAmount = async (
  network: ChainflipNetwork,
  asset: Asset,
): Promise<bigint> => {
  const ingressEgressEnv = await getIngressEgressEnvironment(network);
  return readAssetMinimum(ingressEgressEnv.minimumDepositAmounts, asset);
};

export const getMinimumSwapAmount = async (
  network: ChainflipNetwork,
  asset: Asset,
): Promise<bigint> => {
  const swapEnv = await getSwappingEnvironment(network);
  return readAssetMinimum(swapEnv.minimumSwapAmounts, asset);
};

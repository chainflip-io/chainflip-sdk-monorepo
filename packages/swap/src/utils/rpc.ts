import { Asset, ChainflipNetwork, assetChains } from '@/shared/enums';
import {
  getIngressEgressEnvironment,
  getSwappingEnvironment,
  type ChainAssetMap,
} from '@/shared/rpc';

const readAssetValue = (minimums: ChainAssetMap<bigint>, asset: Asset) => {
  const chain = assetChains[asset];
  const chainMinimums = minimums[chain];
  return chainMinimums[asset as keyof typeof chainMinimums];
};

export const getMinimumDepositAmount = async (
  network: ChainflipNetwork,
  asset: Asset,
): Promise<bigint> => {
  const ingressEgressEnv = await getIngressEgressEnvironment(network);
  return readAssetValue(ingressEgressEnv.minimumDepositAmounts, asset);
};

export const getMinimumSwapAmount = async (
  network: ChainflipNetwork,
  asset: Asset,
): Promise<bigint> => {
  const swapEnv = await getSwappingEnvironment(network);
  return readAssetValue(swapEnv.minimumSwapAmounts, asset);
};

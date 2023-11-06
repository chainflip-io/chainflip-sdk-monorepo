import {
  AssetAndChain,
  ChainflipNetwork,
  UncheckedAssetAndChain,
  assertIsValidAssetAndChain,
} from '@/shared/enums';
import {
  getIngressEgressEnvironment,
  getSwappingEnvironment,
  type ChainAssetMap,
} from '@/shared/rpc';

export const readAssetValue = (
  minimums: ChainAssetMap<bigint>,
  asset: AssetAndChain,
) => {
  const chainMinimums = minimums[asset.chain];
  return chainMinimums[asset.asset as keyof typeof chainMinimums];
};

export const getMinimumDepositAmount = async (
  network: ChainflipNetwork,
  asset: UncheckedAssetAndChain,
): Promise<bigint> => {
  assertIsValidAssetAndChain(asset);
  const ingressEgressEnv = await getIngressEgressEnvironment(network);
  return readAssetValue(ingressEgressEnv.minimumDepositAmounts, asset);
};

export const getMinimumSwapAmount = async (
  network: ChainflipNetwork,
  asset: UncheckedAssetAndChain,
): Promise<bigint> => {
  assertIsValidAssetAndChain(asset);
  const swapEnv = await getSwappingEnvironment(network);
  return readAssetValue(swapEnv.minimumSwapAmounts, asset);
};

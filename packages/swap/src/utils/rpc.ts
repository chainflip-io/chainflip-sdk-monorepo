import {
  AssetAndChain,
  UncheckedAssetAndChain,
  assertIsValidAssetAndChain,
} from '@/shared/enums';
import { getSwappingEnvironment, type ChainAssetMap } from '@/shared/rpc';

const readAssetValue = (
  minimums: ChainAssetMap<bigint>,
  asset: AssetAndChain,
) => {
  const chainMinimums = minimums[asset.chain];
  return chainMinimums[asset.asset as keyof typeof chainMinimums];
};

export const getMinimumSwapAmount = async (
  rpcUrl: string,
  asset: UncheckedAssetAndChain,
): Promise<bigint> => {
  assertIsValidAssetAndChain(asset);
  const swapEnv = await getSwappingEnvironment({ rpcUrl });
  return readAssetValue(swapEnv.minimumSwapAmounts, asset);
};

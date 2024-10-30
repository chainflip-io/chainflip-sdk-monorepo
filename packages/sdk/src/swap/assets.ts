import { getTokenContractAddress } from '@/shared/contracts';
import {
  InternalAsset,
  ChainflipNetwork,
  isTestnet,
  readChainAssetValue,
  assetConstants,
  chainConstants,
} from '@/shared/enums';
import type { Environment } from '@/shared/rpc';
import type { AssetData } from './types';

export const isGasAsset = (asset: InternalAsset) => {
  const { chain } = assetConstants[asset];
  return asset === chainConstants[chain].gasAsset;
};

export const getAssetData = (
  asset: InternalAsset,
  network: ChainflipNetwork,
  env: Pick<Environment, 'swapping' | 'ingressEgress'>,
) => {
  const assetConstant = assetConstants[asset];

  return {
    chainflipId: asset,
    asset: assetConstant.asset,
    chain: assetConstant.chain,
    contractAddress: !isGasAsset(asset) ? getTokenContractAddress(asset, network) : undefined,
    decimals: assetConstant.decimals,
    name: assetConstant.name,
    symbol: assetConstant.asset,
    isMainnet: !isTestnet(network),
    minimumSwapAmount: readChainAssetValue(
      env.ingressEgress.minimumDepositAmounts,
      asset,
    ).toString(),
    maximumSwapAmount:
      readChainAssetValue(env.swapping.maximumSwapAmounts, asset)?.toString() ?? null,
    minimumEgressAmount: readChainAssetValue(
      env.ingressEgress.minimumEgressAmounts,
      asset,
    ).toString(),
  } as AssetData;
};

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

const isGasAsset = (asset: InternalAsset) => {
  const { chain } = assetConstants[asset];
  return assetConstants[asset].asset === chainConstants[chain].gasAsset;
};

export const getAssetData = (
  asset: InternalAsset,
  network: ChainflipNetwork,
  env: Pick<Environment, 'swapping' | 'ingressEgress'>,
) =>
  ({
    chainflipId: asset,
    asset: assetConstants[asset].asset,
    chain: assetConstants[asset].chain,
    contractAddress: !isGasAsset(asset) ? getTokenContractAddress(asset, network) : undefined,
    decimals: assetConstants[asset].decimals,
    name: assetConstants[asset].name,
    symbol: assetConstants[asset].asset,
    isMainnet: !isTestnet(network),
    minimumSwapAmount: readChainAssetValue(
      env.ingressEgress.minimumDepositAmounts,
      assetConstants[asset],
    ).toString(),
    maximumSwapAmount:
      readChainAssetValue(env.swapping.maximumSwapAmounts, assetConstants[asset])?.toString() ??
      null,
    minimumEgressAmount: readChainAssetValue(
      env.ingressEgress.minimumEgressAmounts,
      assetConstants[asset],
    ).toString(),
  }) as AssetData;

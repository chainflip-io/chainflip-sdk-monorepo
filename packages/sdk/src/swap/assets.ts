import { toUpperCase } from '@chainflip/utils/string';
import { ADDRESSES } from '@/shared/consts';
import {
  InternalAsset,
  ChainflipNetwork,
  isTestnet,
  readChainAssetValue,
  assetConstants,
} from '@/shared/enums';
import type { Environment } from '@/shared/rpc';
import type { AssetData } from './types';

const getTokenContractAddress = (asset: InternalAsset, network: ChainflipNetwork) => {
  switch (asset) {
    case 'Btc':
    case 'Dot':
    case 'Eth':
    case 'ArbEth':
    case 'Sol':
      return undefined;
    default:
      return ADDRESSES[network][`${toUpperCase(asset)}_CONTRACT_ADDRESS`];
  }
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
    contractAddress: getTokenContractAddress(asset, network),
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

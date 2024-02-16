import { getTokenContractAddress } from '@/shared/contracts';
import {
  InternalAsset,
  ChainflipNetwork,
  isTestnet,
  readChainAssetMap,
  assetConstants,
} from '@/shared/enums';
import type { Environment } from '@/shared/rpc';
import type { AssetData } from './types';

type AssetFn = (
  network: ChainflipNetwork,
  env: Pick<Environment, 'swapping' | 'ingressEgress'>,
) => AssetData;

const assetFactory =
  (asset: InternalAsset): AssetFn =>
  (network, env) =>
    ({
      chainflipId: asset,
      asset: assetConstants[asset].asset,
      chain: assetConstants[asset].chain,
      contractAddress: getTokenContractAddress(asset, network, false),
      decimals: assetConstants[asset].decimals,
      name: assetConstants[asset].name,
      symbol: assetConstants[asset].asset,
      isMainnet: !isTestnet(network),
      minimumSwapAmount: readChainAssetMap(
        env.ingressEgress.minimumDepositAmounts,
        assetConstants[asset],
      ).toString(),
      maximumSwapAmount:
        readChainAssetMap(
          env.swapping.maximumSwapAmounts,
          assetConstants[asset],
        )?.toString() ?? null,
      minimumEgressAmount: readChainAssetMap(
        env.ingressEgress.minimumEgressAmounts,
        assetConstants[asset],
      ).toString(),
    }) as AssetData;

export const eth$ = assetFactory('Eth');
export const usdc$ = assetFactory('Usdc');
export const flip$ = assetFactory('Flip');
export const dot$ = assetFactory('Dot');
export const btc$ = assetFactory('Btc');

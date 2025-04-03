import {
  ChainflipAsset,
  readAssetValue,
  assetConstants,
  ChainflipNetwork,
} from '@chainflip/utils/chainflip';
import { toUpperCase } from '@chainflip/utils/string';
import { ADDRESSES } from '@/shared/consts';
import { isTestnet } from '@/shared/enums';
import type { Environment } from '@/shared/rpc';
import type { AssetData } from './types';

const getTokenContractAddress = (asset: ChainflipAsset, network: ChainflipNetwork) => {
  switch (asset) {
    case 'Btc':
    case 'Dot':
    case 'Eth':
    case 'ArbEth':
    case 'Sol':
    case 'HubDot':
    case 'HubUsdc':
    case 'HubUsdt':
      return undefined;
    default:
      return ADDRESSES[network][`${toUpperCase(asset)}_CONTRACT_ADDRESS`];
  }
};

const assetNames: Record<ChainflipAsset, string> = {
  Eth: 'Ether',
  Flip: 'FLIP',
  Usdc: 'USDC',
  Usdt: 'USDT',
  Dot: 'Polkadot',
  Btc: 'Bitcoin',
  ArbEth: 'Arbitrum Ether',
  ArbUsdc: 'Arbitrum USDC',
  Sol: 'Solana',
  SolUsdc: 'Solana USDC',
  HubDot: 'Assethub DOT',
  HubUsdc: 'Assethub USDC',
  HubUsdt: 'Assethub USDT',
};

export const getAssetData = (
  asset: ChainflipAsset,
  network: ChainflipNetwork,
  env: Pick<Environment, 'swapping' | 'ingressEgress'>,
) => {
  const assetConstant = assetConstants[asset];

  return {
    chainflipId: asset,
    asset: assetConstant.rpcAsset,
    chain: assetConstant.chain,
    contractAddress: getTokenContractAddress(asset, network),
    decimals: assetConstant.decimals,
    name: assetNames[asset],
    symbol: assetConstant.rpcAsset,
    isMainnet: !isTestnet(network),
    minimumSwapAmount: readAssetValue(env.ingressEgress.minimumDepositAmounts, asset).toString(),
    maximumSwapAmount: readAssetValue(env.swapping.maximumSwapAmounts, asset)?.toString() ?? null,
    minimumEgressAmount: readAssetValue(env.ingressEgress.minimumEgressAmounts, asset).toString(),
  } as AssetData;
};

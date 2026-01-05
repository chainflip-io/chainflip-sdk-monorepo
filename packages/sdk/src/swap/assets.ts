import {
  ChainflipAsset,
  readAssetValue,
  assetConstants,
  ChainflipNetwork,
} from '@chainflip/utils/chainflip';
import { toUpperCase } from '@chainflip/utils/string';
import { ADDRESSES } from '@/shared/consts.js';
import { isTestnet } from '@/shared/functions.js';
import type { Environment } from '@/shared/rpc/index.js';
import type { AssetData } from './types.js';

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
  Wbtc: 'WBTC',
  Dot: 'Polkadot',
  Btc: 'Bitcoin',
  ArbEth: 'Arbitrum Ether',
  ArbUsdc: 'Arbitrum USDC',
  ArbUsdt: 'Arbitrum USDT',
  Sol: 'Solana',
  SolUsdc: 'Solana USDC',
  HubDot: 'Assethub DOT',
  HubUsdc: 'Assethub USDC',
  HubUsdt: 'Assethub USDT',
};

export const getAssetData = (
  asset: Exclude<ChainflipAsset, 'Dot'>,
  network: ChainflipNetwork,
  env: Pick<Environment, 'swapping' | 'ingressEgress'>,
) => {
  const assetConstant = assetConstants[asset];

  return {
    chainflipId: asset,
    asset: assetConstant.symbol,
    chain: assetConstant.chain,
    contractAddress: getTokenContractAddress(asset, network),
    decimals: assetConstant.decimals,
    name: assetNames[asset],
    symbol: assetConstant.symbol,
    isMainnet: !isTestnet(network),
    minimumSwapAmount: readAssetValue(env.ingressEgress.minimumDepositAmounts, asset).toString(),
    maximumSwapAmount: readAssetValue(env.swapping.maximumSwapAmounts, asset)?.toString() ?? null,
    minimumEgressAmount: readAssetValue(env.ingressEgress.minimumEgressAmounts, asset).toString(),
  } as AssetData;
};

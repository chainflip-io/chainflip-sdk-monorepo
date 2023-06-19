import { Assets, assetDecimals, Chains } from '@/shared/enums';
import type { ChainData, AssetData } from './types';

export const ethereum: ChainData = {
  id: Chains.Ethereum,
  name: 'Ethereum',
  isMainnet: true,
};

export const polkadot: ChainData = {
  id: Chains.Polkadot,
  name: 'Polkadot',
  isMainnet: true,
};

export const bitcoin: ChainData = {
  id: Chains.Bitcoin,
  name: 'Bitcoin',
  isMainnet: true,
};

export const ethereumAssets: AssetData[] = [
  {
    id: Assets.ETH,
    chain: Chains.Ethereum,
    contractAddress: '0xeth',
    decimals: assetDecimals.ETH,
    name: 'ether',
    symbol: 'ETH',
    isMainnet: true,
  },
  {
    id: Assets.USDC,
    chain: Chains.Ethereum,
    contractAddress: '0xusdc',
    decimals: assetDecimals.USDC,
    name: 'usdc',
    symbol: 'USDC',
    isMainnet: true,
  },
  {
    id: Assets.FLIP,
    chain: Chains.Ethereum,
    contractAddress: '0xflip',
    decimals: assetDecimals.FLIP,
    name: 'flip',
    symbol: 'FLIP',
    isMainnet: true,
  },
];

export const dot$: AssetData = {
  id: Assets.DOT,
  chain: Chains.Polkadot,
  contractAddress: '0xdot',
  decimals: assetDecimals.DOT,
  name: 'dot',
  symbol: 'DOT',
  isMainnet: true,
};

export const btc$: AssetData = {
  id: Assets.BTC,
  chain: Chains.Bitcoin,
  contractAddress: '0xbitcoin',
  decimals: assetDecimals.BTC,
  name: 'bitcoin',
  symbol: 'BTC',
  isMainnet: true,
};

export const testnetChains = (chains: ChainData[]): ChainData[] =>
  chains.map((chain) => ({ ...chain, isMainnet: false }));

export const testnetAssets = (assets: AssetData[]): AssetData[] =>
  assets.map((asset) => ({ ...asset, isMainnet: false }));

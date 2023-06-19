import { Chains } from '@/shared/enums';
import type { ChainData, Token } from './types';

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

export const ethereumTokens: Token[] = [
  {
    chain: Chains.Ethereum,
    contractAddress: '0xeth',
    decimals: 18,
    name: 'ether',
    symbol: 'ETH',
    isMainnet: true,
  },
  {
    chain: Chains.Ethereum,
    contractAddress: '0xusdc',
    decimals: 6,
    name: 'usdc',
    symbol: 'USDC',
    isMainnet: true,
  },
  {
    chain: Chains.Ethereum,
    contractAddress: '0xflip',
    decimals: 18,
    name: 'flip',
    symbol: 'FLIP',
    isMainnet: true,
  },
];

export const dot$: Token = {
  chain: Chains.Polkadot,
  contractAddress: '0xdot',
  decimals: 10,
  name: 'dot',
  symbol: 'DOT',
  isMainnet: true,
};

export const btc$: Token = {
  chain: Chains.Bitcoin,
  contractAddress: '0xbitcoin',
  decimals: 8,
  name: 'bitcoin',
  symbol: 'BTC',
  isMainnet: true,
};

export const testnetChains = (chains: ChainData[]): ChainData[] =>
  chains.map((chain) => ({ ...chain, isMainnet: false }));

export const testnetTokens = (tokens: Token[]): Token[] =>
  tokens.map((token) => ({ ...token, isMainnet: false }));

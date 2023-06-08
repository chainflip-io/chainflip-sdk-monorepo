import { ChainId } from './consts';
import type { Chain, Token } from './types';

export const ethereum: Chain = {
  id: ChainId.Ethereum,
  name: 'Ethereum',
  isMainnet: true,
};

export const polkadot: Chain = {
  id: ChainId.Polkadot,
  name: 'Polkadot',
  isMainnet: true,
};

export const bitcoin: Chain = {
  id: ChainId.Bitcoin,
  name: 'Bitcoin',
  isMainnet: true,
};

export const ethereumTokens: Token[] = [
  {
    chainId: ChainId.Ethereum,
    contractAddress: '0xeth',
    decimals: 18,
    name: 'ether',
    symbol: 'ETH',
    isMainnet: true,
  },
  {
    chainId: ChainId.Ethereum,
    contractAddress: '0xusdc',
    decimals: 6,
    name: 'usdc',
    symbol: 'USDC',
    isMainnet: true,
  },
  {
    chainId: ChainId.Ethereum,
    contractAddress: '0xflip',
    decimals: 18,
    name: 'flip',
    symbol: 'FLIP',
    isMainnet: true,
  },
];

export const dot$: Token = {
  chainId: ChainId.Polkadot,
  contractAddress: '0xdot',
  decimals: 10,
  name: 'dot',
  symbol: 'DOT',
  isMainnet: true,
};

export const btc$: Token = {
  chainId: ChainId.Bitcoin,
  contractAddress: '0xbitcoin',
  decimals: 8,
  name: 'bitcoin',
  symbol: 'BTC',
  isMainnet: true,
};

export const testnetChains = (chains: Chain[]): Chain[] =>
  chains.map((chain) => ({ ...chain, isMainnet: false }));

export const testnetTokens = (tokens: Token[]): Token[] =>
  tokens.map((token) => ({ ...token, isMainnet: false }));

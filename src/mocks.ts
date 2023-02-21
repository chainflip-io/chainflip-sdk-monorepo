import { Chain, Token } from './types';

export const ethereum: Chain = {
  id: 1,
  name: 'ethereum',
};

export const polkadot: Chain = {
  id: 2,
  name: 'polkadot',
};

export const bitcoin: Chain = {
  id: 2,
  name: 'bitcoin',
};

export const ethereum$: Token = {
  chainId: 1,
  contractAddress: '0xeth',
  decimals: 18,
  name: 'ether',
  ticker: 'ETH',
};

export const usdc$: Token = {
  chainId: 1,
  contractAddress: '0xusdc',
  decimals: 18,
  name: 'usdc',
  ticker: 'USDC',
};

export const flip$: Token = {
  chainId: 1,
  contractAddress: '0xflip',
  decimals: 18,
  name: 'flip',
  ticker: 'FLIP',
};

export const polkadot$: Token = {
  chainId: 2,
  contractAddress: '0xdot',
  decimals: 18,
  name: 'dot',
  ticker: 'DOT',
};

export const bitcoin$: Token = {
  chainId: 2,
  contractAddress: '0xbitcoin',
  decimals: 18,
  name: 'bitcoin',
  ticker: 'BTC',
};

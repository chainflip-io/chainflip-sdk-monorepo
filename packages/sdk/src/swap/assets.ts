import { getMinimumDepositAmount, getMinimumSwapAmount } from '@/shared/consts';
import { getTokenContractAddress } from '@/shared/contracts';
import {
  assetDecimals,
  Assets,
  ChainflipNetwork,
  Chains,
  isTestnet,
} from '@/shared/enums';
import type { AssetData } from './types';

export const eth$: (network: ChainflipNetwork) => AssetData = (network) => ({
  id: Assets.ETH,
  chain: Chains.Ethereum,
  contractAddress: undefined,
  decimals: assetDecimals[Assets.ETH],
  name: 'Ether',
  symbol: 'ETH',
  isMainnet: !isTestnet(network),
  minimumDepositAmount: getMinimumDepositAmount(network, Assets.ETH),
  minimumSwapAmount: getMinimumSwapAmount(network, Assets.ETH),
});

export const usdc$: (network: ChainflipNetwork) => AssetData = (network) => ({
  id: Assets.USDC,
  chain: Chains.Ethereum,
  contractAddress: getTokenContractAddress(Assets.USDC, network),
  decimals: assetDecimals[Assets.USDC],
  name: 'USDC',
  symbol: 'USDC',
  isMainnet: !isTestnet(network),
  minimumDepositAmount: getMinimumDepositAmount(network, Assets.USDC),
  minimumSwapAmount: getMinimumSwapAmount(network, Assets.USDC),
});

export const flip$: (network: ChainflipNetwork) => AssetData = (network) => ({
  id: Assets.FLIP,
  chain: Chains.Ethereum,
  contractAddress: getTokenContractAddress(Assets.FLIP, network),
  decimals: assetDecimals[Assets.FLIP],
  name: 'FLIP',
  symbol: 'FLIP',
  isMainnet: !isTestnet(network),
  minimumDepositAmount: getMinimumDepositAmount(network, Assets.FLIP),
  minimumSwapAmount: getMinimumSwapAmount(network, Assets.FLIP),
});

export const dot$: (network: ChainflipNetwork) => AssetData = (network) => ({
  id: Assets.DOT,
  chain: Chains.Polkadot,
  contractAddress: undefined,
  decimals: assetDecimals[Assets.DOT],
  name: 'Polkadot',
  symbol: 'DOT',
  isMainnet: !isTestnet(network),
  minimumDepositAmount: getMinimumDepositAmount(network, Assets.DOT),
  minimumSwapAmount: getMinimumSwapAmount(network, Assets.DOT),
});

export const btc$: (network: ChainflipNetwork) => AssetData = (network) => ({
  id: Assets.BTC,
  chain: Chains.Bitcoin,
  contractAddress: undefined,
  decimals: assetDecimals[Assets.BTC],
  name: 'Bitcoin',
  symbol: 'BTC',
  isMainnet: !isTestnet(network),
  minimumDepositAmount: getMinimumDepositAmount(network, Assets.BTC),
  minimumSwapAmount: getMinimumSwapAmount(network, Assets.BTC),
});

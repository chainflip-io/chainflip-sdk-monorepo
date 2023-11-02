import { getTokenContractAddress } from '@/shared/contracts';
import {
  assetDecimals,
  Assets,
  ChainflipNetwork,
  Chains,
  isTestnet,
} from '@/shared/enums';
import type { AssetData } from './types';
import type { Environment } from '../rpc';

type AssetFn = (network: ChainflipNetwork, env: Environment) => AssetData;

export const eth$: AssetFn = (network, env) => ({
  id: Assets.ETH,
  chain: Chains.Ethereum,
  contractAddress: undefined,
  decimals: assetDecimals[Assets.ETH],
  name: 'Ether',
  symbol: 'ETH',
  isMainnet: !isTestnet(network),
  minimumDepositAmount:
    env.ingressEgress.minimumDepositAmounts.Ethereum.ETH.toString(),
  minimumSwapAmount: env.swapping.minimumSwapAmounts.Ethereum.ETH.toString(),
});

export const usdc$: AssetFn = (network, env) => ({
  id: Assets.USDC,
  chain: Chains.Ethereum,
  contractAddress: getTokenContractAddress(Assets.USDC, network),
  decimals: assetDecimals[Assets.USDC],
  name: 'USDC',
  symbol: 'USDC',
  isMainnet: !isTestnet(network),
  minimumDepositAmount:
    env.ingressEgress.minimumDepositAmounts.Ethereum.USDC.toString(),
  minimumSwapAmount: env.swapping.minimumSwapAmounts.Ethereum.USDC.toString(),
});

export const flip$: AssetFn = (network, env) => ({
  id: Assets.FLIP,
  chain: Chains.Ethereum,
  contractAddress: getTokenContractAddress(Assets.FLIP, network),
  decimals: assetDecimals[Assets.FLIP],
  name: 'FLIP',
  symbol: 'FLIP',
  isMainnet: !isTestnet(network),
  minimumDepositAmount:
    env.ingressEgress.minimumDepositAmounts.Ethereum.FLIP.toString(),
  minimumSwapAmount: env.swapping.minimumSwapAmounts.Ethereum.FLIP.toString(),
});

export const dot$: AssetFn = (network, env) => ({
  id: Assets.DOT,
  chain: Chains.Polkadot,
  contractAddress: undefined,
  decimals: assetDecimals[Assets.DOT],
  name: 'Polkadot',
  symbol: 'DOT',
  isMainnet: !isTestnet(network),
  minimumDepositAmount:
    env.ingressEgress.minimumDepositAmounts.Polkadot.DOT.toString(),
  minimumSwapAmount: env.swapping.minimumSwapAmounts.Polkadot.DOT.toString(),
});

export const btc$: AssetFn = (network, env) => ({
  id: Assets.BTC,
  chain: Chains.Bitcoin,
  contractAddress: undefined,
  decimals: assetDecimals[Assets.BTC],
  name: 'Bitcoin',
  symbol: 'BTC',
  isMainnet: !isTestnet(network),
  minimumDepositAmount:
    env.ingressEgress.minimumDepositAmounts.Bitcoin.BTC.toString(),
  minimumSwapAmount: env.swapping.minimumSwapAmounts.Bitcoin.BTC.toString(),
});

import { getTokenContractAddress } from '@/shared/contracts';
import {
  assetDecimals,
  Assets,
  ChainflipNetwork,
  Chains,
  isTestnet,
} from '@/shared/enums';
import type { Environment } from '@/shared/rpc';
import { readMinimumSwapAmount } from '@/shared/rpc/utils';
import type { AssetData } from './types';

type AssetFn = (
  network: ChainflipNetwork,
  env: Pick<Environment, 'swapping' | 'ingressEgress'>,
) => AssetData;

export const eth$: AssetFn = (network, env) => ({
  id: Assets.ETH,
  chain: Chains.Ethereum,
  contractAddress: undefined,
  decimals: assetDecimals[Assets.ETH],
  name: 'Ether',
  symbol: 'ETH',
  chainflipId: 'ETH',
  isMainnet: !isTestnet(network),
  minimumSwapAmount: readMinimumSwapAmount(env, {
    chain: 'Ethereum',
    asset: 'ETH',
  }).toString(),
  maximumSwapAmount:
    env.swapping.maximumSwapAmounts.Ethereum.ETH?.toString() ?? null,
});

export const usdc$: AssetFn = (network, env) => ({
  id: Assets.USDC,
  chain: Chains.Ethereum,
  contractAddress: getTokenContractAddress(Assets.USDC, network),
  decimals: assetDecimals[Assets.USDC],
  name: 'USDC',
  symbol: 'USDC',
  chainflipId: 'USDC',
  isMainnet: !isTestnet(network),
  minimumSwapAmount: readMinimumSwapAmount(env, {
    chain: 'Ethereum',
    asset: 'USDC',
  }).toString(),
  maximumSwapAmount:
    env.swapping.maximumSwapAmounts.Ethereum.USDC?.toString() ?? null,
});

export const flip$: AssetFn = (network, env) => ({
  id: Assets.FLIP,
  chain: Chains.Ethereum,
  contractAddress: getTokenContractAddress(Assets.FLIP, network),
  decimals: assetDecimals[Assets.FLIP],
  name: 'FLIP',
  symbol: 'FLIP',
  chainflipId: 'FLIP',
  isMainnet: !isTestnet(network),
  minimumSwapAmount: readMinimumSwapAmount(env, {
    chain: 'Ethereum',
    asset: 'FLIP',
  }).toString(),
  maximumSwapAmount:
    env.swapping.maximumSwapAmounts.Ethereum.FLIP?.toString() ?? null,
});

export const dot$: AssetFn = (network, env) => ({
  id: Assets.DOT,
  chain: Chains.Polkadot,
  contractAddress: undefined,
  decimals: assetDecimals[Assets.DOT],
  name: 'Polkadot',
  symbol: 'DOT',
  chainflipId: 'DOT',
  isMainnet: !isTestnet(network),
  minimumSwapAmount: readMinimumSwapAmount(env, {
    chain: 'Polkadot',
    asset: 'DOT',
  }).toString(),
  maximumSwapAmount:
    env.swapping.maximumSwapAmounts.Polkadot.DOT?.toString() ?? null,
});

export const btc$: AssetFn = (network, env) => ({
  id: Assets.BTC,
  chain: Chains.Bitcoin,
  contractAddress: undefined,
  decimals: assetDecimals[Assets.BTC],
  name: 'Bitcoin',
  symbol: 'BTC',
  chainflipId: 'BTC',
  isMainnet: !isTestnet(network),
  minimumSwapAmount: readMinimumSwapAmount(env, {
    chain: 'Bitcoin',
    asset: 'BTC',
  }).toString(),
  maximumSwapAmount:
    env.swapping.maximumSwapAmounts.Bitcoin.BTC?.toString() ?? null,
});

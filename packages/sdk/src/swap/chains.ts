import { getEvmChainId } from '@/shared/consts';
import { ChainflipNetwork, Chains, Chain, isTestnet } from '@/shared/enums';
import { isNotNullish } from '@/shared/guards';
import { ChainData } from './types';
import { Environment } from '../rpc';

type ChainFn = (network: ChainflipNetwork, env: Pick<Environment, 'ingressEgress'>) => ChainData;

const chainFactory =
  (chain: Chain): ChainFn =>
  (network, env) => ({
    chain,
    name: chain,
    evmChainId: getEvmChainId(chain, network),
    isMainnet: !isTestnet(network),
    requiredBlockConfirmations: isNotNullish(env.ingressEgress.witnessSafetyMargins[chain])
      ? Number(env.ingressEgress.witnessSafetyMargins[chain]) + 1
      : undefined,
  });

export const ethereum = chainFactory(Chains.Ethereum);
export const polkadot = chainFactory(Chains.Polkadot);
export const bitcoin = chainFactory(Chains.Bitcoin);
export const arbitrum = chainFactory(Chains.Arbitrum);

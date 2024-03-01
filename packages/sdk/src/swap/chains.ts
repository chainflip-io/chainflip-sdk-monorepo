import { ChainflipNetwork, Chains, isTestnet } from '@/shared/enums';
import { isNotNullish } from '@/shared/guards';
import { ChainData } from './types';
import { Environment } from '../rpc';

export const ethereum: (
  network: ChainflipNetwork,
  env: Pick<Environment, 'ingressEgress'>,
) => ChainData = (network, env) => ({
  chain: Chains.Ethereum,
  name: 'Ethereum',
  isMainnet: !isTestnet(network),
  requiredBlockConfirmations: isNotNullish(
    env.ingressEgress.witnessSafetyMargins.Ethereum,
  )
    ? Number(env.ingressEgress.witnessSafetyMargins.Ethereum) + 1
    : undefined,
});

export const polkadot: (
  network: ChainflipNetwork,
  env: Pick<Environment, 'ingressEgress'>,
) => ChainData = (network, env) => ({
  chain: Chains.Polkadot,
  name: 'Polkadot',
  isMainnet: !isTestnet(network),
  requiredBlockConfirmations: isNotNullish(
    env.ingressEgress.witnessSafetyMargins.Polkadot,
  )
    ? Number(env.ingressEgress.witnessSafetyMargins.Polkadot) + 1
    : undefined,
});

export const bitcoin: (
  network: ChainflipNetwork,
  env: Pick<Environment, 'ingressEgress'>,
) => ChainData = (network, env) => ({
  chain: Chains.Bitcoin,
  name: 'Bitcoin',
  isMainnet: !isTestnet(network),
  requiredBlockConfirmations: isNotNullish(
    env.ingressEgress.witnessSafetyMargins.Bitcoin,
  )
    ? Number(env.ingressEgress.witnessSafetyMargins.Bitcoin) + 1
    : undefined,
});

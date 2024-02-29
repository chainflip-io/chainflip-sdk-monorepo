import { ChainflipNetwork, Chains, isTestnet } from '@/shared/enums';
import { ChainData } from './types';
import { isNotNullish } from '../guards';
import { Environment } from '../rpc';

export const ethereum: (
  network: ChainflipNetwork,
  env: Pick<Environment, 'ingressEgress'>,
) => ChainData = (network, env) => ({
  chain: Chains.Ethereum,
  name: 'Ethereum',
  isMainnet: !isTestnet(network),
  witnessSafetyMargin: isNotNullish(
    env.ingressEgress.witnessSafetyMargins.Ethereum,
  )
    ? Number(env.ingressEgress.witnessSafetyMargins.Ethereum)
    : undefined,
});

export const polkadot: (
  network: ChainflipNetwork,
  env: Pick<Environment, 'ingressEgress'>,
) => ChainData = (network, env) => ({
  chain: Chains.Polkadot,
  name: 'Polkadot',
  isMainnet: !isTestnet(network),
  witnessSafetyMargin: isNotNullish(
    env.ingressEgress.witnessSafetyMargins.Polkadot,
  )
    ? Number(env.ingressEgress.witnessSafetyMargins.Polkadot)
    : undefined,
});

export const bitcoin: (
  network: ChainflipNetwork,
  env: Pick<Environment, 'ingressEgress'>,
) => ChainData = (network, env) => ({
  chain: Chains.Bitcoin,
  name: 'Bitcoin',
  isMainnet: !isTestnet(network),
  witnessSafetyMargin: isNotNullish(
    env.ingressEgress.witnessSafetyMargins.Bitcoin,
  )
    ? Number(env.ingressEgress.witnessSafetyMargins.Bitcoin)
    : undefined,
});

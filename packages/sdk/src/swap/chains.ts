import { ChainflipNetwork, Chains, Chain, isTestnet } from '@/shared/enums';
import { isNotNullish } from '@/shared/guards';
import { ChainData } from './types';
import { Environment } from '../rpc';

type ChainFn = (
  network: ChainflipNetwork,
  env: Pick<Environment, 'ingressEgress'>,
) => ChainData;

const chainFactory =
  (chain: Chain): ChainFn =>
  (network, env) =>
    ({
      chain,
      name: Chains[chain],
      isMainnet: !isTestnet(network),
      requiredBlockConfirmations: isNotNullish(
        env.ingressEgress.witnessSafetyMargins[Chains[chain]],
      )
        ? Number(env.ingressEgress.witnessSafetyMargins[Chains[chain]]) + 1
        : undefined,
    }) as ChainData;

export const ethereum = chainFactory(Chains.Ethereum);
export const polkadot = chainFactory(Chains.Polkadot);
export const bitcoin = chainFactory(Chains.Bitcoin);

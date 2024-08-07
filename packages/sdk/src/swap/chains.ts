import { getEvmChainId } from '@/shared/consts';
import { ChainflipNetwork, Chain, isTestnet } from '@/shared/enums';
import { isNotNullish } from '@/shared/guards';
import { Environment } from '../rpc';

export const getChainData = (
  chain: Chain,
  network: ChainflipNetwork,
  env: Pick<Environment, 'ingressEgress'>,
) => ({
  chain,
  name: chain,
  evmChainId: getEvmChainId(chain, network),
  isMainnet: !isTestnet(network),
  requiredBlockConfirmations: isNotNullish(env.ingressEgress.witnessSafetyMargins[chain])
    ? Number(env.ingressEgress.witnessSafetyMargins[chain]) + 1
    : undefined,
  maxRetryDurationBlocks: env.ingressEgress.maxSwapRetryDurationBlocks[chain],
});

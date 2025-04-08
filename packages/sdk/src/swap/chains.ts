import { ChainflipChain, ChainflipNetwork } from '@chainflip/utils/chainflip';
import { getEvmChainId } from '@/shared/consts';
import { isTestnet } from '@/shared/functions';
import { isNotNullish } from '@/shared/guards';
import { Environment } from '@/shared/rpc';

export const getChainData = (
  chain: ChainflipChain,
  network: ChainflipNetwork,
  env: Pick<Environment, 'ingressEgress' | 'swapping'>,
) => ({
  chain,
  name: chain,
  evmChainId: getEvmChainId(chain, network),
  isMainnet: !isTestnet(network),
  requiredBlockConfirmations: isNotNullish(env.ingressEgress.witnessSafetyMargins[chain])
    ? Number(env.ingressEgress.witnessSafetyMargins[chain]) + 1
    : undefined,
  maxRetryDurationBlocks: env.swapping.maxSwapRequestDurationBlocks,
});

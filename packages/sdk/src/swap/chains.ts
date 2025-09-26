import { ChainflipChain, ChainflipNetwork } from '@chainflip/utils/chainflip';
import { getEvmChainId } from '@/shared/consts.js';
import { isTestnet } from '@/shared/functions.js';
import { isNotNullish } from '@/shared/guards.js';
import { Environment } from '@/shared/rpc/index.js';

export const getChainData = (
  chain: ChainflipChain,
  network: ChainflipNetwork,
  env: Pick<Environment, 'ingressEgress' | 'swapping'>,
) => ({
  chain,
  name: chain,
  evmChainId: getEvmChainId(chain, network),
  isMainnet: !isTestnet(network),
  requiredBlockConfirmations: isNotNullish(
    env.ingressEgress.witnessSafetyMargins[chain as Exclude<ChainflipChain, 'Polkadot'>],
  )
    ? Number(env.ingressEgress.witnessSafetyMargins[chain as Exclude<ChainflipChain, 'Polkadot'>]) +
      1
    : undefined,
  maxRetryDurationBlocks: env.swapping.maxSwapRetryDurationBlocks,
});

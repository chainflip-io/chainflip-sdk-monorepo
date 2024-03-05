import { CHAINFLIP_STATECHAIN_BLOCK_TIME_SECONDS } from '@/shared/consts';
import { Chain, chainConstants } from '@/shared/enums';
import { getWitnessSafetyMargin } from '@/swap/utils/rpc';

export const estimateSwapDuration = async (
  srcChain: Chain,
  destChain: Chain,
) => {
  const ingressDuration =
    chainConstants[srcChain].blockTimeSeconds *
    Number((await getWitnessSafetyMargin(srcChain)) ?? 1n);
  const swapDuration = CHAINFLIP_STATECHAIN_BLOCK_TIME_SECONDS * 3;

  // assets are spendable by the user once the egress is included in a block
  const egressDuration = chainConstants[destChain].blockTimeSeconds;

  return ingressDuration + egressDuration + swapDuration;
};

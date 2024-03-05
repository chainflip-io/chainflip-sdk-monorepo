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
  const egressDuration =
    chainConstants[destChain].blockTimeSeconds *
    Number((await getWitnessSafetyMargin(destChain)) ?? 1n);
  const swapDuration = CHAINFLIP_STATECHAIN_BLOCK_TIME_SECONDS * 3;

  return ingressDuration + egressDuration + swapDuration;
};

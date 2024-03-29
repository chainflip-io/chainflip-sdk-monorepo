import { CHAINFLIP_STATECHAIN_BLOCK_TIME_SECONDS } from '@/shared/consts';
import { Chain, chainConstants } from '@/shared/enums';
import { getWitnessSafetyMargin } from '@/swap/utils/rpc';

export const estimateSwapDuration = async (srcChain: Chain, destChain: Chain) => {
  // user transaction must be included before witnessing starts
  const ingressTransactionDuration = chainConstants[srcChain].blockTimeSeconds;

  // once transaction is included, state chain validator witness transaction after safety margin is met
  const ingressWitnessDuration =
    chainConstants[srcChain].blockTimeSeconds *
    Number((await getWitnessSafetyMargin(srcChain)) ?? 1n);

  // once ingress is witnessed, swap and egress are executed on the state chain
  const swapDuration = CHAINFLIP_STATECHAIN_BLOCK_TIME_SECONDS * 3;

  // assets are spendable by the user once the egress is included in a block
  const egressTransactionDuration = chainConstants[destChain].blockTimeSeconds;

  return (
    ingressTransactionDuration + ingressWitnessDuration + egressTransactionDuration + swapDuration
  );
};

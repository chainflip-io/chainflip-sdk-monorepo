import { toUpperCase } from '@chainflip/utils/string';
import { CHAINFLIP_STATECHAIN_BLOCK_TIME_SECONDS } from '@/shared/consts';
import { InternalAsset, chainConstants, getAssetAndChain } from '@/shared/enums';
import { assertUnreachable } from '@/shared/functions';
import { screamingSnakeToPascalCase } from '@/shared/strings';
import { getWitnessSafetyMargin } from '@/swap/utils/rpc';
import ServiceError from './ServiceError';
import { Chain, FailedSwapReason, Swap } from '../client';

export const channelIdRegex = /^(?<issuedBlock>\d+)-(?<srcChain>[a-z]+)-(?<channelId>\d+)$/i;
export const swapRequestId = /^\d+$/i;
export const txHashRegex = /^0x[a-f\d]+$/i;

export const estimateSwapDuration = async ({
  srcAsset,
  destAsset,
  boosted = false,
}: {
  srcAsset: InternalAsset;
  destAsset: InternalAsset;
  boosted?: boolean;
}) => {
  const { chain: srcChain } = getAssetAndChain(srcAsset);
  const { chain: destChain } = getAssetAndChain(destAsset);

  // user transaction must be included before witnessing starts
  const ingressTransactionDuration = chainConstants[srcChain].blockTimeSeconds;

  // once transaction is included, state chain validator witness transaction after safety margin is met
  // in case of a boosted swap, the swap occurs at the moment a deposit is prewitnessed (deposit transaction included in a block)
  const ingressWitnessDuration = boosted
    ? 0
    : chainConstants[srcChain].blockTimeSeconds *
      Number((await getWitnessSafetyMargin(srcChain)) ?? 1n);

  // once ingress is witnessed, swap and egress are executed on the state chain
  const swapDuration = CHAINFLIP_STATECHAIN_BLOCK_TIME_SECONDS * 3;

  // assets are spendable by the user once the egress is included in a block
  const egressTransactionDuration = chainConstants[destChain].blockTimeSeconds;

  return (
    ingressTransactionDuration + ingressWitnessDuration + egressTransactionDuration + swapDuration
  );
};

export const isEgressableSwap = (swap: Swap) => {
  switch (swap.type) {
    case 'PRINCIPAL':
    case 'SWAP':
      return true;
    case 'GAS':
    case 'NETWORK_FEE':
    case 'INGRESS_EGRESS_FEE':
      return false;
    default:
      assertUnreachable(swap.type);
      return false;
  }
};

export const coerceChain = (chain: string) => {
  const uppercaseChain = toUpperCase(chain) as Uppercase<Chain>;
  switch (uppercaseChain) {
    case 'BITCOIN':
    case 'ETHEREUM':
    case 'POLKADOT':
    case 'ARBITRUM':
    case 'SOLANA':
      return screamingSnakeToPascalCase(uppercaseChain);
    default:
      assertUnreachable(uppercaseChain);
      throw ServiceError.badRequest(`invalid chain "${chain}"`);
  }
};

export const failedSwapMessage: Record<FailedSwapReason, string> = {
  BelowMinimumDeposit: 'The deposited amount was below the minimum required',
  NotEnoughToPayFees: 'The deposited amount was not enough to pay the fees',
  InsufficientDepositAmount: 'The gas budget exceeded the deposit amount',
  UnsupportedForTargetChain: 'The destination chain does not support CCM',
};

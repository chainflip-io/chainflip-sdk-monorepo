import BigNumber from 'bignumber.js';
import { CHAINFLIP_STATECHAIN_BLOCK_TIME_SECONDS } from '@/shared/consts';
import {
  assetConstants,
  chainConstants,
  Chains,
  getAssetAndChain,
  InternalAsset,
} from '@/shared/enums';
import { assertUnreachable } from '@/shared/functions';
import { getWitnessSafetyMargin } from '@/swap/utils/rpc';
import ServiceError from './ServiceError';
import { FailedSwapReason, Swap } from '../client';

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
  const depositInclusionDuration = chainConstants[srcChain].blockTimeSeconds;

  // once transaction is included, state chain validator witness transaction after safety margin is met
  // in case of a boosted swap, the swap occurs at the moment a deposit is prewitnessed (deposit transaction included in a block)
  const depositWitnessDuration = boosted
    ? 0
    : chainConstants[srcChain].blockTimeSeconds *
      Number((await getWitnessSafetyMargin(srcChain)) ?? 1n);

  // once ingress is witnessed, swap will be scheduled and executed after 2 statechain blocks
  const swapDuration = CHAINFLIP_STATECHAIN_BLOCK_TIME_SECONDS * 2;

  // assets are spendable by the user once the egress is included in a block
  const egressInclusionDuration = chainConstants[destChain].blockTimeSeconds;

  return {
    durations: {
      deposit: depositInclusionDuration + depositWitnessDuration,
      swap: swapDuration,
      egress: egressInclusionDuration,
    },
    total:
      depositInclusionDuration + depositWitnessDuration + swapDuration + egressInclusionDuration,
  };
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

export const coerceChain = (maybeChain: string) => {
  const chain = Object.values(Chains).find((c) => c.toLowerCase() === maybeChain.toLowerCase());
  if (!chain) throw ServiceError.badRequest(`Invalid chain: ${maybeChain}`);
  return chain;
};

export const failedSwapMessage: Record<FailedSwapReason, string> = {
  BelowMinimumDeposit: 'The deposited amount was below the minimum required',
  NotEnoughToPayFees: 'The deposited amount was not enough to pay the fees',
  InsufficientDepositAmount: 'The gas budget exceeded the deposit amount',
  UnsupportedForTargetChain: 'The destination chain does not support CCM',
  TransactionRejectedByBroker: 'The deposit was rejected by the broker',
  InvalidMetadata: 'The provided metadata could not be decoded',
  InvalidDestinationAddress: 'The provided destination address could not be decoded',
};

export enum FailureMode {
  IngressIgnored = 'DEPOSIT_TOO_SMALL',
  SwapEgressIgnored = 'SWAP_OUTPUT_TOO_SMALL',
  RefundEgressIgnored = 'REFUND_OUTPUT_TOO_SMALL',
  BroadcastAborted = 'SENDING_FAILED',
  TransactionRejectedByBroker = 'DEPOSIT_REJECTED',
}

export const getSwapPrice = (
  inputAsset: InternalAsset,
  inputAmount: BigNumber.Value,
  outputAsset: InternalAsset,
  outputAmount: BigNumber.Value,
) => {
  const input = BigNumber(inputAmount).shiftedBy(-assetConstants[inputAsset].decimals);
  const output = BigNumber(outputAmount).shiftedBy(-assetConstants[outputAsset].decimals);

  return output.div(input).toFixed();
};

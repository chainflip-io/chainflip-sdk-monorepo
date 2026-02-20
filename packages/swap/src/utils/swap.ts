import {
  anyAssetConstants,
  anyChainConstants,
  AnyChainflipAsset,
  anyInternalAssetToRpcAsset,
  chainflipChains,
} from '@chainflip/utils/chainflip';
import BigNumber from 'bignumber.js';
import { CHAINFLIP_STATECHAIN_BLOCK_TIME_SECONDS } from '@/shared/consts.js';
import { assertUnreachable } from '@/shared/functions.js';
import ServiceError from './ServiceError.js';
import { FailedSwapReason, Swap } from '../client.js';
import { getBoostDelay, getIngressDelay, getWitnessSafetyMargin } from './rpc.js';

const stateChainBlocksToSeconds = (blocks: number) =>
  blocks * CHAINFLIP_STATECHAIN_BLOCK_TIME_SECONDS;

export const estimateSwapDuration = async ({
  srcAsset,
  destAsset,
  isExternal = true,
  boosted = false,
}: {
  srcAsset: AnyChainflipAsset;
  destAsset: AnyChainflipAsset;
  isExternal?: boolean;
  boosted?: boolean;
}) => {
  const { chain: srcChain } = anyInternalAssetToRpcAsset[srcAsset];
  const { chain: destChain } = anyInternalAssetToRpcAsset[destAsset];

  // user transaction must be included before witnessing starts
  // on average, the user will submit the transaction in the middle of two blocks
  const depositInclusionDuration = anyChainConstants[srcChain].blockTimeSeconds / 2;

  // once transaction is included, state chain validator witness transaction after safety margin is met
  // in case of a boosted swap, the swap occurs at the moment a deposit is prewitnessed (deposit transaction included in a block) and after the boost delay (if set)
  const depositWitnessDuration = boosted
    ? stateChainBlocksToSeconds(await getBoostDelay(srcChain))
    : anyChainConstants[srcChain].blockTimeSeconds *
      Number((await getWitnessSafetyMargin(srcChain)) ?? 1n);

  // ingress delay is the number of state chain blocks that need to pass before the state chain can witness the deposit
  const ingressDelayDuration = stateChainBlocksToSeconds(await getIngressDelay(srcChain));

  // validators need some time to submit the witness to the statechain
  const depositWitnessSubmissionDuration = CHAINFLIP_STATECHAIN_BLOCK_TIME_SECONDS;

  // once ingress is witnessed, swap will be scheduled and executed after 2 statechain blocks
  const swapDuration = CHAINFLIP_STATECHAIN_BLOCK_TIME_SECONDS * 2;

  // time to sign and broadcast the egress transaction by the validators (avg. taken from grafana metrics)
  const EGRESS_BROADCAST_SIGNING_DURATION = 90;

  // assets are spendable by the user once the egress is included in a block
  // on average, the validator will submit the  transaction in the middle of two blocks
  const egressInclusionDuration = anyChainConstants[destChain].blockTimeSeconds / 2;

  const depositDuration =
    depositInclusionDuration +
    depositWitnessDuration +
    ingressDelayDuration +
    depositWitnessSubmissionDuration;
  const egressDuration = EGRESS_BROADCAST_SIGNING_DURATION + egressInclusionDuration;

  const durations = {
    swap: swapDuration,
    ...(isExternal && {
      deposit: depositDuration,
      egress: egressDuration,
    }),
  };

  return {
    durations,
    total: Object.values(durations).reduce((a, b) => a + b),
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
      return assertUnreachable(swap.type);
  }
};

export const coerceChain = (maybeChain: string) => {
  const chain = chainflipChains.find((c) => c.toLowerCase() === maybeChain.toLowerCase());
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
  DepositWitnessRejected: 'An error occurred while witnessing the deposit',
  InvalidBrokerFees: 'The broker fees were improperly formatted',
  InvalidDcaParameters: 'The DCA parameters were improperly formatted',
  InvalidRefundParameters: 'The refund parameters were improperly formatted',
  CcmInvalidMetadata: 'The provided metadata could not be decoded',
  CcmUnsupportedForTargetChain: 'The destination chain does not support CCM',
  Unrefundable: 'The deposit is unrefundable',
};

export enum FailureMode {
  IngressIgnored = 'DEPOSIT_IGNORED',
  SwapEgressIgnored = 'SWAP_OUTPUT_TOO_SMALL',
  RefundEgressIgnored = 'REFUND_OUTPUT_TOO_SMALL',
  BroadcastAborted = 'SENDING_FAILED',
  DepositRejected = 'DEPOSIT_REJECTED',
}

export const getSwapPrice = (
  inputAsset: AnyChainflipAsset,
  inputAmount: BigNumber.Value,
  outputAsset: AnyChainflipAsset,
  outputAmount: BigNumber.Value,
) => {
  const input = BigNumber(inputAmount).shiftedBy(-anyAssetConstants[inputAsset].decimals);
  const output = BigNumber(outputAmount).shiftedBy(-anyAssetConstants[outputAsset].decimals);

  return output.div(input);
};

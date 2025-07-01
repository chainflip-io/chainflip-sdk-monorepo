import {
  assetConstants,
  chainConstants,
  ChainflipAsset,
  chainflipChains,
  internalAssetToRpcAsset,
} from '@chainflip/utils/chainflip';
import BigNumber from 'bignumber.js';
import { CHAINFLIP_STATECHAIN_BLOCK_TIME_SECONDS } from '@/shared/consts.js';
import { assertUnreachable } from '@/shared/functions.js';
import ServiceError from './ServiceError.js';
import prisma, { FailedSwapReason, Swap } from '../client.js';
import { getWitnessSafetyMargin } from './rpc.js';

const estimateBitcoinInclusionDuration = async () => {
  const currentBitcoinTracking = await prisma.chainTracking.findFirst({
    where: { chain: 'Bitcoin' },
    orderBy: { id: 'desc' },
  });

  const secondsSinceLastBlock = currentBitcoinTracking
    ? (Date.now() - new Date(currentBitcoinTracking.blockTrackedAt).getTime()) / 1000
    : 0;

  const estimatedSecondsUntilNextBlock =
    chainConstants.Bitcoin.blockTimeSeconds - secondsSinceLastBlock;

  return Math.round(Math.max(estimatedSecondsUntilNextBlock, 60));
};

export const estimateSwapDuration = async ({
  srcAsset,
  destAsset,
  isExternal = true,
  boosted = false,
}: {
  srcAsset: ChainflipAsset;
  destAsset: ChainflipAsset;
  isExternal?: boolean;
  boosted?: boolean;
}) => {
  const { chain: srcChain } = internalAssetToRpcAsset[srcAsset];
  const { chain: destChain } = internalAssetToRpcAsset[destAsset];

  // user transaction must be included before witnessing starts
  const depositInclusionDuration =
    srcChain === 'Bitcoin'
      ? await estimateBitcoinInclusionDuration()
      : chainConstants[srcChain].blockTimeSeconds;

  // once transaction is included, state chain validator witness transaction after safety margin is met
  // in case of a boosted swap, the swap occurs at the moment a deposit is prewitnessed (deposit transaction included in a block)
  const depositWitnessDuration = boosted
    ? 0
    : chainConstants[srcChain].blockTimeSeconds *
      Number((await getWitnessSafetyMargin(srcChain)) ?? 1n);

  // validators need some time to submit the witness to the statechain
  const depositWitnessSubmissionDuration = CHAINFLIP_STATECHAIN_BLOCK_TIME_SECONDS;

  // once ingress is witnessed, swap will be scheduled and executed after 2 statechain blocks
  const swapDuration = CHAINFLIP_STATECHAIN_BLOCK_TIME_SECONDS * 2;

  // time to sign and broadcast the egress transaction by the validators (avg. taken from grafana metrics)
  const EGRESS_BROADCAST_SIGNING_DURATION = 90;

  // assets are spendable by the user once the egress is included in a block
  const egressInclusionDuration = chainConstants[destChain].blockTimeSeconds;

  const depositDuration =
    depositInclusionDuration + depositWitnessDuration + depositWitnessSubmissionDuration;
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
};

export enum FailureMode {
  IngressIgnored = 'DEPOSIT_IGNORED',
  SwapEgressIgnored = 'SWAP_OUTPUT_TOO_SMALL',
  RefundEgressIgnored = 'REFUND_OUTPUT_TOO_SMALL',
  BroadcastAborted = 'SENDING_FAILED',
  DepositRejected = 'DEPOSIT_REJECTED',
}

export const getSwapPrice = (
  inputAsset: ChainflipAsset,
  inputAmount: BigNumber.Value,
  outputAsset: ChainflipAsset,
  outputAmount: BigNumber.Value,
) => {
  const input = BigNumber(inputAmount).shiftedBy(-assetConstants[inputAsset].decimals);
  const output = BigNumber(outputAmount).shiftedBy(-assetConstants[outputAsset].decimals);

  return output.div(input);
};

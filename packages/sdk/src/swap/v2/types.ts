import { AffiliateBroker, FillOrKillParams, SwapFee } from '@/shared/schemas';
import { SwapType } from '@/swap/client';
import { FailureMode } from '@/swap/utils/swap';
import { ChainsAndAssets } from '../types';

interface DcaParameters {
  numberOfChunks: number;
  chunkIntervalBlocks: string;
}
interface Ccm {
  message: string;
  gasBudget: string;
  cfParameters: string | undefined;
  ccmDepositReceivedBlockIndex: string | undefined;
}
interface Failure {
  failedAt: number;
  failedAtBlockIndex: string;
  mode: FailureMode;
  reason: {
    code: string;
    message: string;
  };
}
interface Boost {
  maxBoostFeeBps: number;
  effectiveBoostFeeBps: number | undefined;
  boostedAt: number | undefined;
  boostedBlockIndex: string | undefined;
  skippedAt: number | undefined;
  skippedBlockIndex: string | undefined;
}
interface DepositChannelFields {
  createdAt: number;
  brokerCommissionBps: number;
  depositAddress: string;
  srcChainExpiryBlock: string;
  estimatedExpiryTime: number;
  expectedDepositAmount: string;
  isExpired: boolean;
  openedThroughBackend: boolean;
  affiliateBrokers: AffiliateBroker[];
  fillOrKillParams: FillOrKillParams | undefined;
  dcaParams: DcaParameters | undefined;
}
interface DepositFields {
  amount: string | undefined;
  txRef: string | undefined;
  txConfirmations: number | undefined;
  receivedAt: number | undefined;
  receivedBlockIndex: string | undefined;
  failure: Failure | undefined;
}
interface SwapChunk {
  swapInputAmount: string;
  swapOutputAmount: string | undefined;
  scheduledAt: number;
  scheduledBlockIndex: string;
  executedAt: number | undefined;
  executedBlockIndex: string | undefined;
  retryCount: number;
  latestSwapRescheduledAt: number | undefined;
  latestSwapRescheduledBlockIndex: number | undefined;
  fees: SwapFee[];
  isDca: boolean;
}
interface SwapFields {
  totalInputAmountSwapped: string | undefined;
  totalOutputAmountSwapped: string | undefined;
  totalChunksExecuted: number;
  isDca: boolean;
  lastExecutedChunk: SwapChunk | undefined;
  currentChunk: SwapChunk;
  type: SwapType;
  fees: SwapFee[];
}
interface EgressFields {
  amount: string;
  scheduledAt: number;
  scheduledBlockIndex: string;
  sentTxRef: string | undefined;
  sentAt: number | undefined;
  sentAtBlockIndex: string | undefined;
  ignoredAmount: string | undefined;
  failure: Failure | undefined;
  failedAt: number | undefined;
  failedAtBlockIndex: string | undefined;
}
interface SwapStatusResponseCommonFields extends ChainsAndAssets {
  swapId: string;
  destAddress: string;
  ccm: Ccm | undefined;
  boost: Boost | undefined;
  estimatedDurationSeconds: number | null | undefined;
  srcChainRequiredBlockConfirmations: number | null;
}

interface VaultSwapCommonFields extends Exclude<SwapStatusResponseCommonFields, 'boost'> {}
interface ReceivingVaultSwap extends VaultSwapCommonFields {
  deposit: Pick<DepositFields, 'amount' | 'txRef'>;
}
interface SwappingVaultSwap extends ReceivingVaultSwap {
  swap:
    | Exclude<SwapChunk, 'latestSwapRescheduledAt' | 'latestSwapRescheduledBlockIndex'>
    | undefined;
  swapEgress: EgressFields | undefined;
}
interface SendingVaultSwap extends SwappingVaultSwap {
  swapEgress: EgressFields | undefined;
}

interface DepositChannel extends SwapStatusResponseCommonFields {
  depositChannel: DepositChannelFields;
}
interface Receiving extends DepositChannel {
  deposit: DepositFields;
}
interface Swapping extends Receiving {
  swap: SwapFields;
}
interface Sending extends Receiving {
  swap: SwapFields;
  swapEgress: EgressFields | undefined;
  refundEgress: EgressFields | undefined;
}
type SwapState =
  | ({
      state: 'RECEIVING';
    } & Receiving)
  | ({
      state: 'SWAPPING';
    } & Swapping)
  | ({
      state: 'SENDING';
    } & Sending)
  | ({
      state: 'SENT';
    } & Sending)
  | ({
      state: 'COMPLETED';
    } & Sending)
  | ({
      state: 'FAILED';
    } & Sending);

export type DepositAddressStatusResponseV2 = SwapState;
export type VaultSwapStatusResponseV2 = SwapState & SendingVaultSwap;
export type SwapStatusResponseV2 = DepositAddressStatusResponseV2 | VaultSwapStatusResponseV2;

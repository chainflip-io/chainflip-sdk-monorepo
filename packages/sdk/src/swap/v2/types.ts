import { AffiliateBroker, CcmParams, DcaParams, FillOrKillParams, PaidFee } from '@/shared/schemas';
import { FailureMode } from '@/swap/utils/swap';
import { ChainsAndAssets } from '../types';

interface Failure {
  failedAt: number;
  failedBlockIndex: string;
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
  id: string;
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
  dcaParams: DcaParams | undefined;
}

interface DepositFields {
  amount: string;
  txRef: string | undefined;
  txConfirmations: number | undefined;
  witnessedAt: number | undefined;
  witnessedBlockIndex: string | undefined;
  failure: Failure | undefined;
  failedAt: number | undefined;
  failedBlockIndex: string | undefined;
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
  fees: PaidFee[];
  isDca: false;
}

interface SwapFields {
  totalInputAmountSwapped: string | undefined;
  totalOutputAmountSwapped: string | undefined;
  totalChunksExecuted: number;
  isDca: true;
  lastExecutedChunk: SwapChunk | undefined;
  currentChunk: SwapChunk;
  fees: PaidFee[];
}

interface EgressFields {
  amount: string;
  scheduledAt: number;
  scheduledBlockIndex: string;
  txRef: string | undefined;
  witnessedAt: number | undefined;
  witnessedBlockIndex: string | undefined;
  failure: Failure | undefined;
  failedAt: number | undefined;
  failedBlockIndex: string | undefined;
}

interface SwapStatusResponseCommonFields extends ChainsAndAssets {
  swapId: string;
  destAddress: string;
  ccmParams: CcmParams | undefined;
  boost: Boost | undefined;
  estimatedDurationSeconds: number | null | undefined;
  srcChainRequiredBlockConfirmations: number | null;
}

interface VaultSwapCommonFields extends Exclude<SwapStatusResponseCommonFields, 'boost'> {}

interface ReceivingVaultSwap extends VaultSwapCommonFields {
  deposit: DepositFields;
}

interface SwappingVaultSwap extends ReceivingVaultSwap {
  swap: SwapChunk | undefined;
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
  swap: SwapFields | SwapChunk;
}

interface Sending extends Receiving {
  swap: SwapFields | SwapChunk;
  swapEgress: EgressFields | undefined;
  refundEgress: EgressFields | undefined;
}

type SwapState =
  | ({
      state: 'WAITING';
    } & DepositChannel)
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

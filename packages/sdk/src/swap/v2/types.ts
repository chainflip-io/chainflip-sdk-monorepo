import { AffiliateBroker, FillOrKillParams, SwapFee } from '@/shared/schemas';
import { SwapType } from '@/swap/client';
import { FailureMode } from '@/swap/utils/swap';
import { ChainsAndAssets } from '../types';

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace SwapV2 {
  type DcaParameters = {
    numberOfChunks: number;
    chunkIntervalBlocks: string;
  };
  type Ccm = {
    message: string;
    gasBudget: string;
    cfParameters: string | undefined;
    ccmDepositReceivedBlockIndex: string | undefined;
  };
  type Failure = {
    failedAt: number;
    failedAtBlockIndex: string;
    mode: FailureMode;
    reason: {
      code: string;
      message: string;
    };
  };
  type Boost = {
    maxBoostFeeBps: number;
    effectiveBoostFeeBps: number | undefined;
    boostedAt: number | undefined;
    boostedBlockIndex: string | undefined;
    skippedAt: number | undefined;
    skippedBlockIndex: string | undefined;
  };
  type DepositChannelFields = {
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
    srcChainRequiredBlockConfirmations: number | null | undefined;
  };
  type DepositFields = {
    amount: string | undefined;
    txRef: string | undefined;
    txConfirmations: number | undefined;
    receivedAt: number | undefined;
    receivedBlockIndex: string | undefined;
    failure: Failure | undefined;
  };
  type SwapChunk = {
    swapInputAmount: string;
    swapOutputAmount: string | undefined;
    scheduledAt: number;
    scheduledBlockIndex: string;
    executedAt: number | undefined;
    executedBlockIndex: string | undefined;
    retryCount: number;
    latestSwapRescheduledAt: number | undefined;
    latestSwapRescheduledBlockIndex: number | undefined;
  };
  type SwapFields = {
    totalInputAmountSwapped: string | undefined;
    totalOutputAmountSwapped: string | undefined;
    totalChunksExecuted: number;
    isDcaSwap: boolean;
    lastExecutedChunk: SwapChunk | undefined;
    currentChunk: SwapChunk;
    type: SwapType;
    fees: SwapFee[];
  };
  type SwapStatusResponseCommonFields = ChainsAndAssets & {
    swapId: string;
    destAddress: string;
    depositChannel: DepositChannelFields;
    ccm: Ccm | undefined;
    boost: Boost | undefined;
    estimatedDurationSeconds: number | null | undefined;
  };
  type EgressFields = {
    amount: string;
    scheduledAt: number;
    scheduledBlockIndex: string;
    sentTxRef: string | undefined;
    sentAt: number | undefined;
    sentAtBlockIndex: string | undefined;
    failure: Failure | undefined;
  };
  type RefundFields = {
    ignoredAmount: string | undefined;
  };
  type SendingSwapFields = (SwapFields & { egress: EgressFields }) | undefined;
  type SendingRefundFields = (RefundFields & EgressFields) | undefined;

  type DepositChannel = SwapStatusResponseCommonFields & {
    depositChannel: DepositChannelFields;
  };
  type Receiving = DepositChannel & {
    deposit: DepositFields;
  };
  type Swapping = Receiving & {
    swap: SwapFields;
  };
  type Sending = Receiving & {
    swap: SendingSwapFields;
    refund: SendingRefundFields;
  };
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

  type DepositAddressStatusResponse = SwapState & Receiving;
  // export type VaultSwapStatusResponse = VaultSwapFields & SwapState;

  export type SwapStatusResponse = DepositAddressStatusResponse;
  // | VaultSwapStatusResponse
}

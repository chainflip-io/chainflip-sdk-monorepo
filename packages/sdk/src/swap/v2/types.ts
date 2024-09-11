import {
  AffiliateBroker,
  FillOrKillParams,
  SwapFee,
  type CcmParams,
  type DcaParams as Dca,
} from '@/shared/schemas';
import { SwapType } from '@/swap/client';
import { FailureMode } from '@/swap/utils/swap';
import { ChainsAndAssets } from '../types';

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace SwapV2 {
  type DcaParameters = Omit<Dca, 'chunkInterval'> & {
    chunkIntervalBlocks: string;
  };

  type Ccm = CcmParams & {
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

  type WithFailure<T> = T & { failure: Failure | undefined };

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
  };

  type Swap = {
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
    lastExecutedChunk: Swap | undefined;
    currentChunk: Swap;
    type: SwapType;
    fees: SwapFee[];
  };

  interface SwapStatusResponseCommonFields extends ChainsAndAssets {
    swapId: string;
    destAddress: string;
    depositChannel: DepositChannelFields;
    ccm: Ccm | undefined;
    boost: Boost | undefined;
    estimatedDurationSeconds: number | null | undefined;
  }

  type EgressFields = {
    amount: string;
    scheduledAt: number;
    scheduledBlockIndex: string;
  };
  type EgressSentFields = EgressFields & {
    sentTxRef: string;
  };
  type EgressCompletedFields = EgressFields & {
    sentAt: number;
    sentAtBlockIndex: string;
  };
  type RefundFields = {
    ignoredAmount: string | undefined;
  };

  type WithEgressFields<T, F = undefined> = T & {
    egress: (F extends undefined ? EgressFields : WithFailure<EgressFields>) | undefined;
  };
  type WtihEgressSentFields<T, F = undefined> = T & {
    egress: (F extends undefined ? EgressSentFields : WithFailure<EgressSentFields>) | undefined;
  };
  type WtihEgressCompletedFields<T, F = undefined> = T & {
    egress:
      | (F extends undefined ? EgressCompletedFields : WithFailure<EgressCompletedFields>)
      | undefined;
  };

  type SendingSwapFields = WithEgressFields<SwapFields, Failure> | undefined;
  type SentSwapFields = WtihEgressSentFields<SwapFields, Failure> | undefined;
  type CompletedSwapFields = WtihEgressCompletedFields<SwapFields> | undefined;

  type SendingRefundFields = WithFailure<RefundFields & EgressFields> | undefined;
  type SentRefundFields = WithFailure<RefundFields & EgressSentFields> | undefined;
  type CompletedRefundFields = WithEgressFields<EgressCompletedFields> | undefined;

  interface DepositChannel extends SwapStatusResponseCommonFields {
    depositChannel: DepositChannelFields;
  }
  interface Receiving extends DepositChannel {
    deposit: WithFailure<DepositFields>;
  }
  interface Swapping extends Receiving {
    swap: SwapFields;
  }
  interface Sending extends Receiving {
    swap: SendingSwapFields;
    refund: SendingRefundFields;
  }
  interface Sent extends Receiving {
    swap: SentSwapFields;
    refund: SentRefundFields;
  }
  interface Completed extends Receiving {
    swap: CompletedSwapFields;
    refund: CompletedRefundFields;
  }
  interface Failed extends Receiving {
    swap: SendingSwapFields;
    refund: SendingRefundFields;
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
      } & Sent)
    | ({
        state: 'SENT';
      } & Sending)
    | ({
        state: 'COMPLETED';
      } & Completed)
    | ({
        state: 'FAILED';
      } & Failed);

  type DepositAddressStatusResponse = SwapState & Receiving;
  // export type VaultSwapStatusResponse = VaultSwapFields & SwapState;

  export type SwapStatusResponse = DepositAddressStatusResponse;
  // | VaultSwapStatusResponse
}

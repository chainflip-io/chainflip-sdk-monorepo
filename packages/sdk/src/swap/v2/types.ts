import {
  AffiliateBroker,
  FillOrKillParams,
  SwapFee,
  type CcmParams,
  type DcaParams as Dca,
} from '@/shared/schemas';
import { SwapType } from '@/swap/client';
import { FailureMode } from '@/swap/routes/swap';
import { ChainsAndAssets } from '../types';

// type Override<T, N> = Omit<T, keyof N> & N;
// One property of T is defined
// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace SwapV2 {
  // type AtLeastOne<T, K extends keyof T = keyof T> = Partial<T> & { [P in K]: T[P] };

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
    expiryBlock: string;
    estimatedExpiryTime: number;
    expectedDepositAmount: string;
    isExpired: boolean;
    openedThroughBackend: boolean;
    affiliateBrokers: AffiliateBroker[];
    fillOrKillParams: FillOrKillParams | undefined;
    dcaParams: DcaParameters | undefined;
  };

  type DepositFields = {
    amount: string | undefined;
    transactionRef: string | undefined;
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
    totalAmountSwapped: string | undefined;
    totalChunksExecuted: number;
    isDcaSwap: boolean;
    lastExecutedChunk: Swap | undefined;
    currentChunk: Swap;
    type: SwapType;
    fees: SwapFee[];
    srcChainRequiredBlockConfirmations: number | null | undefined;
    estimatedDurationSeconds: number | null | undefined;
  };

  interface SwapStatusResponseCommonFields extends ChainsAndAssets {
    swapId: string;
    destAddress: string;
    depositChannel: DepositChannelFields;
    ccm: Ccm | undefined;
    boost: Boost | undefined;
  }

  type SendingFields = {
    outputAmount: string;
    scheduledAt: number;
    scheduledBlockIndex: string;
  };

  type CompletedFields = {
    sentAt: number;
    sentAtBlockIndex: string;
  };

  type RefundFields = {
    ignoredAmount: string | undefined;
  };

  type SendingSwapFields = SwapFields & SendingFields;
  type SentSwapFields = SendingSwapFields & { sentTxRef: string | undefined };
  type CompletedSwapFields = SentSwapFields & CompletedFields;

  interface DepositChannel extends SwapStatusResponseCommonFields {
    depositChannel: DepositChannelFields;
  }
  interface Receiving extends DepositChannel {
    deposit: WithFailure<DepositFields>;
  }
  interface Swapping extends Receiving {
    swap: WithFailure<SwapFields>;
  }
  export interface Sending extends Receiving {
    swap: WithFailure<SendingSwapFields>;
    refund: WithFailure<SendingFields & RefundFields> | undefined;
  }
  interface Sent extends Receiving {
    swap: WithFailure<SentSwapFields> | undefined;
    refund: WithFailure<SentSwapFields & RefundFields> | undefined;
  }
  interface Completed extends Receiving {
    swap: CompletedSwapFields | undefined;
    refund: (CompletedSwapFields & RefundFields) | undefined;
  }
  interface Failed extends Receiving {
    swap: WithFailure<SendingSwapFields> | undefined;
    refund: WithFailure<SendingFields> | undefined;
  }

  export type SwapState =
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
      } & Sent)
    | ({
        state: 'COMPLETED';
      } & Completed)
    | ({
        state: 'FAILED';
      } & Failed);

  export type DepositAddressStatusResponse = SwapState & Receiving;
  // export type VaultSwapStatusResponse = VaultSwapFields & SwapState;

  export type SwapStatusResponse = DepositAddressStatusResponse;
}
// | VaultSwapStatusResponse

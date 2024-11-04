import {
  AffiliateBroker,
  BoostQuote,
  CcmParams,
  DcaParams,
  FillOrKillParamsWithMinPrice,
  FillOrKillParamsWithSlippage,
  PaidFee,
  Quote,
} from '@/shared/schemas';
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
  expectedDepositAmount: string | undefined;
  isExpired: boolean;
  openedThroughBackend: boolean;
  affiliateBrokers: AffiliateBroker[];
  fillOrKillParams: FillOrKillParamsWithMinPrice | undefined;
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

type ChunkInfo = {
  inputAmount: string;
  intermediateAmount: string | undefined;
  outputAmount: string | undefined;
  scheduledAt: number;
  scheduledBlockIndex: string;
  executedAt: number | undefined;
  executedBlockIndex: string | undefined;
  retryCount: number;
};

type PickRequired<T> = {
  [K in keyof T as undefined extends T[K] ? never : K]: T[K];
  // eslint-disable-next-line @typescript-eslint/ban-types
} & {};

interface SwapFields {
  originalInputAmount: string;
  remainingInputAmount: string;
  swappedInputAmount: string;
  swappedIntermediateAmount: string;
  swappedOutputAmount: string;
  regular: ChunkInfo | undefined;
  dca:
    | {
        lastExecutedChunk: ChunkInfo | null;
        currentChunk: PickRequired<ChunkInfo> | null;
        executedChunks: number;
        remainingChunks: number;
      }
    | undefined;
}

interface EgressFields {
  amount: string;
  scheduledAt: number | undefined;
  scheduledBlockIndex: string | undefined;
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
  depositChannel: DepositChannelFields | undefined;
  ccmParams: CcmParams | undefined;
  boost: Boost | undefined;
  estimatedDurationSeconds: number | null | undefined;
  estimatedDurationsSeconds: {
    deposit: number;
    swap: number;
    egress: number;
  };
  srcChainRequiredBlockConfirmations: number | null;
  fees: PaidFee[];
  lastStatechainUpdateAt: number | undefined;
}

interface Waiting extends SwapStatusResponseCommonFields {
  depositChannel: DepositChannelFields; // status is only possible for swaps with a deposit channel
}

interface Receiving extends SwapStatusResponseCommonFields {
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

export type SwapStatusResponseV2 =
  | ({
      state: 'WAITING';
    } & Waiting)
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

export type { Quote, RegularQuote, BoostQuote, DCAQuote, DCABoostQuote } from '@/shared/schemas';

export interface DepositAddressRequestV2 {
  quote: Quote | BoostQuote;
  srcAddress?: string;
  destAddress: string;
  fillOrKillParams?: FillOrKillParamsWithMinPrice | FillOrKillParamsWithSlippage;
  affiliateBrokers?: { account: `cF${string}` | `0x${string}`; commissionBps: number }[];
  ccmParams?: CcmParams;
  brokerCommissionBps?: number;
}

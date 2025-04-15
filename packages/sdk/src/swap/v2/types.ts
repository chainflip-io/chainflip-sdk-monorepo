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
import { ChainsAndAssets, QuoteRequest } from '../types';

interface Failure {
  failedAt: number;
  failedBlockIndex: string;
  mode: string;
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

interface Broker {
  account: string;
  commissionBps: string;
}

interface DepositChannelFields {
  id: string;
  createdAt: number;
  depositAddress: string;
  srcChainExpiryBlock: string;
  estimatedExpiryTime: number;
  expectedDepositAmount: string | undefined;
  isExpired: boolean;
  openedThroughBackend: boolean;

  /** @deprecated DEPRECATED(1.8) use SwapStatusResponseV2['brokers'] instead */
  brokerCommissionBps: number;

  /** @deprecated DEPRECATED(1.8) use SwapStatusResponseV2['brokers'] instead */
  affiliateBrokers: AffiliateBroker[];

  /** @deprecated DEPRECATED(1.8) use SwapStatusResponseV2['fillOrKillParams'] instead */
  fillOrKillParams: FillOrKillParamsWithMinPrice | undefined;

  /** @deprecated DEPRECATED(1.8) use SwapStatusResponseV2['dcaParams'] instead */
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
  transactionPayload:
    | {
        contract: `0x${string}`;
        value: string;
        chainId: string;
        data: `0x${string}`;
      }
    | undefined;
}

interface SwapStatusResponseCommonFields extends ChainsAndAssets {
  swapId: string;
  destAddress: string;
  depositChannel: DepositChannelFields | undefined;
  ccmParams: CcmParams | undefined;
  fillOrKillParams: FillOrKillParamsWithMinPrice | undefined;
  dcaParams: DcaParams | undefined;
  boost: Boost | undefined;
  estimatedDurationSeconds: number | null | undefined;
  estimatedDurationsSeconds: {
    deposit: number;
    swap: number;
    egress: number;
  };
  srcChainRequiredBlockConfirmations: number | null;
  brokers: Broker[];
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
  fillOrKillParams: FillOrKillParamsWithMinPrice | FillOrKillParamsWithSlippage;
  affiliateBrokers?: { account: `cF${string}` | `0x${string}`; commissionBps: number }[];
  ccmParams?: CcmParams;
  brokerCommissionBps?: number;
}

export interface DepositAddressResponseV2 extends Omit<QuoteRequest, 'ccmParams'> {
  destAddress: string;
  ccmParams?: CcmParams;
  maxBoostFeeBps?: number;
  srcAddress?: string;
  dcaParams?: DcaParams;
  fillOrKillParams: FillOrKillParamsWithMinPrice | FillOrKillParamsWithSlippage;
  depositChannelId: string;
  depositAddress: string;
  brokerCommissionBps: number;
  affiliateBrokers: AffiliateBroker[];
  depositChannelExpiryBlock: bigint;
  estimatedDepositChannelExpiryTime: number | undefined;
  channelOpeningFee: bigint;
}

export interface VaultSwapRequest {
  quote: Quote | BoostQuote;
  srcAddress?: string;
  destAddress: string;
  fillOrKillParams: FillOrKillParamsWithMinPrice | FillOrKillParamsWithSlippage;
  affiliateBrokers?: { account: `cF${string}` | `0x${string}`; commissionBps: number }[];
  ccmParams?: CcmParams;
  brokerAccount?: `cF${string}`;
  brokerCommissionBps?: number;
  extraParams?: { solanaDataAccount?: string };
}

export type VaultSwapResponse =
  | {
      chain: 'Bitcoin';
      nulldataPayload: string;
      depositAddress: string;
    }
  | {
      chain: 'Ethereum' | 'Arbitrum';
      calldata: string;
      value: bigint;
      to: string;
      sourceTokenAddress?: string | undefined;
    }
  | {
      chain: 'Solana';
      programId: string;
      accounts: {
        pubkey: string;
        isSigner: boolean;
        isWritable: boolean;
      }[];
      data: string;
    };

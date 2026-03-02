import { AnyChainflipChain, AssetSymbol } from '@chainflip/utils/chainflip';
import {
  AffiliateBroker,
  BoostQuote,
  CcmParams,
  DcaParams,
  FillOrKillParams,
  FillOrKillParamsWithMinPrice,
  PaidFee,
  Quote,
} from '@/shared/schemas.js';
import { QuoteRequest } from '../types.js';

type ChunkFailureReason =
  | 'PriceImpactLimit'
  | 'MinPriceViolation'
  | 'OraclePriceSlippageExceeded'
  | 'OraclePriceStale'
  | 'PredecessorSwapFailure'
  | 'SafeModeActive';

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

type RescheduledInfo = {
  latestSwapRescheduledAt: number | undefined;
  latestSwapRescheduledBlockIndex: string | undefined;
  latestSwapRescheduledReason: ChunkFailureReason | undefined;
};
type ChunkInfo = {
  inputAmount: string;
  intermediateAmount: string | undefined;
  outputAmount: string | undefined;
  scheduledAt: number;
  scheduledBlockIndex: string;
  executedAt: number | undefined;
  executedBlockIndex: string | undefined;
  retryCount: number;
  abortedAt: number | undefined;
  abortedBlockIndex: string | undefined;
  abortedReason: ChunkFailureReason | undefined;
} & RescheduledInfo;

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
  livePriceExecutionDeltaPercentage: number | undefined;
  regular: ChunkInfo | undefined;
  dca:
    | {
        lastExecutedChunk: ChunkInfo | null;
        currentChunk: (PickRequired<ChunkInfo> & RescheduledInfo) | null;
        executedChunks: number;
        remainingChunks: number;
      }
    | undefined;
  /**
   * Represents details of an on-chain transaction associated with the swap.
   * - `accountId`: The account identifier of the LP for the on-chain swap.
   * - `outputAmount`: The amount of output tokens received from the swap.
   *    This is `undefined` if the swap has not been executed or it was fully
   *    refunded.
   * - `refundAmount`: The amount of input tokens refunded due to a fully or
   *    partially refunded swap. This is `undefined` if no refund occurred.
   */
  onChain:
    | {
        /** The account identifier of the LP for the on-chain swap  */
        accountId: string;
        /**
         * The amount of output tokens received from the swap. This is
         * `undefined` if the swap has not been executed or it was fully
         * refunded.
         */
        outputAmount: string | undefined;
        /**
         * The amount of input tokens refunded due to a fully or partially
         * refunded swap. This is `undefined` if no refund occurred.
         */
        refundAmount: string | undefined;
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

interface SwapStatusResponseCommonFields {
  srcChain: AnyChainflipChain;
  srcAsset: AssetSymbol;
  destChain: AnyChainflipChain;
  destAsset: AssetSymbol;
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
  fallbackEgress: EgressFields | undefined;
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

export type { Quote, RegularQuote, BoostQuote, DCAQuote, DCABoostQuote } from '@/shared/schemas.js';

export interface DepositAddressRequestV2 {
  quote: Quote | BoostQuote;
  srcAddress?: string;
  destAddress: string;
  fillOrKillParams: FillOrKillParams;
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
  fillOrKillParams: FillOrKillParams;
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
  fillOrKillParams: FillOrKillParams;
  affiliateBrokers?: { account: `cF${string}` | `0x${string}`; commissionBps: number }[];
  ccmParams?: CcmParams;
  brokerAccount?: `cF${string}`;
  brokerCommissionBps?: number;
  extraParams?: { seed?: `0x${string}` };
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

export interface EncodeCfParametersRequest {
  quote: Quote | BoostQuote;
  srcAddress?: string;
  destAddress: string;
  fillOrKillParams: FillOrKillParams;
  affiliateBrokers?: { account: `cF${string}` | `0x${string}`; commissionBps: number }[];
  ccmParams?: CcmParams;
  brokerAccount?: `cF${string}`;
  brokerCommissionBps?: number;
}

import { Chain, Asset, AssetOfChain, InternalAsset } from '@/shared/enums';
import {
  AffiliateBroker,
  CcmParams,
  QuoteQueryResponse,
  FillOrKillParams,
  SwapFee,
} from '@/shared/schemas';

export interface ChainData {
  chain: Chain;
  name: string;
  evmChainId: number | undefined;
  isMainnet: boolean;
  requiredBlockConfirmations: number | undefined;
  maxRetryDurationBlocks: number | undefined;
}

export type AssetData = {
  [C in Chain]: {
    chainflipId: InternalAsset;
    asset: AssetOfChain<C>;
    chain: C;
    contractAddress: string | undefined;
    decimals: number;
    name: string;
    symbol: string;
    isMainnet: boolean;
    minimumSwapAmount: string;
    maximumSwapAmount: string | null;
    minimumEgressAmount: string;
  };
}[Chain];

interface ChainsAndAssets {
  srcChain: Chain;
  srcAsset: Asset;
  destChain: Chain;
  destAsset: Asset;
}

export interface QuoteRequest extends ChainsAndAssets {
  amount: string;
  brokerCommissionBps?: number;
  affiliateBrokers?: AffiliateBroker[];
}

export interface QuoteResponse
  extends Omit<QuoteRequest, 'brokerCommissionBps' | 'affiliateBrokers'> {
  quote: QuoteQueryResponse;
}

export interface DepositAddressRequest extends QuoteRequest {
  destAddress: string;
  ccmParams?: CcmParams;
  maxBoostFeeBps?: number;
  srcAddress?: string;
  fillOrKillParams?: FillOrKillParams;

  /** @deprecated DEPRECATED(1.5): use ccmParams instead of ccmMetadata */
  ccmMetadata?: CcmParams;
}

export interface DepositAddressResponse extends DepositAddressRequest {
  depositChannelId: string;
  depositAddress: string;
  brokerCommissionBps: number;
  affiliateBrokers: AffiliateBroker[];
  depositChannelExpiryBlock: bigint;
  estimatedDepositChannelExpiryTime: number | undefined;
  channelOpeningFee: bigint;
}

export interface SwapStatusRequest {
  id: string;
}

interface SwapStatusResponseCommonFields extends ChainsAndAssets {
  destAddress: string;
  ccmDepositReceivedBlockIndex: string | undefined;
  ccmParams: CcmParams | undefined;
  feesPaid: SwapFee[];
  estimatedDefaultDurationSeconds: number | undefined;
  srcChainRequiredBlockConfirmations: number | undefined;
  depositTransactionRef: string | undefined;
  latestSwapScheduledAt: number | undefined;
  latestSwapScheduledBlockIndex: string | undefined;

  /** @deprecated DEPRECATED(1.5): use depositTransactionRef instead */
  depositTransactionHash: string | undefined;
  /** @deprecated DEPRECATED(1.5): use ccmParams instead of ccmMetadata */
  ccmMetadata?: CcmParams;
}

interface DepositAddressFields extends SwapStatusResponseCommonFields {
  depositAddress: string;
  depositChannelCreatedAt: number;
  depositChannelBrokerCommissionBps: number;
  expectedDepositAmount: string | undefined;
  depositChannelExpiryBlock: string;
  estimatedDepositChannelExpiryTime: number;
  isDepositChannelExpired: boolean;
  depositChannelOpenedThroughBackend: boolean;
  depositChannelAffiliateBrokers?: { account: string; commissionBps: number }[];
  depositChannelMaxBoostFeeBps: number;
  effectiveBoostFeeBps?: number;
  boostSkippedAt?: number;
  boostSkippedBlockIndex?: string;
  fillOrKillParams: FillOrKillParams;
}

type BroadcastRequested = {
  swapId: string;
  depositAmount: string;
  depositReceivedAt: number;
  depositReceivedBlockIndex: string;
  intermediateAmount: string | undefined;
  swapExecutedAt: number;
  swapExecutedBlockIndex: string;
  egressAmount: string;
  egressScheduledAt: number;
  egressScheduledBlockIndex: string;
  broadcastRequestedAt: number;
  broadcastRequestedBlockIndex: string;
};

type RefundBroadcastRequested = Omit<
  BroadcastRequested,
  'swapExecutedAt' | 'swapExecutedBlockIndex'
>;

type CopyFields<T, U> = { [K in Exclude<keyof T, keyof U>]: undefined } & U;

type VaultSwapFields = CopyFields<DepositAddressFields, SwapStatusResponseCommonFields>;

export type FailedVaultSwapStatusResponse = CopyFields<
  DepositAddressFields,
  {
    depositAmount: string;
    destAddress: string;
    error: { message: string; name: string };
    failedAt: number;
    failedBlockIndex: string;
    failure: string;
    feesPaid: [];
    srcAsset: Asset;
    srcChain: Chain;
    state: 'FAILED';
    depositAddress: undefined;
  }
>;

type SwapState =
  | {
      state: 'AWAITING_DEPOSIT';
      depositAmount: string | undefined;
      depositTransactionConfirmations: number | undefined;
    }
  | {
      state: 'DEPOSIT_RECEIVED';
      swapId: string;
      depositAmount: string;
      depositReceivedAt: number;
      depositReceivedBlockIndex: string;
      depositBoostedAt?: number;
      depositBoostedBlockIndex?: string;
    }
  | {
      state: 'SWAP_EXECUTED';
      swapId: string;
      depositAmount: string;
      depositReceivedAt: number;
      depositReceivedBlockIndex: string;
      intermediateAmount: string | undefined;
      swapExecutedAt: number;
      swapExecutedBlockIndex: string;
    }
  | {
      state: 'EGRESS_SCHEDULED';
      swapId: string;
      depositAmount: string;
      depositReceivedAt: number;
      depositReceivedBlockIndex: string;
      intermediateAmount: string | undefined;
      swapExecutedAt: number;
      swapExecutedBlockIndex: string;
      egressAmount: string;
      egressScheduledAt: number;
      egressScheduledBlockIndex: string;
    }
  | {
      state: 'REFUND_EGRESS_SCHEDULED';
      swapId: string;
      depositAmount: string;
      depositReceivedAt: number;
      depositReceivedBlockIndex: string;
      egressAmount: string;
      egressScheduledAt: number;
      egressScheduledBlockIndex: string;
    }
  | ({
      state: 'BROADCAST_REQUESTED';
    } & BroadcastRequested)
  | ({ state: 'BROADCASTED'; broadcastTransactionRef: string } & BroadcastRequested)
  // TODO: move broadcast aborted to FAILED state
  | ({
      state: 'BROADCAST_ABORTED';
      broadcastAbortedAt: number;
      broadcastAbortedBlockIndex: string;
    } & BroadcastRequested)
  | ({
      state: 'COMPLETE';
      broadcastSucceededAt: number;
      broadcastSucceededBlockIndex: string;
      broadcastTransactionRef: string;
    } & BroadcastRequested)
  | ({
      state: 'REFUNDED';
      broadcastSucceededAt: number;
      broadcastSucceededBlockIndex: string;
      broadcastTransactionRef: string;
    } & RefundBroadcastRequested)
  | {
      state: 'FAILED';
      failure: 'INGRESS_IGNORED';
      error: { name: string; message: string };
      depositAmount: string;
      failedAt: number;
      failedBlockIndex: string;
    }
  | {
      state: 'FAILED';
      failure: 'EGRESS_IGNORED';
      error: { name: string; message: string };
      swapId: string;
      depositAmount: string;
      depositReceivedAt: number;
      depositReceivedBlockIndex: string;
      intermediateAmount: string | undefined;
      swapExecutedAt: number;
      swapExecutedBlockIndex: string;
      ignoredEgressAmount: string;
      egressIgnoredAt: number;
      egressIgnoredBlockIndex: string;
    }
  | {
      state: 'FAILED';
      failure: 'REFUND_BROADCAST_ABORTED';
      swapId: string;
      depositAmount: string;
      depositReceivedAt: number;
      depositReceivedBlockIndex: string;
      intermediateAmount: string | undefined;
      broadcastRequestedAt: number;
      broadcastRequestedBlockIndex: string;
      broadcastAbortedAt: number;
      broadcastAbortedBlockIndex: string;
    };

export type DepositAddressStatusResponse = DepositAddressFields & SwapState;
export type VaultSwapStatusResponse = VaultSwapFields & SwapState;

export type SwapStatusResponse =
  | DepositAddressStatusResponse
  | VaultSwapStatusResponse
  | FailedVaultSwapStatusResponse;

export type BoostPoolDepth = {
  feeTierBps: number;
  availableAmount: bigint;
  asset: Asset;
  chain: Chain;
};

import { Chain, Asset, AssetOfChain, InternalAsset } from '@/shared/enums';
import { AffiliateBroker, CcmMetadata, QuoteQueryResponse, SwapFee } from '@/shared/schemas';

export interface ChainData {
  chain: Chain;
  name: string;
  evmChainId: number | undefined;
  isMainnet: boolean;
  requiredBlockConfirmations: number | undefined;
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
  ccmMetadata?: CcmMetadata;
  maxBoostFeeBps?: number;
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
  ccmMetadata: CcmMetadata | undefined;
  feesPaid: SwapFee[];
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
  boostKippedBlockIndex?: string;
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

type CopyFields<T, U> = { [K in Exclude<keyof T, keyof U>]: undefined } & U;

type VaultSwapFields = CopyFields<DepositAddressFields, SwapStatusResponseCommonFields>;

export type FailedVaultSwapStatusResponse = CopyFields<
  DepositAddressFields,
  {
    depositAmount: string;
    depositTransactionHash: string;
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
      depositTransactionHash: string | undefined;
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
  | {
      state: 'FAILED';
      failure: 'INGRESS_IGNORED';
      error: { name: string; message: string };
      depositAmount: string;
      depositTransactionHash: string | undefined;
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
    };

export type DepositAddressStatusResponse = DepositAddressFields & SwapState;
export type VaultSwapStatusResponse = VaultSwapFields & SwapState;

export type SwapStatusResponse =
  | DepositAddressStatusResponse
  | VaultSwapStatusResponse
  | FailedVaultSwapStatusResponse;

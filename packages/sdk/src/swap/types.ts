import { Chain, Asset, AssetOfChain, InternalAsset } from '@/shared/enums';
import { CcmMetadata, QuoteQueryResponse, SwapFee } from '@/shared/schemas';

export interface ChainData {
  chain: Chain;
  name: string;
  evmChainId: number;
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
}

export interface QuoteResponse extends QuoteRequest {
  quote: QuoteQueryResponse;
}

export interface DepositAddressRequest extends QuoteRequest {
  destAddress: string;
  ccmMetadata?: CcmMetadata;
  boostFeeBps?: number; // TODO: move to `QuoteRequest` once suported inside `getQuote` method
}

export interface DepositAddressResponse extends DepositAddressRequest {
  depositChannelId: string;
  depositAddress: string;
  brokerCommissionBps: number;
  depositChannelExpiryBlock: bigint;
  estimatedDepositChannelExpiryTime: number | undefined;
}

export interface SwapStatusRequest {
  id: string;
}

interface SwapStatusResponseCommonFields extends ChainsAndAssets {
  destAddress: string;
  ccmDepositReceivedBlockIndex: string | undefined;
  ccmMetadata:
    | {
        gasBudget: string;
        message: `0x${string}`;
      }
    | undefined;
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
}

type CopyFields<T, U> = { [K in Exclude<keyof T, keyof U>]: undefined } & U;

type VaultSwapFields = CopyFields<
  DepositAddressFields,
  SwapStatusResponseCommonFields
>;

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
      state: 'BROADCAST_REQUESTED' | 'BROADCASTED';
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
    }
  // TODO: move broadcast aborted to FAILED state
  | {
      state: 'BROADCAST_ABORTED';
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
      broadcastAbortedAt: number;
      broadcastAbortedBlockIndex: string;
    }
  | {
      state: 'COMPLETE';
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
      broadcastSucceededAt: number;
      broadcastSucceededBlockIndex: string;
    }
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

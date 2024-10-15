import { HexString } from '@chainflip/utils/types';
import { Chain, Asset, AssetOfChain, InternalAsset } from '@/shared/enums';
import {
  AffiliateBroker,
  CcmParams,
  Quote,
  FillOrKillParams,
  SwapFee,
  DcaParams,
  BoostQuote,
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

export interface ChainsAndAssets {
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
  quote: Quote;
}

export interface QuoteResponseV2
  extends Omit<QuoteRequest, 'brokerCommissionBps' | 'affiliateBrokers'> {
  quotes: Quote[];
}

export type FillOrKillParamsWithSlippage = Omit<FillOrKillParams, 'minPrice'> & {
  slippageTolerancePercent: string | number;
};

export interface DepositAddressRequest extends QuoteRequest {
  destAddress: string;
  ccmParams?: CcmParams;
  maxBoostFeeBps?: number;
  srcAddress?: string;
  fillOrKillParams?: FillOrKillParams;
  dcaParams?: DcaParams;

  /** @deprecated DEPRECATED(1.5): use ccmParams instead of ccmMetadata */
  ccmMetadata?: CcmParams;
}

export interface DepositAddressRequestV2 {
  quote: Quote | BoostQuote;
  destAddress: string;
  fillOrKillParams?: FillOrKillParams | FillOrKillParamsWithSlippage;
  affiliateBrokers?: { account: `cF${string}` | HexString; commissionBps: number }[];
  ccmParams?: CcmParams;
  brokerCommissionBps?: number;
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
  swapScheduledAt: number | undefined;
  swapScheduledBlockIndex: string | undefined;
  lastStatechainUpdateAt: number | undefined;

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

type EgressScheduled = {
  swapId: string;
  depositAmount: string;
  depositReceivedAt: number;
  depositReceivedBlockIndex: string;
  egressAmount: string;
  egressScheduledAt: number;
  egressScheduledBlockIndex: string;
} & (
  | {
      egressType: 'SWAP';
      intermediateAmount: string | undefined;
      swapExecutedAt: number;
      swapExecutedBlockIndex: string;
    }
  | {
      egressType: 'REFUND';
    }
);

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
  | ({
      state: 'EGRESS_SCHEDULED';
    } & EgressScheduled)
  | ({
      state: 'BROADCAST_REQUESTED';
      broadcastRequestedAt: number;
      broadcastRequestedBlockIndex: string;
    } & EgressScheduled)
  | ({
      state: 'BROADCASTED';
      broadcastRequestedAt: number;
      broadcastRequestedBlockIndex: string;
      broadcastTransactionRef: string;
    } & EgressScheduled)
  | ({
      state: 'COMPLETE';
      broadcastRequestedAt: number;
      broadcastRequestedBlockIndex: string;
      broadcastTransactionRef: string;
      broadcastSucceededAt: number;
      broadcastSucceededBlockIndex: string;
    } & EgressScheduled)
  // TODO: move broadcast aborted to FAILED state
  | ({
      state: 'BROADCAST_ABORTED';
      broadcastRequestedAt: number;
      broadcastRequestedBlockIndex: string;
      broadcastAbortedAt: number;
      broadcastAbortedBlockIndex: string;
    } & EgressScheduled)
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
      failure: 'REFUND_EGRESS_IGNORED';
      error: { name: string; message: string };
      swapId: string;
      depositAmount: string;
      depositReceivedAt: number;
      depositReceivedBlockIndex: string;
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

export type BoostPoolDepth = {
  feeTierBps: number;
  availableAmount: bigint;
  asset: Asset;
  chain: Chain;
};

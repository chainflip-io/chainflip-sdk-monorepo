import {
  AssetOfChain,
  AssetSymbol,
  ChainflipAsset,
  ChainflipChain,
} from '@chainflip/utils/chainflip';
import {
  AffiliateBroker,
  CcmParams,
  Quote,
  FillOrKillParamsWithMinPrice,
  SwapFee,
  DcaParams,
} from '@/shared/schemas';

export interface ChainData {
  chain: ChainflipChain;
  name: string;
  evmChainId: number | undefined;
  isMainnet: boolean;
  requiredBlockConfirmations: number | undefined;
  maxRetryDurationBlocks: number | undefined;
}

export type AssetData = {
  [C in ChainflipChain]: {
    chainflipId: ChainflipAsset;
    asset: AssetOfChain<C>;
    chain: C;
    contractAddress: string | undefined;
    decimals: number;
    name: string;
    symbol: AssetSymbol;
    isMainnet: boolean;
    minimumSwapAmount: string;
    maximumSwapAmount: string | null;
    minimumEgressAmount: string;
  };
}[ChainflipChain];

export interface ChainsAndAssets {
  srcChain: ChainflipChain;
  srcAsset: AssetSymbol;
  destChain: ChainflipChain;
  destAsset: AssetSymbol;
}

export interface QuoteRequest extends ChainsAndAssets {
  amount: string;
  brokerCommissionBps?: number;
  affiliateBrokers?: AffiliateBroker[];
  isVaultSwap?: boolean;
  ccmParams?: {
    gasBudget: string;
    messageLengthBytes: number;
  };
}

export interface QuoteResponse extends QuoteRequest {
  quote: Quote;
}

export interface QuoteResponseV2 extends QuoteRequest {
  quotes: Quote[];
}

export type FillOrKillParamsWithSlippage = Omit<FillOrKillParamsWithMinPrice, 'minPrice'> & {
  slippageTolerancePercent: string | number;
};

export interface DepositAddressRequest extends Omit<QuoteRequest, 'ccmParams'> {
  destAddress: string;
  ccmParams?: CcmParams;
  maxBoostFeeBps?: number;
  srcAddress?: string;
  fillOrKillParams: FillOrKillParamsWithMinPrice;
  dcaParams?: DcaParams;
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
  ccmParams: CcmParams | undefined;
  feesPaid: SwapFee[];
  estimatedDefaultDurationSeconds: number | undefined;
  srcChainRequiredBlockConfirmations: number | undefined;
  depositTransactionRef: string | undefined;
  swapScheduledAt: number | undefined;
  swapScheduledBlockIndex: string | undefined;
  lastStatechainUpdateAt: number | undefined;
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
  fillOrKillParams: FillOrKillParamsWithMinPrice;
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
    srcAsset: AssetSymbol;
    srcChain: ChainflipChain;
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
  asset: AssetSymbol;
  chain: ChainflipChain;
};

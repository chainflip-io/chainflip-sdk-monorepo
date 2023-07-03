import { Chain, Asset, chainAssets } from '@/shared/enums';
import { QuoteQueryResponse } from '@/shared/schemas';

export interface ChainData {
  id: Chain;
  name: string;
  isMainnet: boolean;
}

export type AssetData = {
  [K in keyof typeof chainAssets]: {
    id: (typeof chainAssets)[K][number];
    chain: K;
    contractAddress: string;
    decimals: number;
    name: string;
    symbol: string;
    isMainnet: boolean;
  };
}[keyof typeof chainAssets];

interface ChainsAndAssets {
  srcChain: Chain;
  destChain: Chain;
  srcAsset: Asset;
  destAsset: Asset;
}

export interface QuoteRequest extends ChainsAndAssets {
  amount: string;
}

export interface QuoteResponse extends ChainsAndAssets {
  quote: QuoteQueryResponse;
}

export interface SwapRequest extends QuoteRequest {
  destAddress: string;
}

export interface SwapResponse {
  id: string;
  depositAddress: string;
}

export interface SwapStatusRequest {
  swapDepositChannelId: string;
}

type CommonStatusFields = {
  depositAddress: string;
  destAddress: string;
  srcAsset: Asset;
  destAsset: Asset;
  expectedDepositAmount: string;
};

export type SwapStatusResponse = CommonStatusFields &
  (
    | { state: 'AWAITING_DEPOSIT' }
    | {
        state: 'DEPOSIT_RECEIVED';
        depositAmount: string;
        depositReceivedAt: number;
        depositReceivedBlockIndex: string;
      }
    | {
        state: 'SWAP_EXECUTED';
        depositAmount: string;
        depositReceivedAt: number;
        depositReceivedBlockIndex: string;
        swapExecutedAt: number;
        swapExecutedBlockIndex: string;
      }
    | {
        state: 'EGRESS_SCHEDULED';
        egressAmount: string;
        egressScheduledAt: number;
        depositAmount: string;
        depositReceivedAt: number;
        depositReceivedBlockIndex: string;
        swapExecutedAt: number;
        swapExecutedBlockIndex: string;
      }
    | {
        state: 'COMPLETE';
        egressAmount: string;
        egressCompletedAt: number;
        egressCompletedBlockIndex: string;
        egressScheduledAt: number;
        depositAmount: string;
        depositReceivedAt: number;
        depositReceivedBlockIndex: string;
        swapExecutedAt: number;
        swapExecutedBlockIndex: string;
      }
  );

import { SupportedChain, SupportedAsset } from '@/shared/enums';
import { QuoteResponse } from '@/shared/schemas';
import { TokenSymbol } from '../consts';

export type { SDKOptions } from '../sdk';

export interface Chain {
  id: SupportedChain;
  name: SupportedChain;
  isMainnet: boolean;
}
interface ChainToAssetMap {
  Ethereum: 'ETH' | 'USDC' | 'FLIP';
  Bitcoin: 'BTC';
  Polkadot: 'DOT';
}

export type Token = {
  [K in keyof ChainToAssetMap]: {
    chain: K;
    contractAddress: string;
    decimals: number;
    name: string;
    symbol: ChainToAssetMap[K];
    isMainnet: boolean;
  };
}[keyof ChainToAssetMap];

interface Route {
  srcChain: SupportedChain;
  destChain: SupportedChain;
  srcTokenSymbol: TokenSymbol;
  destTokenSymbol: TokenSymbol;
  destAddress: string;
}

export interface RouteRequest extends Route {
  amount: string;
}

export interface RouteResponse extends Route {
  quote: QuoteResponse;
}

export interface SwapRequest extends Omit<RouteResponse, 'quote'> {
  expectedDepositAmount: string;
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
  srcAsset: SupportedAsset;
  destAsset: SupportedAsset;
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

import {
  AssetOfChain,
  AssetSymbol,
  ChainflipAsset,
  ChainflipChain,
} from '@chainflip/utils/chainflip';
import { AffiliateBroker, Quote, FillOrKillParamsWithMinPrice } from '@/shared/schemas.js';

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
  isOnChain?: boolean;
  ccmParams?: {
    gasBudget: string;
    messageLengthBytes: number;
  };
}

export interface QuoteResponseV2 extends QuoteRequest {
  quotes: Quote[];
}

export type FillOrKillParamsWithSlippage = Omit<FillOrKillParamsWithMinPrice, 'minPrice'> & {
  slippageTolerancePercent: string | number;
};

export interface SwapStatusRequest {
  id: string;
}

export type BoostPoolDepth = {
  feeTierBps: number;
  availableAmount: bigint;
  asset: AssetSymbol;
  chain: ChainflipChain;
};

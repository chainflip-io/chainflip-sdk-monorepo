import type { IntegratorProvider, IntegratorSwapStatus } from '../prisma.js';

export type QuoteRequest = {
  srcAsset: string;
  destAsset: string;
  // human-readable amount, as SwapKit's `sellAmount` expects
  amount: string;
  srcAddress?: string;
  destAddress?: string;
  slippagePercent: number;
};

export type QuoteRoute = {
  routeId: string;
  underlyingProviders: string[];
  expectedDestAmount: string;
  affiliateFeeBps: number;
  estimatedDurationSeconds?: number;
  raw: unknown;
};

export type Quote = {
  provider: IntegratorProvider;
  quoteId: string;
  routes: QuoteRoute[];
};

export type BuildSwapRequest = {
  routeId: string;
  srcAddress: string;
  destAddress: string;
  refundAddress?: string;
};

export type BuiltSwap = {
  // unsigned transaction for the user's wallet, in the chain's format (ethers tx, PSBT, ...)
  tx: unknown;
  approvalTx?: unknown;
  depositAddress?: string;
  depositChannelId?: string;
  raw: unknown;
};

export type TrackRequest =
  | { txHash: string; chainId: string }
  | { depositChannelId: string }
  | { depositAddress: string };

export type ProviderSwapStatus = {
  status: IntegratorSwapStatus;
  destAmount?: string;
  raw: unknown;
};

export interface IntegratorProviderClient {
  readonly provider: IntegratorProvider;
  getQuote(request: QuoteRequest): Promise<Quote>;
  buildSwap(request: BuildSwapRequest): Promise<BuiltSwap>;
  getStatus(request: TrackRequest): Promise<ProviderSwapStatus>;
}

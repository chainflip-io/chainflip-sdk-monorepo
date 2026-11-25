import type { IntegratorProvider, IntegratorSwapStatus } from '../prisma.js';

// Every third-party provider implements this interface so the routes and the status poller never
// depend on a specific provider's API. SwapKit is the first implementation.

export type QuoteRequest = {
  // provider asset identifiers, e.g. SwapKit `ETH.ETH`, `BTC.BTC`
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
  // provider that executes the route behind the aggregator (e.g. THORCHAIN, NEAR)
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
  // deposit-channel routes: the user sends funds here instead of signing `tx`
  depositAddress?: string;
  depositChannelId?: string;
  raw: unknown;
};

// SwapKit's `POST /track` accepts one of these
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

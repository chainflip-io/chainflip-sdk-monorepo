import { z } from 'zod';

// SwapKit API shapes, mirrored from the swap frontend's SwapKit integration
// (chainflip-frontend-monorepo: packages/shared/integrations/swapkit.ts).
//
// The routes in ./router.ts are a pass-through: the frontend sends SwapKit's own request bodies and
// gets SwapKit's own responses back, so it can switch from calling api.swapkit.dev directly to
// calling us by changing `NEXT_PUBLIC_SWAPKIT_API_URL` only. Keep these in sync with the frontend.

// ---------------------------------------------------------------------------------------------
// requests (validated; unknown fields are dropped before forwarding)
// ---------------------------------------------------------------------------------------------

export const quoteRequestSchema = z.object({
  sellAsset: z.string().min(1),
  buyAsset: z.string().min(1),
  // whole units, e.g. "1.5"
  sellAmount: z.string().min(1),
  // percent, e.g. 3 = 3%
  slippage: z.number().nonnegative().optional(),
  // ignored: always replaced by SWAPKIT_AFFILIATE_FEE_BPS so the browser can't change our fee
  affiliateFee: z.number().optional(),
  txHints: z.array(z.enum(['simpleTransfer', 'transferWithMemo', 'contractCall'])).optional(),
  providers: z.array(z.string()).optional(),
  sourceAddress: z.string().optional(),
  destinationAddress: z.string().optional(),
});
export type SwapkitQuoteRequest = z.output<typeof quoteRequestSchema>;

export const swapRequestSchema = z.object({
  routeId: z.string().min(1),
  sourceAddress: z.string().min(1),
  destinationAddress: z.string().min(1),
  refundAddress: z.string().optional(),
  // deposit-address flows: no tx to build, only the deposit address
  disableBuildTx: z.boolean().optional(),
  slippageSetting: z.string().optional(),
});
export type SwapkitSwapRequest = z.output<typeof swapRequestSchema>;

const trackTarget = z.union([
  z.object({ hash: z.string().min(1), chainId: z.string().min(1) }),
  z.object({ depositChannelId: z.string().min(1) }),
  z.object({ depositAddress: z.string().min(1) }),
]);

export const trackRequestSchema = z.intersection(
  trackTarget,
  z.object({ routeId: z.string().optional() }),
);
export type SwapkitTrackRequest = z.output<typeof trackRequestSchema>;

// ---------------------------------------------------------------------------------------------
// responses (not validated; forwarded as-is. typed for the code that reads them later, e.g. when
// recording swaps)
// ---------------------------------------------------------------------------------------------

export type SwapkitFee = {
  type: 'inbound' | 'outbound' | 'liquidity' | 'network' | 'affiliate' | 'service';
  amount: string;
  asset: string;
  chain: string;
  protocol: string;
};

export type SwapkitToken = {
  chainId: string;
  address?: string;
  identifier: string;
  decimals: number;
};

export type SwapkitTokensResponse = { tokens: SwapkitToken[] };

export type SwapkitProviderListing = {
  provider: string;
  displayName?: string;
  logoURI?: string;
};

export type SwapkitQuoteRoute = {
  routeId: string;
  providers: string[];
  sellAsset: string;
  buyAsset: string;
  sellAmount: string;
  expectedBuyAmount: string;
  expectedBuyAmountMaxSlippage: string;
  fees: SwapkitFee[];
  estimatedTime?: { total?: number };
  txHint?: 'simpleTransfer' | 'transferWithMemo' | 'contractCall';
};

export type SwapkitQuoteResponse = { quoteId?: string; routes: SwapkitQuoteRoute[] };

export type SwapkitEvmTx = { to: string; from: string; value: string; data: string };

export type SwapkitSwapResponse = {
  swapId: string;
  routeId: string;
  // 'EVM' | 'SERIALIZED_BASE64' (Solana) | 'TRON' | ...
  txType?: string;
  tx?: SwapkitEvmTx | string | Record<string, unknown>;
  approvalTx?: SwapkitEvmTx;
  inboundAddress?: string;
  targetAddress?: string;
  memo?: string;
  meta?: {
    depositAddress?: string;
    providerDepositChannelId?: string;
    depositChannelExpiration?: string | number;
  };
};

export type SwapkitTrackStatus =
  | 'not_started'
  | 'pending'
  | 'swapping'
  | 'completed'
  | 'refunded'
  | 'unknown'
  | 'failed';

export type SwapkitTrackLeg = {
  status?: SwapkitTrackStatus;
  trackingStatus?: string;
  type?: string;
  hash?: string;
  chainId?: string;
  toAsset?: string;
  toAmount?: string;
  toAddress?: string;
  meta?: { provider?: string; explorerUrl?: string };
};

export type SwapkitTrackResponse = {
  status: SwapkitTrackStatus;
  // finer-grained, e.g. 'partially_refunded'
  trackingStatus?: string;
  hash?: string;
  fromAmount?: string;
  toAmount?: string;
  legs?: SwapkitTrackLeg[];
  meta?: { refundReason?: string };
  realizedSlippageBps?: number;
};

// SwapKit error bodies carry a machine-readable `error` code the frontend branches on, e.g.
// 'noRoutesFound', 'swapRouteNotFound', 'outputBelowPublishedFloor', 'outputAmountDeviationTooHigh'
export type SwapkitErrorBody = { error?: string; message?: string };

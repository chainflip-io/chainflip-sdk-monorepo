import { z } from 'zod';
import { SupportedAsset, supportedAsset } from './enums';
import { numericString } from './parsers';

export const quoteQuerySchema = z.object({
  srcAsset: supportedAsset,
  destAsset: supportedAsset,
  amount: numericString,
});

export type QuoteQueryParams = z.infer<typeof quoteQuerySchema>;

export const postSwapSchema = z.object({
  srcAsset: supportedAsset,
  destAsset: supportedAsset,
  destAddress: z.string(),
  expectedDepositAmount: numericString,
});

export type SwapRequestBody = z.infer<typeof postSwapSchema>;

export const quoteResponseSchema = z.union([
  z
    .object({
      id: z.string(),
      intermediate_amount: z.string(),
      egress_amount: z.string(),
    })
    .transform(({ id, ...rest }) => ({
      id,
      intermediateAmount: rest.intermediate_amount,
      egressAmount: rest.egress_amount,
    })),
  z
    .object({
      id: z.string(),
      egress_amount: z.string(),
    })
    .transform(({ id, ...rest }) => ({
      id,
      egressAmount: rest.egress_amount,
    })),
]);

export type MarketMakerResponse = z.input<typeof quoteResponseSchema>;
export type QuoteResponse = z.infer<typeof quoteResponseSchema>;

interface BaseRequest {
  id: string; // random UUID
  deposit_amount: string; // base unit of the deposit asset, e.g. wei for ETH
}

interface Intermediate extends BaseRequest {
  source_asset: Exclude<SupportedAsset, 'USDC'>;
  intermediate_asset: 'USDC';
  destination_asset: Exclude<SupportedAsset, 'USDC'>;
}

interface USDCDeposit extends BaseRequest {
  source_asset: 'USDC';
  intermediate_asset: null;
  destination_asset: Exclude<SupportedAsset, 'USDC'>;
}

interface USDCEgress extends BaseRequest {
  source_asset: Exclude<SupportedAsset, 'USDC'>;
  intermediate_asset: null;
  destination_asset: 'USDC';
}

export type QuoteRequest = Intermediate | USDCDeposit | USDCEgress;

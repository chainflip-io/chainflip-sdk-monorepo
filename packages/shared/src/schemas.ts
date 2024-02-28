import { z } from 'zod';
import { Chain, Asset, InternalAsset } from './enums';
import {
  chain,
  hexStringWithMaxByteSize,
  numericString,
  asset,
} from './parsers';

export const quoteQuerySchema = z.object({
  srcChain: chain,
  srcAsset: asset,
  destChain: chain,
  destAsset: asset,
  amount: numericString,
  brokerCommissionBps: z
    .string()
    .regex(/^[0-9]*$/)
    .transform((v) => Number(v))
    .optional(),
});

export type QuoteQueryParams = z.input<typeof quoteQuerySchema>;
export type ParsedQuoteParams = z.output<typeof quoteQuerySchema>;

export const ccmMetadataSchema = z.object({
  gasBudget: numericString,
  message: hexStringWithMaxByteSize(1024 * 10),
});

export type CcmMetadata = z.infer<typeof ccmMetadataSchema>;

export const openSwapDepositChannelSchema = z
  .object({
    srcAsset: asset,
    destAsset: asset,
    srcChain: chain,
    destChain: chain,
    destAddress: z.string(),
    amount: numericString,
    ccmMetadata: ccmMetadataSchema.optional(),
    boostFeeBps: z.number().optional(),
  })
  .transform(({ amount, ...rest }) => ({
    ...rest,
    expectedDepositAmount: amount,
  }));

export type SwapFee = {
  type: 'LIQUIDITY' | 'NETWORK' | 'INGRESS' | 'EGRESS' | 'BROKER';
  chain: Chain;
  asset: Asset;
  amount: string;
};

export type QuoteQueryResponse = {
  intermediateAmount?: string;
  egressAmount: string;
  includedFees: SwapFee[];
  lowLiquidityWarning: boolean | undefined;
};

interface BaseRequest {
  id: string; // random UUID
  deposit_amount: string; // base unit of the deposit asset, e.g. wei for ETH
}

interface Intermediate extends BaseRequest {
  source_asset: Exclude<InternalAsset, 'Usdc'>;
  intermediate_asset: 'Usdc';
  destination_asset: Exclude<InternalAsset, 'Usdc'>;
}

interface USDCDeposit extends BaseRequest {
  source_asset: 'Usdc';
  intermediate_asset: null;
  destination_asset: Exclude<InternalAsset, 'Usdc'>;
}

interface USDCEgress extends BaseRequest {
  source_asset: Exclude<InternalAsset, 'Usdc'>;
  intermediate_asset: null;
  destination_asset: 'Usdc';
}

export type InternalQuoteRequest = Intermediate | USDCDeposit | USDCEgress;

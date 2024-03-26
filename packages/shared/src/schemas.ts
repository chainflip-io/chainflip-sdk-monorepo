import { z } from 'zod';
import { Chain, Asset } from './enums';
import {
  chain,
  hexStringWithMaxByteSize,
  numericOrEmptyString,
  numericString,
  asset,
} from './parsers';

export const quoteQuerySchema = z.object({
  srcChain: chain,
  srcAsset: asset,
  destChain: chain,
  destAsset: asset,
  amount: numericString,
  brokerCommissionBps: numericOrEmptyString.transform((v) => Number(v)).optional(),
  boostFeeBps: numericOrEmptyString.transform((v) => Number(v)).optional(),
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
  type: 'LIQUIDITY' | 'NETWORK' | 'INGRESS' | 'EGRESS' | 'BROKER' | 'BOOST';
  chain: Chain;
  asset: Asset;
  amount: string;
};

export type QuoteQueryResponse = {
  intermediateAmount?: string;
  egressAmount: string;
  includedFees: SwapFee[];
  lowLiquidityWarning: boolean | undefined;
  estimatedDurationSeconds: number;
};

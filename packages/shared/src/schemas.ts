import { z } from 'zod';
import { Chain, Asset, getInternalAssets } from './enums';
import {
  chain,
  hexStringWithMaxByteSize,
  numericOrEmptyString,
  numericString,
  asset,
  chainflipAddress,
  number,
} from './parsers';

export const quoteQuerySchema = z
  .object({
    srcChain: chain,
    srcAsset: asset,
    destChain: chain,
    destAsset: asset,
    amount: numericString.transform((n) => BigInt(n)),
    brokerCommissionBps: numericOrEmptyString.transform((v) => Number(v)).optional(),
  })
  .transform((args, ctx) => {
    const { srcAsset, destAsset } = getInternalAssets(args, false);

    if (srcAsset === null) {
      ctx.addIssue({
        message: `invalid asset and chain combination: ${JSON.stringify({ asset: args.srcAsset, chain: args.srcChain })}`,
        code: z.ZodIssueCode.custom,
      });

      return z.NEVER;
    }

    if (destAsset === null) {
      ctx.addIssue({
        message: `invalid asset and chain combination: ${JSON.stringify({ asset: args.destAsset, chain: args.destChain })}`,
        code: z.ZodIssueCode.custom,
      });

      return z.NEVER;
    }

    return {
      srcAsset,
      destAsset,
      amount: args.amount,
      brokerCommissionBps: args.brokerCommissionBps,
    };
  });

export type QuoteQueryParams = z.input<typeof quoteQuerySchema>;
export type ParsedQuoteParams = z.output<typeof quoteQuerySchema>;

export const ccmMetadataSchema = z.object({
  gasBudget: numericString,
  message: hexStringWithMaxByteSize(1024 * 10),
});

export type CcmMetadata = z.infer<typeof ccmMetadataSchema>;

export const affiliateBroker = z
  .object({
    account: chainflipAddress,
    commissionBps: number,
  })
  .transform(({ account, commissionBps: bps }) => ({ account, bps }));

export type AffiliateBroker = z.input<typeof affiliateBroker>;

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
export type QuoteDetails = {
  intermediateAmount?: string;
  egressAmount: string;
  includedFees: SwapFee[];
  lowLiquidityWarning: boolean | undefined;
  estimatedDurationSeconds: number;
};
export type QuoteQueryResponse = QuoteDetails & {
  boostInformation?: QuoteDetails & { boostFeeBps: number };
};

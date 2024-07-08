import { z } from 'zod';
import { Chain, Asset, getInternalAssets, AssetAndChain } from './enums';
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

export const ccmParamsSchema = z.object({
  gasBudget: numericString,
  message: hexStringWithMaxByteSize(1024 * 10),
  // TODO: update max size when it is known
  cfParameters: hexStringWithMaxByteSize(1024 * 10).optional(),
});

export type CcmParams = z.infer<typeof ccmParamsSchema>;

export const affiliateBroker = z
  .object({
    account: chainflipAddress,
    commissionBps: number,
  })
  .transform(({ account, commissionBps: bps }) => ({ account, bps }));

export type AffiliateBroker = z.input<typeof affiliateBroker>;

export const fillOrKillParams = z.object({
  retryDurationBlocks: number,
  refundAddress: z.string(),
  minPriceX128: numericString,
});

export type FillOrKillParamsX128 = z.input<typeof fillOrKillParams>;
export type FillOrKillParams = Omit<FillOrKillParamsX128, 'minPriceX128'> & {
  minPrice: string;
};

export const openSwapDepositChannelSchema = z
  .object({
    srcAsset: asset,
    destAsset: asset,
    srcChain: chain,
    destChain: chain,
    destAddress: z.string(),
    amount: numericString,
    ccmMetadata: ccmParamsSchema.optional(), // DEPRECATED(1.5): use ccmParams instead of ccmMetadata
    ccmParams: ccmParamsSchema.optional(),
    maxBoostFeeBps: z.number().optional(),
    srcAddress: z.string().optional(),
    fillOrKillParams: fillOrKillParams.optional(),
  })
  .transform(({ amount, ...rest }) => ({
    ...rest,
    expectedDepositAmount: amount,
  }));

type Fee<T> = {
  type: T;
  chain: Chain;
  asset: Asset;
  amount: string;
};

export type SwapFee = Fee<'NETWORK' | 'INGRESS' | 'EGRESS' | 'BROKER' | 'BOOST'>;

export type PoolFee = Fee<'LIQUIDITY'>;

export type PoolInfo = {
  baseAsset: AssetAndChain;
  quoteAsset: AssetAndChain;
  fee: Omit<PoolFee, 'type'>;
};

export type QuoteDetails = {
  intermediateAmount?: string;
  egressAmount: string;
  includedFees: SwapFee[];
  poolInfo: PoolInfo[];
  lowLiquidityWarning: boolean | undefined;
  estimatedDurationSeconds: number;
  estimatedPrice: string;
};
export type BoostedQuoteDetails = QuoteDetails & { estimatedBoostFeeBps: number };

export type QuoteQueryResponse = QuoteDetails & {
  boostQuote?: BoostedQuoteDetails;
};

import { hexEncodeNumber } from '@chainflip/utils/number';
import { RefinementCtx, z } from 'zod';
import { Chain, Asset, getInternalAssets, AssetAndChain } from './enums';
import {
  chain,
  hexStringWithMaxByteSize,
  numericOrEmptyString,
  numericString,
  asset,
  chainflipAddress,
  number,
  hexString,
  booleanString,
} from './parsers';

export const quoteQuerySchema = z
  .object({
    srcChain: chain,
    srcAsset: asset,
    destChain: chain,
    destAsset: asset,
    amount: numericString.transform((n) => BigInt(n)),
    brokerCommissionBps: numericOrEmptyString.transform((v) => Number(v)).optional(),
    dcaEnabled: booleanString,
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
      dcaEnabled: args.dcaEnabled,
    };
  });

export type QuoteQueryParams = z.input<typeof quoteQuerySchema>;
export type ParsedQuoteParams = z.output<typeof quoteQuerySchema>;

export const ccmParamsSchema = z.object({
  gasBudget: z.union([numericString, hexString]).transform((n) => hexEncodeNumber(BigInt(n))),
  message: hexStringWithMaxByteSize(1024 * 10),
  // TODO(solana): update max size when it is known
  cfParameters: hexStringWithMaxByteSize(1024 * 10).optional(),
});

export type CcmParams = z.input<typeof ccmParamsSchema>;

export const affiliateBroker = z
  .object({
    account: chainflipAddress,
    commissionBps: number,
  })
  .transform(({ account, commissionBps: bps }) => ({ account, bps }));

export type AffiliateBroker = z.input<typeof affiliateBroker>;

export const dcaParams = z.object({
  numberOfChunks: number,
  chunkIntervalBlocks: number,
});
export type DcaParams = z.input<typeof dcaParams>;

export const fillOrKillParams = z.object({
  retryDurationBlocks: number,
  refundAddress: z.string(),
  minPriceX128: numericString,
});

export type FillOrKillParamsX128 = z.input<typeof fillOrKillParams>;
export type FillOrKillParamsWithMinPrice = Omit<FillOrKillParamsX128, 'minPriceX128'> & {
  minPrice: string;
};
export type FillOrKillParams = FillOrKillParamsWithMinPrice;

export const ensureDcaWithFok = <T extends { dcaParams?: unknown; fillOrKillParams?: unknown }>(
  args: T,
  ctx: RefinementCtx,
  // eslint-disable-next-line consistent-return
) => {
  if (args.dcaParams && !args.fillOrKillParams) {
    ctx.addIssue({
      code: 'custom',
      message: 'dcaParams requires fillOrKillParams',
    });
    return z.NEVER;
  }
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
    dcaParams: dcaParams.optional(),
    quote: z
      .object({
        intermediateAmount: z.string().optional(),
        egressAmount: z.string(),
        estimatedPrice: z.string(),
      })
      .optional(),
  })
  .superRefine(ensureDcaWithFok)
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

export type PaidFee = SwapFee | PoolFee;

export type QuoteType = 'REGULAR' | 'DCA';

export type PoolInfo = {
  baseAsset: AssetAndChain;
  quoteAsset: AssetAndChain;
  fee: Omit<PoolFee, 'type'>;
};

export type BoostedQuoteDetails = {
  estimatedBoostFeeBps: number;
  maxBoostFeeBps: number;
};

interface BaseQuoteDetails {
  srcAsset: AssetAndChain;
  destAsset: AssetAndChain;
  depositAmount: string;
  intermediateAmount?: string;
  egressAmount: string;
  includedFees: SwapFee[];
  poolInfo: PoolInfo[];
  lowLiquidityWarning: boolean | undefined;
  estimatedDurationSeconds: number;
  estimatedDurationsSeconds: {
    deposit: number;
    swap: number;
    egress: number;
  };
  estimatedPrice: string;
  recommendedSlippageTolerancePercent: number;
}

type WithBoostQuote<T> = Omit<T, 'boostQuote'> & BoostedQuoteDetails;

export interface RegularQuote extends BaseQuoteDetails {
  type: 'REGULAR';
  boostQuote?: WithBoostQuote<RegularQuote>;
}

export interface DCAQuote extends BaseQuoteDetails {
  type: 'DCA';
  dcaParams: DcaParams;
  boostQuote?: WithBoostQuote<DCAQuote>;
}

export type Quote = RegularQuote | DCAQuote;

export type DCABoostQuote = NonNullable<DCAQuote['boostQuote']>;

export type RegularBoostQuote = NonNullable<RegularQuote['boostQuote']>;

export type BoostQuote = RegularBoostQuote | DCABoostQuote;

export type FillOrKillParamsWithSlippage = Omit<FillOrKillParamsX128, 'minPriceX128'> & {
  slippageTolerancePercent: string | number;
};

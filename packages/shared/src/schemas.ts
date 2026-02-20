import {
  getInternalAssets,
  UncheckedAssetAndChain,
  AssetAndChain,
  ChainflipAsset,
} from '@chainflip/utils/chainflip';
import { hexEncodeNumber } from '@chainflip/utils/number';
import { z } from 'zod';
import {
  chain,
  hexStringWithMaxByteSize,
  numericOrEmptyString,
  numericString,
  asset,
  chainflipAddress,
  hexString,
  booleanString,
  basisPoints,
} from './parsers.js';

export const quoteQuerySchema = z
  .object({
    srcChain: chain,
    srcAsset: asset,
    destChain: chain,
    destAsset: asset,
    amount: numericString
      .transform((v) => BigInt(v))
      .refine((v) => v > 0n, { message: 'swap input amount must be greater than 0' })
      .refine((v) => v < 2n ** 128n, { message: 'swap input amount must be less than 2^128' }),
    brokerCommissionBps: numericOrEmptyString.transform((v) => Number(v)).optional(),
    ccmGasBudget: z
      .union([
        numericString.transform((v) => BigInt(v)),
        z.literal('undefined').transform(() => undefined), // sdk version 1.8.2 sends undefined string if not set
      ])
      .optional(),
    ccmMessageLengthBytes: z
      .union([
        numericString.transform((v) => Number(v)),
        z.literal('undefined').transform(() => undefined), // sdk version 1.8.2 sends undefined string if not set
      ])
      .optional(),
    dcaEnabled: booleanString.default('false'),
    dcaV2Enabled: booleanString.default('false'),
    isVaultSwap: booleanString.optional(),
    isOnChain: booleanString.optional(),
  })
  .transform((args, ctx) => {
    const { srcAsset, destAsset } = getInternalAssets(args, false);

    let hadError = false;

    if (srcAsset === null) {
      ctx.addIssue({
        message: `invalid asset and chain combination: ${JSON.stringify({ asset: args.srcAsset, chain: args.srcChain })}`,
        code: z.ZodIssueCode.custom,
      });

      hadError = true;
    }

    if (destAsset === null) {
      ctx.addIssue({
        message: `invalid asset and chain combination: ${JSON.stringify({ asset: args.destAsset, chain: args.destChain })}`,
        code: z.ZodIssueCode.custom,
      });

      hadError = true;
    }

    if (args.ccmGasBudget !== undefined && args.ccmMessageLengthBytes === undefined) {
      ctx.addIssue({
        message: `ccmMessageLengthBytes must be set if ccmGasBudget is set`,
        code: z.ZodIssueCode.custom,
      });

      hadError = true;
    }

    if (args.ccmGasBudget === undefined && args.ccmMessageLengthBytes !== undefined) {
      ctx.addIssue({
        message: `ccmGasBudget must be set if ccmMessageLengthBytes is set`,
        code: z.ZodIssueCode.custom,
      });

      hadError = true;
    }

    if (args.isOnChain && args.isVaultSwap) {
      ctx.addIssue({
        message: 'isOnChain and isVaultSwap cannot be set at the same time',
        code: z.ZodIssueCode.custom,
      });

      hadError = true;
    }

    if (args.isVaultSwap && args.srcChain === 'Assethub') {
      ctx.addIssue({
        message: 'Vault swaps are not supported on Assethub',
        code: z.ZodIssueCode.custom,
      });

      hadError = true;
    }

    if (args.isOnChain && args.brokerCommissionBps !== undefined && args.brokerCommissionBps > 0) {
      ctx.addIssue({
        message: 'isOnChain cannot be set with a non-zero broker commission',
        code: z.ZodIssueCode.custom,
      });

      hadError = true;
    }

    if (hadError) return z.NEVER;

    const ccmParams =
      args.ccmGasBudget !== undefined && args.ccmMessageLengthBytes !== undefined
        ? { gasBudget: args.ccmGasBudget, messageLengthBytes: args.ccmMessageLengthBytes }
        : undefined;

    return {
      srcAsset: srcAsset as ChainflipAsset,
      destAsset: destAsset as ChainflipAsset,
      amount: args.amount,
      brokerCommissionBps: args.brokerCommissionBps,
      ccmParams,
      dcaEnabled: args.dcaEnabled,
      dcaV2Enabled: args.dcaV2Enabled,
      isVaultSwap: args.isVaultSwap,
      isOnChain: args.isOnChain,
    };
  });

export type QuoteQueryParams = z.input<typeof quoteQuerySchema>;
export type ParsedQuoteParams = z.output<typeof quoteQuerySchema>;

export const ccmParamsSchema = z
  .object({
    gasBudget: z.union([numericString, hexString]).transform((n) => hexEncodeNumber(BigInt(n))),
    // https://github.com/chainflip-io/chainflip-backend/blob/415aa9e20ec4046c68892cd34798e5d831c5b83f/state-chain/chains/src/lib.rs#L709
    message: hexStringWithMaxByteSize(15_000),
    // https://github.com/chainflip-io/chainflip-backend/blob/415aa9e20ec4046c68892cd34798e5d831c5b83f/state-chain/chains/src/lib.rs#L710
    ccmAdditionalData: hexStringWithMaxByteSize(3_000).optional(),
    /** @deprecated DEPRECATED(1.12) pass additionalData instead */
    cfParameters: z
      .never({ message: 'cfParameters is deprecated, use ccmAdditionalData instead' })
      .optional(),
  })
  .transform(({ gasBudget, message, ccmAdditionalData }) => ({
    gasBudget,
    message,
    ccmAdditionalData: ccmAdditionalData ?? '0x',
  }));

export type CcmParams = Omit<z.input<typeof ccmParamsSchema>, 'cfParameters'>;

export const affiliateBroker = z
  .object({
    account: chainflipAddress,
    commissionBps: z.number(),
  })
  .transform(({ account, commissionBps: bps }) => ({ account, bps }));

export type AffiliateBroker = z.input<typeof affiliateBroker>;

export const dcaParams = z.object({
  numberOfChunks: z.number(),
  chunkIntervalBlocks: z.number(),
});
export type DcaParams = z.input<typeof dcaParams>;

export type SwapFeeType = 'IngressDepositChannel' | 'IngressVaultSwap' | 'Network' | 'Egress';

export const fillOrKillParams = z.object({
  retryDurationBlocks: z.number(),
  refundAddress: z.string(),
  minPriceX128: numericString,
  maxOraclePriceSlippage: basisPoints.nullish().transform((v) => v ?? null),
  refundCcmMetadata: ccmParamsSchema.nullish().optional().default(null),
});

export type FillOrKillParamsX128 = z.input<typeof fillOrKillParams>;
export type FillOrKillParamsWithMinPrice = Omit<FillOrKillParamsX128, 'minPriceX128'> & {
  minPrice: string;
};

interface Fee<T> extends UncheckedAssetAndChain {
  type: T;
  amount: string;
}

export type SwapFee = Fee<'NETWORK' | 'INGRESS' | 'EGRESS' | 'BROKER' | 'BOOST' | 'REFUND'>;

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
  isVaultSwap: boolean;
  isOnChain: boolean;
  ccmParams?: {
    gasBudget: string;
    messageLengthBytes: number;
  };
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
  recommendedRetryDurationMinutes: number;
  recommendedLivePriceSlippageTolerancePercent: number | undefined;
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

export type FillOrKillParamsWithoutRefundAddress = {
  livePriceSlippageTolerancePercent?: string | number | false;
  refundCcmMetadata?: CcmParams | null;
} & (
  | { minPrice: string; retryDurationBlocks: number }
  | { minPrice: string; retryDurationMinutes: number }
  | {
      slippageTolerancePercent: string | number;
      retryDurationBlocks: number;
    }
  | {
      slippageTolerancePercent: string | number;
      retryDurationMinutes: number;
    }
);

export type FillOrKillParams = {
  livePriceSlippageTolerancePercent?: string | number | false;
  refundAddress: string;
  refundCcmMetadata?: CcmParams | null;
} & (
  | { minPrice: string; retryDurationBlocks: number }
  | { minPrice: string; retryDurationMinutes: number }
  | { slippageTolerancePercent: string | number; retryDurationBlocks: number }
  | { slippageTolerancePercent: string | number; retryDurationMinutes: number }
);

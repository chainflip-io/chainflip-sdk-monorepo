import { hexEncodeNumber } from '@chainflip/utils/number';
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
  hexString,
  booleanString,
} from './parsers';

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
    isVaultSwap: booleanString.default('false'),
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

    if (args.ccmGasBudget !== undefined && args.ccmMessageLengthBytes === undefined) {
      ctx.addIssue({
        message: `ccmMessageLengthBytes must be set if ccmGasBudget is set`,
        code: z.ZodIssueCode.custom,
      });

      return z.NEVER;
    }

    if (args.ccmGasBudget === undefined && args.ccmMessageLengthBytes !== undefined) {
      ctx.addIssue({
        message: `ccmGasBudget must be set if ccmMessageLengthBytes is set`,
        code: z.ZodIssueCode.custom,
      });

      return z.NEVER;
    }

    const ccmParams =
      args.ccmGasBudget !== undefined && args.ccmMessageLengthBytes !== undefined
        ? { gasBudget: args.ccmGasBudget, messageLengthBytes: args.ccmMessageLengthBytes }
        : undefined;

    return {
      srcAsset,
      destAsset,
      amount: args.amount,
      brokerCommissionBps: args.brokerCommissionBps,
      ccmParams,
      dcaEnabled: args.dcaEnabled,
      isVaultSwap: args.isVaultSwap,
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
    /** @deprecated DEPRECATED(1.8) pass additionalData instead */
    cfParameters: hexStringWithMaxByteSize(3_000).optional(),
  })
  .transform(({ gasBudget, message, ccmAdditionalData, cfParameters }) => ({
    gasBudget,
    message,
    ccmAdditionalData: ccmAdditionalData ?? cfParameters,
  }));

export type CcmParams = Omit<z.input<typeof ccmParamsSchema>, 'cfParameters'> & {
  /** @deprecated DEPRECATED(1.8) pass additionalData instead */
  cfParameters?: string;
};

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

export type SwapFeeType = 'IngressDepositChannel' | 'IngressVaultSwap' | 'Network' | 'Egress';

export const fillOrKillParams = z.object({
  retryDurationBlocks: number,
  refundAddress: z.string(),
  minPriceX128: numericString,
});

export type FillOrKillParamsX128 = z.input<typeof fillOrKillParams>;
export type FillOrKillParamsWithMinPrice = Omit<FillOrKillParamsX128, 'minPriceX128'> & {
  minPrice: string;
};

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
  isVaultSwap: boolean;
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

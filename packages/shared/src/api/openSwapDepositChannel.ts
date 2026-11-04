import { ChainflipNetwork } from '@chainflip/utils/chainflip';
import { z } from 'zod';
import { assetAndChain, numericString } from '../parsers.js';
import { ccmParamsSchema, dcaParams, fillOrKillParams } from '../schemas.js';
import { validateAddress } from '../validation/addressValidation.js';

const assets = z.object({
  srcAsset: assetAndChain,
  destAsset: assetAndChain,
});

const u128String = numericString.refine(
  (v) => {
    try {
      return BigInt(v) < 2n ** 128n;
    } catch {
      return true;
    }
  },
  { message: 'must be less than 2^128' },
);

export const getOpenSwapDepositChannelSchema = (network: ChainflipNetwork) =>
  z
    .intersection(
      assets,
      z.object({
        destAddress: z.string(),
        amount: u128String,
        ccmParams: ccmParamsSchema.optional(),
        maxBoostFeeBps: z.number().optional(),
        srcAddress: z.string().optional(),
        fillOrKillParams,
        dcaParams: dcaParams.optional(),
        quote: z
          .object({
            intermediateAmount: u128String.optional(),
            egressAmount: u128String,
            estimatedPrice: z.string().refine((v) => Number.isFinite(Number(v)), {
              message: 'must be a finite number',
            }),
            recommendedSlippageTolerancePercent: z.number().optional(),
            recommendedLivePriceSlippageTolerancePercent: z.number().optional(),
          })
          .optional(),
        takeCommission: z.boolean().optional(),
      }),
    )
    .superRefine(({ ...val }, ctx) => {
      if (!validateAddress(val.destAsset.chain, val.destAddress, network)) {
        ctx.addIssue({
          message: `Address "${val.destAddress}" is not a valid "${val.destAsset.chain}" address for "${network}"`,
          code: z.ZodIssueCode.custom,
        });
      }

      if (!validateAddress(val.srcAsset.chain, val.fillOrKillParams.refundAddress, network)) {
        ctx.addIssue({
          message: `Address "${val.fillOrKillParams.refundAddress}" is not a valid "${val.srcAsset.chain}" address for "${network}"`,
          code: z.ZodIssueCode.custom,
        });
      }
    })
    .transform(({ amount, ...rest }) => ({
      ...rest,
      expectedDepositAmount: amount,
    }));

export const DepositChannelInfo = z.object({
  id: z.string(),
  depositAddress: z.string(),
  brokerCommissionBps: z.number(),
  maxBoostFeeBps: z.number(),
  issuedBlock: z.number(),
  srcChainExpiryBlock: z.string(),
  estimatedExpiryTime: z.number().optional(),
  channelOpeningFee: z.string(),
});

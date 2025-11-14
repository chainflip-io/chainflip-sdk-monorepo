import { ChainflipNetwork } from '@chainflip/utils/chainflip';
import { z } from 'zod';
import { asset, assetAndChain, chain, numericString } from '../parsers.js';
import { ccmParamsSchema, dcaParams, fillOrKillParams } from '../schemas.js';
import { validateAddress } from '../validation/addressValidation.js';

const assets = z.union([
  z.object({
    srcAsset: assetAndChain,
    destAsset: assetAndChain,
  }),
  /** @deprecated DEPRECATED(1.12): remove this variant */
  z
    .object({
      srcAsset: asset,
      destAsset: asset,
      srcChain: chain,
      destChain: chain,
    })
    .transform(({ srcAsset, destAsset, srcChain, destChain }) => ({
      srcAsset: assetAndChain.parse({ asset: srcAsset, chain: srcChain }),
      destAsset: assetAndChain.parse({ asset: destAsset, chain: destChain }),
    })),
]);

export const getOpenSwapDepositChannelSchema = (network: ChainflipNetwork) =>
  z
    .intersection(
      assets,
      z.object({
        destAddress: z.string(),
        amount: numericString,
        ccmParams: ccmParamsSchema.optional(),
        maxBoostFeeBps: z.number().optional(),
        srcAddress: z.string().optional(),
        fillOrKillParams,
        dcaParams: dcaParams.optional(),
        quote: z
          .object({
            intermediateAmount: z.string().optional(),
            egressAmount: z.string(),
            estimatedPrice: z.string(),
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

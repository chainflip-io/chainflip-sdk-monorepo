import { z } from 'zod';
import { asset, chain, numericString } from '../parsers.js';
import { ccmParamsSchema, dcaParams, fillOrKillParams } from '../schemas.js';

export const OpenSwapDepositChannelBody = z
  .object({
    srcAsset: asset,
    destAsset: asset,
    srcChain: chain,
    destChain: chain,
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
      })
      .optional(),
    takeCommission: z.boolean().optional(),
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
  srcChainExpiryBlock: z.bigint().transform((n) => n.toString()),
  estimatedExpiryTime: z.number().optional(),
  channelOpeningFee: z.bigint().transform((n) => n.toString()),
});

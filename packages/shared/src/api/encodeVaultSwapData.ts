import { bytesToHex } from '@chainflip/utils/bytes';
import { chainflipNetworks } from '@chainflip/utils/chainflip';
import { priceX128ToPrice } from '@chainflip/utils/tickMath';
import { BigNumber } from 'bignumber.js';
import { z } from 'zod';
import { assert } from '../guards.js';
import { assetAndChain, chainflipAddress, hexString, unsignedInteger } from '../parsers.js';
import {
  affiliateBroker,
  ccmParamsSchema,
  dcaParams as dcaParamsSchema,
  fillOrKillParams as fillOrKillParamsSchema,
} from '../schemas.js';
import { validateAddress } from '../validation/addressValidation.js';

const TransformedCcmParams = ccmParamsSchema.transform(
  ({ message, gasBudget, ccmAdditionalData }) => ({
    message,
    gas_budget: gasBudget,
    ccm_additional_data: ccmAdditionalData,
  }),
);

const FillOrKillParams = fillOrKillParamsSchema.transform(
  ({
    retryDurationBlocks,
    refundAddress,
    minPriceX128,
    maxOraclePriceSlippage,
    refundCcmMetadata,
  }) => ({
    retry_duration: retryDurationBlocks,
    refund_address: refundAddress!,
    min_price: `0x${BigInt(minPriceX128).toString(16)}` as const,
    max_oracle_price_slippage: maxOraclePriceSlippage,
    refund_ccm_metadata: refundCcmMetadata && {
      gas_budget: refundCcmMetadata.gasBudget,
      message: refundCcmMetadata.message,
      ccm_additional_data: refundCcmMetadata.ccmAdditionalData,
    },
  }),
);

const TransformedDcaParams = dcaParamsSchema.transform(
  ({ numberOfChunks, chunkIntervalBlocks }) => ({
    number_of_chunks: numberOfChunks,
    chunk_interval: chunkIntervalBlocks,
  }),
);

export const EncodeVaultSwapBody = z
  .object({
    srcAsset: assetAndChain,
    srcAddress: z.string().optional(),
    destAsset: assetAndChain,
    destAddress: z.string(),
    amount: unsignedInteger,
    commissionBps: z.number().optional().default(0),
    ccmParams: TransformedCcmParams.optional(),
    maxBoostFeeBps: z.number().optional(),
    affiliates: z.array(affiliateBroker).optional(),
    fillOrKillParams: FillOrKillParams,
    dcaParams: TransformedDcaParams.optional(),
    extraParams: z.object({ seed: hexString.optional() }).optional(),
    network: z.enum(chainflipNetworks),
    brokerAccount: chainflipAddress.optional(),
  })
  .superRefine(({ network, ...val }, ctx) => {
    if (val.srcAddress && !validateAddress(val.srcAsset.chain, val.srcAddress, network)) {
      ctx.addIssue({
        message: `Address "${val.srcAddress}" is not a valid "${val.srcAsset.chain}" address for "${network}"`,
        code: z.ZodIssueCode.custom,
      });
    }

    if (!validateAddress(val.destAsset.chain, val.destAddress, network)) {
      ctx.addIssue({
        message: `Address "${val.destAddress}" is not a valid "${val.destAsset.chain}" address for "${network}"`,
        code: z.ZodIssueCode.custom,
      });
    }

    if (!validateAddress(val.srcAsset.chain, val.fillOrKillParams.refund_address, network)) {
      ctx.addIssue({
        message: `Address "${val.fillOrKillParams.refund_address}" is not a valid "${val.srcAsset.chain}" address for "${network}"`,
        code: z.ZodIssueCode.custom,
      });
    }

    if (val.extraParams?.seed && val.extraParams.seed.length !== 66) {
      ctx.addIssue({ message: 'Seed must be 32 bytes', code: z.ZodIssueCode.custom });
    }
  })
  .transform(({ network, ...data }) => {
    let extraParams;
    if (data.srcAsset.chain === 'Bitcoin') {
      const minOutputAmount = BigNumber(data.amount.toString())
        .multipliedBy(priceX128ToPrice(data.fillOrKillParams.min_price))
        .toFixed(0);

      extraParams = {
        chain: 'Bitcoin',
        min_output_amount: `0x${BigInt(minOutputAmount).toString(16)}`,
        retry_duration: data.fillOrKillParams.retry_duration,
        max_oracle_price_slippage: data.fillOrKillParams.max_oracle_price_slippage,
      } as const;
    } else if (data.srcAsset.chain === 'Ethereum' || data.srcAsset.chain === 'Arbitrum') {
      extraParams = {
        chain: data.srcAsset.chain,
        input_amount: `0x${data.amount.toString(16)}`,
        refund_parameters: data.fillOrKillParams,
      } as const;
    } else if (data.srcAsset.chain === 'Solana') {
      assert(data.srcAddress, 'srcAddress is required for Solana');

      extraParams = {
        chain: 'Solana',
        from: data.srcAddress,
        seed: data.extraParams?.seed ?? bytesToHex(crypto.getRandomValues(new Uint8Array(32))),
        input_amount: `0x${data.amount.toString(16)}`,
        refund_parameters: data.fillOrKillParams,
      } as const;
    } else {
      throw new Error(`parameter encoding is not supported for ${data.srcAsset.chain}`);
    }

    return { ...data, extraParams };
  });

export const EncodedVaultSwapData = z.discriminatedUnion('chain', [
  z.object({
    chain: z.literal('Bitcoin'),
    nulldataPayload: hexString,
    depositAddress: z.string(),
  }),
  z.object({
    chain: z.enum(['Ethereum', 'Arbitrum']),
    value: z.string(),
    to: hexString,
    calldata: hexString,
    sourceTokenAddress: hexString.optional(),
  }),
  z.object({
    chain: z.literal('Solana'),
    programId: z.string(),
    data: hexString,
    accounts: z.array(
      z.object({
        pubkey: z.string(),
        isSigner: z.boolean(),
        isWritable: z.boolean(),
      }),
    ),
  }),
]);

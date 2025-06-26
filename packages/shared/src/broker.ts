import { HttpClient } from '@chainflip/rpc';
import { unreachable } from '@chainflip/utils/assertion';
import { bytesToHex } from '@chainflip/utils/bytes';
import {
  AssetSymbol,
  ChainflipChain,
  ChainflipNetwork,
  UncheckedAssetAndChain,
} from '@chainflip/utils/chainflip';
import * as ss58 from '@chainflip/utils/ss58';
import { isHex } from '@chainflip/utils/string';
import { priceX128ToPrice } from '@chainflip/utils/tickMath';
import { HexString } from '@chainflip/utils/types';
import BigNumber from 'bignumber.js';
import { z } from 'zod';
import { assert } from './guards.js';
import { formatResponse } from './objects.js';
import { numericString, assetAndChain, unsignedInteger, DOT_PREFIX, hexString } from './parsers.js';
import {
  affiliateBroker,
  AffiliateBroker,
  CcmParams,
  ccmParamsSchema,
  FillOrKillParamsX128,
  dcaParams as dcaParamsSchema,
  DcaParams,
} from './schemas.js';
import { validateAddress } from './validation/addressValidation.js';

type DepositAddressRequest = {
  srcAsset: UncheckedAssetAndChain | AssetSymbol;
  destAsset: UncheckedAssetAndChain | AssetSymbol;
  destAddress: string;
  commissionBps?: number;
  ccmParams?: CcmParams;
  maxBoostFeeBps?: number;
  affiliates?: AffiliateBroker[];
  fillOrKillParams: FillOrKillParamsX128;
  dcaParams?: DcaParams;

  /** @deprecated DEPRECATED(1.8) pass the chain in the srcAsset object instead */
  srcChain?: ChainflipChain;
  /** @deprecated DEPRECATED(1.8) pass the chain in the destAsset object instead */
  destChain?: ChainflipChain;
};

const transformedFokSchema = z
  .object({
    retryDurationBlocks: z.number(),
    refundAddress: z.string(),
    minPriceX128: numericString,
  })
  .transform(({ retryDurationBlocks, refundAddress, minPriceX128 }) => ({
    retry_duration: retryDurationBlocks,
    refund_address: refundAddress!,
    min_price: `0x${BigInt(minPriceX128).toString(16)}` as const,
  }));

const transformedDcaParamsSchema = dcaParamsSchema.transform(
  ({ numberOfChunks, chunkIntervalBlocks }) => ({
    number_of_chunks: numberOfChunks,
    chunk_interval: chunkIntervalBlocks,
  }),
);

const transformedCcmParamsSchema = ccmParamsSchema.transform(
  ({ message, gasBudget, ccmAdditionalData }) => ({
    message,
    gas_budget: gasBudget,
    ccm_additional_data: ccmAdditionalData,
    /** @deprecated DEPRECATED(1.8) we still need to pass cf_parameters until 1.8 is deployed to all networks */
    cf_parameters: ccmAdditionalData,
  }),
);

const getDepositAddressRequestSchema = (network: ChainflipNetwork) =>
  z
    .object({
      srcAsset: assetAndChain,
      destAsset: assetAndChain,
      destAddress: z.string(),
      commissionBps: z.number().optional().default(0),
      ccmParams: transformedCcmParamsSchema.optional(),
      maxBoostFeeBps: z.number().optional(),
      affiliates: z.array(affiliateBroker).optional(),
      fillOrKillParams: transformedFokSchema,
      dcaParams: transformedDcaParamsSchema.optional(),
    })
    .superRefine((val, ctx) => {
      if (!validateAddress(val.destAsset.chain, val.destAddress, network)) {
        ctx.addIssue({
          message: `Address "${val.destAddress}" is not a valid "${val.destAsset.chain}" address for "${network}"`,
          code: z.ZodIssueCode.custom,
        });
      }
    })
    .superRefine((val, ctx) => {
      if (!validateAddress(val.srcAsset.chain, val.fillOrKillParams.refund_address, network)) {
        ctx.addIssue({
          message: `Address "${val.fillOrKillParams.refund_address}" is not a valid "${val.srcAsset.chain}" address for "${network}"`,
          code: z.ZodIssueCode.custom,
        });
      }
    });

export const getParameterEncodingRequestSchema = (network: ChainflipNetwork) =>
  z
    .object({
      srcAsset: assetAndChain,
      srcAddress: z.string().optional(),
      destAsset: assetAndChain,
      destAddress: z.string(),
      amount: unsignedInteger,
      commissionBps: z.number().optional().default(0),
      ccmParams: transformedCcmParamsSchema.optional(),
      maxBoostFeeBps: z.number().optional(),
      affiliates: z.array(affiliateBroker).optional(),
      fillOrKillParams: transformedFokSchema,
      dcaParams: transformedDcaParamsSchema.optional(),
      extraParams: z.object({ seed: hexString.optional() }).optional(),
    })
    .superRefine((val, ctx) => {
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
    .transform((data) => {
      let extraParams;
      if (data.srcAsset.chain === 'Bitcoin') {
        const minOutputAmount = BigNumber(data.amount.toString())
          .multipliedBy(priceX128ToPrice(data.fillOrKillParams.min_price))
          .toFixed(0);

        extraParams = {
          chain: 'Bitcoin',
          min_output_amount: `0x${BigInt(minOutputAmount).toString(16)}`,
          retry_duration: data.fillOrKillParams.retry_duration,
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

export async function requestSwapDepositAddress(
  request: DepositAddressRequest,
  opts: { url: string },
  chainflipNetwork: ChainflipNetwork,
) {
  const client = new HttpClient(opts.url);

  /** @deprecated pass the chain in the srcAsset and destAsset object instead */
  if (request.srcChain && typeof request.srcAsset === 'string') {
    // eslint-disable-next-line no-param-reassign
    request = { ...request, srcAsset: { asset: request.srcAsset, chain: request.srcChain } };
  }
  if (request.destChain && typeof request.destAsset === 'string') {
    // eslint-disable-next-line no-param-reassign
    request = { ...request, destAsset: { asset: request.destAsset, chain: request.destChain } };
  }

  const params = getDepositAddressRequestSchema(chainflipNetwork).parse(request);

  const response = await client.sendRequest(
    'broker_request_swap_deposit_address',
    params.srcAsset,
    params.destAsset,
    params.destAddress,
    params.commissionBps,
    params.ccmParams,
    params.maxBoostFeeBps,
    params.affiliates,
    params.fillOrKillParams,
    params.dcaParams,
  );

  switch (params.srcAsset.chain) {
    case 'Polkadot':
    case 'Assethub':
      if (isHex(response.address)) {
        response.address = ss58.encode({ data: response.address, ss58Format: DOT_PREFIX });
      }
      break;
    case 'Ethereum':
    case 'Arbitrum':
    case 'Bitcoin':
    case 'Solana':
      // these addresses come properly formatted
      break;
    default:
      return unreachable(params.srcAsset, 'unexpected chain');
  }

  return formatResponse(response);
}

type ParameterEncodingRequest = {
  srcAsset: UncheckedAssetAndChain;
  srcAddress?: string;
  destAsset: UncheckedAssetAndChain;
  destAddress: string;
  amount: string;
  commissionBps?: number;
  ccmParams?: CcmParams;
  maxBoostFeeBps?: number;
  affiliates?: AffiliateBroker[];
  fillOrKillParams: FillOrKillParamsX128;
  dcaParams?: DcaParams;
  extraParams?: { seed?: HexString };
};

export async function requestSwapParameterEncoding(
  request: ParameterEncodingRequest,
  opts: { url: string },
  chainflipNetwork: ChainflipNetwork,
) {
  const client = new HttpClient(opts.url);

  const params = getParameterEncodingRequestSchema(chainflipNetwork).parse(request);

  const response = await client.sendRequest(
    'broker_request_swap_parameter_encoding',
    params.srcAsset,
    params.destAsset,
    params.destAddress,
    params.commissionBps,
    params.extraParams,
    params.ccmParams,
    params.maxBoostFeeBps,
    params.affiliates,
    params.dcaParams,
  );

  return formatResponse(response);
}

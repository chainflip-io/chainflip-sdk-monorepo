import { HttpClient, RpcParams } from '@chainflip/rpc';
import * as ss58 from '@chainflip/utils/ss58';
import { HexString } from '@chainflip/utils/types';
import { z } from 'zod';
import { Chain, ChainflipNetwork, Asset } from './enums';
import {
  hexString,
  numericString,
  btcAddress,
  dotAddress,
  ethereumAddress,
  assetAndChain,
  solanaAddress,
  polkadotAddress,
  number,
} from './parsers';
import {
  affiliateBroker,
  AffiliateBroker,
  CcmParams,
  ccmParamsSchema,
  FillOrKillParamsX128,
  dcaParams as dcaParamsSchema,
  DcaParams,
  ensureDcaWithFok,
} from './schemas';

export type NewSwapRequest = {
  srcAsset: Asset;
  destAsset: Asset;
  srcChain: Chain;
  destChain: Chain;
  destAddress: string;
  commissionBps?: number;
  ccmParams?: CcmParams;
  maxBoostFeeBps?: number;
  affiliates?: AffiliateBroker[];
  fillOrKillParams?: FillOrKillParamsX128;
  dcaParams?: DcaParams;
};

const paramOrder = [
  'srcAsset',
  'destAsset',
  'destAddress',
  'commissionBps',
  'ccmParams',
  'maxBoostFeeBps',
  'affiliates',
  'fillOrKillParams',
  'dcaParams',
] as const;

const getTransformedFokSchema = <Z extends z.ZodTypeAny>(addressSchema: Z) =>
  z
    .object({
      retryDurationBlocks: number,
      refundAddress: addressSchema,
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

const transformedCcmParamsSchema = <T extends HexString | undefined>(defaultValue: T) =>
  ccmParamsSchema.transform(({ message, gasBudget, cfParameters }) => ({
    message,
    gas_budget: gasBudget,
    cf_parameters: cfParameters ?? defaultValue,
  }));

const validateAddressLength = (chain: Chain, address: string, type: 'destination' | 'refund') => {
  if ((chain === 'Arbitrum' || chain === 'Ethereum') && address.length !== 42) {
    throw new Error(`Invalid ${type} address length`);
  }

  if (chain === 'Polkadot' && address.length !== 66) {
    throw new Error(`Invalid ${type} address length`);
  }
};

const validateRequest = (network: ChainflipNetwork, params: unknown) => {
  const addressSchema = z.union([
    numericString,
    hexString,
    btcAddress(network),
    solanaAddress,
    polkadotAddress.transform(ss58.toPublicKey),
  ]);

  const parsed = z
    .object({
      srcAsset: assetAndChain,
      destAsset: assetAndChain,
      destAddress: addressSchema,
      commissionBps: z.number().optional().default(0),
      ccmParams: transformedCcmParamsSchema(undefined).optional(),
      maxBoostFeeBps: z.number().optional(),
      affiliates: z.array(affiliateBroker).optional(),
      fillOrKillParams: getTransformedFokSchema(addressSchema).optional(),
      dcaParams: transformedDcaParamsSchema.optional(),
    })
    .superRefine(ensureDcaWithFok)
    .parse(params);

  validateAddressLength(parsed.destAsset.chain, parsed.destAddress, 'destination');
  if (parsed.fillOrKillParams) {
    validateAddressLength(
      parsed.srcAsset.chain,
      parsed.fillOrKillParams.refund_address,
      'destination',
    );
  }
  return paramOrder.map((key) => parsed[key]);
};

const validateResponse = (network: ChainflipNetwork, response: unknown) =>
  z
    .object({
      address: z.union([dotAddress, ethereumAddress, btcAddress(network), solanaAddress]),
      issued_block: z.number(),
      channel_id: z.number(),
      source_chain_expiry_block: z.bigint(),
      channel_opening_fee: z.bigint(),
    })
    .transform(
      ({ address, issued_block, channel_id, source_chain_expiry_block, channel_opening_fee }) => ({
        address,
        issuedBlock: issued_block,
        channelId: BigInt(channel_id),
        sourceChainExpiryBlock: source_chain_expiry_block,
        channelOpeningFee: channel_opening_fee,
      }),
    )
    .parse(response);

export type DepositChannelResponse = ReturnType<typeof validateResponse>;

export async function requestSwapDepositAddress(
  swapRequest: NewSwapRequest,
  opts: { url: string },
  chainflipNetwork: ChainflipNetwork,
): Promise<DepositChannelResponse> {
  const client = new HttpClient(opts.url);

  const params = validateRequest(chainflipNetwork, {
    ...swapRequest,
    srcAsset: { asset: swapRequest.srcAsset, chain: swapRequest.srcChain },
    destAsset: { asset: swapRequest.destAsset, chain: swapRequest.destChain },
  });

  const response = await client.sendRequest(
    'broker_requestSwapDepositAddress',
    ...(params as RpcParams['broker_requestSwapDepositAddress']),
  );

  return validateResponse(chainflipNetwork, response);
}

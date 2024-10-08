import { HttpClient, RpcParams } from '@chainflip/rpc';
import * as ss58 from '@chainflip/utils/ss58';
import { z } from 'zod';
import { Chain, ChainflipNetwork, Asset } from './enums';
import { assert } from './guards';
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
  dcaParams,
  DcaParams,
  ensureDcaWithFok,
} from './schemas';

type NewSwapRequest = {
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

const getAddressSchema = (network: ChainflipNetwork) =>
  z.union([
    numericString,
    hexString,
    btcAddress(network),
    solanaAddress,
    polkadotAddress.transform(ss58.toPublicKey),
  ]);

const fillOrKillParams = <Z extends z.ZodTypeAny>(addressSchema: Z) =>
  z.object({
    retryDurationBlocks: number,
    refundAddress: addressSchema,
    minPriceX128: numericString,
  });

const validateRequest = (network: ChainflipNetwork, params: unknown) => {
  const addressSchema = getAddressSchema(network);

  const parsed = z
    .object({
      srcAsset: assetAndChain,
      destAsset: assetAndChain,
      destAddress: addressSchema,
      commissionBps: z.number().optional().default(0),
      ccmParams: ccmParamsSchema
        .transform(({ message, ...rest }) => ({
          message,
          cf_parameters: rest.cfParameters,
          gas_budget: rest.gasBudget,
        }))
        .optional(),
      maxBoostFeeBps: z.number().optional(),
      affiliates: z.array(affiliateBroker).optional(),
      fillOrKillParams: fillOrKillParams(addressSchema)
        .transform(({ retryDurationBlocks, refundAddress, minPriceX128 }) => ({
          retry_duration: retryDurationBlocks,
          refund_address: refundAddress,
          min_price: `0x${BigInt(minPriceX128).toString(16)}`,
        }))
        .optional(),
      dcaParams: dcaParams
        .transform(({ numberOfChunks, chunkIntervalBlocks }) => ({
          number_of_chunks: numberOfChunks,
          chunk_interval: chunkIntervalBlocks,
        }))
        .optional(),
    })
    .superRefine(ensureDcaWithFok)
    .parse(params);

  const evmAddressLength = 20 * 2 + 2;

  if (parsed.destAsset.chain === 'Arbitrum' || parsed.destAsset.chain === 'Ethereum') {
    assert(parsed.destAddress.length === evmAddressLength, 'Invalid destination address length');
  }

  const dotAddressLength = 32 * 2 + 2;

  if (parsed.destAsset.chain === 'Polkadot') {
    assert(parsed.destAddress.length === dotAddressLength, 'Invalid destination address length');
  }

  if (
    parsed.fillOrKillParams &&
    (parsed.srcAsset.chain === 'Arbitrum' || parsed.srcAsset.chain === 'Ethereum')
  ) {
    assert(
      parsed.fillOrKillParams.refund_address.length === evmAddressLength,
      'Invalid refund address length',
    );
  }

  if (parsed.fillOrKillParams && parsed.srcAsset.chain === 'Polkadot') {
    assert(
      parsed.fillOrKillParams.refund_address.length === dotAddressLength,
      'Invalid refund address length',
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

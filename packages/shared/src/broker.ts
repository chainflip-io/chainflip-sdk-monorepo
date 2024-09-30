import { HttpClient, RpcParams } from '@chainflip/rpc';
import * as ss58 from '@chainflip/utils/ss58';
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
} from './parsers';
import {
  affiliateBroker,
  AffiliateBroker,
  CcmParams,
  ccmParamsSchema,
  FillOrKillParamsX128,
  fillOrKillParams,
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

const validateRequest = (network: ChainflipNetwork, params: unknown) => {
  const parsed = z
    .object({
      srcAsset: assetAndChain,
      destAsset: assetAndChain,
      destAddress: z.union([numericString, hexString, btcAddress(network), solanaAddress]),
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
      fillOrKillParams: fillOrKillParams
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

  if (parsed.destAsset.chain === 'Polkadot') {
    parsed.destAddress = parsed.destAddress.startsWith('0x')
      ? z.string().length(66).parse(parsed.destAddress) // we only accept 32 byte dot addresses
      : ss58.toPublicKey(parsed.destAddress);
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

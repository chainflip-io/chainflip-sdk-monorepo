import { HttpClient, RpcParams } from '@chainflip/rpc';
import { bytesToHex } from '@chainflip/utils/bytes';
import * as ss58 from '@chainflip/utils/ss58';
import { z } from 'zod';
import { Chain, ChainflipNetwork, Asset, Chains } from './enums';
import {
  hexString,
  numericString,
  btcAddress,
  dotAddress,
  ethereumAddress,
  assetAndChain,
} from './parsers';
import {
  affiliateBroker,
  AffiliateBroker,
  CcmMetadata,
  ccmMetadataSchema,
  RefundParameters,
  refundParameters,
} from './schemas';

type NewSwapRequest = {
  srcAsset: Asset;
  destAsset: Asset;
  srcChain: Chain;
  destChain: Chain;
  destAddress: string;
  commissionBps?: number;
  ccmMetadata?: CcmMetadata;
  maxBoostFeeBps?: number;
  affiliates?: AffiliateBroker[];
  refundParameters?: RefundParameters;
};

const submitAddress = (chain: Chain, address: string): string => {
  if (chain === Chains.Polkadot) {
    return address.startsWith('0x')
      ? z.string().length(66).parse(address) // we only accept 32 byte dot addresses
      : bytesToHex(ss58.decode(address).data);
  }
  return address;
};

const validateRequest = (network: ChainflipNetwork, params: unknown) =>
  z
    .tuple([
      assetAndChain,
      assetAndChain,
      z.union([numericString, hexString, btcAddress(network)]),
      z.number(),
      ccmMetadataSchema
        .merge(
          z.object({
            cfParameters: z.union([hexString, z.string()]).optional(),
          }),
        )
        .transform(({ message, ...rest }) => ({
          message,
          cf_parameters: rest.cfParameters,
          gas_budget: `0x${BigInt(rest.gasBudget).toString(16)}` as `0x${string}`,
        }))
        .optional(),
      z.number().optional(),
      z.array(affiliateBroker).optional(),
      refundParameters
        .transform(({ retryDuration, refundAddress, minPrice }) => ({
          retry_duration: retryDuration,
          refund_address: refundAddress,
          min_price: `0x${BigInt(minPrice).toString(16)}`,
        }))
        .optional(),
    ])
    .parse(params);

const validateResponse = (network: ChainflipNetwork, response: unknown) =>
  z
    .object({
      address: z.union([dotAddress, ethereumAddress, btcAddress(network)]),
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
  const { srcAsset, srcChain, destAsset, destChain, destAddress, maxBoostFeeBps } = swapRequest;

  const client = new HttpClient(opts.url);

  const params = validateRequest(chainflipNetwork, [
    { asset: srcAsset, chain: srcChain },
    { asset: destAsset, chain: destChain },
    submitAddress(destChain, destAddress),
    swapRequest.commissionBps ?? 0,
    swapRequest.ccmMetadata && {
      ...swapRequest.ccmMetadata,
      cfParameters: undefined,
    },
    maxBoostFeeBps,
    swapRequest.affiliates,
    swapRequest.refundParameters,
  ]);

  const response = await client.sendRequest(
    'broker_requestSwapDepositAddress',
    ...(params as RpcParams['broker_requestSwapDepositAddress']),
  );

  return validateResponse(chainflipNetwork, response);
}

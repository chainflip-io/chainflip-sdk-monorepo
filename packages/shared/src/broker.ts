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
  CcmParams,
  ccmParamsSchema,
  FillOrKillParamsX128,
  fillOrKillParams,
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
      ccmParamsSchema
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
      fillOrKillParams
        .transform(({ retryDurationBlocks, refundAddress, minPriceX128 }) => ({
          retry_duration: retryDurationBlocks,
          refund_address: refundAddress,
          min_price: `0x${BigInt(minPriceX128).toString(16)}`,
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
    swapRequest.ccmParams && {
      ...swapRequest.ccmParams,
      cfParameters: undefined,
    },
    maxBoostFeeBps,
    swapRequest.affiliates,
    swapRequest.fillOrKillParams,
  ]);

  const response = await client.sendRequest(
    'broker_requestSwapDepositAddress',
    ...(params as RpcParams['broker_requestSwapDepositAddress']),
  );

  return validateResponse(chainflipNetwork, response);
}

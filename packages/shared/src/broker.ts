import { HttpClient } from '@chainflip/rpc';
import { bytesToHex } from '@chainflip/utils/bytes';
import * as ss58 from '@chainflip/utils/ss58';
import { z } from 'zod';
import { Chain, ChainflipNetwork, Asset, UncheckedAssetAndChain } from './enums';
import {
  hexString,
  btcAddress,
  dotAddress,
  ethereumAddress,
  assetAndChain,
  solanaAddress,
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

const validateRequest = (network: ChainflipNetwork, params: NewSwapRequest) => {
  const addressAndAsset = z
    .object({ asset: assetAndChain, address: z.string() })
    .refine(({ asset, address }) => {
      switch (asset.chain) {
        case 'Arbitrum':
        case 'Ethereum':
          return ethereumAddress.parse(address);
        case 'Bitcoin':
          return btcAddress(network).parse(address);
        case 'Polkadot':
          return z
            .union([hexString, dotAddress.transform((addr) => bytesToHex(ss58.decode(addr).data))])
            .refine((addr) => addr.length === 66)
            .parse(address);
        case 'Solana':
          return solanaAddress.parse(address);
        default:
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          throw new Error(`Unsupported chain ${(asset as any).chain}`);
      }
    });

  const src = assetAndChain.parse({ asset: params.srcAsset, chain: params.srcChain });
  const dest = addressAndAsset.parse({
    asset: { asset: params.destAsset, chain: params.destChain },
    address: params.destAddress,
  });

  const optionalArgs = z
    .object({
      commissionBps: z.number().optional(),
      ccmMetadata: ccmMetadataSchema
        .transform(({ message, ...rest }) => ({
          message,
          cf_parameters: rest.cfParameters,
          gas_budget: rest.gasBudget,
        }))
        .optional(),
      maxBoostFeeBps: z.number().optional(),
      affiliates: z.array(affiliateBroker).optional(),
      refundParameters: refundParameters
        .transform(({ retryDurationBlocks, refundAddress, minPrice }) => ({
          retry_duration: retryDurationBlocks,
          refund_address: refundAddress,
          min_price: `0x${BigInt(minPrice).toString(16)}`,
        }))
        .optional(),
    })
    .parse(params);

  return [
    src as UncheckedAssetAndChain,
    dest.asset as UncheckedAssetAndChain,
    dest.address,
    optionalArgs.commissionBps,
    optionalArgs.ccmMetadata,
    optionalArgs.maxBoostFeeBps,
    optionalArgs.affiliates,
    optionalArgs.refundParameters,
  ] as const;
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

  const params = validateRequest(chainflipNetwork, swapRequest);

  const response = await client.sendRequest('broker_requestSwapDepositAddress', ...params);

  return validateResponse(chainflipNetwork, response);
}

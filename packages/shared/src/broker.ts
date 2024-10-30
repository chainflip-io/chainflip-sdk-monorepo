import * as bitcoin from '@chainflip/bitcoin';
import type { EncodedAddress, ForeignChainAddress } from '@chainflip/extrinsics/160/common';
// import type { SwappingRequestSwapDepositAddressWithAffiliates } from '@chainflip/extrinsics/160/swapping/requestSwapDepositAddressWithAffiliates';
import { HttpClient, RpcParams } from '@chainflip/rpc';
import * as base58 from '@chainflip/utils/base58';
import { bytesToHex, hexToBytes } from '@chainflip/utils/bytes';
import * as ss58 from '@chainflip/utils/ss58';
import { isHex } from '@chainflip/utils/string';
import { HexString } from '@chainflip/utils/types';
import { z } from 'zod';
import { Chain, ChainflipNetwork, Asset, getInternalAsset, InternalAsset } from './enums';
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
  ccmParamsSchema.transform(({ message, gasBudget, ccmAdditionalData }) => ({
    message,
    gas_budget: gasBudget,
    ccm_additional_data: ccmAdditionalData ?? defaultValue,
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

type NonBitcoinEncodedAddress = Exclude<EncodedAddress, { Btc: unknown }>;
type BitcoinEncodedAddress = Extract<EncodedAddress, { Btc: unknown }>;

function toEncodedAddress(
  chain: Exclude<Chain, 'Bitcoin'>,
  address: string,
): NonBitcoinEncodedAddress;
function toEncodedAddress(chain: 'Bitcoin', address: string): BitcoinEncodedAddress;
function toEncodedAddress(chain: Chain, address: string): EncodedAddress;
function toEncodedAddress(chain: Chain, address: string): EncodedAddress {
  switch (chain) {
    case 'Arbitrum':
      assert(isHex(address), 'Expected hex-encoded EVM address');
      return { Arb: hexToBytes(address) };
    case 'Ethereum':
      assert(isHex(address), 'Expected hex-encoded EVM address');
      return { Eth: hexToBytes(address) } as EncodedAddress;
    case 'Polkadot':
      return { Dot: isHex(address) ? hexToBytes(address) : ss58.decode(address).data };
    case 'Solana':
      return { Sol: isHex(address) ? hexToBytes(address) : base58.decode(address) };
    case 'Bitcoin':
      return { Btc: bytesToHex(new TextEncoder().encode(address)) };
    default:
      throw new Error(`Unsupported chain: ${chain}`);
  }
}

const toForeignChainAddress = (
  chain: Chain,
  address: string,
  network: ChainflipNetwork,
): ForeignChainAddress => {
  switch (chain) {
    case 'Arbitrum':
    case 'Ethereum':
    case 'Polkadot':
    case 'Solana':
      return toEncodedAddress(chain, address);
    case 'Bitcoin': {
      const { type, data } = bitcoin.decodeAddress(address, network);
      return { Btc: { [type]: data } } as ForeignChainAddress;
    }
    default:
      throw new Error(`Unsupported chain: ${chain}`);
  }
};

export type SwappingRequestSwapDepositAddressWithAffiliates = [
  sourceAsset: InternalAsset,
  destinationAsset: InternalAsset,
  destinationAddress: EncodedAddress,
  brokerCommission: number,
  channelMetadata: {
    message: Uint8Array | `0x${string}`;
    gas_budget: `0x${string}`;
    ccm_additional_data: Uint8Array | `0x${string}`;
  } | null,
  boostFee: number,
  affiliateFees: {
    account: `0x${string}`;
    bps: number;
  }[],
  refundParameters: {
    retry_duration: number;
    refund_address: ForeignChainAddress;
    min_price: `0x${string}`;
  } | null,
  dcaParameters: {
    number_of_chunks: number;
    chunk_interval: number;
  } | null,
];

// eslint-disable-next-line @typescript-eslint/ban-types
type RemoveOptional<T> = {} & {
  [K in keyof T]-?: undefined extends T[K] ? T[K] | null : T[K];
};

export type ExtrinsicPayloadParams = RemoveOptional<NewSwapRequest>;

export const buildExtrinsicPayload = (
  swapRequest: ExtrinsicPayloadParams,
  chainflipNetwork: ChainflipNetwork,
): SwappingRequestSwapDepositAddressWithAffiliates => {
  const srcAsset = getInternalAsset({ asset: swapRequest.srcAsset, chain: swapRequest.srcChain });
  const destAsset = getInternalAsset({
    asset: swapRequest.destAsset,
    chain: swapRequest.destChain,
  });

  const ccmParams = transformedCcmParamsSchema('0x')
    .nullable()
    .parse(swapRequest.ccmParams ?? null);

  const fokParams = getTransformedFokSchema(
    z
      .string()
      .transform((address) =>
        toForeignChainAddress(swapRequest.srcChain, address, chainflipNetwork),
      ),
  )
    .nullable()
    .parse(swapRequest.fillOrKillParams ?? null);

  const dcaParams = transformedDcaParamsSchema.nullable().parse(swapRequest.dcaParams ?? null);

  assert(!dcaParams || fokParams, 'Fill or kill parameters are required for DCA');

  return [
    srcAsset,
    destAsset,
    toEncodedAddress(swapRequest.destChain, swapRequest.destAddress), // destination address
    swapRequest.commissionBps ?? 0, // broker commission
    ccmParams, // channel metadata
    srcAsset === 'Btc' ? swapRequest.maxBoostFeeBps ?? 0 : 0, // boost fee
    (swapRequest.affiliates ?? []).map(({ account, commissionBps }) => ({
      account: isHex(account) ? account : bytesToHex(ss58.decode(account).data),
      bps: commissionBps,
    })), // affiliate fees
    fokParams, // refund parameters
    dcaParams, // dca parameters
  ];
};

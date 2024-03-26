import { u8aToHex } from '@polkadot/util';
import { decodeAddress } from '@polkadot/util-crypto';
import axios from 'axios';
import { z } from 'zod';
import { Chain, ChainflipNetwork, Asset, Chains } from './enums';
import {
  hexString,
  numericString,
  btcAddress,
  dotAddress,
  hexStringFromNumber,
  unsignedInteger,
  uncheckedAssetAndChain,
  u128,
  ethereumAddress,
} from './parsers';
import { CcmMetadata, ccmMetadataSchema } from './schemas';
import { CamelCaseToSnakeCase, camelToSnakeCase } from './strings';

type NewSwapRequest = {
  srcAsset: Asset;
  destAsset: Asset;
  srcChain: Chain;
  destChain: Chain;
  destAddress: string;
  ccmMetadata?: CcmMetadata;
  boostFeeBps?: number;
};

type SnakeCaseKeys<T> = {
  [K in keyof T as K extends string ? CamelCaseToSnakeCase<K> : K]: T[K];
};

const transformObjToSnakeCase = <T>(obj: T | undefined): SnakeCaseKeys<T> | undefined => {
  if (!obj) return undefined;
  const newObj: Record<string, unknown> = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      newObj[camelToSnakeCase(key)] = obj[key];
    }
  }
  return newObj as SnakeCaseKeys<T>;
};

const submitAddress = (chain: Chain, address: string): string => {
  if (chain === Chains.Polkadot) {
    return address.startsWith('0x')
      ? z.string().length(66).parse(address) // we only accept 32 byte dot addresses
      : u8aToHex(decodeAddress(address));
  }
  return address;
};

const rpcResult = z.union([
  z.object({
    error: z.object({
      code: z.number().optional(),
      message: z.string().optional(),
      data: z.unknown().optional(),
    }),
  }),
  z.object({ result: z.unknown() }),
]);

const requestValidators = (network: ChainflipNetwork) => ({
  requestSwapDepositAddress: z
    .tuple([
      uncheckedAssetAndChain,
      uncheckedAssetAndChain,
      z.union([numericString, hexString, btcAddress(network)]),
      z.number(),
      ccmMetadataSchema
        .merge(
          z.object({
            gasBudget: hexStringFromNumber, // broker expects hex encoded number
            cfParameters: z.union([hexString, z.string()]).optional(),
          }),
        )
        .optional(),
      z.number().optional(),
    ])
    .transform(([a, b, c, d, e, f]) => [a, b, c, d, transformObjToSnakeCase(e), f]),
});

const responseValidators = (network: ChainflipNetwork) => ({
  requestSwapDepositAddress: z
    .object({
      address: z.union([dotAddress, ethereumAddress, btcAddress(network)]),
      issued_block: z.number(),
      channel_id: z.number(),
      expiry_block: z.number().int().safe().positive().optional(),
      source_chain_expiry_block: unsignedInteger.optional(),
      channel_opening_fee: u128.optional().default(0),
    })
    .transform(
      ({ address, issued_block, channel_id, source_chain_expiry_block, channel_opening_fee }) => ({
        address,
        issuedBlock: issued_block,
        channelId: BigInt(channel_id),
        sourceChainExpiryBlock: source_chain_expiry_block,
        channelOpeningFee: channel_opening_fee,
      }),
    ),
});

type RequestValidator = ReturnType<typeof requestValidators>;
type ResponseValidator = ReturnType<typeof responseValidators>;

export type DepositChannelResponse = z.infer<ResponseValidator['requestSwapDepositAddress']>;

const makeRpcRequest = async <T extends keyof RequestValidator & keyof ResponseValidator>(
  network: ChainflipNetwork,
  url: string | URL,
  method: T,
  ...params: z.input<RequestValidator[T]>
): Promise<z.output<ResponseValidator[T]>> => {
  const res = await axios.post(url.toString(), {
    jsonrpc: '2.0',
    id: 1,
    method: `broker_${method}`,
    params: requestValidators(network)[method].parse(params),
  });

  const result = rpcResult.parse(res.data);

  if ('error' in result) {
    throw new Error(
      `Broker responded with error code ${result.error.code}: ${result.error.message}`,
    );
  }

  return responseValidators(network)[method].parse(result.result);
};

export async function requestSwapDepositAddress(
  swapRequest: NewSwapRequest,
  opts: { url: string; commissionBps: number },
  chainflipNetwork: ChainflipNetwork,
): Promise<DepositChannelResponse> {
  const { srcAsset, srcChain, destAsset, destChain, destAddress, boostFeeBps } = swapRequest;

  return makeRpcRequest(
    chainflipNetwork,
    opts.url,
    'requestSwapDepositAddress',
    { asset: srcAsset, chain: srcChain },
    { asset: destAsset, chain: destChain },
    submitAddress(destChain, destAddress),
    opts.commissionBps,
    swapRequest.ccmMetadata && {
      ...swapRequest.ccmMetadata,
      cfParameters: undefined,
    },
    boostFeeBps,
  );
}

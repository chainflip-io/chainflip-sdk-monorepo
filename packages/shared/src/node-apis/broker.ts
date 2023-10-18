import { u8aToHex } from '@polkadot/util';
import { decodeAddress } from '@polkadot/util-crypto';
import assert from 'assert';
import { z } from 'zod';
import { Asset, Assets, Chain } from '../enums';
import { isNotNullish } from '../guards';
import {
  hexString,
  numericString,
  btcAddress,
  dotAddress,
  chainflipAsset,
  hexStringFromNumber,
  unsignedInteger,
} from '../parsers';
import { CcmMetadata, ccmMetadataSchema } from '../schemas';
import {
  CamelCaseToSnakeCase,
  camelToSnakeCase,
  transformAsset,
} from '../strings';

type NewSwapRequest = {
  srcAsset: Asset;
  destAsset: Asset;
  srcChain: Chain;
  destChain: Chain;
  destAddress: string;
  ccmMetadata?: CcmMetadata;
};

type SnakeCaseKeys<T> = {
  [K in keyof T as K extends string ? CamelCaseToSnakeCase<K> : K]: T[K];
};

const transformObjToSnakeCase = <T>(
  obj: T | undefined,
): SnakeCaseKeys<T> | undefined => {
  if (!obj) return undefined;
  const newObj: Record<string, unknown> = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      newObj[camelToSnakeCase(key)] = obj[key];
    }
  }
  return newObj as SnakeCaseKeys<T>;
};

const submitAddress = (asset: Asset, address: string): string => {
  if (asset === Assets.DOT) {
    return address.startsWith('0x')
      ? z.string().length(66).parse(address) // we only accept 32 byte dot addresses
      : u8aToHex(decodeAddress(address));
  }
  return address;
};

const requestValidators = {
  requestSwapDepositAddress: z
    .tuple([
      chainflipAsset.transform(transformAsset),
      chainflipAsset.transform(transformAsset),
      z.union([numericString, hexString, btcAddress()]),
      z.number(),
      ccmMetadataSchema
        .merge(
          z.object({
            gasBudget: hexStringFromNumber, // broker expects hex encoded number
            cfParameters: z.union([hexString, z.string()]).optional(),
          }),
        )
        .optional(),
    ])
    .transform(([a, b, c, d, e]) =>
      [a, b, c, d, transformObjToSnakeCase(e)].filter(isNotNullish),
    ),
};

const responseValidators = {
  requestSwapDepositAddress: z
    .object({
      address: z.union([dotAddress, hexString, btcAddress()]),
      issued_block: z.number(),
      channel_id: z.number(),
      expiry_block: z.number().int().safe().positive().optional(),
      source_chain_expiry_block: unsignedInteger.optional(),
    })
    .transform(
      ({ address, issued_block, channel_id, source_chain_expiry_block }) => ({
        address,
        issuedBlock: issued_block,
        channelId: BigInt(channel_id),
        sourceChainExpiryBlock: source_chain_expiry_block,
      }),
    ),
};

export type DepositChannelResponse = z.infer<
  (typeof responseValidators)['requestSwapDepositAddress']
>;

const makeRpcRequest = async <
  T extends keyof typeof requestValidators & keyof typeof responseValidators,
>(
  url: string | URL,
  method: T,
  ...params: z.input<(typeof requestValidators)[T]>
): Promise<z.output<(typeof responseValidators)[T]>> => {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: `broker_${method}`,
      params: requestValidators[method].parse(params),
    }),
  });

  if (!res.ok) {
    throw new Error(`request failed with status ${res.status}`);
  }

  const body = await res.json();

  if (body.error) {
    throw new Error(`request failed with error ${body.error}`);
  }

  return responseValidators[method].parse(body.result);
};

export async function requestSwapDepositAddress(
  swapRequest: NewSwapRequest,
  opts?: { url: string; commissionBps: number },
): Promise<DepositChannelResponse> {
  const { srcAsset, destAsset, destAddress } = swapRequest;

  let url = process.env.RPC_BROKER_HTTPS_URL;
  let commissionBps = 0;

  if (opts) {
    url = opts.url;
    commissionBps = opts.commissionBps;
  }

  assert(url, 'no broker url provided');
  const depositChannelResponse = await makeRpcRequest(
    url,
    'requestSwapDepositAddress',
    srcAsset,
    destAsset,
    submitAddress(destAsset, destAddress),
    commissionBps,
    swapRequest.ccmMetadata && {
      ...swapRequest.ccmMetadata,
      cfParameters: undefined,
    },
  );

  return depositChannelResponse;
}

import { u8aToHex } from '@polkadot/util';
import { decodeAddress } from '@polkadot/util-crypto';
import { z } from 'zod';
import { Asset, Assets, Chain } from '@/shared/enums';
import {
  hexString,
  numericString,
  btcAddress,
  dotAddress,
  chainflipAsset,
  chainflipChain,
} from '@/shared/parsers';
import { CcmMetadata, ccmMetadataSchema } from '@/shared/schemas';
import { isNotNullish } from '../guards';
import { memoize } from './function';
import RpcClient from './RpcClient';
import { camelToSnakeCase, transformAsset } from './string';

type NewSwapRequest = {
  srcAsset: Asset;
  destAsset: Asset;
  srcChain: Chain;
  destAddress: string;
  ccmMetadata?: CcmMetadata;
};

const transformObjToSnakeCase = (obj: Record<string, unknown> | undefined) => {
  if (!obj) return undefined;
  const newObj: Record<string, unknown> = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      newObj[camelToSnakeCase(key)] = obj[key];
    }
  }
  return newObj;
};

const submitAddress = (asset: Asset, address: string): string => {
  if (asset === Assets.DOT) {
    return u8aToHex(decodeAddress(address));
  }
  return address;
};

const requestValidators = {
  requestSwapDepositAddress: z
    .tuple([
      chainflipAsset.transform(transformAsset),
      chainflipAsset.transform(transformAsset),
      z.union([numericString, hexString, btcAddress]),
      z.number(),
      ccmMetadataSchema
        .merge(
          z.object({
            source_chain: chainflipChain,
            source_address: z.literal(0),
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
      address: z.union([hexString, btcAddress, dotAddress]),
      expiry_block: z.number(),
      issued_block: z.number(),
    })
    .transform(({ address, expiry_block, issued_block }) => ({
      address,
      expiryBlock: expiry_block,
      issuedBlock: issued_block,
    })),
};

const initializeClient = memoize(async () => {
  const rpcClient = await new RpcClient(
    process.env.RPC_BROKER_WSS_URL as string,
    requestValidators,
    responseValidators,
    'broker',
  ).connect();

  return rpcClient;
});

export type DepositChannelResponse = z.infer<
  (typeof responseValidators)['requestSwapDepositAddress']
>;

export const submitSwapToBroker = async (
  swapRequest: NewSwapRequest,
): Promise<DepositChannelResponse> => {
  const { srcAsset, destAsset, destAddress, srcChain } = swapRequest;
  const client = await initializeClient();

  const depositChannelResponse = await client.sendRequest(
    'requestSwapDepositAddress',
    srcAsset,
    destAsset,
    submitAddress(srcAsset, destAddress),
    0,
    swapRequest.ccmMetadata && {
      ...swapRequest.ccmMetadata,
      source_chain: srcChain,
      source_address: 0,
    },
  );

  return depositChannelResponse;
};

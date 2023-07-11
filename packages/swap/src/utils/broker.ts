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
import { memoize } from './function';
import RpcClient from './RpcClient';
import { transformAsset } from './string';

type NewSwapRequest = {
  srcAsset: Asset;
  destAsset: Asset;
  srcChain: Chain;
  destChain: Chain;
  destAddress: string;
  ccmMetadata?: CcmMetadata;
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
      chainflipChain,
      chainflipAsset.transform(transformAsset),
      chainflipChain,
      chainflipAsset.transform(transformAsset),
      z.union([numericString, hexString, btcAddress]),
      ccmMetadataSchema.optional(),
      z.number(),
    ])
    .transform(([a, b, c, d]) => [a, b, c, d]),
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
  const { srcAsset, destAsset, destAddress, srcChain, destChain } = swapRequest;
  const client = await initializeClient();
  const depositChannelResponse = await client.sendRequest(
    'requestSwapDepositAddress',
    srcChain,
    srcAsset,
    destChain,
    destAsset,
    submitAddress(srcAsset, destAddress),
    swapRequest.ccmMetadata,
    0, // broker commission
  );

  return depositChannelResponse;
};

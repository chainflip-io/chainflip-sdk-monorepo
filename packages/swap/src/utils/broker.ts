import { u8aToHex } from '@polkadot/util';
import { decodeAddress } from '@polkadot/util-crypto';
import { z } from 'zod';
import { supportedAsset, SupportedAsset } from '@/shared/enums';
import {
  hexString,
  numericString,
  btcAddress,
  dotAddress,
} from '@/shared/parsers';
import { memoize } from './function';
import RpcClient from './RpcClient';
import { transformAsset } from './string';

type NewSwapRequest = {
  srcAsset: SupportedAsset;
  destAsset: SupportedAsset;
  destAddress: string;
};

const requestValidators = {
  requestSwapDepositAddress: z
    .tuple([
      supportedAsset.transform(transformAsset),
      supportedAsset.transform(transformAsset),
      z.union([numericString, hexString, btcAddress]),
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
  const { srcAsset, destAsset, destAddress } = swapRequest;
  const client = await initializeClient();
  const depositChannelResponse = await client.sendRequest(
    'requestSwapDepositAddress',
    srcAsset,
    destAsset,
    destAsset === 'DOT' ? u8aToHex(decodeAddress(destAddress)) : destAddress,
    0,
  );

  return depositChannelResponse;
};

import { z } from 'zod';
import { InternalAsset, getAssetAndChain } from '@/shared/enums';
import RpcClient from '@/shared/node-apis/RpcClient';
import { hexStringFromNumber, uncheckedAssetAndChain } from '@/shared/parsers';
import { memoize } from './function';
import env from '../config/env';
import { swapRateResponseSchema } from '../quoting/schemas';

const requestValidators = {
  swap_rate: z.tuple([uncheckedAssetAndChain, uncheckedAssetAndChain, hexStringFromNumber]),
};

const responseValidators = {
  swap_rate: swapRateResponseSchema,
};

const initializeClient = memoize(async () => {
  const rpcClient = await new RpcClient(
    env.RPC_NODE_WSS_URL,
    requestValidators,
    responseValidators,
    'cf',
  ).connect();

  return rpcClient;
});

export const getSwapRate = async ({
  srcAsset,
  destAsset,
  amount,
}: {
  srcAsset: InternalAsset;
  destAsset: InternalAsset;
  amount: bigint;
}) => {
  const client = await initializeClient();

  const quote = await client.sendRequest(
    'swap_rate',
    getAssetAndChain(srcAsset),
    getAssetAndChain(destAsset),
    String(amount),
  );

  return { ...quote, quoteType: 'pool' as const };
};

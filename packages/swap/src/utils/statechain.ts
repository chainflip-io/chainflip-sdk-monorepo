import { z } from 'zod';
import { Asset, Chain } from '@/shared/enums';
import RpcClient from '@/shared/node-apis/RpcClient';
import { assetAndChain, hexStringFromNumber } from '@/shared/parsers';
import { ParsedQuoteParams } from '@/shared/schemas';
import { memoize } from './function';
import env from '../config/env';
import { swapRateResponseSchema } from '../quoting/schemas';

const requestValidators = {
  swap_rate: z.tuple([assetAndChain, assetAndChain, hexStringFromNumber]),
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

const getSwapAmount = async (
  srcChain: Chain,
  srcAsset: Asset,
  destChain: Chain,
  destAsset: Asset,
  amount: string,
): Promise<z.output<(typeof responseValidators)['swap_rate']>> => {
  const client = await initializeClient();

  return client.sendRequest(
    'swap_rate',
    { asset: srcAsset, chain: srcChain },
    { asset: destAsset, chain: destChain },
    amount,
  );
};

export const getBrokerQuote = async (
  { srcChain, srcAsset, destChain, destAsset, amount }: ParsedQuoteParams,
  id: string,
) => {
  const quote = await getSwapAmount(
    srcChain,
    srcAsset,
    destChain,
    destAsset,
    amount,
  );

  return { id, ...quote };
};

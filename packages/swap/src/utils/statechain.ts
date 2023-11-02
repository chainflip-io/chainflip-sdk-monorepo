import { z } from 'zod';
import RpcClient from '@/shared/node-apis/RpcClient';
import {
  AssetAndChain,
  chainflipAssetAndChain,
  hexStringFromNumber,
} from '@/shared/parsers';
import { QuoteQueryParams } from '@/shared/schemas';
import { memoize } from './function';
import { swapRateResponseSchema } from '../quoting/schemas';

const requestValidators = {
  swap_rate: z.tuple([
    chainflipAssetAndChain,
    chainflipAssetAndChain,
    hexStringFromNumber,
  ]),
};

const responseValidators = {
  swap_rate: swapRateResponseSchema,
};

const initializeClient = memoize(async () => {
  const rpcClient = await new RpcClient(
    process.env.RPC_NODE_WSS_URL as string,
    requestValidators,
    responseValidators,
    'cf',
  ).connect();

  return rpcClient;
});

const getSwapAmount = async (
  srcAsset: AssetAndChain,
  destAsset: AssetAndChain,
  amount: string,
): Promise<z.output<(typeof responseValidators)['swap_rate']>> => {
  const client = await initializeClient();

  return client.sendRequest('swap_rate', srcAsset, destAsset, amount);
};

export const getBrokerQuote = async (
  { srcAsset, destAsset, amount }: QuoteQueryParams,
  id: string,
) => {
  const quote = await getSwapAmount(srcAsset, destAsset, amount);

  return { id, ...quote };
};

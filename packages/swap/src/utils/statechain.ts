import { z } from 'zod';
import { Asset } from '@/shared/enums';
import RpcClient from '@/shared/node-apis/RpcClient';
import { chainflipAsset, hexStringFromNumber } from '@/shared/parsers';
import { QuoteQueryParams } from '@/shared/schemas';
import { transformAsset } from '@/shared/strings';
import { memoize } from './function';
import { swapRateResponseSchema } from '../quoting/schemas';

const requestValidators = {
  swap_rate: z.tuple([
    chainflipAsset.transform(transformAsset),
    chainflipAsset.transform(transformAsset),
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
  srcAsset: Asset,
  destAsset: Asset,
  amount: string,
): Promise<z.infer<(typeof responseValidators)['swap_rate']>> => {
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

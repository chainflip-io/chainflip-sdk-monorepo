import { z } from 'zod';
import { Asset, Chain } from '@/shared/enums';
import RpcClient from '@/shared/node-apis/RpcClient';
import { hexStringFromNumber, uncheckedAssetAndChain } from '@/shared/parsers';
import { ParsedQuoteParams } from '@/shared/schemas';
import { memoize } from './function';
import env from '../config/env';
import { swapRateResponseSchema } from '../quoting/schemas';

const requestValidators = {
  swap_rate: z.tuple([
    uncheckedAssetAndChain,
    uncheckedAssetAndChain,
    hexStringFromNumber,
  ]),
  cf_pool_price: z.tuple([uncheckedAssetAndChain, uncheckedAssetAndChain]),
  cf_pool_orders: z.tuple([uncheckedAssetAndChain, uncheckedAssetAndChain]),
};

const limitOrder = z.object({
  tick: z.number(),
  sell_amount: z.string(),
});

const rangeOrder = z.object({
  liquidity: z.number(),
  range: z.object({ start: z.number(), end: z.number() }),
});

const responseValidators = {
  swap_rate: swapRateResponseSchema,
  cf_pool_orders: z.object({
    limit_orders: z.object({
      asks: z.array(limitOrder),
      bids: z.array(limitOrder),
    }),
    range_orders: z.array(rangeOrder),
  }),
  cf_pool_price: z.object({
    tick: z.number(),
    price: z.string(),
    sqrt_price: z.string(),
  }),
};

type RpcResponse<T extends keyof typeof responseValidators> = z.output<
  (typeof responseValidators)[T]
>;

export type PoolPrice = RpcResponse<'cf_pool_price'>;
export type PoolOrders = RpcResponse<'cf_pool_orders'>;

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

  return { id, ...quote, quoteType: 'broker' as const };
};

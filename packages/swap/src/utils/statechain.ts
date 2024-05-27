import { WsClient } from '@chainflip/rpc';
import { hexEncodeNumber } from '@chainflip/utils/number';
import WebSocket from 'ws';
import { InternalAsset, getAssetAndChain } from '@/shared/enums';
import { memoize } from './function';
import env from '../config/env';

const initializeClient = memoize(() => new WsClient(env.RPC_NODE_WSS_URL, WebSocket as never));

export type SwapRateArgs = {
  srcAsset: InternalAsset;
  destAsset: InternalAsset;
  amount: bigint;
};

export const getSwapRate = async ({ srcAsset, destAsset, amount }: SwapRateArgs) => {
  const client = initializeClient();

  const { intermediary, output } = await client.sendRequest(
    'cf_swap_rate',
    getAssetAndChain(srcAsset),
    getAssetAndChain(destAsset),
    hexEncodeNumber(amount),
  );

  return { intermediateAmount: intermediary, outputAmount: output, quoteType: 'pool' as const };
};

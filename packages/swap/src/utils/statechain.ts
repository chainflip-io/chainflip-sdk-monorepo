import { WsClient, RpcParams } from '@chainflip/rpc';
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
  limitOrders?: LimitOrders;
};

export type LimitOrders = RpcParams['cf_swap_rate_v2'][3];

export const getSwapRateV2 = async ({ srcAsset, destAsset, amount, limitOrders }: SwapRateArgs) => {
  const client = initializeClient();

  const {
    intermediary: intermediateAmount,
    output: outputAmount,
    egress_fee: egressFee,
    ingress_fee: ingressFee,
    network_fee: networkFee,
  } = await client.sendRequest(
    'cf_swap_rate_v2',
    getAssetAndChain(srcAsset),
    getAssetAndChain(destAsset),
    hexEncodeNumber(amount),
    limitOrders,
  );

  return { intermediateAmount, outputAmount, egressFee, ingressFee, networkFee };
};

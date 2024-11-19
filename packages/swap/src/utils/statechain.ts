import { WsClient, RpcParams } from '@chainflip/rpc';
import { hexEncodeNumber } from '@chainflip/utils/number';
import WebSocket from 'ws';
import { InternalAsset, getAssetAndChain } from '@/shared/enums';
import { DcaParams } from '@/shared/schemas';
import { memoize } from './function';
import env from '../config/env';

const initializeClient = memoize(() => new WsClient(env.RPC_NODE_WSS_URL, WebSocket as never));

export type SwapRateArgs = {
  srcAsset: InternalAsset;
  destAsset: InternalAsset;
  depositAmount: bigint;
  limitOrders?: LimitOrders;
  brokerCommissionBps?: number;
  dcaParams?: DcaParams;
};

export type LimitOrders = RpcParams['cf_swap_rate_v3'][3];

export const getSwapRateV3 = async ({
  srcAsset,
  destAsset,
  depositAmount,
  limitOrders,
  dcaParams,
  brokerCommissionBps,
}: SwapRateArgs) => {
  const client = initializeClient();
  const dcaParameters = dcaParams
    ? {
        number_of_chunks: dcaParams.numberOfChunks,
        chunk_interval: dcaParams.chunkIntervalBlocks,
      }
    : undefined;

  const {
    ingress_fee: ingressFee,
    network_fee: networkFee,
    egress_fee: egressFee,
    intermediary: intermediateAmount,
    output: egressAmount,
    broker_commission: brokerFee,
  } = await client.sendRequest(
    'cf_swap_rate_v3',
    getAssetAndChain(srcAsset),
    getAssetAndChain(destAsset),
    hexEncodeNumber(depositAmount),
    brokerCommissionBps ?? 0,
    dcaParameters,
    limitOrders,
  );

  return {
    ingressFee,
    networkFee,
    brokerFee,
    egressFee,
    intermediateAmount,
    egressAmount,
  };
};

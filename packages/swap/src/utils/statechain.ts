import { WsClient, RpcParams } from '@chainflip/rpc';
import { ChainflipAsset, internalAssetToRpcAsset } from '@chainflip/utils/chainflip';
import { hexEncodeNumber } from '@chainflip/utils/number';
import WebSocket from 'ws';
import { DcaParams, SwapFeeType } from '@/shared/schemas';
import { memoize } from './function';
import env from '../config/env';

const initializeClient = memoize(() => new WsClient(env.RPC_NODE_WSS_URL, WebSocket as never));
export type QuoteLimitOrders = NonNullable<RpcParams['cf_swap_rate_v3'][7]>;
export type QuoteCcmParams = {
  gasBudget: bigint;
  messageLengthBytes: number;
};

export type SwapRateArgs = {
  srcAsset: ChainflipAsset;
  destAsset: ChainflipAsset;
  depositAmount: bigint;
  limitOrders?: QuoteLimitOrders;
  brokerCommissionBps?: number;
  dcaParams?: DcaParams;
  ccmParams?: QuoteCcmParams;
  excludeFees?: SwapFeeType[];
};

export const getSwapRateV3 = async ({
  srcAsset,
  destAsset,
  depositAmount,
  limitOrders,
  dcaParams: _dcaParams,
  ccmParams: _ccmParams,
  excludeFees,
  brokerCommissionBps,
}: SwapRateArgs) => {
  const client = initializeClient();
  const dcaParams = _dcaParams
    ? {
        number_of_chunks: _dcaParams.numberOfChunks,
        chunk_interval: _dcaParams.chunkIntervalBlocks,
      }
    : undefined;
  const ccmParams = _ccmParams
    ? {
        gas_budget: Number(_ccmParams.gasBudget),
        message_length: _ccmParams.messageLengthBytes,
      }
    : undefined;

  const additionalOrders = limitOrders?.filter((order) => order.LimitOrder.sell_amount !== '0x0');

  const {
    ingress_fee: ingressFee,
    network_fee: networkFee,
    egress_fee: egressFee,
    intermediary: intermediateAmount,
    output: egressAmount,
    broker_commission: brokerFee,
  } = await client.sendRequest(
    'cf_swap_rate_v3',
    internalAssetToRpcAsset[srcAsset],
    internalAssetToRpcAsset[destAsset],
    hexEncodeNumber(depositAmount),
    brokerCommissionBps ?? 0,
    dcaParams,
    ccmParams,
    excludeFees,
    additionalOrders,
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

import { WsClient, RpcParams } from '@chainflip/rpc';
import { hexEncodeNumber } from '@chainflip/utils/number';
import WebSocket from 'ws';
import { InternalAsset, getAssetAndChain, UncheckedAssetAndChain } from '@/shared/enums';
import { DcaParams, SwapFeeType } from '@/shared/schemas';
import { isAtLeastSpecVersion } from '@/swap/utils/function';
import { memoize } from './function';
import env from '../config/env';

export const initializeClient = memoize(
  () => new WsClient(env.RPC_NODE_WSS_URL, WebSocket as never),
);
type ExtractArray<T> = T extends unknown[] ? T : never;
export type LimitOrders = ExtractArray<RpcParams['cf_swap_rate_v3'][5]>;

export type SwapRateArgs = {
  srcAsset: InternalAsset;
  destAsset: InternalAsset;
  depositAmount: bigint;
  limitOrders?: LimitOrders;
  brokerCommissionBps?: number;
  dcaParams?: DcaParams;
  ccmParams?: undefined; // TODO: change the type https://linear.app/chainflip/issue/PRO-1889/update-product-side-after-changes-in-the-protocol-related-to-ccm
  excludeFees?: SwapFeeType[];
};

export const getSwapRateV3 = async ({
  srcAsset,
  destAsset,
  depositAmount,
  limitOrders,
  dcaParams,
  excludeFees,
  brokerCommissionBps,
}: SwapRateArgs) => {
  const client = initializeClient();
  const dcaParameters = dcaParams
    ? {
        number_of_chunks: dcaParams.numberOfChunks,
        chunk_interval: dcaParams.chunkIntervalBlocks,
      }
    : undefined;

  const commonParams: [
    UncheckedAssetAndChain,
    UncheckedAssetAndChain,
    `0x${string}`,
    number,
    { number_of_chunks: number; chunk_interval: number } | undefined,
  ] = [
    getAssetAndChain(srcAsset),
    getAssetAndChain(destAsset),
    hexEncodeNumber(depositAmount),
    brokerCommissionBps ?? 0,
    dcaParameters,
  ];

  const additionalOrders = limitOrders?.filter((order) => order.LimitOrder.sell_amount !== '0x0');

  const params: RpcParams['cf_swap_rate_v3'] = (await isAtLeastSpecVersion('1.8.0'))
    ? [...commonParams, null, excludeFees, additionalOrders]
    : [...commonParams, additionalOrders];

  const {
    ingress_fee: ingressFee,
    network_fee: networkFee,
    egress_fee: egressFee,
    intermediary: intermediateAmount,
    output: egressAmount,
    broker_commission: brokerFee,
  } = await client.sendRequest('cf_swap_rate_v3', ...params);

  return {
    ingressFee,
    networkFee,
    brokerFee,
    egressFee,
    intermediateAmount,
    egressAmount,
  };
};

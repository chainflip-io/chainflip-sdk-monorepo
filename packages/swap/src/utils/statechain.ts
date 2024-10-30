import { WsClient, RpcParams } from '@chainflip/rpc';
import { hexEncodeNumber } from '@chainflip/utils/number';
import WebSocket from 'ws';
import { InternalAsset, getAssetAndChain } from '@/shared/enums';
import { getPipAmountFromAmount } from '@/shared/functions';
import { memoize } from './function';
import env from '../config/env';

const initializeClient = memoize(() => new WsClient(env.RPC_NODE_WSS_URL, WebSocket as never));

export type SwapRateArgs = {
  srcAsset: InternalAsset;
  destAsset: InternalAsset;
  amount: bigint;
  limitOrders?: LimitOrders;
  brokerCommissionBps?: number;
};

export type LimitOrders = RpcParams['cf_swap_rate_v2'][3];

export const getDeductedBrokerFeeOutput = ({
  destAsset,
  inputAmount,
  intermediateAmount,
  egressAmount,
  brokerCommissionBps = 0,
  egressFee,
}: {
  destAsset: InternalAsset;
  inputAmount: bigint;
  intermediateAmount: bigint | null;
  egressAmount: bigint;
  brokerCommissionBps?: number;
  egressFee: bigint;
}) => {
  let usdcAmount = intermediateAmount ?? inputAmount;
  if (destAsset === 'Usdc') {
    usdcAmount = egressAmount;
  }

  const brokerFee = BigInt(getPipAmountFromAmount(usdcAmount, brokerCommissionBps));

  return {
    intermediateAmount: intermediateAmount ? intermediateAmount - brokerFee : undefined,
    egressAmount:
      egressAmount - getPipAmountFromAmount(egressAmount + egressFee, brokerCommissionBps),
    brokerFee,
  };
};

export const getSwapRateV2 = async ({
  srcAsset,
  destAsset,
  amount,
  limitOrders,
  brokerCommissionBps,
}: SwapRateArgs) => {
  const client = initializeClient();

  const {
    intermediary: intermediateAmount,
    output: egressAmount,
    egress_fee: egressFee,
    ingress_fee: ingressFee,
    network_fee: networkFee,
  } = await client.sendRequest(
    'cf_swap_rate_v2',
    getAssetAndChain(srcAsset),
    getAssetAndChain(destAsset),
    hexEncodeNumber(amount),
    limitOrders?.filter((order) => order.LimitOrder.sell_amount !== '0x0'),
  );

  const {
    egressAmount: egressAmountExcludingBrokerFee,
    intermediateAmount: intermediateAmountExcludingBrokerFee,
    brokerFee,
  } = getDeductedBrokerFeeOutput({
    inputAmount: amount,
    destAsset,
    intermediateAmount,
    egressAmount,
    brokerCommissionBps,
    egressFee: egressFee.amount,
  });

  return {
    intermediateAmount: intermediateAmountExcludingBrokerFee,
    egressAmount: egressAmountExcludingBrokerFee,
    egressFee,
    ingressFee,
    networkFee,
    brokerFee,
  };
};

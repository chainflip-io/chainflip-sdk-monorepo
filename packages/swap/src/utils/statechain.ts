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

const getDeductedBrokerFeeOutput = ({
  destAsset,
  inputAmount,
  intermediateAmount,
  outputAmount,
  brokerCommissionBps,
  egressFee,
}: {
  destAsset: InternalAsset;
  inputAmount: bigint;
  intermediateAmount: bigint | null;
  outputAmount: bigint;
  brokerCommissionBps?: number;
  egressFee: bigint;
}) => {
  if (!brokerCommissionBps) {
    return { intermediateAmount, outputAmount };
  }
  let usdcAmount = intermediateAmount ?? inputAmount;
  if (destAsset === 'Usdc') {
    usdcAmount = outputAmount;
  }

  const brokerFee = BigInt(
    brokerCommissionBps && getPipAmountFromAmount(usdcAmount, brokerCommissionBps),
  );

  const outputAmountExchangeRate = (outputAmount + egressFee) / (intermediateAmount ?? inputAmount);

  if (intermediateAmount) {
    return {
      intermediateAmount: intermediateAmount - brokerFee,
      outputAmount: outputAmount - brokerFee * outputAmountExchangeRate,
      brokerFee,
    };
  }
  if (destAsset === 'Usdc') {
    return {
      outputAmount: outputAmount - brokerFee,
      brokerFee,
    };
  }
  // Source asset is USDC
  return {
    outputAmount: outputAmount - brokerFee * outputAmountExchangeRate,
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

  const {
    outputAmount: outputAmountExcludingBrokerFee,
    intermediateAmount: intermediateAmountExcludingBrokerFee,
    brokerFee,
  } = getDeductedBrokerFeeOutput({
    inputAmount: amount,
    destAsset,
    intermediateAmount,
    outputAmount,
    brokerCommissionBps,
    egressFee: egressFee.amount,
  });

  return {
    intermediateAmount: intermediateAmountExcludingBrokerFee,
    outputAmount: outputAmountExcludingBrokerFee,
    egressFee,
    ingressFee,
    networkFee,
    brokerFee,
  };
};

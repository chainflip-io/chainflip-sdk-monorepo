import assert from 'assert';
import { getPoolsNetworkFeeHundredthPips } from '@/shared/consts';
import { InternalAsset, InternalAssets, assetConstants } from '@/shared/enums';
import {
  getHundredthPipAmountFromAmount,
  getPipAmountFromAmount,
  ONE_IN_HUNDREDTH_PIPS,
} from '@/shared/functions';
import { SwapFee } from '@/shared/schemas';
import { getPools } from '@/swap/utils/pools';
import { getIngressFee } from './rpc';
import ServiceError from './ServiceError';
import env from '../config/env';

export const buildFee = (
  internalAsset: InternalAsset,
  type: SwapFee['type'],
  amount: bigint,
): SwapFee => {
  const { asset, chain } = assetConstants[internalAsset];

  return { type, chain, asset, amount: amount.toString() };
};

export const calculateIncludedSwapFees = async (
  srcAsset: InternalAsset,
  destAsset: InternalAsset,
  swapInputAmount: bigint,
  intermediateAmount: bigint | null | undefined,
  swapOutputAmount: bigint,
): Promise<SwapFee[]> => {
  const networkFeeHundredthPips = getPoolsNetworkFeeHundredthPips(env.CHAINFLIP_NETWORK);
  if (srcAsset === 'Usdc' && destAsset === 'Usdc') {
    return [
      {
        type: 'NETWORK',
        chain: assetConstants[InternalAssets.Usdc].chain,
        asset: assetConstants[InternalAssets.Usdc].asset,
        amount: getHundredthPipAmountFromAmount(
          swapInputAmount,
          networkFeeHundredthPips,
        ).toString(),
      },
    ];
  }
  const pools = await getPools(srcAsset, destAsset);

  if (srcAsset === InternalAssets.Usdc) {
    return [
      {
        type: 'NETWORK',
        chain: assetConstants[InternalAssets.Usdc].chain,
        asset: assetConstants[InternalAssets.Usdc].asset,
        amount: getHundredthPipAmountFromAmount(
          swapInputAmount,
          networkFeeHundredthPips,
        ).toString(),
      },
      {
        type: 'LIQUIDITY',
        chain: assetConstants[srcAsset].chain,
        asset: assetConstants[srcAsset].asset,
        amount: getHundredthPipAmountFromAmount(
          swapInputAmount,
          pools[0].liquidityFeeHundredthPips,
        ).toString(),
      },
    ];
  }

  if (destAsset === InternalAssets.Usdc) {
    const stableAmountBeforeNetworkFee =
      (swapOutputAmount * BigInt(ONE_IN_HUNDREDTH_PIPS)) /
      BigInt(ONE_IN_HUNDREDTH_PIPS - networkFeeHundredthPips);

    return [
      {
        type: 'NETWORK',
        chain: assetConstants[InternalAssets.Usdc].chain,
        asset: assetConstants[InternalAssets.Usdc].asset,
        amount: getHundredthPipAmountFromAmount(
          stableAmountBeforeNetworkFee,
          networkFeeHundredthPips,
        ).toString(),
      },
      {
        type: 'LIQUIDITY',
        chain: assetConstants[srcAsset].chain,
        asset: assetConstants[srcAsset].asset,
        amount: getHundredthPipAmountFromAmount(
          swapInputAmount,
          pools[0].liquidityFeeHundredthPips,
        ).toString(),
      },
    ];
  }

  assert(intermediateAmount != null, 'no intermediate amount given');

  return [
    {
      type: 'NETWORK',
      chain: assetConstants[InternalAssets.Usdc].chain,
      asset: assetConstants[InternalAssets.Usdc].asset,
      amount: getHundredthPipAmountFromAmount(
        intermediateAmount,
        networkFeeHundredthPips,
      ).toString(),
    },
    {
      type: 'LIQUIDITY',
      chain: assetConstants[srcAsset].chain,
      asset: assetConstants[srcAsset].asset,
      amount: getHundredthPipAmountFromAmount(
        swapInputAmount,
        pools[0].liquidityFeeHundredthPips,
      ).toString(),
    },
    {
      type: 'LIQUIDITY',
      chain: assetConstants[InternalAssets.Usdc].chain,
      asset: assetConstants[InternalAssets.Usdc].asset,
      amount: getHundredthPipAmountFromAmount(
        intermediateAmount,
        pools[1].liquidityFeeHundredthPips,
      ).toString(),
    },
  ];
};

export const tryExtractFeesFromIngressAmount = async ({
  srcAsset,
  ingressAmount,
  brokerCommissionBps,
}: {
  srcAsset: InternalAsset;
  ingressAmount: bigint;
  brokerCommissionBps?: number;
}): Promise<{ fees: SwapFee[]; amountAfterFees: bigint }> => {
  const fees: SwapFee[] = [];

  let amountAfterFees = ingressAmount;

  const ingressFee = await getIngressFee(srcAsset);
  if (ingressFee == null) {
    throw ServiceError.internalError(`could not determine ingress fee for ${srcAsset}`);
  }
  fees.push(buildFee(srcAsset, 'INGRESS', ingressFee));
  amountAfterFees -= ingressFee;
  if (amountAfterFees <= 0n) {
    throw ServiceError.badRequest(`amount is lower than estimated ingress fee (${ingressFee})`);
  }

  if (brokerCommissionBps) {
    const brokerFee = getPipAmountFromAmount(amountAfterFees, brokerCommissionBps);
    fees.push(buildFee(srcAsset, 'BROKER', brokerFee));
    amountAfterFees -= brokerFee;
  }

  return {
    fees,
    amountAfterFees,
  };
};

import assert from 'assert';
import { getPoolsNetworkFeeHundredthPips } from '@/shared/consts';
import { InternalAsset, InternalAssets, assetConstants, chainConstants } from '@/shared/enums';
import { getHundredthPipAmountFromAmount, ONE_IN_HUNDREDTH_PIPS } from '@/shared/functions';
import { getSwapRate } from '@/shared/rpc';
import { SwapFee } from '@/shared/schemas';
import { getPools } from '@/swap/utils/pools';
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

  assert(intermediateAmount, 'no intermediate amount given');

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

export const estimateIngressEgressFeeAssetAmount = async (
  nativeFeeAmount: bigint,
  internalAsset: InternalAsset,
  blockHash: string | undefined = undefined,
): Promise<bigint> => {
  const { chain, asset } = assetConstants[internalAsset];
  const { gasAsset } = chainConstants[chain];
  if (asset === gasAsset) return nativeFeeAmount;

  // TODO: we get the output amount for the "nativeAmount" instead of figuring out the required input amount
  // this makes the result different to the backend if there are limit orders that affect the price in one direction
  // https://github.com/chainflip-io/chainflip-backend/blob/4318931178a1696866e1e70e65d73d722bee4afd/state-chain/pallets/cf-pools/src/lib.rs#L2025
  const rate = await getSwapRate(
    { rpcUrl: env.RPC_NODE_HTTP_URL },
    { chain, asset: gasAsset },
    { chain, asset },
    `0x${nativeFeeAmount.toString(16)}`,
    blockHash,
  );

  return rate.output;
};

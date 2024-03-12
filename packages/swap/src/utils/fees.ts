import assert from 'assert';
import { getPoolsNetworkFeeHundredthPips } from '@/shared/consts';
import {
  InternalAsset,
  InternalAssets,
  assetConstants,
  chainConstants,
} from '@/shared/enums';
import { getSwapRate } from '@/shared/rpc';
import { SwapFee } from '@/shared/schemas';
import { getPools } from '@/swap/utils/pools';
import env from '../config/env';

export const ONE_IN_HUNDREDTH_PIPS = 1000000;

export const getPips = (value: string, hundrethPips: number) =>
  (BigInt(value) * BigInt(hundrethPips)) / BigInt(ONE_IN_HUNDREDTH_PIPS);

export const calculateIncludedSwapFees = async (
  srcAsset: InternalAsset,
  destAsset: InternalAsset,
  swapInputAmount: string,
  intermediateAmount: string | undefined,
  swapOutputAmount: string,
): Promise<SwapFee[]> => {
  const networkFeeHundredthPips = getPoolsNetworkFeeHundredthPips(
    env.CHAINFLIP_NETWORK,
  );
  const pools =
    srcAsset === 'Usdc' && destAsset === 'Usdc'
      ? null
      : await getPools(srcAsset, destAsset);

  if (srcAsset === InternalAssets.Usdc) {
    return [
      {
        type: 'NETWORK',
        chain: assetConstants[InternalAssets.Usdc].chain,
        asset: assetConstants[InternalAssets.Usdc].asset,
        amount: getPips(swapInputAmount, networkFeeHundredthPips).toString(),
      },
      {
        type: 'LIQUIDITY',
        chain: assetConstants[srcAsset].chain,
        asset: assetConstants[srcAsset].asset,
        amount: pools
          ? getPips(
              swapInputAmount,
              pools[0].liquidityFeeHundredthPips,
            ).toString()
          : '0',
      },
    ];
  }

  if (destAsset === InternalAssets.Usdc) {
    const stableAmountBeforeNetworkFee =
      (BigInt(swapOutputAmount) * BigInt(ONE_IN_HUNDREDTH_PIPS)) /
      BigInt(ONE_IN_HUNDREDTH_PIPS - networkFeeHundredthPips);

    return [
      {
        type: 'NETWORK',
        chain: assetConstants[InternalAssets.Usdc].chain,
        asset: assetConstants[InternalAssets.Usdc].asset,
        amount: getPips(
          String(stableAmountBeforeNetworkFee),
          networkFeeHundredthPips,
        ).toString(),
      },
      {
        type: 'LIQUIDITY',
        chain: assetConstants[srcAsset].chain,
        asset: assetConstants[srcAsset].asset,
        amount: pools
          ? getPips(
              swapInputAmount,
              pools[0].liquidityFeeHundredthPips,
            ).toString()
          : '0',
      },
    ];
  }

  assert(intermediateAmount, 'no intermediate amount given');

  return [
    {
      type: 'NETWORK',
      chain: assetConstants[InternalAssets.Usdc].chain,
      asset: assetConstants[InternalAssets.Usdc].asset,
      amount: getPips(intermediateAmount, networkFeeHundredthPips).toString(),
    },
    {
      type: 'LIQUIDITY',
      chain: assetConstants[srcAsset].chain,
      asset: assetConstants[srcAsset].asset,
      amount: pools
        ? getPips(
            swapInputAmount,
            pools[0].liquidityFeeHundredthPips,
          ).toString()
        : '0',
    },
    {
      type: 'LIQUIDITY',
      chain: assetConstants[InternalAssets.Usdc].chain,
      asset: assetConstants[InternalAssets.Usdc].asset,
      amount: pools
        ? getPips(
            intermediateAmount,
            pools[1].liquidityFeeHundredthPips,
          ).toString()
        : '0',
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

import assert from 'assert';
import { getPoolsNetworkFeeHundredthPips } from '@/shared/consts';
import { Asset, Assets, ChainflipNetwork } from '@/shared/enums';
import { SwapFee } from '@/shared/schemas';
import { getPools } from '@/swap/utils/pools';

export const ONE_IN_HUNDREDTH_PIPS = 1000000;

export const getPips = (value: string, hundrethPips: number) =>
  (BigInt(value) * BigInt(hundrethPips)) / BigInt(ONE_IN_HUNDREDTH_PIPS);

export const calculateIncludedFees = async (
  srcAsset: Asset,
  destAsset: Asset,
  depositAmount: string,
  intermediateAmount: string | undefined,
  egressAmount: string,
): Promise<SwapFee[]> => {
  const networkFeeHundredthPips = getPoolsNetworkFeeHundredthPips(
    process.env.CHAINFLIP_NETWORK as ChainflipNetwork,
  );
  const pools = await getPools(srcAsset, destAsset);

  if (srcAsset === Assets.USDC) {
    return [
      {
        type: 'NETWORK',
        asset: Assets.USDC,
        amount: getPips(depositAmount, networkFeeHundredthPips).toString(),
      },
      {
        type: 'LIQUIDITY',
        asset: srcAsset,
        amount: getPips(
          depositAmount,
          pools[0].liquidityFeeHundredthPips,
        ).toString(),
      },
    ];
  }

  if (destAsset === Assets.USDC) {
    const stableAmountBeforeNetworkFee =
      (BigInt(egressAmount) * BigInt(ONE_IN_HUNDREDTH_PIPS)) /
      BigInt(ONE_IN_HUNDREDTH_PIPS - networkFeeHundredthPips);

    return [
      {
        type: 'NETWORK',
        asset: Assets.USDC,
        amount: getPips(
          String(stableAmountBeforeNetworkFee),
          networkFeeHundredthPips,
        ).toString(),
      },
      {
        type: 'LIQUIDITY',
        asset: srcAsset,
        amount: getPips(
          depositAmount,
          pools[0].liquidityFeeHundredthPips,
        ).toString(),
      },
    ];
  }

  assert(intermediateAmount, 'no intermediate amount given');

  return [
    {
      type: 'NETWORK',
      asset: Assets.USDC,
      amount: getPips(intermediateAmount, networkFeeHundredthPips).toString(),
    },
    {
      type: 'LIQUIDITY',
      asset: srcAsset,
      amount: getPips(
        depositAmount,
        pools[0].liquidityFeeHundredthPips,
      ).toString(),
    },
    {
      type: 'LIQUIDITY',
      asset: Assets.USDC,
      amount: getPips(
        intermediateAmount,
        pools[1].liquidityFeeHundredthPips,
      ).toString(),
    },
  ];
};

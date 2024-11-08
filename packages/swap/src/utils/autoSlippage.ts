import BigNumber from 'bignumber.js';
import { assetConstants, chainConstants } from '@/shared/enums';
import { getDeployedLiquidity, getUndeployedLiquidity } from './pools';
import { getRequiredBlockConfirmations } from './rpc';
import { InternalAsset } from '../client';

const getLiquidityAutoSlippage = async (
  srcAsset: InternalAsset,
  destAsset: InternalAsset,
  amount: bigint,
) => {
  const deployedLiquidity = await getDeployedLiquidity(srcAsset, destAsset);
  const liquidityRatio = new BigNumber(amount.toString()).div(deployedLiquidity.toString());

  if (liquidityRatio.isGreaterThan(0.2)) {
    return liquidityRatio.multipliedBy(2);
  }
  return new BigNumber(0);
};

const getDepositTimeAutoSlippage = async (srcAsset: InternalAsset, isBoosted: boolean) => {
  const { chain } = assetConstants[srcAsset];
  const { blockTimeSeconds } = chainConstants[chain];
  const blockConfirmations = isBoosted ? 1 : (await getRequiredBlockConfirmations(srcAsset)) ?? 0;
  const depositTimeMinutes = (blockConfirmations * blockTimeSeconds) / 60;

  if (['Solana', 'Arbitrum'].includes(chain)) {
    return depositTimeMinutes * 0.01;
  }
  if (['Ethereum', 'Polkadot'].includes(chain)) {
    return depositTimeMinutes * 0.05;
  }
  return depositTimeMinutes * 0.1;
};

const getUndeployedLiquidityAutoSlippage = async (asset: InternalAsset, amount: bigint) => {
  const undeployedLiquidity = await getUndeployedLiquidity(asset);
  if (undeployedLiquidity >= amount) {
    return new BigNumber(-0.5);
  }

  const undeployedRatio = new BigNumber(undeployedLiquidity.toString()).div(amount.toString());
  if (undeployedRatio.gt(0.5)) {
    return new BigNumber(-undeployedRatio * 0.1);
  }

  return new BigNumber(0);
};

export const calculateRecommendedSlippage = async ({
  srcAsset,
  destAsset,
  intermediateAmount,
  egressAmount,
  boostFeeBps,
  dcaChunks,
}: {
  srcAsset: InternalAsset;
  destAsset: InternalAsset;
  intermediateAmount?: bigint;
  egressAmount: bigint;
  boostFeeBps?: number;
  dcaChunks: number;
}) => {
  const minSlippage = 0.1;
  const baseSlippage = 1;

  const assetTo = srcAsset === 'Usdc' || destAsset === 'Usdc' ? destAsset : 'Usdc';

  const [deployedLiquiditySlippage, timeSlippage, undeployedLiquiditySlippage] = await Promise.all([
    await getLiquidityAutoSlippage(
      srcAsset,
      assetTo,
      (intermediateAmount ?? egressAmount) * BigInt(dcaChunks),
    ),
    await getDepositTimeAutoSlippage(srcAsset, Boolean(boostFeeBps && boostFeeBps > 0)),
    await getUndeployedLiquidityAutoSlippage(
      intermediateAmount ? 'Usdc' : destAsset,
      (intermediateAmount ?? egressAmount) * BigInt(dcaChunks),
    ),
  ]);

  const calculatedSlippage = deployedLiquiditySlippage
    .plus(timeSlippage)
    .plus(undeployedLiquiditySlippage)
    .plus(baseSlippage);

  return Math.max(minSlippage, Math.round(calculatedSlippage.toNumber() * 100) / 100);
};

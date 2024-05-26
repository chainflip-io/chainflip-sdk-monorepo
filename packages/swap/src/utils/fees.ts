import { InternalAsset, assetConstants } from '@/shared/enums';
import { SwapFee } from '@/shared/schemas';

export const buildFee = (
  internalAsset: InternalAsset,
  type: SwapFee['type'],
  amount: bigint,
): SwapFee => {
  const { asset, chain } = assetConstants[internalAsset];

  return { type, chain, asset, amount: amount.toString() };
};

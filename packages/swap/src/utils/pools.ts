import { InternalAsset, InternalAssets } from '@/shared/enums';
import prisma, { Pool } from '@/swap/client';

export const getPools = async (
  srcAsset: InternalAsset,
  destAsset: InternalAsset,
): Promise<Pool[]> => {
  if (srcAsset === InternalAssets.Usdc || destAsset === InternalAssets.Usdc) {
    return [
      await prisma.pool.findUniqueOrThrow({
        where: {
          baseAsset_quoteAsset: {
            baseAsset: srcAsset === InternalAssets.Usdc ? destAsset : srcAsset,
            quoteAsset: srcAsset === InternalAssets.Usdc ? srcAsset : destAsset,
          },
        },
      }),
    ];
  }

  return Promise.all([
    prisma.pool.findUniqueOrThrow({
      where: {
        baseAsset_quoteAsset: {
          baseAsset: srcAsset,
          quoteAsset: InternalAssets.Usdc,
        },
      },
    }),
    prisma.pool.findUniqueOrThrow({
      where: {
        baseAsset_quoteAsset: {
          baseAsset: destAsset,
          quoteAsset: InternalAssets.Usdc,
        },
      },
    }),
  ]);
};

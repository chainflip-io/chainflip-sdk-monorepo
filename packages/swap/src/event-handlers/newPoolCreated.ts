import { z } from 'zod';
import { internalAssetEnum, unsignedInteger } from '@/shared/parsers';
import type { EventHandlerArgs } from './index';

const eventArgs = z.union([
  z.object({
    baseAsset: internalAssetEnum,
    quoteAsset: internalAssetEnum,
    feeHundredthPips: unsignedInteger,
  }),
  // support 1.0 event shape used on sisyphos
  z
    .object({
      baseAsset: internalAssetEnum,
      pairAsset: internalAssetEnum,
      feeHundredthPips: unsignedInteger,
    })
    .transform(({ baseAsset, pairAsset, feeHundredthPips }) => ({
      baseAsset,
      quoteAsset: pairAsset,
      feeHundredthPips,
    })),
  // support 0.9 event shape used on sisyphos
  z
    .object({
      unstableAsset: internalAssetEnum,
      feeHundredthPips: unsignedInteger,
    })
    .transform(({ unstableAsset, feeHundredthPips }) => ({
      baseAsset: unstableAsset,
      quoteAsset: 'Usdc' as const,
      feeHundredthPips,
    })),
]);

export default async function newPoolCreated({
  prisma,
  event,
}: EventHandlerArgs): Promise<void> {
  const { baseAsset, quoteAsset, feeHundredthPips } = eventArgs.parse(
    event.args,
  );

  // handle pools that were created with USDC as base asset on sisyphos: https://blocks.staging/events/384977-0
  const stableAsset = baseAsset === 'Usdc' ? baseAsset : quoteAsset;
  const unstableAsset = baseAsset === 'Usdc' ? quoteAsset : baseAsset;

  await prisma.pool.create({
    data: {
      baseAsset: unstableAsset,
      quoteAsset: stableAsset,
      liquidityFeeHundredthPips: Number(feeHundredthPips),
    },
  });
}

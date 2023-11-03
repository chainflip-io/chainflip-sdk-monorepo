import { z } from 'zod';
import { chainflipAssetEnum, unsignedInteger } from '@/shared/parsers';
import type { EventHandlerArgs } from './index';

const eventArgs = z.union([
  z.object({
    baseAsset: chainflipAssetEnum,
    pairAsset: chainflipAssetEnum,
    feeHundredthPips: unsignedInteger,
  }),
  // previous event shape for sisyphos and perseverance
  z
    .object({
      unstableAsset: chainflipAssetEnum,
      feeHundredthPips: unsignedInteger,
    })
    .transform(({ unstableAsset, feeHundredthPips }) => ({
      baseAsset: 'USDC' as const,
      pairAsset: unstableAsset,
      feeHundredthPips,
    })),
]);

export default async function newPoolCreated({
  prisma,
  event,
}: EventHandlerArgs): Promise<void> {
  const { baseAsset, pairAsset, feeHundredthPips } = eventArgs.parse(
    event.args,
  );

  await prisma.pool.create({
    data: {
      baseAsset,
      pairAsset,
      liquidityFeeHundredthPips: Number(feeHundredthPips),
    },
  });
}

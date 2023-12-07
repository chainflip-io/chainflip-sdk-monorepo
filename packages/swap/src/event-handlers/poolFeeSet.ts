import { z } from 'zod';
import { chainflipAssetEnum, unsignedInteger } from '@/shared/parsers';
import type { EventHandlerArgs } from './index';

const eventArgs = z.intersection(
  z.object({
    baseAsset: chainflipAssetEnum,
    feeHundredthPips: unsignedInteger,
  }),
  z.union([
    z.object({ quoteAsset: chainflipAssetEnum }),
    z
      .object({ pairAsset: chainflipAssetEnum })
      .transform(({ pairAsset }) => ({ quoteAsset: pairAsset })),
  ]),
);

export default async function poolFeeSet({
  prisma,
  event,
}: EventHandlerArgs): Promise<void> {
  const {
    baseAsset,
    quoteAsset: pairAsset,
    feeHundredthPips,
  } = eventArgs.parse(event.args);

  await prisma.pool.update({
    where: {
      baseAsset_pairAsset: {
        baseAsset,
        pairAsset,
      },
    },
    data: {
      liquidityFeeHundredthPips: Number(feeHundredthPips),
    },
  });
}

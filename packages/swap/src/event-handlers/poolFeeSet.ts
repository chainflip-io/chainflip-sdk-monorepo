import { z } from 'zod';
import { chainflipAssetEnum, unsignedInteger } from '@/shared/parsers';
import type { EventHandlerArgs } from './index';

const eventArgs = z.object({
  baseAsset: chainflipAssetEnum,
  quoteAsset: chainflipAssetEnum,
  feeHundredthPips: unsignedInteger,
});

export default async function poolFeeSet({
  prisma,
  event,
}: EventHandlerArgs): Promise<void> {
  const { baseAsset, quoteAsset, feeHundredthPips } = eventArgs.parse(
    event.args,
  );

  await prisma.pool.update({
    where: {
      baseAsset_quoteAsset: {
        baseAsset,
        quoteAsset,
      },
    },
    data: {
      liquidityFeeHundredthPips: Number(feeHundredthPips),
    },
  });
}

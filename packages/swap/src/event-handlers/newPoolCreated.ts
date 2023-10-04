import { z } from 'zod';
import { chainflipAssetEnum, unsignedInteger } from '@/shared/parsers';
import type { EventHandlerArgs } from './index';

const eventArgs = z.object({
  baseAsset: chainflipAssetEnum,
  pairAsset: chainflipAssetEnum,
  feeHundredthPips: unsignedInteger,
});

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

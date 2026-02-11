import { liquidityPoolsNewPoolCreated as schema190 } from '@chainflip/processor/190/liquidityPools/newPoolCreated';
import { liquidityPoolsNewPoolCreated as schema210 } from '@chainflip/processor/210/liquidityPools/newPoolCreated';
import { z } from 'zod';
import type { EventHandlerArgs } from '../index.js';

const eventArgs = z.union([schema210.strict(), schema190.strict()]);

export type NewPoolCreatedArgs = z.input<typeof eventArgs>;

export default async function newPoolCreated({ prisma, event }: EventHandlerArgs): Promise<void> {
  const { baseAsset, quoteAsset, feeHundredthPips } = eventArgs.parse(event.args);

  // handle pools that were created with USDC as base asset on sisyphos: https://scan.sisyphos.staging/events/384977-0
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

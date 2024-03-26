import { z } from 'zod';
import { reverseHexBytes } from '@/shared/bitcoin';
import { Chain } from '@/shared/enums';
import { hexString, unsignedInteger } from '@/shared/parsers';
import type { EventHandlerArgs } from './index';

export const networkBroadcastSuccessArgs = z.object({
  broadcastId: unsignedInteger,
  transactionRef: z // v130+
    .union([
      z
        .object({ blockNumber: z.number(), extrinsicIndex: z.number() })
        .transform((v) => `${v.blockNumber}-${v.extrinsicIndex}`),
      hexString,
    ])
    .optional(),
});

export default function networkBroadcastSuccess(
  chain: Chain,
): (args: EventHandlerArgs) => Promise<void> {
  return async ({ prisma, block, event }: EventHandlerArgs): Promise<void> => {
    const args = networkBroadcastSuccessArgs.parse(event.args);

    // use updateMany to skip update if broadcast does not include any swap
    await prisma.broadcast.updateMany({
      where: { chain, nativeId: args.broadcastId },
      data: {
        succeededAt: new Date(block.timestamp),
        succeededBlockIndex: `${block.height}-${event.indexInBlock}`,
        transactionRef:
          chain === 'Bitcoin' ? reverseHexBytes(args.transactionRef) : args.transactionRef,
      },
    });
  };
}

import * as base58 from '@chainflip/utils/base58';
import { reverseBytes, hexToBytes } from '@chainflip/utils/bytes';
import { ChainflipChain } from '@chainflip/utils/chainflip';
import { HexString } from '@chainflip/utils/types';
import { z } from 'zod';
import { hexString, unsignedInteger } from '@/shared/parsers';
import type { EventHandlerArgs } from '../index';

export const broadcastSuccessArgs = (chain: ChainflipChain) =>
  z.object({
    broadcastId: unsignedInteger,
    transactionRef: z // v130+
      .union([
        z
          .object({ blockNumber: z.number(), extrinsicIndex: z.number() })
          .transform((v) => `${v.blockNumber}-${v.extrinsicIndex}`),
        hexString,
      ])
      .transform((v) => {
        if (chain === 'Bitcoin') return reverseBytes(v.slice(2));
        if (chain === 'Solana') return base58.encode(hexToBytes(v as HexString));
        return v;
      })
      .optional(),
  });

export default function broadcastSuccess(
  chain: ChainflipChain,
): (args: EventHandlerArgs) => Promise<void> {
  const parser = broadcastSuccessArgs(chain);

  return async ({ prisma, block, event }: EventHandlerArgs): Promise<void> => {
    const args = parser.parse(event.args);

    // use updateMany to skip update if broadcast does not include any swap
    await prisma.broadcast.updateMany({
      where: { chain, nativeId: args.broadcastId },
      data: {
        succeededAt: new Date(block.timestamp),
        succeededBlockIndex: `${block.height}-${event.indexInBlock}`,
        transactionRef: args.transactionRef,
      },
    });
  };
}

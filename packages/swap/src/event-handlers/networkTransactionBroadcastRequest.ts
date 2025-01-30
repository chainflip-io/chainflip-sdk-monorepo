import { type Chain } from '.prisma/client';
import { z } from 'zod';
import { EventHandlerArgs } from './index';

const transactionBroadcastRequestArgs = z
  .union([
    z
      .object({
        broadcastAttemptId: z.object({ broadcastId: z.number() }),
        transactionPayload: z.any(),
      })
      .transform((args) => ({
        ...args,
        broadcastId: args.broadcastAttemptId.broadcastId,
      })),
    z.object({
      broadcastId: z.number(),
      transactionPayload: z.any(),
    }),
  ])

  .transform((args) => ({
    ...args,
    transactionPayload: JSON.stringify(args.transactionPayload),
  }));

export type TransactionBroadcastRequestArgs = z.input<typeof transactionBroadcastRequestArgs>;

const networkTransactionBroadcastRequest =
  (chain: Chain) =>
  async ({ prisma, event }: EventHandlerArgs) => {
    const { broadcastId, transactionPayload } = transactionBroadcastRequestArgs.parse(event.args);
    await prisma.broadcast.updateMany({
      where: {
        chain,
        nativeId: broadcastId,
      },
      data: {
        transactionPayload,
      },
    });
  };

export default networkTransactionBroadcastRequest;

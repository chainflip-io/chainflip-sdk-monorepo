import { bitcoinBroadcasterBroadcastSuccess } from '@chainflip/processor/131/bitcoinBroadcaster/broadcastSuccess';
import { ethereumBroadcasterBroadcastSuccess } from '@chainflip/processor/131/ethereumBroadcaster/broadcastSuccess';
import { arbitrumBroadcasterBroadcastSuccess } from '@chainflip/processor/141/arbitrumBroadcaster/broadcastSuccess';
import { solanaBroadcasterBroadcastSuccess } from '@chainflip/processor/160/solanaBroadcaster/broadcastSuccess';
import { assethubBroadcasterBroadcastSuccess } from '@chainflip/processor/190/assethubBroadcaster/broadcastSuccess';
import { ChainflipChain } from '@chainflip/utils/chainflip';
import { z } from 'zod';
import { formatTxRef } from '@/shared/common.js';
import type { EventHandlerArgs } from '../index.js';

const schemas = {
  Arbitrum: arbitrumBroadcasterBroadcastSuccess.transform((args) => ({
    ...args,
    transactionRef: formatTxRef({ chain: 'Arbitrum' as const, data: args.transactionRef }),
  })),
  Bitcoin: bitcoinBroadcasterBroadcastSuccess.transform((args) => ({
    ...args,
    transactionRef: formatTxRef({ chain: 'Bitcoin' as const, data: args.transactionRef }),
  })),
  Ethereum: ethereumBroadcasterBroadcastSuccess.transform((args) => ({
    ...args,
    transactionRef: formatTxRef({ chain: 'Ethereum' as const, data: args.transactionRef }),
  })),
  Solana: solanaBroadcasterBroadcastSuccess.transform((args) => ({
    ...args,
    transactionRef: formatTxRef({ chain: 'Solana' as const, data: args.transactionRef }),
  })),
  Assethub: assethubBroadcasterBroadcastSuccess.transform((args) => ({
    ...args,
    transactionRef: formatTxRef({ chain: 'Assethub' as const, data: args.transactionRef }),
  })),
} as const satisfies Record<ChainflipChain, z.ZodTypeAny>;

export type BroadcastSuccessArgsMap = {
  [C in ChainflipChain]: z.input<(typeof schemas)[C]>;
};

const broadcastSuccess =
  (chain: ChainflipChain): ((args: EventHandlerArgs) => Promise<void>) =>
  async ({ prisma, block, event }: EventHandlerArgs): Promise<void> => {
    const args = schemas[chain].parse(event.args);

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

export default broadcastSuccess;

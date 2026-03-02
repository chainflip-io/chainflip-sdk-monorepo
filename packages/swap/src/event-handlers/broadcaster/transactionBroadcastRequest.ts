import { ethereumBroadcasterTransactionBroadcastRequest } from '@chainflip/processor/120/ethereumBroadcaster/transactionBroadcastRequest';
import { bitcoinBroadcasterTransactionBroadcastRequest } from '@chainflip/processor/131/bitcoinBroadcaster/transactionBroadcastRequest';
import { arbitrumBroadcasterTransactionBroadcastRequest } from '@chainflip/processor/141/arbitrumBroadcaster/transactionBroadcastRequest';
import { solanaBroadcasterTransactionBroadcastRequest } from '@chainflip/processor/180/solanaBroadcaster/transactionBroadcastRequest';
import { assethubBroadcasterTransactionBroadcastRequest } from '@chainflip/processor/190/assethubBroadcaster/transactionBroadcastRequest';
import { ChainflipChain } from '@chainflip/utils/chainflip';
import { z } from 'zod';
import { safeStringify } from '@/shared/functions.js';
import { EventHandlerArgs } from '../index.js';

const schemas = {
  Arbitrum: arbitrumBroadcasterTransactionBroadcastRequest,
  Bitcoin: bitcoinBroadcasterTransactionBroadcastRequest,
  Ethereum: ethereumBroadcasterTransactionBroadcastRequest,
  Solana: solanaBroadcasterTransactionBroadcastRequest,
  Assethub: assethubBroadcasterTransactionBroadcastRequest,
} as const satisfies Record<ChainflipChain, z.ZodTypeAny>;

export type TransactionBroadcastRequestArgsMap = {
  [C in ChainflipChain]: z.input<(typeof schemas)[C]>;
};

const transactionBroadcastRequest =
  (chain: ChainflipChain) =>
  async ({ prisma, event }: EventHandlerArgs) => {
    const { broadcastId, transactionPayload } = schemas[chain].parse(event.args);
    await prisma.broadcast.updateMany({
      where: {
        chain,
        nativeId: broadcastId,
      },
      data: {
        transactionPayload: safeStringify(transactionPayload),
      },
    });
  };

export default transactionBroadcastRequest;

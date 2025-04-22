import { Prisma } from './client.js';
import type { Block } from './processBlocks.js';

const preBlock = async (txClient: Prisma.TransactionClient, block: Block) => {
  await txClient.swapDepositChannel.updateMany({
    where: {
      expiryBlock: { lte: block.height },
      isExpired: false,
    },
    data: { isExpired: true },
  });
};

export default preBlock;

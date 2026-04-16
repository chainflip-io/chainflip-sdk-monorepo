import { logger } from '../../logger.js';
import type { EventHandlerContext } from './index.js';

export const handleCollateralAdded = async ({ prisma, event, block }: EventHandlerContext) => {
  const { lp_account, asset, amount } = event.args as {
    lp_account: string;
    asset: string;
    amount: string;
  };

  const executedBlockIndex = `${block.height}-${event.indexInBlock}`;
  const timestamp = new Date(block.timestamp);

  await prisma.collateralEvent.create({
    data: {
      lpAccount: lp_account,
      asset,
      amount,
      type: 'ADDED',
      executedBlockIndex,
      timestamp,
    },
  });

  logger.debug('CollateralAdded processed', { lpAccount: lp_account, asset, amount });
};

export const handleCollateralRemoved = async ({ prisma, event, block }: EventHandlerContext) => {
  const { lp_account, asset, amount } = event.args as {
    lp_account: string;
    asset: string;
    amount: string;
  };

  const executedBlockIndex = `${block.height}-${event.indexInBlock}`;
  const timestamp = new Date(block.timestamp);

  await prisma.collateralEvent.create({
    data: {
      lpAccount: lp_account,
      asset,
      amount,
      type: 'REMOVED',
      executedBlockIndex,
      timestamp,
    },
  });

  logger.debug('CollateralRemoved processed', { lpAccount: lp_account, asset, amount });
};
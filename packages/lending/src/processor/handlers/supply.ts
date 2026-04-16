import { logger } from '../../logger.js';
import type { EventHandlerContext } from './index.js';

export const handleLenderFundsAdded = async ({ prisma, event, block }: EventHandlerContext) => {
  const { lp_account, asset, amount } = event.args as {
    lp_account: string;
    asset: string;
    amount: string;
  };

  const executedBlockIndex = `${block.height}-${event.indexInBlock}`;
  const timestamp = new Date(block.timestamp);

  const pool = await prisma.lendingPool.findUnique({ where: { asset } });
  if (!pool) {
    logger.warn(`LendingPool not found for asset "${asset}", skipping LenderFundsAdded`);
    return;
  }

  await prisma.supplyPosition.upsert({
    where: { lpAccount_asset: { lpAccount: lp_account, asset } },
    create: {
      lpAccount: lp_account,
      asset,
      suppliedAmount: amount,
      poolId: pool.id,
    },
    update: {
      suppliedAmount: amount,
    },
  });

  await prisma.supplyEvent.create({
    data: {
      lpAccount: lp_account,
      asset,
      amount,
      type: 'SUPPLIED',
      executedBlockIndex,
      timestamp,
    },
  });

  logger.debug('LenderFundsAdded processed', { lpAccount: lp_account, asset, amount });
};

export const handleLenderFundsRemoved = async ({ prisma, event, block }: EventHandlerContext) => {
  const { lp_account, asset, amount } = event.args as {
    lp_account: string;
    asset: string;
    amount: string;
  };

  const executedBlockIndex = `${block.height}-${event.indexInBlock}`;
  const timestamp = new Date(block.timestamp);

  await prisma.supplyPosition.update({
    where: { lpAccount_asset: { lpAccount: lp_account, asset } },
    data: {
      suppliedAmount: amount,
    },
  });

  await prisma.supplyEvent.create({
    data: {
      lpAccount: lp_account,
      asset,
      amount,
      type: 'WITHDRAWN',
      executedBlockIndex,
      timestamp,
    },
  });

  logger.debug('LenderFundsRemoved processed', { lpAccount: lp_account, asset, amount });
};
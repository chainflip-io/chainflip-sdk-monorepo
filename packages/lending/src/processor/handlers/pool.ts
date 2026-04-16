import { logger } from '../../logger.js';
import type { EventHandlerContext } from './index.js';

export const handlePoolStateUpdated = async ({ prisma, event, block }: EventHandlerContext) => {
  const {
    asset,
    total_supplied_amount,
    total_borrowed_amount,
    total_available_amount,
    supply_apy_bps,
    borrow_apy_bps,
    utilization_rate_bps,
  } = event.args as {
    asset: string;
    total_supplied_amount: string;
    total_borrowed_amount: string;
    total_available_amount: string;
    supply_apy_bps: number;
    borrow_apy_bps: number;
    utilization_rate_bps: number;
  };

  const executedBlockIndex = `${block.height}-${event.indexInBlock}`;
  const timestamp = new Date(block.timestamp);

  const pool = await prisma.lendingPool.upsert({
    where: { asset },
    create: {
      asset,
      totalSuppliedAmount: total_supplied_amount,
      totalBorrowedAmount: total_borrowed_amount,
      totalAvailableAmount: total_available_amount,
      supplyApyBps: supply_apy_bps,
      borrowApyBps: borrow_apy_bps,
      utilizationRateBps: utilization_rate_bps,
      originationFeeBps: 0,
      liquidationFeeBps: 0,
      updatedAtBlock: block.height,
    },
    update: {
      totalSuppliedAmount: total_supplied_amount,
      totalBorrowedAmount: total_borrowed_amount,
      totalAvailableAmount: total_available_amount,
      supplyApyBps: supply_apy_bps,
      borrowApyBps: borrow_apy_bps,
      utilizationRateBps: utilization_rate_bps,
      updatedAtBlock: block.height,
    },
  });

  await prisma.poolSnapshot.create({
    data: {
      asset,
      poolId: pool.id,
      totalSupplied: total_supplied_amount,
      totalBorrowed: total_borrowed_amount,
      totalAvailable: total_available_amount,
      supplyApyBps: supply_apy_bps,
      borrowApyBps: borrow_apy_bps,
      utilizationBps: utilization_rate_bps,
      executedBlockIndex,
      timestamp,
    },
  });

  logger.debug('PoolStateUpdated processed', { asset, block: block.height });
};
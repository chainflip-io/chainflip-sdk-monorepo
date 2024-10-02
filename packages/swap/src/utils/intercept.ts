import { Request, Response, NextFunction } from 'express';
import prisma from '../client';

const getLastChainTrackingUpdateTimestamp = async () => {
  const latestChainTracking = await prisma.chainTracking.findFirst({
    orderBy: {
      updatedAt: 'desc',
    },
  });

  if (!latestChainTracking) {
    return null;
  }

  return latestChainTracking.updatedAt;
};

export const stalenessCheck = async (_: Request, res: Response, next: NextFunction) => {
  const lastUpdateTimestamp = await getLastChainTrackingUpdateTimestamp();

  if (lastUpdateTimestamp) {
    res.header('X-Last-Update', lastUpdateTimestamp.toUTCString());
    // If we didn't update the chain tracking table in the last minute, we consider the data stale
    if (lastUpdateTimestamp.getTime() < Date.now() - 1000 * 60) {
      res.header('X-Status', 'stale');
    }
  } else {
    res.header('X-Status', 'offline');
  }

  next();
};

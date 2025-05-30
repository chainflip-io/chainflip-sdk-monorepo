import { Request, Response, NextFunction } from 'express';
import prisma from '../client.js';
import { asyncHandler } from '../routes/common.js';

export const getLastChainTrackingUpdateTimestamp = async () => {
  const latestChainTracking = await prisma.chainTracking.findFirst({
    orderBy: {
      updatedAt: 'desc',
    },
  });

  if (!latestChainTracking) {
    return undefined;
  }

  return latestChainTracking.updatedAt;
};

export const lastUpdateHeader = asyncHandler(
  async (_: Request, res: Response, next: NextFunction) => {
    const lastUpdateTimestamp = await getLastChainTrackingUpdateTimestamp();

    if (lastUpdateTimestamp) {
      res.header('X-Chainflip-Last-Statechain-Update', lastUpdateTimestamp.toUTCString());
    }

    next();
  },
);

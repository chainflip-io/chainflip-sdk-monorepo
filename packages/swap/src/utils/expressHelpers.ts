import { WarningCode } from '../../../sdk/src/swap/types';
import { Response } from 'express';
import prisma from '../client';

const getWarning = async (): Promise<WarningCode | undefined> => {
  const latestChainTracking = await prisma.chainTracking.findFirst({
    orderBy: {
      blockTrackedAt: 'desc',
    },
  });
  if (!latestChainTracking) {
    return WarningCode.CHAIN_TRACKING_NOT_FOUND;
  }
  if (new Date(latestChainTracking.blockTrackedAt).getTime() < Date.now() - 1000 * 60 * 5) {
    return WarningCode.CHAIN_TRACKING_NOT_SYNCED;
  }
};

export const sendJsonResponse = async (res: Response, data: any) => {
  const warning = await getWarning();
  res.json({ ...data, warning });
};

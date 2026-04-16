import { Router } from 'express';
import prisma from '../../client.js';

export const configRoutes = Router();

configRoutes.get('/', async (_req, res, next) => {
  try {
    const [assetConfigs, processorState] = await Promise.all([
      prisma.assetConfig.findMany(),
      prisma.processorState.findUnique({ where: { id: 1 } }),
    ]);

    res.json({
      assets: assetConfigs,
      processor: {
        lastProcessedBlock: processorState?.lastProcessedBlock ?? 0,
      },
    });
  } catch (error) {
    next(error);
  }
});
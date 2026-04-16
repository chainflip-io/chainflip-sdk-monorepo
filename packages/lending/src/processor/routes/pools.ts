import { Router } from 'express';
import prisma from '../../client.js';

export const poolRoutes = Router();

poolRoutes.get('/', async (_req, res, next) => {
  try {
    const pools = await prisma.lendingPool.findMany({
      include: {
        _count: { select: { loans: true, supplyPositions: true } },
      },
    });

    res.json(pools);
  } catch (error) {
    next(error);
  }
});

poolRoutes.get('/:asset', async (req, res, next) => {
  try {
    const { asset } = req.params;

    const pool = await prisma.lendingPool.findUnique({
      where: { asset },
      include: {
        loans: { where: { status: 'ACTIVE' }, take: 50 },
        supplyPositions: { take: 50 },
      },
    });

    if (!pool) {
      res.status(404).json({ error: `Pool not found for asset: ${asset}` });
      return;
    }

    res.json(pool);
  } catch (error) {
    next(error);
  }
});
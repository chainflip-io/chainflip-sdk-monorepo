import { Router } from 'express';
import prisma from '../../client.js';

export const lpRoutes = Router();

lpRoutes.get('/:idSs58', async (req, res, next) => {
  try {
    const { idSs58 } = req.params;

    const [supplyPositions, loans, userStat] = await Promise.all([
      prisma.supplyPosition.findMany({
        where: { lpAccount: idSs58 },
        include: { pool: true },
      }),
      prisma.loan.findMany({
        where: { lpAccount: idSs58 },
        include: {
          loanEvents: { orderBy: { timestamp: 'desc' }, take: 5 },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.userStat.findUnique({
        where: { lpAccount: idSs58 },
      }),
    ]);

    res.json({
      lpAccount: idSs58,
      supplyPositions,
      loans,
      stats: userStat,
    });
  } catch (error) {
    next(error);
  }
});
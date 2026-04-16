import { Router } from 'express';
import prisma from '../../client.js';

export const liquidationRoutes = Router();

liquidationRoutes.get('/:swapRequestId', async (req, res, next) => {
  try {
    const swapRequestId = Number(req.params.swapRequestId);

    if (Number.isNaN(swapRequestId)) {
      res.status(400).json({ error: 'Invalid swap request ID' });
      return;
    }

    const liquidations = await prisma.liquidationEvent.findMany({
      where: { swapRequestId },
      include: {
        loan: true,
      },
      orderBy: { timestamp: 'desc' },
    });

    res.json(liquidations);
  } catch (error) {
    next(error);
  }
});
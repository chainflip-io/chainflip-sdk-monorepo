import { Router } from 'express';
import prisma from '../../client.js';

export const loanRoutes = Router();

loanRoutes.get('/', async (req, res, next) => {
  try {
    const { lpAccount, status, limit = '50', offset = '0' } = req.query as Record<string, string>;

    const loans = await prisma.loan.findMany({
      where: {
        ...(lpAccount && { lpAccount }),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...(status && { status: status as any }),
      },
      include: {
        loanEvents: { orderBy: { timestamp: 'desc' }, take: 5 },
      },
      orderBy: { createdAt: 'desc' },
      take: Math.min(Number(limit), 100),
      skip: Number(offset),
    });

    res.json(loans);
  } catch (error) {
    next(error);
  }
});

loanRoutes.get('/:id', async (req, res, next) => {
  try {
    const loanId = Number(req.params.id);

    if (Number.isNaN(loanId)) {
      res.status(400).json({ error: 'Invalid loan ID' });
      return;
    }

    const loan = await prisma.loan.findUnique({
      where: { loanId },
      include: {
        loanEvents: { orderBy: { timestamp: 'desc' } },
        feeEvents: { orderBy: { timestamp: 'desc' } },
        liquidationEvents: { orderBy: { timestamp: 'desc' } },
      },
    });

    if (!loan) {
      res.status(404).json({ error: `Loan not found: ${loanId}` });
      return;
    }

    res.json(loan);
  } catch (error) {
    next(error);
  }
});
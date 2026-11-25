import express, { Router } from 'express';
import { z } from 'zod';
import prisma from '../prisma.js';
import ServiceError from '../utils/ServiceError.js';

const swapIdParams = z.object({ id: z.coerce.number().int().positive() });

const router: Router = express.Router();

// TODO: SwapKit `POST /v3/quote` (adds our affiliateFee, excludes Chainflip routes)
router.post('/quote', (_req, _res, next) => {
  next(ServiceError.notImplemented());
});

// TODO: SwapKit `POST /v3/swap` for the chosen routeId, then insert an IntegratorSwap row
router.post('/swap', (_req, _res, next) => {
  next(ServiceError.notImplemented());
});

// TODO: the frontend reports the user's signed tx hash here; it is what SwapKit `/track` needs.
// set txHash + nextCheckAt so the status poller picks the swap up
router.post('/swaps/:id/tx', (_req, _res, next) => {
  next(ServiceError.notImplemented());
});

// reads from our DB only; the status poller keeps the rows up to date
router.get('/swaps/:id', async (req, res, next) => {
  try {
    const parsed = swapIdParams.safeParse(req.params);
    if (!parsed.success) throw ServiceError.badRequest('invalid swap id');

    const swap = await prisma.integratorSwap.findUnique({ where: { id: parsed.data.id } });
    if (!swap) throw ServiceError.notFound();

    res.json(swap);
  } catch (error) {
    next(error);
  }
});

export default router;

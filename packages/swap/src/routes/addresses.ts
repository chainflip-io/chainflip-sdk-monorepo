import express from 'express';
import { asyncHandler } from './common.js';
import prisma from '../client.js';

const router = express.Router();

router.get(
  '/blocked',
  asyncHandler(async (req, res) => {
    const records = await prisma.blockedAddress.findMany();
    res.json(records.map((r) => r.address));
  }),
);

export default router;

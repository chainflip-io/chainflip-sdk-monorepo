import express from 'express';
import { asyncHandler } from './common';
import prisma from '../client';
import { sendJsonResponse } from '../utils/expressHelpers';

const router = express.Router();

router.get(
  '/blocked',
  asyncHandler(async (req, res) => {
    const records = await prisma.blockedAddress.findMany();
    sendJsonResponse(
      res,
      records.map((r) => r.address),
    );
  }),
);

export default router;

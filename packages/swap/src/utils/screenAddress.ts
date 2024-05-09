import axios from 'axios';
import { z } from 'zod';
import logger from './logger';
import prisma from '../client';
import env from '../config/env';

const chainalysisSchema = z.object({ identifications: z.array(z.object({})) });

const screenChainalysis = async (address: string): Promise<boolean> => {
  const apiKey = env.CHAINALYSIS_API_KEY;

  if (!apiKey) return false;

  const response = await axios
    .get(`https://public.chainalysis.com/api/v1/address/${address}`, {
      headers: { 'X-API-Key': apiKey },
    })
    .catch(() => {
      logger.error('Failed to screen address');
      return { data: { identifications: [] } };
    });

  const result = chainalysisSchema.safeParse(response.data);

  if (!result.success) {
    logger.error('failed to parse chainalysis response', result.error);
    return false;
  }

  return result.data.identifications.length > 0;
};

const checkBlocklist = async (address: string): Promise<boolean> => {
  const results = await prisma.$queryRaw<
    unknown[]
  >`SELECT 1 FROM private."BlockedAddress" WHERE LOWER(address) = LOWER(${address})`;

  return results.length > 0;
};

export default async function screenAddress(address: string): Promise<boolean> {
  return (await Promise.all([screenChainalysis(address), checkBlocklist(address)])).some(Boolean);
}

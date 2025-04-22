import { isAxiosError } from 'axios';
import { AML } from 'elliptic-sdk';
import { inspect } from 'util';
import { z } from 'zod';
import logger from './logger.js';
import prisma from '../client.js';
import env from '../config/env.js';

let elliptic: (typeof AML.prototype)['client'] | undefined;

const exposureSchema = z.object({ risk_score: z.number().nullable() });

const isTooRisky = async (address: string | undefined): Promise<boolean> => {
  if (!address || !env.ELLIPTIC_API_KEY || !env.ELLIPTIC_API_SECRET) {
    return false;
  }

  try {
    elliptic ??= new AML({ secret: env.ELLIPTIC_API_SECRET, key: env.ELLIPTIC_API_KEY }).client;

    const { data: result } = await elliptic.post('/v2/wallet/synchronous', {
      subject: {
        asset: 'holistic',
        blockchain: 'holistic',
        hash: address,
        type: 'address',
      },
      type: 'wallet_exposure',
    });

    const parsed = exposureSchema.parse(result);

    return parsed.risk_score !== null && parsed.risk_score >= env.ELLIPTIC_RISK_SCORE_TOLERANCE;
  } catch (error) {
    const level = isAxiosError(error) && error.status === 404 ? 'warn' : 'error';
    logger[level]('failed to request risk score from elliptic', { error: inspect(error) });
    return false;
  }
};

const isOnBlocklist = async (address: string | undefined): Promise<boolean> => {
  if (address === undefined) return false;

  const result = await prisma.blockedAddress.findFirst({
    where: {
      address: {
        equals: address,
        mode: 'insensitive',
      },
    },
  });

  return result !== null;
};

export default async function isDisallowedSwap(
  destAddress: string,
  srcAddress: string | undefined,
  refundAddress: string | undefined,
): Promise<boolean> {
  return (
    await Promise.all([
      isOnBlocklist(destAddress),
      isOnBlocklist(srcAddress),
      isOnBlocklist(refundAddress),
      isTooRisky(destAddress),
      isTooRisky(srcAddress),
      isTooRisky(refundAddress),
    ])
  ).some(Boolean);
}

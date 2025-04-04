import { describe, it, expect, beforeEach } from 'vitest';
import prisma from '../../../client';
import { boostPoolCreated } from '../boostPoolCreated';

describe(boostPoolCreated, () => {
  beforeEach(async () => {
    await prisma.$queryRaw`TRUNCATE TABLE "BoostPool" CASCADE`;
  });
  it('handles event by creating a boost pool entry', async () => {
    await prisma.$transaction(async (txClient) => {
      await boostPoolCreated('Bitcoin')({
        prisma: txClient,
        block: {
          height: 120,
          timestamp: 1670337105000,
        } as any,
        event: {
          args: {
            boostPool: {
              asset: {
                __kind: 'Btc',
              },
              tier: 10,
            },
          },
          name: 'BitcoinIngressEgress.BoostPoolCreated',
          indexInBlock: 7,
        },
      });
    });

    expect(await prisma.boostPool.findFirst()).toMatchSnapshot({
      id: expect.any(Number),
    });
  });
});

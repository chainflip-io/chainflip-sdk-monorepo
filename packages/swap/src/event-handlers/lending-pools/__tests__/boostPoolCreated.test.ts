import { describe, it, expect, beforeEach } from 'vitest';
import prisma from '../../../client.js';
import { lendingPoolsBoostPoolCreated } from '../boostPoolCreated.js';

describe(lendingPoolsBoostPoolCreated, () => {
  beforeEach(async () => {
    await prisma.$queryRaw`TRUNCATE TABLE "BoostPool" CASCADE`;
  });
  it('handles event by creating a boost pool entry', async () => {
    await prisma.$transaction(async (txClient) => {
      await lendingPoolsBoostPoolCreated({
        prisma: txClient,
        block: {
          height: 120,
          timestamp: '2022-12-06T14:31:45.000Z',
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
          name: 'LendingPools.BoostPoolCreated',
          indexInBlock: 7,
        },
      });
    });

    expect(await prisma.boostPool.findFirst()).toMatchSnapshot({
      id: expect.any(Number),
    });
  });
});

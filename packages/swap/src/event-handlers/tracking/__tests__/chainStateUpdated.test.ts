import { describe, it, expect, beforeEach } from 'vitest';
import prisma from '../../../client';
import chainStateUpdated from '../chainStateUpdated';

describe(chainStateUpdated, () => {
  beforeEach(async () => {
    await prisma.$queryRaw`TRUNCATE TABLE "ChainTracking" CASCADE`;
  });

  it('should create the initial records', async () => {
    await chainStateUpdated('Bitcoin')({
      prisma,
      block: { height: 1, timestamp: new Date(1718105922000) } as any,
      event: {
        args: {
          newChainState: {
            blockHeight: 1,
          },
        },
      } as any,
    });

    expect(await prisma.chainTracking.count()).toEqual(1);
    expect(
      await prisma.chainTracking.findFirst({ where: { chain: 'Bitcoin' } }),
    ).toMatchInlineSnapshot(
      {
        id: expect.any(Number),
        updatedAt: expect.any(Date),
      },
      `
      {
        "blockTrackedAt": 2024-06-11T11:38:42.000Z,
        "chain": "Bitcoin",
        "eventWitnessedBlock": 1,
        "height": 1n,
        "id": Any<Number>,
        "previousHeight": 0n,
        "updatedAt": Any<Date>,
      }
    `,
    );
  });

  it('should update the to the correct value', async () => {
    await prisma.chainTracking.create({
      data: {
        chain: 'Bitcoin',
        height: 100,
        blockTrackedAt: new Date(1718105912000),
        eventWitnessedBlock: 9,
        previousHeight: 99,
      },
    });
    await chainStateUpdated('Bitcoin')({
      prisma,
      block: { height: 10, timestamp: new Date(1718105922000) } as any,
      event: {
        args: {
          newChainState: {
            blockHeight: 101,
          },
        },
      } as any,
    });

    expect(await prisma.chainTracking.count()).toEqual(1);
    expect(
      await prisma.chainTracking.findFirst({ where: { chain: 'Bitcoin' } }),
    ).toMatchInlineSnapshot(
      {
        id: expect.any(Number),
        updatedAt: expect.any(Date),
      },
      `
        {
          "blockTrackedAt": 2024-06-11T11:38:42.000Z,
          "chain": "Bitcoin",
          "eventWitnessedBlock": 10,
          "height": 101n,
          "id": Any<Number>,
          "previousHeight": 100n,
          "updatedAt": Any<Date>,
        }
      `,
    );
  });
});

import { describe, it, expect, beforeEach } from 'vitest';
import prisma from '../../../client.js';
import { newPoolCreatedMock } from '../../__tests__/utils.js';
import newPoolCreated from '../newPoolCreated.js';

describe(newPoolCreated, () => {
  beforeEach(async () => {
    await prisma.$queryRaw`TRUNCATE TABLE "Pool" CASCADE`;
  });

  it('creates a pool with the correct data', async () => {
    const { block, event } = newPoolCreatedMock;

    await prisma.$transaction((tx) =>
      newPoolCreated({
        block: block as any,
        event: event as any,
        prisma: tx,
      }),
    );

    const pool = await prisma.pool.findFirstOrThrow();

    expect(pool).toMatchSnapshot({
      id: expect.any(Number),
    });
  });
});

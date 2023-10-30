import { newPoolCreatedMock, poolFeeSetMock } from './utils';
import prisma from '../../client';
import newPoolCreated from '../newPoolCreated';

describe(newPoolCreated, () => {
  beforeEach(async () => {
    await prisma.$queryRaw`TRUNCATE TABLE "Pool" CASCADE`;
  });

  it('updates the pool fee correctly', async () => {
    const { block: newPoolBlock } = newPoolCreatedMock;
    const { event: newPoolEvent } = newPoolCreatedMock.eventContext;

    await prisma.$transaction((tx) =>
      newPoolCreated({
        block: newPoolBlock as any,
        event: newPoolEvent as any,
        prisma: tx,
      }),
    );

    const pool = await prisma.pool.findFirstOrThrow();
    expect(pool).toMatchSnapshot({
      id: expect.any(Number),
      baseAsset: newPoolEvent.args.baseAsset,
      pairAsset: newPoolEvent.args.pairAsset,
      liquidityFeeHundredthPips: newPoolEvent.args.feeHundredthPips,
    });

    const { block: poolFeeSetBlock } = poolFeeSetMock;
    const { event: poolFeeSetEvent } = poolFeeSetMock.eventContext;

    await prisma.$transaction((tx) =>
      newPoolCreated({
        block: poolFeeSetBlock as any,
        event: poolFeeSetEvent as any,
        prisma: tx,
      }),
    );

    const pool2 = await prisma.pool.findFirstOrThrow();

    expect(pool2).toMatchSnapshot({
      id: expect.any(Number),
      baseAsset: newPoolEvent.args.baseAsset,
      pairAsset: newPoolEvent.args.pairAsset,
      liquidityFeeHundredthPips: poolFeeSetEvent.args.feeHundredthPips,
    });
  });
});

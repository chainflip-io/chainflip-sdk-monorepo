import { InternalAssets } from '@/shared/enums';
import metadataMock from './metadata.json';
import { DOT_ADDRESS, createDepositChannel, refundEgressIgnoredMock } from './utils';
import prisma from '../../client';
import { Block, Event } from '../../processBlocks';
import refundEgressIgnored from '../refundEgressIgnored';

jest.mock('@/shared/rpc', () => ({
  getMetadata: jest.fn().mockResolvedValue(metadataMock.result),
}));

const {
  eventContext: { event },
  block,
} = refundEgressIgnoredMock;

describe(refundEgressIgnored, () => {
  beforeEach(async () => {
    await prisma.$queryRaw`TRUNCATE TABLE "SwapDepositChannel", "Swap", "Egress", "IgnoredEgress", "StateChainError" CASCADE`;
  });

  it('handles refundEgressIgnored event', async () => {
    const { swapId } = event.args;

    // store a new swap intent to initiate a new swap
    const swapDepositChannel = await createDepositChannel({
      swaps: {
        create: {
          nativeId: BigInt(swapId),
          depositAmount: '10000000000',
          swapInputAmount: '10000000000',
          swapOutputAmount: '10000000000',
          depositReceivedAt: new Date(block.timestamp - 12000),
          depositReceivedBlockIndex: `${block.height - 100}-${event.indexInBlock}`,
          swapExecutedAt: new Date(block.timestamp - 6000),
          swapExecutedBlockIndex: `${block.height}-${event.indexInBlock}`,
          srcAsset: InternalAssets.Eth,
          destAsset: InternalAssets.Dot,
          destAddress: DOT_ADDRESS,
          type: 'SWAP',
          latestSwapScheduledAt: new Date(Date.now() - 12000),
          latestSwapScheduledBlockIndex: `${block.height}-${event.indexInBlock}`,
        },
      },
    });

    await refundEgressIgnored({
      block: block as Block,
      event: event as Event,
      prisma,
    });

    const swap = await prisma.swap.findFirstOrThrow({
      where: { swapDepositChannelId: swapDepositChannel.id },
      include: { ignoredEgress: true },
    });

    expect(swap).toMatchSnapshot({
      id: expect.any(BigInt),
      createdAt: expect.any(Date),
      updatedAt: expect.any(Date),
      swapDepositChannelId: expect.any(BigInt),
      latestSwapScheduledAt: expect.any(Date),
      ignoredEgress: {
        id: expect.any(BigInt),
        swapId: expect.any(BigInt),
        stateChainErrorId: expect.any(Number),
        createdAt: expect.any(Date),
      },
    });

    expect(
      await prisma.stateChainError.findUniqueOrThrow({
        where: { id: swap.ignoredEgress!.stateChainErrorId },
      }),
    ).toMatchSnapshot({
      id: expect.any(Number),
    });
  });
});

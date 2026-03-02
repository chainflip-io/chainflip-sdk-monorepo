import { describe, it, expect, beforeEach, vi } from 'vitest';
import prisma from '../../../client.js';
import metadataMock from '../../__tests__/metadata.json' with { type: 'json' };
import { DOT_ADDRESS, refundEgressIgnoredMock } from '../../__tests__/utils.js';
import refundEgressIgnored from '../refundEgressIgnored.js';

vi.mock('@/shared/rpc/index.js', async (importOriginal) => {
  const original = (await importOriginal()) as object;
  return {
    ...original,
    getMetadata: vi.fn().mockResolvedValue(metadataMock.result),
  };
});

const { event, block } = refundEgressIgnoredMock;

describe(refundEgressIgnored, () => {
  beforeEach(async () => {
    await prisma.$queryRaw`TRUNCATE TABLE "SwapDepositChannel", "Swap", "Egress", "IgnoredEgress", "StateChainError", "SwapRequest" CASCADE`;
  });

  it('handles refundEgressIgnored event', async () => {
    const { swapRequestId } = event.args;

    await prisma.swapRequest.create({
      data: {
        nativeId: BigInt(swapRequestId),
        depositAmount: '10000000000',
        swapInputAmount: '10000000000',
        depositFinalisedAt: new Date(block.timestamp - 12000),
        depositFinalisedBlockIndex: `${block.height - 100}-${event.indexInBlock}`,
        srcAsset: 'Eth',
        destAsset: 'HubDot',
        destAddress: DOT_ADDRESS,
        requestType: 'LEGACY_SWAP',
        originType: 'DEPOSIT_CHANNEL',
        swapRequestedAt: new Date(block.timestamp - 12000),
        swapRequestedBlockIndex: '92-398',
        totalBrokerCommissionBps: 0,
      },
    });

    await refundEgressIgnored({ block, event, prisma });

    expect(
      await prisma.swapRequest.findUniqueOrThrow({
        where: { nativeId: BigInt(swapRequestId) },
        include: { ignoredEgresses: true },
      }),
    ).toMatchSnapshot({
      id: expect.any(BigInt),
      ignoredEgresses: [
        {
          id: expect.any(BigInt),
          swapRequestId: expect.any(BigInt),
          stateChainErrorId: expect.any(Number),
          createdAt: expect.any(Date),
        },
      ],
    });
  });
});

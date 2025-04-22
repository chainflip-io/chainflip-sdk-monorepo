import { describe, it, expect, beforeEach, vi } from 'vitest';
import prisma from '../../../client.js';
import metadataMock from '../../__tests__/metadata.json' with { type: 'json' };
import { DOT_ADDRESS, swapEgressIgnoredMock } from '../../__tests__/utils.js';
import swapEgressIgnored from '../swapEgressIgnored.js';

vi.mock('@/shared/rpc/index.js', async (importOriginal) => {
  const original = (await importOriginal()) as object;
  return {
    ...original,
    getMetadata: vi.fn().mockResolvedValue(metadataMock.result),
  };
});
const { event, block } = swapEgressIgnoredMock;

describe(swapEgressIgnored, () => {
  beforeEach(async () => {
    await prisma.$queryRaw`TRUNCATE TABLE "SwapDepositChannel", "Swap", "SwapRequest", "Egress", "IgnoredEgress", "StateChainError" CASCADE`;
  });

  it('adds an IgnoredEgress record for a egress ignored event', async () => {
    const { swapRequestId } = event.args;

    await prisma.swapRequest.create({
      data: {
        nativeId: BigInt(swapRequestId),
        srcAsset: 'Btc',
        destAsset: 'Eth',
        destAddress: DOT_ADDRESS,
        depositAmount: '100000000',
        swapInputAmount: '100000000',
        depositFinalisedAt: new Date('2024-08-06T00:00:00.000Z'),
        depositFinalisedBlockIndex: '1-1',
        originType: 'VAULT',
        requestType: 'LEGACY_SWAP',
        swapRequestedAt: new Date('2024-08-06T00:00:00.000Z'),
        swapRequestedBlockIndex: '92-398',
        totalBrokerCommissionBps: 0,
      },
    });

    await swapEgressIgnored({ block, event, prisma });

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
          createdAt: expect.any(Date),
          stateChainErrorId: expect.any(Number),
        },
      ],
    });
  });
});

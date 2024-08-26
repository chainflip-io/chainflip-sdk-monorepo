import metadataMock from './metadata.json';
import { DOT_ADDRESS, swapEgressIgnoredMock } from './utils';
import prisma from '../../client';
import swapEgressIgnored from '../swapEgressIgnored';

jest.mock('@/shared/rpc', () => ({
  getMetadata: jest.fn().mockResolvedValue(metadataMock.result),
}));

const { event, block } = swapEgressIgnoredMock;

describe(swapEgressIgnored, () => {
  beforeEach(async () => {
    await prisma.$queryRaw`TRUNCATE TABLE "SwapDepositChannel", "Swap", "SwapRequest", "Egress", "IgnoredEgress", "StateChainError" CASCADE`;
  });

  it('adds an IgnoredEgress record for a egress ignored event', async () => {
    const { swapId } = event.args;

    await prisma.swapRequest.create({
      data: {
        nativeId: BigInt(swapId),
        srcAsset: 'Btc',
        destAsset: 'Eth',
        destAddress: DOT_ADDRESS,
        depositAmount: '100000000',
        depositReceivedAt: new Date('2024-08-06T00:00:00.000Z'),
        depositReceivedBlockIndex: '1-1',
        originType: 'VAULT',
        requestType: 'LEGACY_SWAP',
        swapRequestedAt: new Date('2024-08-06T00:00:00.000Z'),
      },
    });

    await swapEgressIgnored({ block, event, prisma });

    expect(
      await prisma.swapRequest.findUniqueOrThrow({
        where: { nativeId: BigInt(swapId) },
        include: { ignoredEgress: true },
      }),
    ).toMatchSnapshot({
      id: expect.any(BigInt),
      ignoredEgress: {
        id: expect.any(BigInt),
        swapRequestId: expect.any(BigInt),
        createdAt: expect.any(Date),
        stateChainErrorId: expect.any(Number),
      },
    });
  });
});

import { DOT_ADDRESS, ETH_ADDRESS, swapEgressScheduledMock } from './utils';
import prisma from '../../client';
import swapEgressScheduled from '../swapEgressScheduled';

const { event, block } = swapEgressScheduledMock;

describe(swapEgressScheduled, () => {
  beforeEach(async () => {
    await prisma.$queryRaw`TRUNCATE TABLE "SwapDepositChannel", "Swap", "Egress", "SwapRequest" CASCADE`;
  });

  it('adds an egress and fee to a swap request', async () => {
    const swapId = BigInt(event.args.swapId);

    await prisma.swapRequest.create({
      data: {
        nativeId: BigInt(swapId),
        depositAmount: '10000000000',
        swapInputAmount: '10000000000',
        depositFinalisedAt: new Date(block.timestamp - 12000),
        depositFinalisedBlockIndex: `${block.height - 100}-${event.indexInBlock}`,
        srcAsset: 'Eth',
        destAsset: 'Dot',
        destAddress: DOT_ADDRESS,
        requestType: 'LEGACY_SWAP',
        originType: 'VAULT',
        swapRequestedAt: new Date(block.timestamp - 12000),
        swapRequestedBlockIndex: '92-398',
      },
    });

    await swapEgressScheduled({ block, event, prisma });

    const swapRequest = await prisma.swapRequest.findFirstOrThrow({
      where: { nativeId: swapId },
      include: {
        egress: true,
        fees: { select: { amount: true, asset: true, type: true } },
      },
    });

    expect(swapRequest).toMatchSnapshot({
      id: expect.any(BigInt),
      egressId: expect.any(BigInt),
      egress: {
        id: expect.any(BigInt),
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      },
    });
  });

  it('uses gas asset for egress fee when CCM', async () => {
    const ccmEvent = {
      ...event,
      args: {
        ...event.args,
        asset: { __kind: 'ArbUsdc' },
        egressId: [{ __kind: 'Arbitrum' }, '1'] as const,
      },
    };

    const swapId = BigInt(ccmEvent.args.swapId);

    await prisma.swapRequest.create({
      data: {
        nativeId: BigInt(swapId),
        depositAmount: '1000000',
        swapInputAmount: '1000000',
        depositFinalisedAt: new Date(block.timestamp - 12000),
        depositFinalisedBlockIndex: `${block.height - 100}-${ccmEvent.indexInBlock}`,
        srcAsset: 'ArbUsdc',
        destAsset: 'ArbUsdc',
        destAddress: ETH_ADDRESS,
        requestType: 'CCM',
        originType: 'VAULT',
        swapRequestedAt: new Date(block.timestamp - 12000),
        swapRequestedBlockIndex: '92-398',
      },
    });

    await swapEgressScheduled({ block, event: ccmEvent, prisma });

    const swapRequest = await prisma.swapRequest.findFirstOrThrow({
      where: { nativeId: swapId },
      include: {
        egress: true,
        fees: { select: { amount: true, asset: true, type: true } },
      },
    });

    expect(swapRequest).toMatchSnapshot({
      id: expect.any(BigInt),
      egressId: expect.any(BigInt),
      egress: {
        id: expect.any(BigInt),
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      },
      fees: [
        {
          asset: 'ArbEth',
          type: 'EGRESS',
        },
      ],
    });
  });
});

import { describe, it, expect, beforeEach } from 'vitest';
import prisma from '../../../client';
import {
  createChainTrackingInfo,
  createDepositChannel,
  swapDepositAddressReadyCcmParamsMocked,
  swapDepositAddressReadyMocked,
} from '../../__tests__/utils';
import swapDepositAddressReady from '../swapDepositAddressReady';

const eventMock = swapDepositAddressReadyMocked;
const ccmEventMock = swapDepositAddressReadyCcmParamsMocked;

describe(swapDepositAddressReady, () => {
  beforeEach(async () => {
    await prisma.$queryRaw`TRUNCATE TABLE "SwapDepositChannel", private."DepositChannel", "ChainTracking", "SwapBeneficiary" CASCADE`;
    await createChainTrackingInfo();
  });

  it('creates a swap deposit channel entry', async () => {
    await prisma.$transaction(async (txClient) => {
      await swapDepositAddressReady({
        prisma: txClient,
        event: eventMock.event,
        block: eventMock.block,
      });
    });

    const swapDepositChannel = await prisma.swapDepositChannel.findFirstOrThrow({
      where: {
        channelId: BigInt(eventMock.event.args.channelId),
      },
      include: { beneficiaries: true },
    });

    expect(swapDepositChannel).toMatchSnapshot({
      id: expect.any(BigInt),
      createdAt: expect.any(Date),
    });
  });

  it('creates a swap deposit channel entry with a broker commission', async () => {
    await prisma.$transaction(async (txClient) => {
      await swapDepositAddressReady({
        prisma: txClient,
        event: {
          ...eventMock.event,
          args: {
            ...eventMock.event.args,
            brokerCommissionRate: 25,
          },
        },
        block: { ...eventMock.block, height: 121 },
      });
    });

    const { beneficiaries, ...swapDepositChannel } =
      await prisma.swapDepositChannel.findFirstOrThrow({
        where: {
          channelId: BigInt(eventMock.event.args.channelId),
        },
        include: { beneficiaries: true },
      });

    expect(swapDepositChannel).toMatchSnapshot({
      id: expect.any(BigInt),
      createdAt: expect.any(Date),
    });
    expect(beneficiaries).toHaveLength(1);
    expect(beneficiaries[0]).toMatchSnapshot({
      id: expect.any(BigInt),
      channelId: expect.any(BigInt),
    });
  });

  it('creates a swap deposit channel entry with a channel opening fee', async () => {
    await swapDepositAddressReady({
      prisma,
      event: {
        ...eventMock.event,
        args: {
          ...eventMock.event.args,
          channelOpeningFee: 1000,
        },
      },
      block: { ...eventMock.block, height: 121 },
    });

    const swapDepositChannel = await prisma.swapDepositChannel.findFirstOrThrow({
      where: {
        channelId: BigInt(eventMock.event.args.channelId),
      },
    });

    expect(swapDepositChannel).toMatchSnapshot({
      id: expect.any(BigInt),
      createdAt: expect.any(Date),
    });
  });

  it('creates a swap deposit channel entry with ccm metadata', async () => {
    await prisma.$transaction(async (txClient) => {
      await swapDepositAddressReady({
        prisma: txClient,
        event: ccmEventMock.event,
        block: ccmEventMock.block,
      });
    });

    const swapDepositChannel = await prisma.swapDepositChannel.findFirstOrThrow({
      where: {
        channelId: BigInt(ccmEventMock.event.args.channelId),
      },
    });

    expect(swapDepositChannel).toMatchSnapshot({
      id: expect.any(BigInt),
      createdAt: expect.any(Date),
    });
  });

  it('does not overwrite expectedDepositAmount with zero', async () => {
    await createDepositChannel({
      channelId: BigInt(eventMock.event.args.channelId),
      srcChain: 'Ethereum',
      issuedBlock: 10,
      expectedDepositAmount: 650,
    });

    await prisma.$transaction(async (txClient) => {
      await swapDepositAddressReady({
        prisma: txClient,
        event: eventMock.event,
        block: {
          ...eventMock.block,
          height: 10,
        },
      });
    });

    const swapDepositChannel = await prisma.swapDepositChannel.findFirstOrThrow({
      where: {
        channelId: BigInt(eventMock.event.args.channelId),
      },
    });

    expect(swapDepositChannel).toMatchSnapshot({
      id: expect.any(BigInt),
      createdAt: expect.any(Date),
    });
  });

  it('can handle empty ccm messages', async () => {
    await swapDepositAddressReady({
      prisma,
      event: {
        ...eventMock.event,
        args: {
          ...eventMock.event.args,
          channelMetadata: {
            message: '0x',
            gasBudget: '0',
            ccmAdditionalData: '0x',
          },
        },
      },
      block: eventMock.block,
    });

    const swapDepositChannel = await prisma.swapDepositChannel.findFirstOrThrow({
      where: {
        channelId: BigInt(eventMock.event.args.channelId),
      },
    });

    expect(swapDepositChannel).toMatchSnapshot({
      id: expect.any(BigInt),
      createdAt: expect.any(Date),
    });
  });

  it('inserts affiliates', async () => {
    await swapDepositAddressReady({
      prisma,
      event: {
        ...eventMock.event,
        args: {
          ...eventMock.event.args,
          brokerCommissionRate: 25,
          affiliateFees: [
            {
              account: '0x7cf56f93db22f45007bbfa2e2ee89551365b2ebaece029fb006d5ad1b3756c3c',
              bps: 100,
            },
          ],
        },
      },
      block: eventMock.block,
    });

    const swapDepositChannel = await prisma.swapDepositChannel.findFirstOrThrow({
      where: {
        channelId: BigInt(eventMock.event.args.channelId),
      },
      include: { beneficiaries: true },
    });

    expect(swapDepositChannel).toMatchSnapshot({
      id: expect.any(BigInt),
      createdAt: expect.any(Date),
      beneficiaries: [
        {
          id: expect.any(BigInt),
          channelId: expect.any(BigInt),
        },
        {
          id: expect.any(BigInt),
          channelId: expect.any(BigInt),
        },
      ],
    });
  });

  it('handles Fill Or Kill parameters', async () => {
    await swapDepositAddressReady({
      prisma,
      event: {
        ...eventMock.event,
        args: {
          ...eventMock.event.args,
          refundParameters: {
            minPrice: '2041694201525630780780247644590609',
            refundAddress: {
              value: '0x541f563237a309b3a61e33bdf07a8930bdba8d99',
              __kind: 'Eth',
            },
            retryDuration: 15,
          },
        },
      },
      block: eventMock.block,
    });

    const swapDepositChannel = await prisma.swapDepositChannel.findFirstOrThrow({
      where: {
        channelId: BigInt(eventMock.event.args.channelId),
      },
    });

    expect(swapDepositChannel.fokMinPriceX128?.toFixed()).toEqual(
      '2041694201525630780780247644590609',
    );
    expect(swapDepositChannel.fokRefundAddress).toEqual(
      '0x541f563237a309b3a61e33bdf07a8930bdba8d99',
    );
    expect(swapDepositChannel.fokRetryDurationBlocks).toEqual(15);
  });

  it('handles dcaParameters parameters', async () => {
    await swapDepositAddressReady({
      prisma,
      event: {
        ...eventMock.event,
        args: {
          ...eventMock.event.args,
          refundParameters: {
            minPrice: '2041694201525630780780247644590609',
            refundAddress: {
              value: '0x541f563237a309b3a61e33bdf07a8930bdba8d99',
              __kind: 'Eth',
            },
            retryDuration: 15,
          },
          dcaParameters: {
            numberOfChunks: 100,
            chunkInterval: 5,
          },
        },
      },
      block: eventMock.block,
    });

    const swapDepositChannel = await prisma.swapDepositChannel.findFirstOrThrow({
      where: {
        channelId: BigInt(eventMock.event.args.channelId),
      },
    });

    expect(swapDepositChannel.fokMinPriceX128?.toFixed()).toEqual(
      '2041694201525630780780247644590609',
    );
    expect(swapDepositChannel.fokRefundAddress).toEqual(
      '0x541f563237a309b3a61e33bdf07a8930bdba8d99',
    );
    expect(swapDepositChannel.fokRetryDurationBlocks).toEqual(15);
    expect(swapDepositChannel.dcaNumberOfChunks).toEqual(100);
    expect(swapDepositChannel.dcaChunkIntervalBlocks).toEqual(5);
  });
});

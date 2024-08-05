import { Chains } from '@/shared/enums';
import {
  createChainTrackingInfo,
  createDepositChannel,
  swapDepositAddressReadyCcmParamsMocked,
  swapDepositAddressReadyMocked,
} from './utils';
import prisma from '../../client';
import swapDepositAddressReady from '../swapDepositAddressReady';

const eventMock = swapDepositAddressReadyMocked;
const ccmEventMock = swapDepositAddressReadyCcmParamsMocked;

describe(swapDepositAddressReady, () => {
  beforeEach(async () => {
    await prisma.$queryRaw`TRUNCATE TABLE "SwapDepositChannel", private."DepositChannel", "ChainTracking" CASCADE`;
    await prisma.$queryRaw`TRUNCATE TABLE "ChainTracking" CASCADE`;
  });

  it('creates a swap deposit channel entry', async () => {
    await prisma.$transaction(async (txClient) => {
      await createChainTrackingInfo();
      await swapDepositAddressReady({
        prisma: txClient,
        event: eventMock.eventContext.event,
        block: eventMock.block,
      });
    });

    const swapDepositChannel = await prisma.swapDepositChannel.findFirstOrThrow({
      where: {
        channelId: BigInt(eventMock.eventContext.event.args.channelId),
      },
    });

    expect(swapDepositChannel).toMatchSnapshot({
      id: expect.any(BigInt),
      createdAt: expect.any(Date),
    });
  });

  it('creates a swap deposit channel entry with a broker commission', async () => {
    await prisma.$transaction(async (txClient) => {
      await createChainTrackingInfo();
      await swapDepositAddressReady({
        prisma: txClient,
        event: {
          ...eventMock.eventContext.event,
          args: {
            ...eventMock.eventContext.event.args,
            brokerCommissionRate: 25,
          },
        },
        block: { ...eventMock.block, height: 121 },
      });
    });

    const swapDepositChannel = await prisma.swapDepositChannel.findFirstOrThrow({
      where: {
        channelId: BigInt(eventMock.eventContext.event.args.channelId),
      },
    });

    expect(swapDepositChannel).toMatchSnapshot({
      id: expect.any(BigInt),
      createdAt: expect.any(Date),
    });
  });
  it('creates a swap deposit channel entry with a channel opening fee', async () => {
    await createChainTrackingInfo();
    await swapDepositAddressReady({
      prisma,
      event: {
        ...eventMock.eventContext.event,
        args: {
          ...eventMock.eventContext.event.args,
          channelOpeningFee: 1000,
        },
      },
      block: { ...eventMock.block, height: 121 },
    });

    const swapDepositChannel = await prisma.swapDepositChannel.findFirstOrThrow({
      where: {
        channelId: BigInt(eventMock.eventContext.event.args.channelId),
      },
    });

    expect(swapDepositChannel).toMatchSnapshot({
      id: expect.any(BigInt),
      createdAt: expect.any(Date),
    });
  });

  it('creates a swap deposit channel entry with ccm metadata', async () => {
    await prisma.$transaction(async (txClient) => {
      await createChainTrackingInfo();
      await swapDepositAddressReady({
        prisma: txClient,
        event: ccmEventMock.eventContext.event,
        block: ccmEventMock.block,
      });
    });

    const swapDepositChannel = await prisma.swapDepositChannel.findFirstOrThrow({
      where: {
        channelId: BigInt(ccmEventMock.eventContext.event.args.channelId),
      },
    });

    expect(swapDepositChannel).toMatchSnapshot({
      id: expect.any(BigInt),
      createdAt: expect.any(Date),
    });
  });

  it('does not overwrite expectedDepositAmount with zero', async () => {
    await createDepositChannel({
      channelId: BigInt(eventMock.eventContext.event.args.channelId),
      srcChain: Chains.Ethereum,
      issuedBlock: 10,
      expectedDepositAmount: 650,
    });

    await prisma.$transaction(async (txClient) => {
      await swapDepositAddressReady({
        prisma: txClient,
        event: eventMock.eventContext.event,
        block: {
          ...eventMock.block,
          height: 10,
        },
      });
    });

    const swapDepositChannel = await prisma.swapDepositChannel.findFirstOrThrow({
      where: {
        channelId: BigInt(eventMock.eventContext.event.args.channelId),
      },
    });

    expect(swapDepositChannel).toMatchSnapshot({
      id: expect.any(BigInt),
      createdAt: expect.any(Date),
    });
  });

  it('can handle empty ccm messages', async () => {
    await createChainTrackingInfo();
    await swapDepositAddressReady({
      prisma,
      event: {
        ...eventMock.eventContext.event,
        args: {
          ...eventMock.eventContext.event.args,
          channelMetadata: {
            message: '0x',
            gasBudget: '0',
            cfParameters: '0x',
          },
        },
      },
      block: eventMock.block,
    });

    const swapDepositChannel = await prisma.swapDepositChannel.findFirstOrThrow({
      where: {
        channelId: BigInt(eventMock.eventContext.event.args.channelId),
      },
    });

    expect(swapDepositChannel).toMatchSnapshot({
      id: expect.any(BigInt),
      createdAt: expect.any(Date),
    });
  });

  it('inserts affiliates', async () => {
    await createChainTrackingInfo();
    await swapDepositAddressReady({
      prisma,
      event: {
        ...eventMock.eventContext.event,
        args: {
          ...eventMock.eventContext.event.args,
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
        channelId: BigInt(eventMock.eventContext.event.args.channelId),
      },
      include: { affiliates: true },
    });

    expect(swapDepositChannel).toMatchSnapshot({
      id: expect.any(BigInt),
      createdAt: expect.any(Date),
      affiliates: [
        {
          id: expect.any(BigInt),
          channelId: expect.any(BigInt),
        },
      ],
    });
  });

  it('handles Fill Or Kill parameters', async () => {
    await createChainTrackingInfo();
    await swapDepositAddressReady({
      prisma,
      event: {
        ...eventMock.eventContext.event,
        args: {
          ...eventMock.eventContext.event.args,
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
        channelId: BigInt(eventMock.eventContext.event.args.channelId),
      },
    });

    expect(swapDepositChannel.fokMinPrice?.toNumber()).toEqual(600);
    expect(swapDepositChannel.fokRefundAddress).toEqual(
      '0x541f563237a309b3a61e33bdf07a8930bdba8d99',
    );
    expect(swapDepositChannel.fokRetryDuration).toEqual(15);
  });
});

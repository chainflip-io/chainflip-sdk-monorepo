import { Chains } from '@/shared/enums';
import { createDepositChannel, swapDepositAddressReadyMocked } from './utils';
import prisma from '../../client';
import swapDepositAddressReady from '../swapDepositAddressReady';

const {
  block,
  eventContext: { event },
} = swapDepositAddressReadyMocked;

describe(swapDepositAddressReady, () => {
  beforeEach(async () => {
    await prisma.$queryRaw`TRUNCATE TABLE "SwapDepositChannel" CASCADE`;
  });

  it('creates a swap deposit channel entry', async () => {
    await prisma.$transaction(async (txClient) => {
      await swapDepositAddressReady({
        prisma: txClient,
        event,
        block,
      });
    });

    const swapDepositChannel = await prisma.swapDepositChannel.findFirstOrThrow(
      {
        where: { channelId: BigInt(event.args.channelId) },
      },
    );

    expect(swapDepositChannel).toMatchSnapshot({
      id: expect.any(BigInt),
      createdAt: expect.any(Date),
    });
  });

  it('does not update the already existing deposit channel', async () => {
    await createDepositChannel({
      channelId: BigInt(event.args.channelId),
      srcChain: Chains.Ethereum,
      issuedBlock: 10,
    });

    await prisma.$transaction(async (txClient) => {
      await swapDepositAddressReady({
        prisma: txClient,
        event,
        block: {
          ...block,
          height: 1000,
        },
      });
    });

    const swapDepositChannel = await prisma.swapDepositChannel.findFirstOrThrow(
      {
        where: { channelId: BigInt(event.args.channelId) },
      },
    );

    expect(swapDepositChannel).toMatchSnapshot({
      id: expect.any(BigInt),
      createdAt: expect.any(Date),
    });
  });
});

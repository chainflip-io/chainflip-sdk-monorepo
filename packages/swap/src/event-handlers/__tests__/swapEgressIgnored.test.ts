import { Assets } from '@/shared/enums';
import { environment, swapRate } from '@/shared/tests/fixtures';
import {
  DOT_ADDRESS,
  createDepositChannel,
  swapEgressIgnoredMock,
} from './utils';
import prisma from '../../client';
import swapEgressIgnored from '../swapEgressIgnored';

jest.mock('@polkadot/api', () => ({
  ApiPromise: class {
    static create() {
      return new this();
    }

    async at() {
      return this;
    }

    registry = {
      findMetaError: jest.fn().mockReturnValue({
        name: 'BelowEgressDustLimit',
        section: 'bitcoinIngressEgress',
        docs: ['The amount is below the minimum egress amount.'],
      }),
    };

    runtimeVersion = {
      specVersion: {
        toNumber: () => 120,
      },
    };
  },
  WsProvider: class {},
}));

const {
  eventContext: { event },
  block,
} = swapEgressIgnoredMock;

describe(swapEgressIgnored, () => {
  beforeEach(async () => {
    await prisma.$queryRaw`TRUNCATE TABLE "SwapDepositChannel", "Swap", "Egress", "IgnoredEgress", "StateChainError" CASCADE`;
  });

  it('adds an IgnoredEgress record for a egress ignored event', async () => {
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
          depositReceivedBlockIndex: `${block.height - 100}-${
            event.indexInBlock
          }`,
          swapExecutedAt: new Date(block.timestamp - 6000),
          swapExecutedBlockIndex: `${block.height}-${event.indexInBlock}`,
          srcAsset: Assets.ETH,
          destAsset: Assets.DOT,
          destAddress: DOT_ADDRESS,
          type: 'SWAP',
        },
      },
    });

    await prisma.$transaction((tx) =>
      swapEgressIgnored({
        block: block as any,
        event: event as any,
        prisma: tx,
      }),
    );

    const swap = await prisma.swap.findFirstOrThrow({
      where: { swapDepositChannelId: swapDepositChannel.id },
      include: { ignoredEgress: true },
    });

    expect(swap).toMatchSnapshot({
      id: expect.any(BigInt),
      createdAt: expect.any(Date),
      updatedAt: expect.any(Date),
      swapDepositChannelId: expect.any(BigInt),
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

/* eslint-disable @typescript-eslint/no-empty-function */
import { GraphQLClient } from 'graphql-request';
import { assetChains } from '@/shared/enums';
import prisma from '../../client';
import { Event } from '../../gql/generated/graphql';
import processBlocks from '../../processBlocks';

jest.mock('graphql-request', () => ({
  GraphQLClient: class MockClient {
    request() {}
  },
}));

const uppercase = <const T extends string>(str: T): Uppercase<T> =>
  str.toUpperCase() as Uppercase<T>;

const swapDepositAddressReadyEvent = {
  id: '0000000000-000358-8c2f5',
  blockId: '0000000000-8c2f5',
  indexInBlock: 358,
  extrinsicId: '0000000000-000179-8c2f5',
  callId: '0000000000-000179-8c2f5',
  name: 'Swapping.SwapDepositAddressReady',
  args: {
    channelId: '3',
    expiryBlock: 2,
    sourceAsset: {
      __kind: 'Eth',
    },
    depositAddress: {
      value: '0x6fd76a7699e6269af49e9c63f01f61464ab21d1c',
      __kind: 'Eth',
    },
    destinationAsset: {
      __kind: 'Btc',
    },
    destinationAddress: {
      value:
        '0x6d703351536f504e32694c4b724568647a3951623944534a5141754e774444613737',
      __kind: 'Btc',
    },
  },
} as const;

const batchEvents = [
  // swapDepositAddressReadyEvent,
  {
    id: '0000000001-000019-09d28',
    blockId: '0000000001-09d28',
    indexInBlock: 19,
    extrinsicId: '0000000001-000008-09d28',
    callId: '0000000001-000008-09d28',
    name: 'Swapping.SwapScheduled',
    args: {
      origin: {
        __kind: 'DepositChannel',
        channelId: '3',
        depositAddress: {
          value: '0x6fd76a7699e6269af49e9c63f01f61464ab21d1c',
          __kind: 'Eth',
        },
      },
      swapId: '1',
      sourceAsset: {
        __kind: 'Eth',
      },
      depositAmount: '100000000010000000',
      destinationAsset: {
        __kind: 'Btc',
      },
      destinationAddress: {
        value:
          '0x6d703351536f504e32694c4b724568647a3951623944534a5141754e774444613737',
        __kind: 'Btc',
      },
      swapType: {
        __kind: 'Swap',
      },
    },
  },
  {
    id: '0000000001-000253-09d28',
    blockId: '0000000001-09d28',
    indexInBlock: 253,
    extrinsicId: null,
    callId: null,
    name: 'Swapping.SwapExecuted',
    args: {
      swapId: '1',
      sourceAsset: {
        __kind: 'Eth',
      },
      egressAmount: '662256',
      depositAmount: '100000000010000000',
      destinationAsset: {
        __kind: 'Btc',
      },
      intermediateAmount: '990109107',
    },
  },
  {
    id: '0000000001-000254-09d28',
    blockId: '0000000001-09d28',
    indexInBlock: 254,
    extrinsicId: null,
    callId: null,
    name: 'BitcoinIngressEgress.EgressScheduled',
    args: {
      id: [{ __kind: 'Bitcoin' }, '1'],
      asset: { __kind: 'Btc' },
      amount: '662256',
      destinationAddress:
        '0x6d703351536f504e32694c4b724568647a3951623944534a5141754e774444613737',
    },
  },
  {
    id: '0000000001-000255-09d28',
    blockId: '0000000001-09d28',
    indexInBlock: 255,
    extrinsicId: null,
    callId: null,
    name: 'Swapping.SwapEgressScheduled',
    args: {
      asset: {
        __kind: 'Btc',
      },
      amount: '662256',
      swapId: '1',
      egressId: [
        {
          __kind: 'Bitcoin',
        },
        '1',
      ],
    },
  },
  {
    id: '0000000001-000259-09d28',
    blockId: '0000000001-09d28',
    indexInBlock: 259,
    extrinsicId: null,
    callId: null,
    name: 'BitcoinIngressEgress.BatchBroadcastRequested',
    args: {
      egressIds: [
        [
          {
            __kind: 'Bitcoin',
          },
          '1',
        ],
      ],
      broadcastId: 5,
    },
  },
  {
    id: '0000000002-000296-f433b',
    blockId: '0000000002-f433b',
    indexInBlock: 296,
    extrinsicId: '0000000002-000099-f433b',
    callId: '0000000002-000099-f433b',
    name: 'BitcoinBroadcaster.BroadcastSuccess',
    args: {
      broadcastId: 5,
      transactionOutId: '0xcafebabe',
    },
  },
]
  .sort((a, b) => (a.id < b.id ? -1 : 1))
  .reduce((acc, event) => {
    acc.set(
      event.blockId,
      (acc.get(event.blockId) || []).concat([event as Event]),
    );
    return acc;
  }, new Map<string, Event[]>());

describe('batch swap flow', () => {
  beforeEach(async () => {
    await prisma.$queryRaw`TRUNCATE TABLE "Egress", "Broadcast", "Swap", "SwapDepositChannel" CASCADE`;
  });

  it('handles all the events', async () => {
    const startingHeight =
      Number(batchEvents.keys().next().value.split('-')[0]) - 1;
    await prisma.state.upsert({
      where: { id: 1 },
      create: { id: 1, height: startingHeight },
      update: { height: startingHeight },
    });

    const blocksIt = batchEvents.entries();

    await prisma.swapDepositChannel.create({
      data: {
        srcAsset: uppercase(
          swapDepositAddressReadyEvent.args.sourceAsset.__kind,
        ),
        depositAddress: swapDepositAddressReadyEvent.args.depositAddress.value,
        srcChain:
          assetChains[
            uppercase(swapDepositAddressReadyEvent.args.sourceAsset.__kind)
          ],
        channelId: BigInt(swapDepositAddressReadyEvent.args.channelId),
        expectedDepositAmount: '0',
        destAsset: uppercase(
          swapDepositAddressReadyEvent.args.destinationAsset.__kind,
        ),
        destAddress: swapDepositAddressReadyEvent.args.destinationAddress.value,
        expiryBlock: swapDepositAddressReadyEvent.args.expiryBlock,
        issuedBlock: 0,
      },
    });

    jest
      .spyOn(GraphQLClient.prototype, 'request')
      .mockImplementation(async () => {
        const batch = blocksIt.next();
        if (batch.done) throw new Error('done');
        const [blockId, events] = batch.value;
        const height = Number(blockId.split('-')[0]);
        await prisma.state.upsert({
          where: { id: 1 },
          create: { id: 1, height: height - 1 },
          update: { height: height - 1 },
        });

        return {
          blocks: {
            nodes: [
              {
                height,
                specId: 'test@0',
                timestamp: new Date(height * 6000).toISOString(),
                events: { nodes: events },
              },
            ],
          },
        };
      });

    await expect(processBlocks()).rejects.toThrow('done');

    const swaps = await prisma.swap.findMany();

    expect(swaps).toHaveLength(1);

    expect(swaps[0]).toMatchSnapshot(
      {
        id: expect.any(BigInt),
        swapDepositChannelId: expect.any(BigInt),
        egressId: expect.any(BigInt),
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      },
      'swap',
    );

    const egresses = await prisma.egress.findMany();
    expect(egresses).toHaveLength(1);
    expect(egresses[0]).toMatchSnapshot(
      {
        id: expect.any(BigInt),
        broadcastId: expect.any(BigInt),
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      },
      'egress',
    );

    const broadcasts = await prisma.broadcast.findMany();
    expect(broadcasts).toHaveLength(1);
    expect(broadcasts[0]).toMatchSnapshot(
      {
        id: expect.any(BigInt),
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      },
      'broadcast',
    );
  });
});

import { GraphQLClient } from 'graphql-request';
import prisma from '../../client';
import { Event } from '../../gql/generated/graphql';
import processBlocks from '../../processBlocks';
import { SwapDepositAddressReadyArgs } from '../swapDepositAddressReady';
import { SwapEgressScheduledArgs } from '../swapEgressScheduled';
import { SwapExecutedArgs } from '../swapExecuted';
import { SwapRequestedArgs } from '../swapRequested';
import { SwapScheduledArgs } from '../swapScheduled';

const ccmEvents = [
  {
    id: '0000000031-000050-2d23a',
    blockId: '0000000031-2d23a',
    indexInBlock: 50,
    extrinsicId: null,
    callId: null,
    name: 'LiquidityPools.NewPoolCreated',
    args: {
      baseAsset: { __kind: 'Dot' },
      quoteAsset: { __kind: 'Usdc' },
      initialPrice: '340282366920938470546924331736236032',
      feeHundredthPips: 20,
    },
  },
  {
    id: '0000000031-000054-2d23a',
    blockId: '0000000031-2d23a',
    indexInBlock: 54,
    extrinsicId: null,
    callId: null,
    name: 'LiquidityPools.NewPoolCreated',
    args: {
      baseAsset: { __kind: 'Flip' },
      quoteAsset: { __kind: 'Usdc' },
      initialPrice: '3402823669209384428752601088',
      feeHundredthPips: 20,
    },
  },
  {
    id: '0000000052-000001-25edd',
    blockId: '0000000052-25edd',
    indexInBlock: 1,
    extrinsicId: '0000000052-000001-25edd',
    callId: '0000000052-000001-25edd',
    name: 'PolkadotChainTracking.ChainStateUpdated',
    args: {
      newChainState: {
        blockHeight: 55,
        trackedData: {
          medianTip: '0',
          runtimeVersion: {
            specVersion: 1002005,
            transactionVersion: 26,
          },
        },
      },
    },
  },
  {
    id: '0000000052-000024-25edd',
    blockId: '0000000052-25edd',
    indexInBlock: 24,
    extrinsicId: '0000000052-000007-25edd',
    callId: '0000000052-000007-25edd',
    name: 'Swapping.SwapDepositAddressReady',
    args: {
      boostFee: 0,
      channelId: '2',
      sourceAsset: { __kind: 'Dot' },
      affiliateFees: [],
      depositAddress: {
        value: '0x7b42c78a80b6e72e1ec500cfb88a064959dfae5fe8b09f366444d35878364513',
        __kind: 'Dot',
      },
      channelMetadata: {
        message:
          '0x0000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000003f7a000000000000000000000000000000000000000000000000000000000000000074761735465737400000000000000000000000000000000000000000000000000',
        gasBudget: '360801',
        cfParameters: '0x8ea88ab41897b921ef36ddd7dfd3e9',
      },
      destinationAsset: { __kind: 'Flip' },
      channelOpeningFee: '0',
      destinationAddress: { value: '0xa51c1fc2f0d1a1b8494ed1fe312d7c3a78ed91c0', __kind: 'Eth' },
      brokerCommissionRate: 100,
      sourceChainExpiryBlock: '157',
    } as SwapDepositAddressReadyArgs,
  },
  {
    id: '0000000057-000010-29eb0',
    blockId: '0000000057-29eb0',
    indexInBlock: 10,
    extrinsicId: '0000000057-000003-29eb0',
    callId: '0000000057-000003-29eb0',
    name: 'Swapping.SwapRequested',
    args: {
      origin: {
        __kind: 'DepositChannel',
        channelId: '2',
        depositAddress: {
          value: '0x7b42c78a80b6e72e1ec500cfb88a064959dfae5fe8b09f366444d35878364513',
          __kind: 'Dot',
        },
        depositBlockHeight: '57',
      },
      inputAsset: { __kind: 'Dot' },
      inputAmount: '499802700000',
      outputAsset: { __kind: 'Flip' },
      requestType: {
        __kind: 'Ccm',
        outputAddress: { value: '0xa51c1fc2f0d1a1b8494ed1fe312d7c3a78ed91c0', __kind: 'Eth' },
        ccmDepositMetadata: {
          sourceChain: { __kind: 'Polkadot' },
          channelMetadata: {
            message:
              '0x0000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000003f7a000000000000000000000000000000000000000000000000000000000000000074761735465737400000000000000000000000000000000000000000000000000',
            gasBudget: '360801',
            cfParameters: '0x8ea88ab41897b921ef36ddd7dfd3e9',
          },
        },
      },
      swapRequestId: '28',
    } as SwapRequestedArgs,
  },
  {
    id: '0000000057-000011-29eb0',
    blockId: '0000000057-29eb0',
    indexInBlock: 11,
    extrinsicId: '0000000057-000003-29eb0',
    callId: '0000000057-000003-29eb0',
    name: 'Swapping.SwapScheduled',
    args: {
      swapId: '28',
      swapType: { __kind: 'CcmPrincipal' },
      executeAt: 59,
      inputAmount: '499802339199',
      swapRequestId: '28',
    } as SwapScheduledArgs,
  },
  {
    id: '0000000059-000036-fbdf4',
    blockId: '0000000059-fbdf4',
    indexInBlock: 36,
    extrinsicId: null,
    callId: null,
    name: 'Swapping.SwapExecuted',
    args: {
      swapId: '28',
      brokerFee: '4973783',
      inputAsset: { __kind: 'Dot' },
      networkFee: '497876',
      inputAmount: '499802339199',
      outputAsset: { __kind: 'Flip' },
      outputAmount: '48628752989585358147',
      swapRequestId: '28',
      intermediateAmount: '492404494',
    } as SwapExecutedArgs,
  },
  {
    id: '0000000059-000037-fbdf4',
    blockId: '0000000059-fbdf4',
    indexInBlock: 37,
    extrinsicId: null,
    callId: null,
    name: 'Swapping.SwapScheduled',
    args: {
      swapId: '82',
      swapType: { __kind: 'CcmGas' },
      executeAt: 61,
      inputAmount: '360801',
      swapRequestId: '28',
    } as SwapScheduledArgs,
  },
  {
    id: '0000000061-000023-df0ad',
    blockId: '0000000061-df0ad',
    indexInBlock: 23,
    extrinsicId: null,
    callId: null,
    name: 'Swapping.SwapExecuted',
    args: {
      swapId: '82',
      brokerFee: '0',
      inputAsset: { __kind: 'Dot' },
      networkFee: '0',
      inputAmount: '360801',
      outputAsset: { __kind: 'Eth' },
      outputAmount: '374529689743',
      swapRequestId: '28',
      intermediateAmount: '357',
    } as SwapExecutedArgs,
  },
  {
    id: '0000000061-000024-df0ad',
    blockId: '0000000061-df0ad',
    indexInBlock: 24,
    extrinsicId: null,
    callId: null,
    name: 'Swapping.SwapEgressScheduled',
    args: {
      asset: { __kind: 'Flip' },
      amount: '48628752989585358147',
      egressId: [{ __kind: 'Ethereum' }, '17'],
      egressFee: '374529689743',
      swapRequestId: '28',
    } as SwapEgressScheduledArgs,
  },
  {
    id: '0000000061-000025-df0ad',
    blockId: '0000000061-df0ad',
    indexInBlock: 25,
    extrinsicId: null,
    callId: null,
    name: 'Swapping.SwapRequestCompleted',
    args: {
      swapRequestId: '28',
    },
  },
  {
    id: '0000000061-000048-df0ad',
    blockId: '0000000061-df0ad',
    indexInBlock: 48,
    extrinsicId: null,
    callId: null,
    name: 'EthereumIngressEgress.CcmBroadcastRequested',
    args: {
      egressId: [{ __kind: 'Ethereum' }, '17'],
      broadcastId: 20,
    },
  },
  {
    id: '0000000099-000016-1f543',
    blockId: '0000000099-1f543',
    indexInBlock: 16,
    extrinsicId: '0000000099-000004-1f543',
    callId: '0000000099-000004-1f543',
    name: 'EthereumBroadcaster.BroadcastSuccess',
    args: {
      broadcastId: 20,
      transactionRef: '0x9220d619fd86e2a02d94af8c7a40333b31fdc7fe603b2ae527455a7ab1cd3364',
      transactionOutId: {
        s: '0x3232a494c1fae5495e79fd387be0f84bb158e28350d135e77f66c9e15a2ce1f2',
        kTimesGAddress: '0xf1a144d65ffed479a709d54c3ff9e906695a1d5c',
      },
    },
  },
]
  .sort((a, b) => (a.id < b.id ? -1 : 1))
  .reduce((acc, event) => {
    const id = Number.parseInt(event.id, 10);
    acc.set(id, (acc.get(id) || []).concat([event as Event]));
    return acc;
  }, new Map<number, Event[]>());

describe('ccm swap flow', () => {
  beforeAll(async () => {
    await prisma.$queryRaw`TRUNCATE TABLE public."Pool" CASCADE`;
    await prisma.pool.createMany({
      data: [
        {
          baseAsset: 'Eth',
          quoteAsset: 'Usdc',
          liquidityFeeHundredthPips: 1000,
        },

        {
          baseAsset: 'Dot',
          quoteAsset: 'Usdc',
          liquidityFeeHundredthPips: 1500,
        },
      ],
    });
  });

  beforeEach(async () => {
    await prisma.$queryRaw`TRUNCATE TABLE "Egress", "Broadcast", "Swap", "SwapDepositChannel", "SwapRequest", "Pool" CASCADE`;
  });

  it('handles all the events', async () => {
    const startingHeight = Number(ccmEvents.keys().next().value) - 1;
    await prisma.state.upsert({
      where: { id: 1 },
      create: { id: 1, height: startingHeight },
      update: { height: startingHeight },
    });

    const blocksIt = ccmEvents.entries();

    let previousHeight = startingHeight + 1;

    jest.spyOn(GraphQLClient.prototype, 'request').mockImplementation(async () => {
      const batch = blocksIt.next();
      if (batch.done) throw new Error('done');
      const [height, events] = batch.value;

      const dummyBlockLength = height - previousHeight - 1;
      previousHeight = height;

      return {
        blocks: {
          nodes: [
            ...Array.from({ length: dummyBlockLength }, (_, i) => ({
              height: height - dummyBlockLength + i,
              specId: 'test@160',
              timestamp: new Date(height * 6000).toISOString(),
              events: { nodes: [] },
            })),
            {
              height,
              specId: 'test@160',
              timestamp: new Date(height * 6000).toISOString(),
              events: { nodes: events },
            },
          ],
        },
      };
    });

    await expect(processBlocks()).rejects.toThrow('done');

    const fees = { select: { asset: true, amount: true, type: true } } as const;

    const channel = await prisma.swapDepositChannel.findFirstOrThrow({
      include: {
        swapRequests: {
          include: {
            fees,
            swaps: { include: { fees } },
            egress: {
              include: {
                broadcast: true,
              },
            },
          },
        },
      },
    });

    expect(channel).toMatchSnapshot({
      id: expect.any(BigInt),
      createdAt: expect.any(Date),
      swapRequests: [
        {
          id: expect.any(BigInt),
          egressId: expect.any(BigInt),
          swapDepositChannelId: expect.any(BigInt),
          egress: {
            id: expect.any(BigInt),
            broadcastId: expect.any(BigInt),
            createdAt: expect.any(Date),
            updatedAt: expect.any(Date),
            broadcast: {
              id: expect.any(BigInt),
              createdAt: expect.any(Date),
              updatedAt: expect.any(Date),
            },
          },
          swaps: [
            {
              id: expect.any(BigInt),
              swapRequestId: expect.any(BigInt),
              createdAt: expect.any(Date),
              updatedAt: expect.any(Date),
            },
            {
              id: expect.any(BigInt),
              swapRequestId: expect.any(BigInt),
              createdAt: expect.any(Date),
              updatedAt: expect.any(Date),
            },
          ],
        },
      ],
    });
  });
});

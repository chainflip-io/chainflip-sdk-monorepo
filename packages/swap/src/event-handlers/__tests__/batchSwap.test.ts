import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { processEvents } from './utils';
import prisma from '../../client';
import { SwapDepositAddressReadyArgs } from '../swapDepositAddressReady';
import { SwapRequestedArgs } from '../swapRequested';

const check = <T>(value: T): T => value;

const batchEvents = [
  {
    id: '0000000031-000050-2d23a',
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
    id: '0000000031-000054-2d23a',
    blockId: '0000000031-2d23a',
    indexInBlock: 62,
    extrinsicId: null,
    callId: null,
    name: 'LiquidityPools.NewPoolCreated',
    args: {
      baseAsset: { __kind: 'Sol' },
      quoteAsset: { __kind: 'Usdc' },
      initialPrice: '34028236692093848235284053891034906624',
      feeHundredthPips: 20,
    },
  },
  {
    id: '0000000086-000023-f8e73',
    blockId: '0000000086-f8e73',
    indexInBlock: 23,
    extrinsicId: '0000000086-000007-f8e73',
    callId: '0000000086-000007-f8e73',
    name: 'EthereumChainTracking.ChainStateUpdated',
    args: {
      newChainState: {
        blockHeight: '221',
        trackedData: {
          baseFee: '7',
          priorityFee: '1500000000',
        },
      },
    },
  },
  {
    id: '0000000086-000264-f8e73',
    blockId: '0000000086-f8e73',
    indexInBlock: 264,
    extrinsicId: '0000000086-000067-f8e73',
    callId: '0000000086-000067-f8e73',
    name: 'Swapping.SwapDepositAddressReady',
    args: check<SwapDepositAddressReadyArgs>({
      boostFee: 0,
      channelId: '49',
      sourceAsset: { __kind: 'Flip' },
      affiliateFees: [],
      depositAddress: {
        value: '0xe89e5fe04b8db0f5b3cd87295fd8331260d656f2',
        __kind: 'Eth',
      },
      destinationAsset: { __kind: 'Sol' },
      channelOpeningFee: '0',
      destinationAddress: {
        value: '0x5f7e2361d746df1d6e5248afb988c0f6ae4b0fa51b396bf7c5f1c2508e803c4d',
        __kind: 'Sol',
      },
      brokerCommissionRate: 100,
      sourceChainExpiryBlock: '265',
      brokerId: '0x9059e6d854b769a505d01148af212bf8cb7f8469a7153edce8dcaedd9d299125',
      refundParameters: {
        refundAddress: {
          __kind: 'Eth',
          value: '0xe89e5fe04b8db0f5b3cd87295fd8331260d656f2',
        },
        minPrice: '0',
        retryDuration: 100,
      },
    }),
  },
  {
    id: '0000000092-000138-77afe',
    blockId: '0000000092-77afe',
    indexInBlock: 138,
    extrinsicId: '0000000092-000008-77afe',
    callId: '0000000092-000008-77afe',
    name: 'Swapping.SwapRequested',
    args: check<SwapRequestedArgs>({
      origin: {
        __kind: 'DepositChannel',
        channelId: '49',
        depositAddress: { value: '0xe89e5fe04b8db0f5b3cd87295fd8331260d656f2', __kind: 'Eth' },
        depositBlockHeight: '222',
        brokerId: '0x9059e6d854b769a505d01148af212bf8cb7f8469a7153edce8dcaedd9d299125',
      },
      inputAsset: { __kind: 'Flip' },
      inputAmount: '499992015299453626516',
      outputAsset: { __kind: 'Sol' },
      requestType: {
        __kind: 'Regular',
        outputAddress: {
          value: '0x5f7e2361d746df1d6e5248afb988c0f6ae4b0fa51b396bf7c5f1c2508e803c4d',
          __kind: 'Sol',
        },
      },
      swapRequestId: '287',
      brokerFees: [],
    }),
  },
  {
    id: '0000000092-000139-77afe',
    blockId: '0000000092-77afe',
    indexInBlock: 139,
    extrinsicId: '0000000092-000008-77afe',
    callId: '0000000092-000008-77afe',
    name: 'Swapping.SwapScheduled',
    args: {
      swapId: '342',
      swapType: { __kind: 'Swap' },
      executeAt: 94,
      inputAmount: '499992015299453626516',
      swapRequestId: '287',
    },
  },
  {
    id: '0000000092-000140-77afe',
    blockId: '0000000092-77afe',
    indexInBlock: 140,
    extrinsicId: '0000000092-000008-77afe',
    callId: '0000000092-000008-77afe',
    name: 'EthereumIngressEgress.DepositFinalised',
    args: {
      asset: {
        __kind: 'Flip',
      },
      action: {
        __kind: 'Swap',
        swapRequestId: '287',
      },
      amount: '500000000000000000000',
      channelId: '49',
      ingressFee: '7984700546373484',
      blockHeight: '222',
      depositAddress: '0xe89e5fe04b8db0f5b3cd87295fd8331260d656f2',
      depositDetails: {
        txHashes: ['0xa38f5b782542360b97895e216a4f09ce21f0f28e50575381794f84da5891fa81'],
      },
    },
  },
  {
    id: '0000000094-000383-75b12',
    blockId: '0000000094-75b12',
    indexInBlock: 383,
    extrinsicId: null,
    callId: null,
    name: 'Swapping.SwapExecuted',
    args: {
      swapId: '342',
      brokerFee: '47977823',
      inputAsset: { __kind: 'Flip' },
      networkFee: '4802585',
      inputAmount: '499992015299453626516',
      outputAsset: { __kind: 'Sol' },
      outputAmount: '162665753156',
      swapRequestId: '287',
      intermediateAmount: '4749804473',
    },
  },
  {
    id: '0000000094-000384-75b12',
    blockId: '0000000094-75b12',
    indexInBlock: 384,
    extrinsicId: null,
    callId: null,
    name: 'Swapping.SwapEgressScheduled',
    args: {
      asset: { __kind: 'Sol' },
      amount: '162665748156',
      egressId: [{ __kind: 'Solana' }, '31'],
      egressFee: '5000',
      swapRequestId: '287',
    },
  },
  {
    id: '0000000094-000385-75b12',
    blockId: '0000000094-75b12',
    indexInBlock: 385,
    extrinsicId: null,
    callId: null,
    name: 'Swapping.SwapRequestCompleted',
    args: {
      swapRequestId: '287',
    },
  },
  {
    id: '0000000110-000119-48635',
    blockId: '0000000110-48635',
    indexInBlock: 119,
    extrinsicId: null,
    callId: null,
    name: 'SolanaIngressEgress.BatchBroadcastRequested',
    args: {
      egressIds: [[{ __kind: 'Solana' }, '31']],
      broadcastId: 36,
    },
  },
  {
    id: '0000000124-000021-b7537',
    blockId: '0000000124-b7537',
    indexInBlock: 21,
    extrinsicId: null,
    callId: null,
    name: 'SolanaBroadcaster.BroadcastSuccess',
    args: {
      broadcastId: 36,
      transactionRef:
        '0x2bafbe8a6fc4b8fc6a7d9ee3d6e98df78211eac79a0e31bda5d44a58ea5c63d746c60eecd6b771d949282352d15f98c072deac328bc38dd758605ca72711d10c',
      transactionOutId:
        '0x2bafbe8a6fc4b8fc6a7d9ee3d6e98df78211eac79a0e31bda5d44a58ea5c63d746c60eecd6b771d949282352d15f98c072deac328bc38dd758605ca72711d10c',
    },
  },
];

describe('batch swap flow', () => {
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
          baseAsset: 'Btc',
          quoteAsset: 'Usdc',
          liquidityFeeHundredthPips: 1500,
        },
      ],
    });
  });

  beforeEach(async () => {
    await prisma.$queryRaw`TRUNCATE TABLE "Egress", "Broadcast", "Swap", "SwapDepositChannel", "FailedSwap", "SwapRequest", "Pool", "ChainTracking" CASCADE`;
  });

  it('handles all the events', async () => {
    await processEvents(batchEvents);

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
          ],
        },
      ],
    });
  });
});

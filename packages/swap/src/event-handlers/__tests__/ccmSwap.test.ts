import { processEvents } from './utils';
import prisma from '../../client';
import { SwapDepositAddressReadyArgs } from '../swapDepositAddressReady';
import { SwapEgressScheduledArgs } from '../swapEgressScheduled';
import { SwapExecutedArgs } from '../swapExecuted';
import { SwapRequestedArgs } from '../swapRequested';
import { SwapScheduledArgs } from '../swapScheduled';

const depositChannelEvents = [
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
        ccmSwapMetadata: {
          swapAmounts: { principalSwapAmount: '499802700000', gasBudget: '360801' },
          depositMetadata: {
            sourceChain: { __kind: 'Polkadot' },
            channelMetadata: {
              message:
                '0x0000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000003f7a000000000000000000000000000000000000000000000000000000000000000074761735465737400000000000000000000000000000000000000000000000000',
              gasBudget: '360801',
              cfParameters: '0x8ea88ab41897b921ef36ddd7dfd3e9',
            },
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
    id: '0000000057-000012-29eb0',
    blockId: '0000000057-29eb0',
    indexInBlock: 12,
    extrinsicId: '0000000057-000003-29eb0',
    callId: '0000000057-000003-29eb0',
    name: 'PolkadotIngressEgress.DepositFinalised',
    args: {
      asset: {
        __kind: 'Dot',
      },
      action: {
        __kind: 'CcmTransfer',
        swapRequestId: '28',
      },
      amount: '500000000000',
      channelId: '2',
      ingressFee: '197300000',
      blockHeight: 57,
      depositAddress: '0x7b42c78a80b6e72e1ec500cfb88a064959dfae5fe8b09f366444d35878364513',
      depositDetails: 2,
    },
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
];

const vaultOriginCcmEvents = [
  {
    id: '0002504899-000050-2d23a',
    blockId: '0002504899-2d23a',
    indexInBlock: 50,
    extrinsicId: null,
    callId: null,
    name: 'LiquidityPools.NewPoolCreated',
    args: {
      baseAsset: { __kind: 'Eth' },
      quoteAsset: { __kind: 'Usdc' },
      initialPrice: '340282366920938470546924331736236032',
      feeHundredthPips: 20,
    },
  },
  {
    id: '0002504899-000772-ae06e',
    blockId: '0002504899-ae06e',
    indexInBlock: 772,
    extrinsicId: '0002504899-000383-ae06e',
    callId: '0002504899-000383-ae06e',
    name: 'Swapping.SwapRequested',
    args: {
      origin: {
        __kind: 'Vault',
        txHash: '0x0ea0bc075d5d972ba6469bc651d2966b312085b8f7a4c55e340986c43e73abc7',
      },
      inputAsset: { __kind: 'Eth' },
      inputAmount: '1',
      outputAsset: { __kind: 'Usdc' },
      requestType: {
        __kind: 'Ccm',
        outputAddress: { value: '0x28ac2744fff7e772e6450a34d68d661a7b35c660', __kind: 'Eth' },
        ccmDepositMetadata: {
          sourceChain: { __kind: 'Ethereum' },
          sourceAddress: { value: '0xa56a6be23b6cf39d9448ff6e897c29c41c8fbdff', __kind: 'Eth' },
          channelMetadata: {
            message:
              '0x000000000000000000000000000000000000000000000000000000000000004000000000000000000000000067ff09c184d8e9e7b90c5187ed04cbfbdba741c8000000000000000000000000000000000000000000000000000000000000000c6461676f61746973686572650000000000000000000000000000000000000000',
            gasBudget: '0',
            cfParameters: '0x',
          },
        },
      },
      swapRequestId: '2448',
    },
  },
  {
    id: '0002504899-000773-ae06e',
    blockId: '0002504899-ae06e',
    indexInBlock: 773,
    extrinsicId: '0002504899-000383-ae06e',
    callId: '0002504899-000383-ae06e',
    name: 'Swapping.SwapScheduled',
    args: {
      swapId: '2401',
      swapType: { __kind: 'CcmPrincipal' },
      executeAt: 2504901,
      inputAmount: '1',
      swapRequestId: '2448',
    },
  },
  {
    id: '0002504901-000937-16632',
    blockId: '0002504901-16632',
    indexInBlock: 937,
    extrinsicId: null,
    callId: null,
    name: 'Swapping.SwapExecuted',
    args: {
      swapId: '2401',
      brokerFee: '0',
      inputAsset: { __kind: 'Eth' },
      networkFee: '0',
      inputAmount: '1',
      outputAsset: { __kind: 'Usdc' },
      outputAmount: '0',
      swapRequestId: '2448',
    },
  },
  {
    id: '0002504901-000938-16632',
    blockId: '0002504901-16632',
    indexInBlock: 938,
    extrinsicId: null,
    callId: null,
    name: 'Swapping.SwapEgressScheduled',
    args: {
      asset: { __kind: 'Usdc' },
      amount: '0',
      egressId: [{ __kind: 'Ethereum' }, '1243'],
      egressFee: '0',
      swapRequestId: '2448',
    },
  },
  {
    id: '0002504901-000939-16632',
    blockId: '0002504901-16632',
    indexInBlock: 939,
    extrinsicId: null,
    callId: null,
    name: 'Swapping.SwapRequestCompleted',
    args: { swapRequestId: '2448' },
  },
  {
    id: '0002504901-000941-16632',
    blockId: '0002504901-16632',
    indexInBlock: 941,
    extrinsicId: null,
    callId: null,
    name: 'EthereumIngressEgress.CcmBroadcastRequested',
    args: { egressId: [{ __kind: 'Ethereum' }, '1243'], broadcastId: 1929 },
  },
  {
    id: '0002504910-000016-1f543',
    blockId: '0002504910-1f543',
    indexInBlock: 16,
    extrinsicId: '0002504910-000004-1f543',
    callId: '0002504910-000004-1f543',
    name: 'EthereumBroadcaster.BroadcastSuccess',
    args: {
      broadcastId: 1929,
      transactionRef: '0x9220d619fd86e2a02d94af8c7a40333b31fdc7fe603b2ae527455a7ab1cd3364',
      transactionOutId: {
        s: '0x3232a494c1fae5495e79fd387be0f84bb158e28350d135e77f66c9e15a2ce1f2',
        kTimesGAddress: '0xf1a144d65ffed479a709d54c3ff9e906695a1d5c',
      },
    },
  },
];

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
    await prisma.$queryRaw`TRUNCATE TABLE "Egress", "Broadcast", "Swap", "SwapDepositChannel", "SwapRequest", "Pool", "ChainTracking", private."State", private."DepositChannel" CASCADE`;
  });

  it('handles all the deposit channel events', async () => {
    await processEvents(depositChannelEvents);

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

  it('handles all the vault events', async () => {
    await processEvents(vaultOriginCcmEvents);

    const fees = { select: { asset: true, amount: true, type: true } } as const;

    const swapRequest = await prisma.swapRequest.findUniqueOrThrow({
      where: { nativeId: 2448 },
      include: {
        fees,
        swaps: { include: { fees } },
        egress: {
          include: {
            broadcast: true,
          },
        },
      },
    });

    expect(swapRequest).toMatchSnapshot({
      id: expect.any(BigInt),
      egressId: expect.any(BigInt),
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
    });
  });
});

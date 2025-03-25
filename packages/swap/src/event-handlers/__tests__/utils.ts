import { bytesToHex } from '@chainflip/utils/bytes';
import * as ss58 from '@chainflip/utils/ss58';
import assert from 'assert';
import { GraphQLClient } from 'graphql-request';
import { vi, expect } from 'vitest';
import { z } from 'zod';
import { InternalAssets, Chain, Chains, assetConstants } from '@/shared/enums';
import { actionSchema } from '@/shared/parsers';
import prisma, { SwapDepositChannel } from '../../client';
import { GET_CALL } from '../../gql/query';
import processBlocks, { Call, Event } from '../../processBlocks';
import { events as eventNames } from '../index';
import { networkBroadcastSuccessArgs } from '../networkBroadcastSuccess';
import { DepositFailedArgs } from '../networkDepositFailed';
import { SwapDepositAddressReadyArgs } from '../swapDepositAddressReady';

export const ETH_ADDRESS = '0x6Aa69332B63bB5b1d7Ca5355387EDd5624e181F2';
export const DOT_ADDRESS = '1yMmfLti1k3huRQM2c47WugwonQMqTvQ2GUFxnU7Pcs7xPo'; // 0x2afba9278e30ccf6a6ceb3a8b6e336b70068f045c666f2e7f4f9cc5f47db8972
export const BTC_ADDRESS = 'tb1pdz3akc5wa2gr69v3x87tfg0ka597dxqvfl6zhqx4y202y63cgw0q3rgpm6'; // 0x68a3db628eea903d159131fcb4a1f6ed0be6980c4ff42b80d5229ea26a38439e

type SwapChannelData = Parameters<(typeof prisma)['swapDepositChannel']['create']>[0]['data'];

export const createDepositChannel = (
  data: Partial<SwapChannelData> = {},
): Promise<SwapDepositChannel> =>
  prisma.swapDepositChannel.create({
    data: {
      channelId: 1n,
      srcChain: Chains.Ethereum,
      srcAsset: InternalAssets.Eth,
      destAsset: InternalAssets.Dot,
      depositAddress: ETH_ADDRESS,
      destAddress: DOT_ADDRESS,
      totalBrokerCommissionBps: 0,
      expectedDepositAmount: '10000000000',
      issuedBlock: 100,
      estimatedExpiryAt: new Date('2023-11-09T11:05:00.000Z'),
      openingFeePaid: 0,
      ...data,
      createdAt: new Date(1690556052834),
    },
  });

export const networkDepositReceivedBtcMock = {
  block: {
    specId: 'test@160',
    height: 120,
    timestamp: 1670337105000,
  },
  event: {
    args: {
      asset: {
        __kind: 'Btc',
      },
      amount: '110000',
      depositAddress: {
        value: '0x68a3db628eea903d159131fcb4a1f6ed0be6980c4ff42b80d5229ea26a38439e',
        __kind: 'Taproot',
      },
    },
    name: 'BitcoinIngressEgress.DepositReceived',
    indexInBlock: 7,
  },
} as const;

export const networkDepositReceivedBtcMockV120 = (action?: z.input<typeof actionSchema>) =>
  ({
    block: {
      height: 120,
      timestamp: 1670337105000,
    },
    event: {
      args: {
        asset: {
          __kind: 'Btc',
        },
        amount: '110000',
        depositAddress: {
          value: '0x68a3db628eea903d159131fcb4a1f6ed0be6980c4ff42b80d5229ea26a38439e',
          __kind: 'Taproot',
        },
        ingressFee: '1000',
        action: action || { __kind: 'Swap', swapId: '1' },
      },
      name: 'BitcoinIngressEgress.DepositReceived',
      indexInBlock: 7,
    },
  }) as const;

export const swapDepositAddressReadyMocked = {
  block: {
    specId: 'test@160',
    height: 120,
    timestamp: 1670337105000,
    hash: '0x6c35d3e08b00e979961976cefc79f9594e8ae12f8cc4e9cabfd4796a1994ccd8',
  },
  event: {
    extrinsicId: '1',
    args: {
      depositAddress: {
        __kind: 'Eth',
        value: ETH_ADDRESS,
      },
      destinationAddress: {
        __kind: 'Dot',
        value: bytesToHex(ss58.decode(DOT_ADDRESS).data),
      },
      sourceAsset: {
        __kind: 'Eth',
      },
      destinationAsset: {
        __kind: 'Dot',
      },
      brokerCommissionRate: 0,
      channelId: '1',
      sourceChainExpiryBlock: '0x100',
      boostFee: 0,
      channelOpeningFee: 0,
      affiliateFees: [],
      brokerId: '0x9059e6d854b769a505d01148af212bf8cb7f8469a7153edce8dcaedd9d299125',
      refundParameters: {
        minPrice: '0',
        refundAddress: {
          __kind: 'Eth',
          value: ETH_ADDRESS,
        },
        retryDuration: 100,
      },
    } satisfies SwapDepositAddressReadyArgs,
    indexInBlock: 0,
    name: eventNames.Swapping.SwapDepositAddressReady,
  },
} as const;

export const swapDepositAddressReadyCcmParamsMocked = {
  block: {
    specId: 'test@180',
    height: 120,
    timestamp: 1670337105000,
    hash: '0x6c35d3e08b00e979961976cefc79f9594e8ae12f8cc4e9cabfd4796a1994ccd8',
  },
  event: {
    args: {
      channelId: '8249',
      sourceAsset: { __kind: 'Btc' },
      depositAddress: {
        value:
          '0x7462317079303874383832667679656b63393975336432656a7578347261336c72636b687970776d336137656578363838766a757571687138786e74336b',
        __kind: 'Btc',
      },
      channelMetadata: {
        message: '0xdeadc0de',
        gasBudget: '125000',
        ccmAdditionalData: '0x',
      },
      destinationAsset: { __kind: 'Eth' },
      destinationAddress: {
        value: '0xfcd3c82b154cb4717ac98718d0fd13eeba3d2754',
        __kind: 'Eth',
      },
      brokerCommissionRate: 0,
      sourceChainExpiryBlock: '2573643',
      boostFee: 0,
      channelOpeningFee: 0,
      affiliateFees: [],
      brokerId: '0x9059e6d854b769a505d01148af212bf8cb7f8469a7153edce8dcaedd9d299125',
      refundParameters: {
        minPrice: '0',
        refundAddress: {
          value: '0xfcd3c82b154cb4717ac98718d0fd13eeba3d2754',
          __kind: 'Eth',
        },
        retryDuration: 100,
      },
    } as SwapDepositAddressReadyArgs,
    indexInBlock: 0,
    name: eventNames.Swapping.SwapDepositAddressReady,
  },
} as const;

export const swapRequestCompletedMock = {
  block: {
    specId: 'test@160',
    height: 120,
    timestamp: 1670337105000,
    hash: '0x123',
  },
  event: {
    args: {
      swapRequestId: '9876545',
    },
    id: '0000012799-000000-c1ea7',
    indexInBlock: 0,
    nodeId: 'WyJldmVudHMiLCIwMDAwMDEyNzk5LTAwMDAwMC1jMWVhNyJd',
    name: eventNames.Swapping.SwapRequestCompleted,
    phase: 'ApplyExtrinsic',
    pos: 2,
    extrinsic: {
      error: null,
      hash: '0xf72d579e0e659b6e287873698da1ffee2f5cbbc1a5165717f0218fca85ba66f4',
      id: '0000012799-000000-c1ea7',
      indexInBlock: 0,
      nodeId: 'WyJleHRyaW5zaWNzIiwiMDAwMDAxMjc5OS0wMDAwMDAtYzFlYTciXQ==',
      pos: 1,
      success: true,
      version: 4,
      call: {
        args: [null],
        error: null,
        id: '0000012799-000000-c1ea7',
        name: 'Timestamp.set',
        nodeId: 'WyJjYWxscyIsIjAwMDAwMTI3OTktMDAwMDAwLWMxZWE3Il0=',
        origin: [null],
        pos: 0,
        success: true,
      },
    },
  },
} as const;

export const networkTransactionBroadcastRequestBtcMock = {
  block: {
    height: 120,
    timestamp: 1670337105000,
  },
  eventContext: {
    kind: 'event',
    event: {
      args: {
        nominee: '0xfca6cd155fe8c31495d7da47b72fccd3f16d0d85bd0a1ffcd33d3f7a04314531',
        transactionOutId: '0xaef9c86539f194f617f45d495823789d3da082745d4a6e3b602ac00d815ed6e3',
        broadcastAttemptId: { broadcastId: 1, attemptCount: 0 },
        transactionPayload: {
          encodedTransaction:
            '0x020000000001012f9fa5bb631cc20b2ee53988549db06369188977a759eeee0e95fe4d9089518b0100000000fdffffff0202ac0e0000000000160014605a08f510309c0aeb52554c288cc8a81e773f0c0c2feb02000000002251203d30a261d370dc764140a8f222bda1d003a403d8a24648470fb2e4fc2978f2ae0340b036f7c1cb7a0cfc00e1984cd49daba01fa7a69eeda00e71c14d7f262668ff72e8b29aa02899df429ca1e304482a7c9f86d6448bc5da3c7da567cef4053d3d92245175206a4d5e4829cf59df788c48223c71abb1c3c57a12bfc9b7d389786c4aca4ba5f7ac21c0eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee00000000',
        },
      },
      name: 'BitcoinBroadcaster.TransactionBroadcastRequest',
      indexInBlock: 7,
    },
  },
} as const;

export const networkTransactionBroadcastRequestBtcMockV2 = {
  block: {
    height: 120,
    timestamp: 1670337105000,
  },
  eventContext: {
    kind: 'event',
    event: {
      args: {
        nominee: '0xfca6cd155fe8c31495d7da47b72fccd3f16d0d85bd0a1ffcd33d3f7a04314531',
        transactionOutId: '0xaef9c86539f194f617f45d495823789d3da082745d4a6e3b602ac00d815ed6e3',
        broadcastId: 1,
        transactionPayload: {
          encodedTransaction:
            '0x020000000001012f9fa5bb631cc20b2ee53988549db06369188977a759eeee0e95fe4d9089518b0100000000fdffffff0202ac0e0000000000160014605a08f510309c0aeb52554c288cc8a81e773f0c0c2feb02000000002251203d30a261d370dc764140a8f222bda1d003a403d8a24648470fb2e4fc2978f2ae0340b036f7c1cb7a0cfc00e1984cd49daba01fa7a69eeda00e71c14d7f262668ff72e8b29aa02899df429ca1e304482a7c9f86d6448bc5da3c7da567cef4053d3d92245175206a4d5e4829cf59df788c48223c71abb1c3c57a12bfc9b7d389786c4aca4ba5f7ac21c0eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee00000000',
        },
      },
      name: 'BitcoinBroadcaster.TransactionBroadcastRequest',
      indexInBlock: 7,
    },
  },
} as const;

export const swapEgressScheduledMock = {
  block: {
    specId: 'test@160',
    height: 120,
    timestamp: 1670337105000,
    hash: '0x123',
  },
  event: {
    args: {
      asset: { __kind: 'Eth' },
      amount: '4945198948008612506',
      egressId: [{ __kind: 'Ethereum' }, '1'],
      egressFee: ['167509500781711', { __kind: 'Eth' }],
      swapRequestId: '9876545',
    },
    id: '0000012799-000000-c1ea7',
    indexInBlock: 0,
    nodeId: 'WyJldmVudHMiLCIwMDAwMDEyNzk5LTAwMDAwMC1jMWVhNyJd',
    name: eventNames.Swapping.SwapEgressScheduled,
    phase: 'ApplyExtrinsic',
    pos: 2,
    extrinsic: {
      error: null,
      hash: '0xf72d579e0e659b6e287873698da1ffee2f5cbbc1a5165717f0218fca85ba66f4',
      id: '0000012799-000000-c1ea7',
      indexInBlock: 0,
      nodeId: 'WyJleHRyaW5zaWNzIiwiMDAwMDAxMjc5OS0wMDAwMDAtYzFlYTciXQ==',
      pos: 1,
      success: true,
      version: 4,
      call: {
        args: [null],
        error: null,
        id: '0000012799-000000-c1ea7',
        name: 'Timestamp.set',
        nodeId: 'WyJjYWxscyIsIjAwMDAwMTI3OTktMDAwMDAwLWMxZWE3Il0=',
        origin: [null],
        pos: 0,
        success: true,
      },
    },
  },
} as const;

export const refundEgressScheduledMock160 = {
  block: {
    specId: 'test@160',
    height: 120,
    timestamp: 1670337105000,
    hash: '0x123',
  },
  event: {
    args: {
      dispatchInfo: {
        class: [null],
        weight: '101978000',
        paysFee: [null],
      },
      swapId: '9876545',
      swapRequestId: '9876545',
      fee: '1000000000',
      egressFee: '1000000000',
      asset: { __kind: 'Eth' },
      amount: '10000000000',
      egressId: [{ __kind: 'Ethereum' }, '1'] as const,
    },
    id: '0000012799-000000-c1ea7',
    indexInBlock: 0,
    nodeId: 'WyJldmVudHMiLCIwMDAwMDEyNzk5LTAwMDAwMC1jMWVhNyJd',
    name: eventNames.Swapping.SwapEgressScheduled,
    phase: 'ApplyExtrinsic',
    pos: 2,
    extrinsic: {
      error: null,
      hash: '0xf72d579e0e659b6e287873698da1ffee2f5cbbc1a5165717f0218fca85ba66f4',
      id: '0000012799-000000-c1ea7',
      indexInBlock: 0,
      nodeId: 'WyJleHRyaW5zaWNzIiwiMDAwMDAxMjc5OS0wMDAwMDAtYzFlYTciXQ==',
      pos: 1,
      success: true,
      version: 4,
      call: {
        args: [null],
        error: null,
        id: '0000012799-000000-c1ea7',
        name: 'Timestamp.set',
        nodeId: 'WyJjYWxscyIsIjAwMDAwMTI3OTktMDAwMDAwLWMxZWE3Il0=',
        origin: [null],
        pos: 0,
        success: true,
      },
    },
  },
} as const;

export const refundEgressScheduledMock = {
  block: {
    specId: 'test@180',
    height: 120,
    timestamp: 1670337105000,
    hash: '0x123',
  },
  event: {
    args: {
      dispatchInfo: {
        class: [null],
        weight: '101978000',
        paysFee: [null],
      },
      swapId: '9876545',
      swapRequestId: '9876545',
      fee: '1000000000',
      egressFee: ['1000000000', { __kind: 'Eth' }],
      asset: { __kind: 'Eth' },
      amount: '10000000000',
      egressId: [{ __kind: 'Ethereum' }, '1'] as const,
    },
    id: '0000012799-000000-c1ea7',
    indexInBlock: 0,
    nodeId: 'WyJldmVudHMiLCIwMDAwMDEyNzk5LTAwMDAwMC1jMWVhNyJd',
    name: eventNames.Swapping.SwapEgressScheduled,
    phase: 'ApplyExtrinsic',
    pos: 2,
    extrinsic: {
      error: null,
      hash: '0xf72d579e0e659b6e287873698da1ffee2f5cbbc1a5165717f0218fca85ba66f4',
      id: '0000012799-000000-c1ea7',
      indexInBlock: 0,
      nodeId: 'WyJleHRyaW5zaWNzIiwiMDAwMDAxMjc5OS0wMDAwMDAtYzFlYTciXQ==',
      pos: 1,
      success: true,
      version: 4,
      call: {
        args: [null],
        error: null,
        id: '0000012799-000000-c1ea7',
        name: 'Timestamp.set',
        nodeId: 'WyJjYWxscyIsIjAwMDAwMTI3OTktMDAwMDAwLWMxZWE3Il0=',
        origin: [null],
        pos: 0,
        success: true,
      },
    },
  },
} as const;

export const swapEgressIgnoredMock = {
  block: {
    specId: 'test@160',
    height: 120,
    timestamp: 1670337105000,
    hash: '0x123',
  },
  event: {
    args: {
      asset: {
        __kind: 'Btc',
      },
      amount: '11',
      reason: {
        value: {
          error: '0x06000000',
          index: 34,
        },
        __kind: 'Module',
      },
      swapRequestId: '2',
    },
    id: '0000012799-000000-c1ea7',
    indexInBlock: 0,
    nodeId: 'WyJldmVudHMiLCIwMDAwMDEyNzk5LTAwMDAwMC1jMWVhNyJd',
    name: eventNames.Swapping.SwapEgressIgnored,
    phase: 'ApplyExtrinsic',
    pos: 2,
    extrinsic: null,
  },
} as const;

export const refundEgressIgnoredMock = {
  block: {
    specId: 'test@160',
    height: 120,
    timestamp: 1670337105000,
    hash: '0x123',
  },
  event: {
    args: {
      asset: {
        __kind: 'Btc',
      },
      amount: '22000',
      reason: {
        value: {
          error: '0x06000000',
          index: 34,
        },
        __kind: 'Module',
      },
      swapRequestId: '377',
    },
    id: '0000012799-000000-c1ea7',
    indexInBlock: 0,
    nodeId: 'WyJldmVudHMiLCIwMDAwMDEyNzk5LTAwMDAwMC1jMWVhNyJd',
    name: eventNames.Swapping.RefundEgressIgnored,
    phase: 'ApplyExtrinsic',
    pos: 2,
    extrinsic: null,
  },
} as const;

export const networkBatchBroadcastRequestedMock = {
  block: {
    specId: 'test@160',
    height: 120,
    timestamp: 1670337105000,
  },
  event: {
    args: {
      egressIds: [
        [
          {
            __kind: 'Ethereum',
          },
          '10',
        ],
        [
          {
            __kind: 'Ethereum',
          },
          '11',
        ],
        [
          {
            __kind: 'Ethereum',
          },
          '12',
        ],
      ],
      broadcastId: 9,
    },
    name: 'EthereumIngressEgress.BatchBroadcastRequested',
    indexInBlock: 135,
  },
} as const;

export const networkBroadcastSuccessMock = (
  args?: Partial<z.input<ReturnType<typeof networkBroadcastSuccessArgs>>>,
) =>
  ({
    block: {
      specId: 'test@160',
      height: 120,
      timestamp: 1670337105000,
    },
    event: {
      args: {
        broadcastId: 12,
        transactionOutId: {
          s: '0x689c4add3e14ea8243a1966fc2cea3baea692ca52fd7ef464e1cc74e608bf262',
          kTimesGAddress: '0x972c9f07cc7a847b29003655faf265c12e193f09',
        },
        ...args,
      },
      name: 'EthereumBroadcaster.BroadcastSuccess',
      indexInBlock: 12,
    },
  }) as const;

export const networkBroadcastAbortedMock = {
  block: {
    specId: 'test@160',
    height: 120,
    timestamp: 1670337105000,
  },
  event: {
    args: { broadcastId: 62 },
    name: 'EthereumBroadcaster.BroadcastAborted',
    indexInBlock: 7,
  },
} as const;

export const newPoolCreatedMock = {
  block: {
    specId: 'test@160',
    height: 120,
    timestamp: 1670337105000,
  },
  event: {
    args: {
      baseAsset: { __kind: 'Btc' },
      quoteAsset: { __kind: 'Usdc' },
      initialPrice: '170141183460469231731687303715884105728000',
      feeHundredthPips: 1000,
    },
    name: 'LiquidityPools.NewPoolCreated',
    indexInBlock: 7,
  },
} as const;

export const poolFeeSetMock = {
  block: {
    specId: 'test@160',
    height: 150,
    timestamp: 1680337105000,
  },
  event: {
    args: {
      baseAsset: { __kind: 'Btc' },
      quoteAsset: { __kind: 'Usdc' },
      initialPrice: '170141183460469231731687303715884105728000',
      feeHundredthPips: 2000,
    },
    name: 'LiquidityPools.PoolFeeSet',
    indexInBlock: 7,
  },
} as const;

export const thresholdSignatureInvalidMock = {
  block: {
    specId: 'test@160',
    height: 420,
    timestamp: 1680337105000,
  },
  event: {
    args: {
      broadcastId: 1,
      retryBroadcastId: 10,
    },
    name: 'EthereumBroadcaster.ThresholdSignatureInvalid',
    indexInBlock: 7,
  },
} as const;

export const buildDepositFailedEvent = <T extends DepositFailedArgs>(args: T) => {
  const asset =
    args.details.__kind === 'DepositChannel'
      ? args.details.depositWitness.asset.__kind
      : args.details.vaultWitness.inputAsset.__kind;
  const { chain } = assetConstants[asset];

  return {
    block: { specId: 'test@180', timestamp: 1670337093000, height: 100, hash: '0x123' },
    event: { args, indexInBlock: 0, name: `${chain}IngressEgress.DepositFailed` },
  };
};

export const createChainTrackingInfo = (date?: Date) => {
  const chains: Chain[] = ['Bitcoin', 'Ethereum', 'Polkadot', 'Solana'];
  return Promise.all(
    chains.map((chain) =>
      prisma.chainTracking.upsert({
        where: { chain },
        create: {
          chain,
          height: 10,
          blockTrackedAt: date ?? new Date('2023-11-09T10:00:00.000Z'),
          updatedAt: date ?? new Date('2023-11-09T10:00:00.000Z'),
          eventWitnessedBlock: 200,
        },
        update: { height: 10 },
      }),
    ),
  );
};

export const createPools = () => {
  const assets = Object.values(InternalAssets).filter((asset) => asset !== 'Usdc');
  return prisma.pool.createMany({
    data: assets.map((baseAsset) => ({
      baseAsset,
      quoteAsset: 'Usdc',
      liquidityFeeHundredthPips: 1000,
    })),
  });
};

export const processEvents = async (
  events: (Event & { id: string })[],
  calls: (Call & { id: string })[] = [],
  version = '180',
) => {
  const eventMap = events
    .sort((a, b) => (a.id < b.id ? -1 : 1))
    .reduce((acc, event) => {
      const id = Number.parseInt(event.id, 10);
      assert(!Number.isNaN(id), 'event id is not a number');
      acc.set(id, (acc.get(id) || []).concat([event]));
      return acc;
    }, new Map<number, Event[]>());

  const startingHeight = Number(eventMap.keys().next().value) - 1;
  await prisma.state.upsert({
    where: { id: 1 },
    create: { id: 1, height: startingHeight },
    update: { height: startingHeight },
  });

  const blocksIt = eventMap.entries();

  let previousHeight = startingHeight + 1;

  vi.spyOn(GraphQLClient.prototype, 'request').mockImplementation(async (...args) => {
    if (JSON.stringify(args[0]) === JSON.stringify(GET_CALL)) {
      const [, vars] = args as unknown as [unknown, Record<string, unknown> | undefined];

      return { call: { args: calls.find((c) => c.id === vars?.id) } };
    }

    const batch = blocksIt.next();
    if (batch.done) throw new Error('done');
    const [height, blockEvents] = batch.value;

    const dummyBlockLength = height - previousHeight - 1;
    previousHeight = height;

    return {
      blocks: {
        nodes: [
          ...Array.from({ length: dummyBlockLength }, (_, i) => ({
            height: height - dummyBlockLength + i,
            specId: `test@${version}`,
            timestamp: new Date(height * 6000).toISOString(),
            events: { nodes: [] },
          })),
          {
            height,
            specId: `test@${version}`,
            timestamp: new Date(height * 6000).toISOString(),
            events: { nodes: blockEvents },
          },
        ],
      },
    };
  });

  await expect(processBlocks()).rejects.toThrow('done');
};

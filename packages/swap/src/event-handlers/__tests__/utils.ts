import prisma, { SwapDepositChannel } from '../../client';
import { Swapping } from '../index';
import { SwapScheduledEvent } from '../swapScheduled';

export const ETH_ADDRESS = '0x6Aa69332B63bB5b1d7Ca5355387EDd5624e181F2';
export const ETH_ADDRESS_2 = '0x6AA69332b63BB5B1d7CA5355387edd5624e181f3';
export const DOT_ADDRESS = '5F3sa2TJAWMqDhXG6jhV4N8ko9SxwGy8TpaNS1repo5EYjQX';

type SwapChannelData = Parameters<
  (typeof prisma)['swapDepositChannel']['create']
>[0]['data'];

export const createDepositChannel = (
  data: Partial<SwapChannelData> = {},
): Promise<SwapDepositChannel> =>
  prisma.swapDepositChannel.create({
    data: {
      srcAsset: 'ETH',
      destAsset: 'DOT',
      depositAddress: ETH_ADDRESS,
      destAddress: DOT_ADDRESS,
      expectedDepositAmount: '10000000000',
      expiryBlock: 200,
      issuedBlock: 100,
      ...data,
    },
  });

const buildSwapScheduledEvent = <T extends SwapScheduledEvent>(args: T) => ({
  block: {
    timestamp: 1670337093000,
    height: 100,
  },
  eventContext: {
    kind: 'event',
    event: {
      args: {
        dispatchInfo: {
          class: [null],
          weight: '101978000',
          paysFee: [null],
        },
        ...args,
      },
      id: '0000012799-000000-c1ea7',
      indexInBlock: 0,
      nodeId: 'WyJldmVudHMiLCIwMDAwMDEyNzk5LTAwMDAwMC1jMWVhNyJd',
      name: Swapping.SwapScheduled,
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
  },
});

export const swapScheduledDepositChannelMock = buildSwapScheduledEvent({
  sourceAsset: { __kind: 'Eth' },
  destinationAsset: { __kind: 'Flip' },
  swapId: '9876545',
  depositAmount: '222222222222222222',
  destinationAddress: {
    __kind: 'Eth',
    value: ETH_ADDRESS_2,
  },
  origin: {
    __kind: 'DepositChannel',
    depositAddress: { __kind: 'Eth', value: ETH_ADDRESS },
  },
} as const);

export const swapScheduledVaultMock = buildSwapScheduledEvent({
  sourceAsset: { __kind: 'Eth' },
  destinationAsset: { __kind: 'Flip' },
  swapId: '9876545',
  depositAmount: '222222222222222222',
  destinationAddress: { __kind: 'Eth', value: ETH_ADDRESS },
  origin: {
    __kind: 'Vault',
    value: {
      txHash:
        '0x414833b2fc5d31e2b967d2badd3fe658e5badc2b36543d579de00aed17ccc230',
    },
  },
} as const);

export const swapExecutedMock = {
  block: {
    height: 100,
    timestamp: 1670337099000,
  },
  eventContext: {
    kind: 'event',
    event: {
      args: {
        dispatchInfo: {
          class: [null],
          weight: '101978000',
          paysFee: [null],
        },
        swapId: '9876545',
      },
      id: '0000012799-000000-c1ea7',
      indexInBlock: 0,
      nodeId: 'WyJldmVudHMiLCIwMDAwMDEyNzk5LTAwMDAwMC1jMWVhNyJd',
      name: Swapping.SwapExecuted,
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
  },
};

export const swapEgressScheduledMock = {
  block: {
    height: 120,
    timestamp: 1670337105000,
  },
  eventContext: {
    kind: 'event',
    event: {
      args: {
        dispatchInfo: {
          class: [null],
          weight: '101978000',
          paysFee: [null],
        },
        swapId: '9876545',
        egressId: [{ __kind: 'Ethereum' }, '1'] as const,
      },
      id: '0000012799-000000-c1ea7',
      indexInBlock: 0,
      nodeId: 'WyJldmVudHMiLCIwMDAwMDEyNzk5LTAwMDAwMC1jMWVhNyJd',
      name: Swapping.SwapEgressScheduled,
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
  },
};

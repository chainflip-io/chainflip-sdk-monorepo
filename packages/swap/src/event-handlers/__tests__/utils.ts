import { bytesToHex } from '@chainflip/utils/bytes';
import * as ss58 from '@chainflip/utils/ss58';
import { z } from 'zod';
import { InternalAssets, Chain, Chains } from '@/shared/enums';
import { actionSchema } from '@/shared/parsers';
import prisma, { SwapDepositChannel } from '../../client';
import { events } from '../index';
import { networkBroadcastSuccessArgs } from '../networkBroadcastSuccess';
import { DepositIgnoredArgs } from '../networkDepositIgnored';
import { SwapDepositAddressReadyArgs } from '../swapDepositAddressReady';
import { SwapEgressScheduledArgs } from '../swapEgressScheduled';
import { SwapExecutedEvent } from '../swapExecuted';

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
      brokerCommissionBps: 0,
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
    specId: 'test@150',
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

export const buildSwapExecutedMock = (args: SwapExecutedEvent) => ({
  block: {
    specId: 'test@150',
    height: 100,
    timestamp: 1670337099000,
  },
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
    name: events.Swapping.SwapExecuted,
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
});

export const swapDepositAddressReadyMocked = {
  block: {
    specId: 'test@150',
    height: 120,
    timestamp: 1670337105000,
    hash: '0x6c35d3e08b00e979961976cefc79f9594e8ae12f8cc4e9cabfd4796a1994ccd8',
  },
  event: {
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
    } as SwapDepositAddressReadyArgs,
    indexInBlock: 0,
    name: events.Swapping.SwapDepositAddressReady,
  },
} as const;

export const swapDepositAddressReadyCcmParamsMocked = {
  block: {
    specId: 'test@150',
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
        cfParameters: '0x',
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
    } as SwapDepositAddressReadyArgs,
    indexInBlock: 0,
    name: events.Swapping.SwapDepositAddressReady,
  },
} as const;

export const swapEgressScheduledMock = {
  block: {
    specId: 'test@150',
    height: 120,
    timestamp: 1670337105000,
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
    } as SwapEgressScheduledArgs,
    id: '0000012799-000000-c1ea7',
    indexInBlock: 0,
    nodeId: 'WyJldmVudHMiLCIwMDAwMDEyNzk5LTAwMDAwMC1jMWVhNyJd',
    name: events.Swapping.SwapEgressScheduled,
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
    specId: 'test@150',
    height: 120,
    timestamp: 1670337105000,
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
      swapId: '2',
    },
    id: '0000012799-000000-c1ea7',
    indexInBlock: 0,
    nodeId: 'WyJldmVudHMiLCIwMDAwMDEyNzk5LTAwMDAwMC1jMWVhNyJd',
    name: events.Swapping.SwapEgressIgnored,
    phase: 'ApplyExtrinsic',
    pos: 2,
    extrinsic: null,
  },
} as const;

export const refundEgressIgnoredMock = {
  block: {
    specId: 'test@150',
    height: 120,
    timestamp: 1670337105000,
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
      swapId: '377',
    },
    id: '0000012799-000000-c1ea7',
    indexInBlock: 0,
    nodeId: 'WyJldmVudHMiLCIwMDAwMDEyNzk5LTAwMDAwMC1jMWVhNyJd',
    name: events.Swapping.RefundEgressIgnored,
    phase: 'ApplyExtrinsic',
    pos: 2,
    extrinsic: null,
  },
} as const;

export const networkBatchBroadcastRequestedMock = {
  block: {
    specId: 'test@150',
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
      specId: 'test@150',
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
    specId: 'test@150',
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
    specId: 'test@150',
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
    specId: 'test@150',
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
    specId: 'test@150',
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

export const buildDepositIgnoredEvent = <T extends DepositIgnoredArgs>(
  args: T,
  eventName: string,
) => ({
  block: {
    specId: 'test@150',
    timestamp: 1670337093000,
    height: 100,
  },
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
    name: eventName,
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
});

export const createChainTrackingInfo = () => {
  const chains: Chain[] = ['Bitcoin', 'Ethereum', 'Polkadot'];
  return Promise.all(
    chains.map((chain) =>
      prisma.chainTracking.upsert({
        where: { chain },
        create: {
          chain,
          height: 10,
          blockTrackedAt: new Date('2023-11-09T10:00:00.000Z'),
          eventWitnessedBlock: 200,
        },
        update: { height: 10 },
      }),
    ),
  );
};

import { ethereumIngressEgressDepositFailed } from '@chainflip/processor/180/ethereumIngressEgress/depositFailed';
import { bytesToHex } from '@chainflip/utils/bytes';
import * as ss58 from '@chainflip/utils/ss58';
import { Server } from 'http';
import request from 'supertest';
import { vi, describe, it, beforeEach, afterEach, expect, beforeAll } from 'vitest';
import { z } from 'zod';
import { environment, mockRpcResponse } from '@/shared/tests/fixtures';
import prisma from '../../../client';
import env from '../../../config/env';
import metadata from '../../../event-handlers/__tests__/metadata.json';
import {
  createChainTrackingInfo,
  createPools,
  processEvents,
} from '../../../event-handlers/__tests__/utils';
import { BitcoinDepositFailedArgs } from '../../../event-handlers/ingress-egress/depositFailed';
import { TransactionRejectedByBrokerArgs } from '../../../event-handlers/ingress-egress/transactionRejectedByBroker';
import type { SwapDepositAddressReadyArgs } from '../../../event-handlers/swapping/swapDepositAddressReady';
import { SwapEgressIgnoredArgs } from '../../../event-handlers/swapping/swapEgressIgnored';
import { SwapRequestedArgs190 } from '../../../event-handlers/swapping/swapRequested';
import {
  getPendingBroadcast,
  getPendingDeposit,
  getPendingVaultSwap,
} from '../../../ingress-egress-tracking';
import app from '../../../server';
import { StateV2 } from '../../v2/swap';

const incrementId = (obj: Mutable<(typeof swapEventMap)[keyof typeof swapEventMap]>, def = 1) => {
  if ('swapId' in obj.args) {
    return {
      ...obj,
      args: {
        ...obj.args,
        swapId: (parseInt(obj.args.swapId as string, 10) + def).toString(),
      },
    };
  }
  throw new Error('no incremental id in event');
};

vi.mock('@/shared/rpc', async (importOriginal) => {
  const original = (await importOriginal()) as object;
  return {
    ...original,
    getMetadata: vi.fn().mockResolvedValue(metadata.result),
  };
});

vi.mock('../../../utils/disallowChannel', () => ({
  default: vi.fn().mockResolvedValue(false),
}));

vi.mock('timers/promises', () => ({
  setTimeout: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../../ingress-egress-tracking');

vi.mock('@/shared/broker', async (importOriginal) => {
  const original = (await importOriginal()) as object;
  return {
    ...original,
    requestSwapDepositAddress: vi.fn().mockRejectedValue(Error('unhandled mock')),
  };
});

type Mutable<T> = {
  -readonly [K in keyof T]: Mutable<T[K]> extends infer O
    ? O extends number
      ? number
      : O extends string
        ? string
        : O
    : never;
} & { [key: string]: any };

const clone = <T>(obj: T) => structuredClone(obj) as Mutable<T>;

const RECEIVED_TIMESTAMP = 552000;
const RECEIVED_BLOCK_INDEX = '92-400';

const swapEventMap = {
  'Swapping.SwapDepositAddressReady': {
    id: '0000000086-000632-f8e73',
    blockId: '0000000086-f8e73',
    indexInBlock: 632,
    extrinsicId: '0000000086-000159-f8e73',
    callId: '0000000086-000159-f8e73',
    name: 'Swapping.SwapDepositAddressReady',
    args: {
      boostFee: 0,
      channelId: '85',
      sourceAsset: { __kind: 'Eth' },
      affiliateFees: [],
      depositAddress: { value: '0x6aa69332b63bb5b1d7ca5355387edd5624e181f2', __kind: 'Eth' },
      destinationAsset: { __kind: 'Dot' },
      channelOpeningFee: '0',
      destinationAddress: {
        value: '0x2afba9278e30ccf6a6ceb3a8b6e336b70068f045c666f2e7f4f9cc5f47db8972',
        __kind: 'Dot',
      },
      brokerCommissionRate: 0,
      sourceChainExpiryBlock: '265',
      brokerId: '0x9059e6d854b769a505d01148af212bf8cb7f8469a7153edce8dcaedd9d299125',
      refundParameters: {
        minPrice: '0',
        refundAddress: {
          __kind: 'Eth',
          value: '0x2afba9278e30ccf6a6ceb3a8b6e336b70068f045c666f2e7f4f9cc5f47db8972',
        },
        retryDuration: 100,
      },
    } as SwapDepositAddressReadyArgs,
  },
  'Swapping.SwapRequested': {
    id: '0000000092-000398-77afe',
    blockId: '0000000092-77afe',
    indexInBlock: 398,
    extrinsicId: '0000000092-000010-77afe',
    callId: '0000000092-000010-77afe',
    name: 'Swapping.SwapRequested',
    args: {
      origin: {
        __kind: 'DepositChannel',
        channelId: '85',
        depositAddress: { value: '0x6aa69332b63bb5b1d7ca5355387edd5624e181f2', __kind: 'Eth' },
        depositBlockHeight: '222',
        brokerId: '0x9059e6d854b769a505d01148af212bf8cb7f8469a7153edce8dcaedd9d299125',
      },
      brokerFees: [],
      inputAsset: { __kind: 'Eth' },
      inputAmount: '4999949999999650000',
      outputAsset: { __kind: 'Dot' },
      requestType: {
        __kind: 'Regular',
        outputAction: {
          __kind: 'Egress',
          outputAddress: {
            value: '0x2afba9278e30ccf6a6ceb3a8b6e336b70068f045c666f2e7f4f9cc5f47db8972',
            __kind: 'Dot',
          },
        },
      },
      swapRequestId: '368',
    } satisfies SwapRequestedArgs190,
  },
  'Swapping.SwapScheduled': {
    id: '0000000092-000399-77afe',
    blockId: '0000000092-77afe',
    indexInBlock: 399,
    extrinsicId: '0000000092-000010-77afe',
    callId: '0000000092-000010-77afe',
    name: 'Swapping.SwapScheduled',
    args: {
      swapId: '423',
      swapType: { __kind: 'Swap' },
      executeAt: 94,
      inputAmount: '4999949999999650000',
      swapRequestId: '368',
    },
  },
  'EthereumIngressEgress.DepositFinalised': {
    id: '0000000092-000400-77afe',
    blockId: '0000000092-77afe',
    indexInBlock: 400,
    extrinsicId: '0000000092-000010-77afe',
    callId: '0000000092-000010-77afe',
    name: 'EthereumIngressEgress.DepositFinalised',
    args: {
      originType: {
        __kind: 'DepositChannel',
      },
      asset: { __kind: 'Eth' },
      action: { __kind: 'Swap', swapRequestId: '368' },
      amount: '5000000000000000000',
      channelId: '85',
      ingressFee: '50000000350000',
      blockHeight: '222',
      depositAddress: '0x6aa69332b63bb5b1d7ca5355387edd5624e181f2',
      depositDetails: {},
    },
  },
  'EthereumIngressEgress.DepositBoosted': {
    id: '0000000092-000400-77afe',
    blockId: '0000000092-77afe',
    indexInBlock: 400,
    extrinsicId: '0000000092-000010-77afe',
    callId: '0000000092-000010-77afe',
    name: 'EthereumIngressEgress.DepositBoosted',
    args: {
      originType: {
        __kind: 'DepositChannel',
      },
      asset: { __kind: 'Eth' },
      action: { __kind: 'Swap', swapRequestId: '368' },
      amounts: [[4, '5000000000000000000']],
      boostFee: '2500000000000000',
      channelId: '85',
      ingressFee: '50000000350000',
      blockHeight: '222',
      depositAddress: '0x6aa69332b63bb5b1d7ca5355387edd5624e181f2',
      depositDetails: {},
      maxBoostFeeBps: 7,
      prewitnessedDepositId: '27',
    },
  },
  'EthereumIngressEgress.InsufficientBoostLiquidity': {
    id: '0000000092-000400-77afe',
    blockId: '0000000092-77afe',
    indexInBlock: 400,
    extrinsicId: '0000000092-000010-77afe',
    callId: '0000000092-000010-77afe',
    name: 'EthereumIngressEgress.InsufficientBoostLiquidity',
    args: {
      prewitnessedDepositId: '27',
      asset: { __kind: 'Eth' },
      amountAttempted: '5000000000000000000',
      channelId: '85',
    },
  },
  'Swapping.SwapExecuted': {
    id: '0000000094-000594-75b12',
    blockId: '0000000094-75b12',
    indexInBlock: 594,
    extrinsicId: null,
    callId: null,
    name: 'Swapping.SwapExecuted',
    args: {
      swapId: '423',
      brokerFee: '45516860',
      inputAsset: { __kind: 'Eth' },
      networkFee: '4556242',
      inputAmount: '4999949999999650000',
      outputAsset: { __kind: 'Dot' },
      outputAmount: '4192904666034',
      swapRequestId: '368',
      intermediateAmount: '4506169140',
    },
  },
  'Swapping.SwapEgressScheduled': {
    id: '0000000094-000595-75b12',
    blockId: '0000000094-75b12',
    indexInBlock: 595,
    extrinsicId: null,
    callId: null,
    name: 'Swapping.SwapEgressScheduled',
    args: {
      asset: { __kind: 'Dot' },
      amount: '4192707216034',
      egressId: [{ __kind: 'Polkadot' }, '19'],
      egressFee: '197450000',
      swapRequestId: '368',
    },
  },
  'Swapping.SwapRequestCompleted': {
    id: '0000000094-000596-75b12',
    blockId: '0000000094-75b12',
    indexInBlock: 596,
    extrinsicId: null,
    callId: null,
    name: 'Swapping.SwapRequestCompleted',
    args: { swapRequestId: '368' },
  },
  'PolkadotIngressEgress.BatchBroadcastRequested': {
    id: '0000000094-000843-75b12',
    blockId: '0000000094-75b12',
    indexInBlock: 843,
    extrinsicId: null,
    callId: null,
    name: 'PolkadotIngressEgress.BatchBroadcastRequested',
    args: {
      egressIds: [[{ __kind: 'Polkadot' }, '19']],
      broadcastId: 7,
    },
  },
  'EthereumIngressEgress.BatchBroadcastRequested': {
    id: '0000000094-000843-75b12',
    blockId: '0000000094-75b12',
    indexInBlock: 843,
    extrinsicId: null,
    callId: null,
    name: 'EthereumIngressEgress.BatchBroadcastRequested',
    args: {
      egressIds: [[{ __kind: 'Ethereum' }, '71']],
      broadcastId: 7,
    },
  },
  'Swapping.RefundEgressScheduled': {
    id: '0000000094-000594-75b12',
    blockId: '0000000094-75b12',
    indexInBlock: 594,
    extrinsicId: null,
    callId: null,
    name: 'Swapping.RefundEgressScheduled',
    args: {
      asset: { __kind: 'Eth' },
      amount: '999844999999160000',
      egressId: [{ __kind: 'Ethereum' }, '71'],
      egressFee: '105000000490000',
      swapRequestId: '368',
    },
  },
  'PolkadotBroadcaster.BroadcastSuccess': {
    id: '0000000104-000007-5dbb8',
    blockId: '0000000104-5dbb8',
    indexInBlock: 7,
    extrinsicId: '0000000104-000002-5dbb8',
    callId: '0000000104-000002-5dbb8',
    name: 'PolkadotBroadcaster.BroadcastSuccess',
    args: {
      broadcastId: 7,
      transactionRef: { blockNumber: 104, extrinsicIndex: 2 },
      transactionOutId:
        '0x7c53cc46ddfbf51ecd3aa7ee97e5dc60db89f99cb54426a2d641735c15d78908c047c33944df15f8720e20c6b5e49999680428e9ce7ae6a4bc223c26b0137f87',
    },
  },
  'EthereumBroadcaster.BroadcastSuccess': {
    id: '0000000104-000007-5dbb8',
    blockId: '0000000104-5dbb8',
    indexInBlock: 7,
    extrinsicId: '0000000104-000002-5dbb8',
    callId: '0000000104-000002-5dbb8',
    name: 'EthereumBroadcaster.BroadcastSuccess',
    args: {
      broadcastId: 7,
      transactionRef: '0xd2398250c9fa869f0eb7659015549ed46178c95cedd444c3539f655068f6a7d9',
      transactionOutId: {
        s: '0x4b4a8a15558f559ebb0bc4e591f276a24e1ea2a1aefa708bd0c1baec232b5a9b',
        kTimesGAddress: '0x6bca5f42c73fc7bd8422ccc9c99e8d62f7aca092',
      },
    },
  },
  'PolkadotBroadcaster.BroadcastAborted': {
    id: '0000000104-000007-5dbb8',
    blockId: '0000000104-5dbb8',
    indexInBlock: 7,
    extrinsicId: '0000000104-000002-5dbb8',
    callId: '0000000104-000002-5dbb8',
    name: 'PolkadotBroadcaster.BroadcastAborted',
    args: {
      broadcastId: 7,
    },
  },
  'EthereumBroadcaster.BroadcastAborted': {
    id: '0000000104-000007-5dbb8',
    blockId: '0000000104-5dbb8',
    indexInBlock: 7,
    extrinsicId: '0000000104-000002-5dbb8',
    callId: '0000000104-000002-5dbb8',
    name: 'EthereumBroadcaster.BroadcastAborted',
    args: {
      broadcastId: 7,
    },
  },
  'Swapping.RefundEgressIgnored': {
    id: '0000000104-000594-75b12',
    indexInBlock: 1,
    name: 'Swapping.RefundEgressIgnored',
    args: {
      asset: { __kind: 'Eth' },
      amount: '999844999999160000',
      reason: { value: { error: '0x06000000', index: 32 }, __kind: 'Module' },
      swapRequestId: '368',
    },
  },
  'EthereumIngressEgress.DepositFailed': {
    id: '0000000092-000399-24afe',
    indexInBlock: 1,
    name: 'EthereumIngressEgress.DepositFailed',
    callId: '0000000092-000399-04fea',
    args: {
      reason: { __kind: 'InvalidDcaParameters' },
      details: {
        __kind: 'DepositChannel',
        depositWitness: {
          asset: { __kind: 'Eth' },
          amount: '100000000000000',
          depositAddress: '0x6aa69332b63bb5b1d7ca5355387edd5624e181f2',
          depositDetails: {
            txHashes: ['0xfae1ed'],
          },
        },
      },
      blockHeight: 1234,
    },
  },
  'EthereumIngressEgress.DepositFailed.Vault': {
    id: '0000000092-000399-24afe',
    indexInBlock: 1,
    name: 'EthereumIngressEgress.DepositFailed',
    callId: '0000000092-000399-04fea',
    args: {
      reason: { __kind: 'InvalidRefundParameters' },
      details: {
        __kind: 'Vault',
        vaultWitness: {
          txId: '0xcafebabe',
          inputAsset: { __kind: 'Eth' },
          outputAsset: { __kind: 'Dot' },
          depositAmount: '100000000000000',
          depositDetails: {
            txHashes: ['0xfae1ed'],
          },
          destinationAddress: {
            __kind: 'Dot',
            value: '0x2afba9278e30ccf6a6ceb3a8b6e336b70068f045c666f2e7f4f9cc5f47db8972',
          },
          boostFee: 0,
          affiliateFees: [],
          refundParams: {
            minPrice: '0',
            refundAddress: '0x2afba9278e30ccf6a6ceb3a8b6e336b70068f045c666f2e7f4f9cc5f47db8972',
            retryDuration: 100,
          },
        },
      } as z.input<typeof ethereumIngressEgressDepositFailed>['details'],
      blockHeight: 1234,
    },
  },
} as const;

const swapEvents = [
  // 0
  swapEventMap['Swapping.SwapDepositAddressReady'],
  // 1
  swapEventMap['Swapping.SwapRequested'],
  // 2
  swapEventMap['Swapping.SwapScheduled'],
  // 3
  swapEventMap['EthereumIngressEgress.DepositFinalised'],
  // 4
  swapEventMap['Swapping.SwapExecuted'],
  // 5
  swapEventMap['Swapping.SwapEgressScheduled'],
  // 6
  swapEventMap['Swapping.SwapRequestCompleted'],
  // 7
  swapEventMap['PolkadotIngressEgress.BatchBroadcastRequested'],
  // 8
  swapEventMap['PolkadotBroadcaster.BroadcastSuccess'],
  // 9
] as const;

const channelId = '86-Ethereum-85';
const { swapRequestId } = swapEventMap['Swapping.SwapRequested'].args;

describe('server', () => {
  let server: Server;
  vi.setConfig({ testTimeout: 5000 });

  beforeAll(async () => {
    mockRpcResponse({ data: environment() });
    server = app.listen(0);

    return () => {
      server.close();
    };
  });

  describe('GET /v2/swaps/:id', () => {
    let oldEnv: typeof env;

    beforeEach(async () => {
      const time = new Date('2022-01-01');
      vi.useFakeTimers({ toFake: ['performance'] }).setSystemTime(time);
      await prisma.$queryRaw`TRUNCATE TABLE "Egress", "Broadcast", "Swap", "SwapDepositChannel", private."DepositChannel", "Swap", "FailedSwap", "IgnoredEgress", "StateChainError", "SwapRequest", "Pool", "ChainTracking" CASCADE`;
      await createChainTrackingInfo(time);
      await createPools();
      oldEnv = { ...env };
    });

    afterEach(() => {
      vi.clearAllTimers();
      Object.assign(env, oldEnv);
    });

    it('throws an error if no swap deposit channel is found', async () => {
      const { body, status } = await request(server).get(`/v2/swaps/1`);

      expect(status).toBe(404);
      expect(body).toEqual({ message: 'resource not found' });
    });

    it(`retrieves a swap in ${StateV2.Waiting} status`, async () => {
      await processEvents(swapEvents.slice(0, 1));

      const { body, status } = await request(server).get(`/v2/swaps/${channelId}`);

      expect(status).toBe(200);
      expect(body).toMatchObject({
        state: 'WAITING',
        srcAsset: 'ETH',
        srcChain: 'Ethereum',
        destAsset: 'DOT',
        destChain: 'Polkadot',
        destAddress: '1yMmfLti1k3huRQM2c47WugwonQMqTvQ2GUFxnU7Pcs7xPo',
        estimatedDurationSeconds: 138,
        estimatedDurationsSeconds: {
          deposit: 30,
          egress: 96,
          swap: 12,
        },
        depositChannel: {
          createdAt: 516000,
          brokerCommissionBps: 0,
          depositAddress: '0x6aa69332b63bb5b1d7ca5355387edd5624e181f2',
          srcChainExpiryBlock: '265',
          estimatedExpiryTime: 1640998260000,
          isExpired: false,
          openedThroughBackend: false,
        },
      });
    });

    it(`retrieves a swap with a broker commission in ${StateV2.Waiting} status`, async () => {
      const depositAddressEvent = clone(swapEventMap['Swapping.SwapDepositAddressReady']);
      depositAddressEvent.args.brokerId =
        '0x9059e6d854b769a505d01148af212bf8cb7f8469a7153edce8dcaedd9d299125';
      depositAddressEvent.args.brokerCommissionRate = 15;
      await processEvents([depositAddressEvent]);

      const { body, status } = await request(server).get(`/v2/swaps/${channelId}`);

      expect(status).toBe(200);
      expect(body).toMatchObject({
        state: 'WAITING',
        srcAsset: 'ETH',
        srcChain: 'Ethereum',
        destAsset: 'DOT',
        destChain: 'Polkadot',
        destAddress: '1yMmfLti1k3huRQM2c47WugwonQMqTvQ2GUFxnU7Pcs7xPo',
        estimatedDurationSeconds: 138,
        estimatedDurationsSeconds: {
          deposit: 30,
          egress: 96,
          swap: 12,
        },
        depositChannel: {
          createdAt: 516000,
          brokerCommissionBps: 15,
          depositAddress: '0x6aa69332b63bb5b1d7ca5355387edd5624e181f2',
          srcChainExpiryBlock: '265',
          estimatedExpiryTime: 1640998260000,
          isExpired: false,
          openedThroughBackend: false,
        },
        brokers: [
          {
            account: 'cFM8kRvLBXagj6ZXvrt7wCM4jGmHvb5842jTtXXg3mRHjrvKy',
            commissionBps: 15,
          },
        ],
      });
    });

    it(`retrieves a swap with ccm metadata in ${StateV2.Waiting} status`, async () => {
      const depositAddressEvent = clone(swapEventMap['Swapping.SwapDepositAddressReady']);
      depositAddressEvent.args.channelMetadata = {
        message: '0xdeadbeef',
        gasBudget: '100000',
        ccmAdditionalData: '0x8ea88ab41897b921ef36ddd7dfd3e9',
      };
      await processEvents([depositAddressEvent]);

      const { body, status } = await request(server).get(`/v2/swaps/${channelId}`);

      expect(status).toBe(200);

      expect(body).toMatchObject({
        state: 'WAITING',
        ccmParams: {
          gasBudget: '100000',
          message: '0xdeadbeef',
        },
      });
    });

    it(`retrieves a swap in ${StateV2.Waiting} status and the channel is expired`, async () => {
      const depositAddressEvent = clone(swapEventMap['Swapping.SwapDepositAddressReady']);
      depositAddressEvent.args.sourceChainExpiryBlock = '1';
      await processEvents([
        depositAddressEvent,
        {
          ...depositAddressEvent,
          indexInBlock: depositAddressEvent.indexInBlock + 1,
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
      ]);

      const { body, status } = await request(server).get(`/v2/swaps/${channelId}`);

      expect(status).toBe(200);

      expect(body).toMatchObject({
        state: 'WAITING',
        depositChannel: {
          createdAt: 516000,
          brokerCommissionBps: 0,
          depositAddress: '0x6aa69332b63bb5b1d7ca5355387edd5624e181f2',
          srcChainExpiryBlock: '1',
          estimatedExpiryTime: 1640995092000,
          isExpired: true,
          openedThroughBackend: false,
        },
      });
    });

    it(`retrieves a swap in ${StateV2.Receiving} status`, async () => {
      vi.mocked(getPendingDeposit).mockResolvedValueOnce({
        amount: '1500000000000000000',
        txConfirmations: 2,
        txRef: '0x1234',
      });

      await processEvents(swapEvents.slice(0, 1));

      const { body, status } = await request(server).get(`/v2/swaps/${channelId}`);

      expect(status).toBe(200);
      expect(body).toMatchObject({
        state: 'RECEIVING',
        srcAsset: 'ETH',
        srcChain: 'Ethereum',
        destAsset: 'DOT',
        destChain: 'Polkadot',
        destAddress: '1yMmfLti1k3huRQM2c47WugwonQMqTvQ2GUFxnU7Pcs7xPo',
        estimatedDurationSeconds: 138,
        estimatedDurationsSeconds: {
          deposit: 30,
          egress: 96,
          swap: 12,
        },
        depositChannel: {
          createdAt: 516000,
          brokerCommissionBps: 0,
          depositAddress: '0x6aa69332b63bb5b1d7ca5355387edd5624e181f2',
          srcChainExpiryBlock: '265',
          estimatedExpiryTime: 1640998260000,
          isExpired: false,
          openedThroughBackend: false,
        },
        deposit: {},
      });
      expect(body.deposit).toMatchObject({
        amount: '1500000000000000000',
        txConfirmations: 2,
        txRef: '0x1234',
      });
      expect(getPendingDeposit).toBeCalledWith('Eth', '0x6aa69332b63bb5b1d7ca5355387edd5624e181f2');
    });

    it(`retrieves a swap in ${StateV2.Swapping} status`, async () => {
      await processEvents(swapEvents.slice(0, 4));

      const { body, status } = await request(server).get(`/v2/swaps/${channelId}`);

      expect(status).toBe(200);
      const { swapId, ...rest } = body;

      expect(BigInt(swapId)).toEqual(368n);

      expect(rest).toMatchSnapshot();
    });

    it(`retrieves a swap in ${StateV2.Swapping} status with a tx ref`, async () => {
      const depositFinalisedEvent = clone(swapEventMap['EthereumIngressEgress.DepositFinalised']);
      depositFinalisedEvent.args.depositDetails.txHashes = [
        '0xa2d5df86c6ec123283eb052c598a0f4b650367a81ad141b9ff3adb0286a86c17',
      ];

      await processEvents([...swapEvents.slice(0, 3), depositFinalisedEvent]);

      const { body, status } = await request(server).get(`/v2/swaps/${channelId}`);

      expect(status).toBe(200);
      const { swapId, ...rest } = body;

      expect(rest).toMatchSnapshot();
    });

    it(`retrieves a swap in ${StateV2.Swapping} status`, async () => {
      await processEvents(swapEvents.slice(0, 5));

      const { body, status } = await request(server).get(`/v2/swaps/${channelId}`);

      expect(status).toBe(200);
      const { swapId, ...rest } = body;

      expect(rest).toMatchSnapshot();
    });

    it(`retrieves a swap in ${StateV2.Sending} status`, async () => {
      await processEvents(swapEvents.slice(0, 7));

      const { body, status } = await request(server).get(`/v2/swaps/${channelId}`);

      expect(status).toBe(200);
      const { swapId, ...rest } = body;

      expect(rest).toMatchSnapshot();
    });

    it(`retrieves a swap in ${StateV2.Sent} status`, async () => {
      vi.mocked(getPendingBroadcast).mockResolvedValueOnce({
        tx_ref: '0xdeadbeef',
      } as any);

      await processEvents(swapEvents.slice(0, 8));

      const { body, status } = await request(server).get(`/v2/swaps/${channelId}`);

      expect(status).toBe(200);
      const { swapId, ...rest } = body;

      expect(rest).toMatchSnapshot();
      expect(getPendingBroadcast).toBeCalledWith(expect.objectContaining({ chain: 'Polkadot' }));
    });

    it(`retrieves a swap in ${StateV2.Completed} status`, async () => {
      await processEvents(swapEvents.slice(0, 9));

      const { body, status } = await request(server).get(`/v2/swaps/${channelId}`);

      expect(status).toBe(200);
      const { swapId, ...rest } = body;

      expect(rest).toMatchSnapshot();
    });

    it(`retrieves a swap in ${StateV2.Failed} status`, async () => {
      await processEvents([
        ...swapEvents.slice(0, 8),
        swapEventMap['PolkadotBroadcaster.BroadcastAborted'],
      ]);

      const { body, status } = await request(server).get(`/v2/swaps/${channelId}`);

      expect(status).toBe(200);
      const { swapId, ...rest } = body;

      expect(rest.state).toBe('FAILED');
      expect(rest.swapEgress.failure).toMatchObject({
        failedAt: 624000,
        failedBlockIndex: '104-7',
        mode: 'SENDING_FAILED',
        reason: {
          name: 'BroadcastAborted',
          message: 'The swap broadcast was aborted',
        },
      });
    });

    it(`retrieves a swap in ${StateV2.Failed} status (deposit failed)`, async () => {
      await processEvents([
        swapEventMap['Swapping.SwapDepositAddressReady'],
        swapEventMap['EthereumIngressEgress.DepositFailed'],
      ]);

      const { body } = await request(server).get(`/v2/swaps/${channelId}`);

      expect(body).toMatchInlineSnapshot(`
        {
          "brokers": [],
          "deposit": {
            "amount": "100000000000000",
            "failedAt": 552000,
            "failedBlockIndex": "92-1",
            "failure": {
              "failedAt": 552000,
              "failedBlockIndex": "92-1",
              "mode": "DEPOSIT_IGNORED",
              "reason": {
                "message": "The DCA parameters were improperly formatted",
                "name": "InvalidDcaParameters",
              },
            },
            "txRef": "0xfae1ed",
          },
          "depositChannel": {
            "affiliateBrokers": [],
            "brokerCommissionBps": 0,
            "createdAt": 516000,
            "depositAddress": "0x6aa69332b63bb5b1d7ca5355387edd5624e181f2",
            "estimatedExpiryTime": 1640998260000,
            "fillOrKillParams": {
              "minPrice": "0",
              "refundAddress": "0x2afba9278e30ccf6a6ceb3a8b6e336b70068f045c666f2e7f4f9cc5f47db8972",
              "retryDurationBlocks": 100,
            },
            "id": "86-Ethereum-85",
            "isExpired": false,
            "openedThroughBackend": false,
            "srcChainExpiryBlock": "265",
          },
          "destAddress": "1yMmfLti1k3huRQM2c47WugwonQMqTvQ2GUFxnU7Pcs7xPo",
          "destAsset": "DOT",
          "destChain": "Polkadot",
          "estimatedDurationSeconds": 138,
          "estimatedDurationsSeconds": {
            "deposit": 30,
            "egress": 96,
            "swap": 12,
          },
          "fees": [],
          "fillOrKillParams": {
            "minPrice": "0",
            "refundAddress": "0x2afba9278e30ccf6a6ceb3a8b6e336b70068f045c666f2e7f4f9cc5f47db8972",
            "retryDurationBlocks": 100,
          },
          "lastStatechainUpdateAt": 1640995200000,
          "srcAsset": "ETH",
          "srcChain": "Ethereum",
          "srcChainRequiredBlockConfirmations": 2,
          "state": "FAILED",
          "swap": {
            "originalInputAmount": "100000000000000",
            "remainingInputAmount": "100000000000000",
            "swappedInputAmount": "0",
            "swappedIntermediateAmount": "0",
            "swappedOutputAmount": "0",
          },
        }
      `);
    });

    it(`retrieves a swap in ${StateV2.Failed} status (invalid dca parameters)`, async () => {
      await processEvents([
        swapEventMap['Swapping.SwapDepositAddressReady'],
        swapEventMap['EthereumIngressEgress.DepositFailed'],
      ]);

      const failedTxHash = '0xfae1ed';
      const { body } = await request(server).get(`/v2/swaps/${failedTxHash}`);

      expect(body.state).toBe('FAILED');
      expect(body.deposit.failure).toMatchObject({
        failedAt: 552000,
        failedBlockIndex: '92-1',
        mode: 'DEPOSIT_IGNORED',
        reason: {
          name: 'InvalidDcaParameters',
          message: 'The DCA parameters were improperly formatted',
        },
      });
    });

    it(`retrieves a vault swap in ${StateV2.Failed} status (invalid refund parameters)`, async () => {
      await processEvents([swapEventMap['EthereumIngressEgress.DepositFailed.Vault']]);

      const failedTxHash = '0xfae1ed';
      const { body } = await request(server).get(`/v2/swaps/${failedTxHash}`);

      expect(body.state).toBe('FAILED');
      expect(body.deposit.failure).toMatchObject({
        failedAt: 552000,
        failedBlockIndex: '92-1',
        mode: 'DEPOSIT_IGNORED',
        reason: {
          name: 'InvalidRefundParameters',
          message: 'The refund parameters were improperly formatted',
        },
      });
    });

    it(`retrieves a swap in ${StateV2.Failed} status (deposit failed w/ refund)`, async () => {
      await processEvents([
        {
          id: '0003614786-000494-09fd9',
          indexInBlock: 494,
          callId: '0003614786-000245-09fd9',
          name: 'Swapping.SwapDepositAddressReady',
          args: {
            boostFee: 0,
            channelId: '875',
            sourceAsset: { __kind: 'Btc' },
            affiliateFees: [],
            depositAddress: {
              value:
                '0x74623170757271346b6e32636c38636c746a6d733374776d6c6a706b727563666a78783374687338796e6d736767396e6b78327970796471783965367932',
              __kind: 'Btc',
            },
            destinationAsset: { __kind: 'Eth' },
            refundParameters: {
              minPrice: '17490603648355810813658618490882604478133626649690',
              refundAddress: {
                value:
                  '0x746231713738706a6c6c787a6d37303639666a386d773375643064766b3464386e326d7571733771326b',
                __kind: 'Btc',
              },
              retryDuration: 150,
            },
            channelOpeningFee: '10000',
            destinationAddress: {
              value: '0xac16d8adbd217576a540a625e873448cecdb21e2',
              __kind: 'Eth',
            },
            brokerCommissionRate: 0,
            sourceChainExpiryBlock: '3485883',
            brokerId: '0x9059e6d854b769a505d01148af212bf8cb7f8469a7153edce8dcaedd9d299125',
          },
        },
        {
          id: '0003614958-000465-1d0a6',
          indexInBlock: 465,
          callId: '0003614958-000231-1d0a6',
          name: 'BitcoinIngressEgress.DepositFailed',
          args: {
            reason: { __kind: 'TransactionRejectedByBroker' },
            depositAddress: {
              value: '0xe0c15b4d58f9f1f5cb708addbfc8361f309918d15de0724f70420b3b1944091a',
              __kind: 'Taproot',
            },
            blockHeight: 1234,
            details: {
              __kind: 'DepositChannel',
              depositWitness: {
                asset: { __kind: 'Btc' },
                amount: '1000000',
                depositAddress: {
                  __kind: 'Taproot',
                  value: '0xe0c15b4d58f9f1f5cb708addbfc8361f309918d15de0724f70420b3b1944091a',
                },

                depositDetails: {
                  asset: { __kind: 'Btc' },
                  amount: '1000000',
                  depositAddress: {
                    pubkeyX: '0xe9adc6fc32ca8e08f9940ffb209dcd775f5f35e20ad69b5c4e225527e9430833',
                    scriptPath: {
                      salt: 875,
                      tapleafHash:
                        '0x4f99f5996889dd9d5332ab2be83e0ce478bb03420dbc8cea7aaaa14e5ef77f86',
                      unlockScript: {
                        bytes:
                          '0x026b037520e9adc6fc32ca8e08f9940ffb209dcd775f5f35e20ad69b5c4e225527e9430833ac',
                      },
                      tweakedPubkeyBytes:
                        '0x03e0c15b4d58f9f1f5cb708addbfc8361f309918d15de0724f70420b3b1944091a',
                    },
                  },
                  id: {
                    txId: '0x78b3828e63d9300eedcfeaed28e7416764019a62066b945e63624ac27dc5cc9d',
                    vout: 0,
                  },
                },
              },
            },
          } as BitcoinDepositFailedArgs,
        },
        {
          id: '0003614958-001117-1d0a6',
          indexInBlock: 1117,
          callId: null,
          name: 'BitcoinIngressEgress.TransactionRejectedByBroker',
          args: {
            txId: {
              id: {
                txId: '0x78b3828e63d9300eedcfeaed28e7416764019a62066b945e63624ac27dc5cc9d',
                vout: 0,
              },
              amount: '1000000',
              depositAddress: {
                pubkeyX: '0xe9adc6fc32ca8e08f9940ffb209dcd775f5f35e20ad69b5c4e225527e9430833',
                scriptPath: {
                  salt: 875,
                  tapleafHash: '0x4f99f5996889dd9d5332ab2be83e0ce478bb03420dbc8cea7aaaa14e5ef77f86',
                  unlockScript: {
                    bytes:
                      '0x026b037520e9adc6fc32ca8e08f9940ffb209dcd775f5f35e20ad69b5c4e225527e9430833ac',
                  },
                  tweakedPubkeyBytes:
                    '0x03e0c15b4d58f9f1f5cb708addbfc8361f309918d15de0724f70420b3b1944091a',
                },
              },
            },
            broadcastId: 1226,
          } as TransactionRejectedByBrokerArgs,
        },
        {
          id: '0003615072-001060-7ee49',
          indexInBlock: 1060,
          callId: '0003615072-000527-7ee49',
          name: 'BitcoinBroadcaster.BroadcastSuccess',
          args: {
            broadcastId: 1226,
            transactionRef: '0x7732cfb2f61551db38424b34c2bdfcb632eb204199865168f7a2334ed516c67c',
            transactionOutId: '0x7732cfb2f61551db38424b34c2bdfcb632eb204199865168f7a2334ed516c67c',
          },
        },
      ]);

      const txHash = '0x78b3828e63d9300eedcfeaed28e7416764019a62066b945e63624ac27dc5cc9d'
        .slice(2)
        .match(/.{2}/g)
        ?.reverse()
        .join('');

      const { body, status } = await request(server).get(`/v2/swaps/${txHash}`);

      expect(status).toBe(200);

      expect(body).toStrictEqual({
        deposit: {
          amount: '1000000',
          failedAt: 21689748000,
          failedBlockIndex: '3614958-465',
          failure: {
            failedAt: 21689748000,
            failedBlockIndex: '3614958-465',
            mode: 'DEPOSIT_REJECTED',
            reason: {
              message: 'The deposit was rejected by the broker',
              name: 'TransactionRejectedByBroker',
            },
          },
          txRef: '9dccc57dc24a62635e946b06629a01646741e728edeacfed0e30d9638e82b378',
        },
        depositChannel: {
          affiliateBrokers: [],
          brokerCommissionBps: 0,
          createdAt: 21688716000,
          depositAddress: 'tb1purq4kn2cl8cltjms3twmljpkrucfjxx3ths8ynmsgg9nkx2ypydqx9e6y2',
          estimatedExpiryTime: 3732519000000,
          fillOrKillParams: {
            minPrice: '5.140026445278486822',
            refundAddress: 'tb1q78pjllxzm7069fj8mw3ud0dvk4d8n2muqs7q2k',
            retryDurationBlocks: 150,
          },
          id: '3614786-Bitcoin-875',
          isExpired: false,
          openedThroughBackend: false,
          srcChainExpiryBlock: '3485883',
        },
        destAddress: '0xac16d8adbd217576a540a625e873448cecdb21e2',
        destAsset: 'ETH',
        destChain: 'Ethereum',
        estimatedDurationSeconds: 1920,
        estimatedDurationsSeconds: {
          deposit: 1806,
          egress: 102,
          swap: 12,
        },
        fees: [],
        lastStatechainUpdateAt: 1640995200000,
        refundEgress: {
          amount: '1000000',
          scheduledAt: 21689748000,
          scheduledBlockIndex: '3614958-1117',
          txRef: '7cc616d54e33a2f7685186994120eb32b6fcbdc2344b4238db5115f6b2cf3277',
          witnessedAt: 21690432000,
          witnessedBlockIndex: '3615072-1060',
        },
        srcAsset: 'BTC',
        srcChain: 'Bitcoin',
        srcChainRequiredBlockConfirmations: 3,
        state: 'FAILED',
        swap: {
          originalInputAmount: '1000000',
          remainingInputAmount: '1000000',
          swappedInputAmount: '0',
          swappedIntermediateAmount: '0',
          swappedOutputAmount: '0',
        },
        fillOrKillParams: {
          minPrice: '5.140026445278486822',
          refundAddress: 'tb1q78pjllxzm7069fj8mw3ud0dvk4d8n2muqs7q2k',
          retryDurationBlocks: 150,
        },
        brokers: [],
      });
    });

    it(`retrieves a swap in ${StateV2.Failed} status (egress ignored)`, async () => {
      await processEvents([
        ...swapEvents.slice(0, 5),
        {
          id: '0000000094-000595-75b12',
          indexInBlock: 595,
          name: 'Swapping.SwapEgressIgnored',
          args: {
            asset: { __kind: 'Flip' },
            amount: '0',
            reason: { value: { error: '0x06000000', index: 32 }, __kind: 'Module' },
            swapRequestId: '368',
          } as SwapEgressIgnoredArgs,
        },
      ]);

      const { body, status } = await request(server).get('/v2/swaps/368');

      expect(status).toBe(200);

      expect(body.state).toBe('FAILED');
      expect(body.swapEgress.failure).toMatchObject({
        failedAt: 564000,
        failedBlockIndex: '94-595',
        mode: 'SWAP_OUTPUT_TOO_SMALL',
        reason: {
          message: 'The amount is below the minimum egress amount.',
          name: 'ethereumIngressEgress.BelowEgressDustLimit',
        },
      });
    });

    it(`retrieves a swap in ${StateV2.Failed} status (refund egress ignored)`, async () => {
      const depositChannelEvent = clone(swapEventMap['Swapping.SwapDepositAddressReady']);
      depositChannelEvent.args.refundParameters = {
        minPrice: '99999999999999999999999999999999999999999999999999999000000000000000000',
        refundAddress: {
          value: '0x541f563237a309b3a61e33bdf07a8930bdba8d99',
          __kind: 'Eth',
        },
        retryDuration: 15,
      };

      await processEvents([
        depositChannelEvent,
        ...swapEvents.slice(1, 4),
        swapEventMap['Swapping.RefundEgressScheduled'],
        swapEventMap['Swapping.RefundEgressIgnored'],
      ]);

      const { body, status } = await request(server).get(`/v2/swaps/${channelId}`);

      expect(status).toBe(200);

      expect(body.state).toBe('FAILED');
      expect(body.refundEgress.failure).toMatchObject({
        failedAt: 624000,
        failedBlockIndex: '104-1',
        mode: 'REFUND_OUTPUT_TOO_SMALL',
        reason: {
          name: 'ethereumIngressEgress.BelowEgressDustLimit',
          message: 'The amount is below the minimum egress amount.',
        },
      });
    });

    it(`returns ${StateV2.Completed} status even when the channel has other failed swaps`, async () => {
      await processEvents(swapEvents.slice(0, 9));
      const req1 = await request(server).get(`/v2/swaps/${channelId}`);
      expect(req1.status).toBe(200);
      expect(req1.body.state).toBe('COMPLETED');
      await prisma.failedSwap.create({
        data: {
          depositAmount: '100000',
          destAddress: '0x1234',
          reason: 'BelowMinimumDeposit',
          destChain: 'Polkadot',
          srcChain: 'Ethereum',
          srcAsset: 'Eth',
          failedAt: new Date(),
          failedBlockIndex: '94-594',
        },
      });
      const req2 = await request(server).get(`/v2/swaps/${channelId}`);
      expect(req2.status).toBe(200);
      expect(req1.body).toStrictEqual(req2.body);
    });

    it(`retrieves a swap from an onChain origin in ${StateV2.Swapping}`, async () => {
      const accountId = 'cFNzKSS48cZ1xQmdub2ykc2LUc5UZS2YjLaZBUvmxoXHjMMVh';

      const requestedEvent = clone(swapEventMap['Swapping.SwapRequested']);
      (requestedEvent.args as any) = {
        ...requestedEvent.args,
        origin: {
          __kind: 'OnChainAccount',
          value: bytesToHex(ss58.decode(accountId).data),
        },
        requestType: {
          __kind: 'Regular',
          outputAction: {
            __kind: 'CreditOnChain',
            accountId: bytesToHex(ss58.decode(accountId).data),
          },
        },
        refundParameters: {
          refundDestination: {
            __kind: 'InternalAccount',
            value: bytesToHex(ss58.decode(accountId).data),
          },
          minPrice: '99999994999',
          retryDuration: 100,
        },
      };

      await processEvents([requestedEvent, swapEventMap['Swapping.SwapScheduled']]);

      const { body, status } = await request(server).get(
        `/v2/swaps/${requestedEvent.args.swapRequestId}`,
      );
      expect(status).toBe(200);
      expect(body.state).toBe('SWAPPING');
      expect(body).toMatchSnapshot();
    });

    it(`retrieves a swap from an onChain origin in ${StateV2.Completed}`, async () => {
      const accountId = 'cFNzKSS48cZ1xQmdub2ykc2LUc5UZS2YjLaZBUvmxoXHjMMVh';

      const requestedEvent = clone(swapEventMap['Swapping.SwapRequested']);
      (requestedEvent.args as any) = {
        ...requestedEvent.args,
        origin: {
          __kind: 'OnChainAccount',
          value: bytesToHex(ss58.decode(accountId).data),
        },
        requestType: {
          __kind: 'Regular',
          outputAction: {
            __kind: 'CreditOnChain',
            accountId: bytesToHex(ss58.decode(accountId).data),
          },
        },
        refundParameters: {
          refundDestination: {
            __kind: 'InternalAccount',
            value: bytesToHex(ss58.decode(accountId).data),
          },
          minPrice: '99999994999',
          retryDuration: 100,
        },
      };

      const executedEvent = clone(swapEventMap['Swapping.SwapExecuted']);
      executedEvent.args = {
        ...executedEvent.args,
        brokerFee: '0',
      };

      await processEvents([
        requestedEvent,
        swapEventMap['Swapping.SwapScheduled'],
        executedEvent,
        swapEventMap['Swapping.SwapRequestCompleted'],
      ]);

      const { body, status } = await request(server).get(
        `/v2/swaps/${requestedEvent.args.swapRequestId}`,
      );

      expect(status).toBe(200);
      const { swapId, ...rest } = body;
      expect(body.state).toBe('COMPLETED');
      expect(rest).toMatchSnapshot();
    });

    it(`retrieves a DCA swap from an onChain origin in ${StateV2.Completed}`, async () => {
      const accountId = '0x640dfbca7473dd212d3c9b9815cd32dcc83b2a9a099c91369110609199b0f374';

      // requested
      const requestedEvent = {
        name: 'Swapping.SwapRequested',
        id: '0000004123-000984-b7c4d',
        blockId: '0000015161-d719c',
        indexInBlock: 21,
        args: {
          origin: {
            value: accountId,
            __kind: 'OnChainAccount',
          },
          brokerFees: [],
          inputAsset: {
            __kind: 'Usdc',
          },
          inputAmount: '5000000000',
          outputAsset: {
            __kind: 'Usdt',
          },
          requestType: {
            __kind: 'Regular',
            outputAction: {
              __kind: 'CreditOnChain',
              accountId,
            },
          },
          dcaParameters: {
            chunkInterval: 2,
            numberOfChunks: 2,
          },
          swapRequestId: '4',
          refundParameters: {
            minPrice: '0',
            retryDuration: 100,
            refundDestination: {
              value: accountId,
              __kind: 'InternalAccount',
            },
          },
        },
      };

      // scheduled 1
      const legOneScheduled = {
        name: 'Swapping.SwapScheduled',
        id: '0000004123-000984-b7c4d',
        blockId: '0000015161-d719c',
        indexInBlock: 22,
        args: {
          swapId: '23',
          swapType: {
            __kind: 'Swap',
          },
          executeAt: 15163,
          inputAmount: '2500000000',
          swapRequestId: '4',
        },
      };
      // executed 1
      const legOneExecuted = {
        name: 'Swapping.SwapExecuted',
        id: '0000004123-000984-b7c4d',
        blockId: '0000015163-e6f80',
        indexInBlock: 22,
        args: {
          swapId: '23',
          brokerFee: '0',
          inputAsset: {
            __kind: 'Usdc',
          },
          networkFee: '2500000',
          inputAmount: '2497500000',
          outputAsset: {
            __kind: 'Usdt',
          },
          outputAmount: '2491227710',
          swapRequestId: '4',
        },
      };

      // scheduled 2
      const legTwoScheduled = {
        ...legOneScheduled,
        id: '0000004123-000984-b7c4d',
        args: {
          ...legOneScheduled.args,
          swapId: '24',
          executeAt: 15165,
        },
      };

      // executed 2
      const legTwoExecuted = {
        ...legOneExecuted,
        id: '0000004123-000984-b7c4d',
        args: {
          ...legOneExecuted.args,
          swapId: '24',
          outputAmount: '2478844890',
        },
      };

      // credited on chain
      const creditedOnChainEvent = {
        name: 'Swapping.CreditedOnChain',
        id: '0000004123-001234-ab9d3',
        blockId: '0000015165-942fa',
        indexInBlock: 23,
        args: {
          asset: {
            __kind: 'Usdt',
          },
          amount: '4970072600',
          accountId,
          swapRequestId: '4',
        },
      };

      // completed
      const completedEvent = {
        name: 'Swapping.SwapRequestCompleted',
        id: '0000004123-001234-ab9d3',
        blockId: '0000015165-942fa',
        indexInBlock: 25,
        args: {
          swapRequestId: '4',
        },
      };
      await processEvents(
        [
          requestedEvent,
          legOneScheduled,
          legOneExecuted,
          legTwoScheduled,
          legTwoExecuted,
          creditedOnChainEvent,
          completedEvent,
        ],
        [],
        '190',
      );

      const { body, status } = await request(server).get(
        `/v2/swaps/${requestedEvent.args.swapRequestId}`,
      );

      expect(status).toBe(200);
      const { swapId, ...rest } = body;
      expect(body.state).toBe('COMPLETED');
      expect(rest).toMatchSnapshot();
    });

    it(`retrieves a swap from an onChain origin ${StateV2.Failed}`, async () => {
      // refunded on chain
      const accountId = 'cFNzKSS48cZ1xQmdub2ykc2LUc5UZS2YjLaZBUvmxoXHjMMVh';

      const requestedEvent = clone(swapEventMap['Swapping.SwapRequested']);
      (requestedEvent.args as any) = {
        ...requestedEvent.args,
        origin: {
          __kind: 'OnChainAccount',
          value: bytesToHex(ss58.decode(accountId).data),
        },
        requestType: {
          __kind: 'Regular',
          outputAction: {
            __kind: 'CreditOnChain',
            accountId: bytesToHex(ss58.decode(accountId).data),
          },
        },
        refundParameters: {
          refundDestination: {
            __kind: 'InternalAccount',
            value: bytesToHex(ss58.decode(accountId).data),
          },
          minPrice: '99999994999',
          retryDuration: 100,
        },
      };

      const refundedOnChain = {
        id: requestedEvent.id,
        indexInBlock: requestedEvent.indexInBlock,
        callId: requestedEvent.callId,
        name: 'Swapping.RefundedOnChain',
        args: {
          asset: { __kind: 'Eth' },
          amount: '99798295526091993961',
          accountId: bytesToHex(ss58.decode(accountId).data),
          swapRequestId: requestedEvent.args.swapRequestId,
        },
      };

      await processEvents([
        requestedEvent,
        swapEventMap['Swapping.SwapScheduled'],
        refundedOnChain,
      ]);

      const { body, status } = await request(server).get(
        `/v2/swaps/${requestedEvent.args.swapRequestId}`,
      );

      expect(status).toBe(200);
      expect(body.state).toBe('FAILED');
      expect(body).toMatchSnapshot();
    });

    it('retrieves a swap from a vault origin', async () => {
      const txHash = '0xb2dcb9ce8d50f0ab869995fee8482bcf304ffcfe5681ca748f90e34c0ad7b241';

      const requestedEvent = clone(swapEventMap['Swapping.SwapRequested']);
      (requestedEvent.args as SwapRequestedArgs190) = {
        ...requestedEvent.args,
        origin: {
          __kind: 'Vault',
          txId: {
            value: txHash,
            __kind: 'Evm',
          },
          brokerId: '0x9059e6d854b769a505d01148af212bf8cb7f8469a7153edce8dcaedd9d299125',
        } as any,
        brokerFees: [
          {
            bps: 10,
            account: '0x9e8d88ae895c9b37b2dead9757a3452f7c2299704d91ddfa444d87723f94fe0c',
          },
        ],
      } as SwapRequestedArgs190;

      await processEvents([
        requestedEvent,
        swapEventMap['Swapping.SwapScheduled'],
        swapEventMap['Swapping.SwapExecuted'],
      ]);

      const { body, status } = await request(server).get(`/v2/swaps/${txHash}`);
      expect(status).toBe(200);
      const { swapId, ...rest } = body;

      expect(rest).toMatchSnapshot();
    });

    it(`retrieves a swap from a vault origin in ${StateV2.Completed}`, async () => {
      const txHash = '0xb2dcb9ce8d50f0ab869995fee8482bcf304ffcfe5681ca748f90e34c0ad7b241';

      const requestedEvent = clone(swapEventMap['Swapping.SwapRequested']);

      (requestedEvent.args.origin as any) = {
        __kind: 'Vault',
        txId: {
          __kind: 'Evm',
          value: txHash,
        },
      } as Extract<SwapRequestedArgs190['origin'], { __kind: 'Vault' }>;

      await processEvents([
        requestedEvent,
        swapEventMap['Swapping.SwapScheduled'],
        swapEventMap['Swapping.SwapExecuted'],
        ...swapEvents.slice(5, 9),
      ]);

      const { body, status } = await request(server).get(`/v2/swaps/${txHash}`);
      expect(status).toBe(200);
      const { swapId, ...rest } = body;

      expect(rest).toMatchSnapshot();
    });

    it('retrieves a swap from a native swap id', async () => {
      await processEvents(swapEvents.slice(0, 4));

      const { body, status } = await request(server).get(`/v2/swaps/${swapRequestId}`);
      expect(status).toBe(200);
      const { swapId, ...rest } = body;

      expect(rest).toMatchSnapshot();
    });

    it('retrieves a swap from a solana case-insensitive tx ref', async () => {
      const solanaTxRef =
        'qRPnr195EppRTtmjiTUu94VDANaY2UtveuyBeyR5hMTjbqzDAtdNv8N4miayUNhkbQdgzn8TfYhEXHJ8xHjkHYp';

      await processEvents(swapEvents.slice(0, 4));
      await prisma.swapRequest.update({
        where: { nativeId: Number(swapRequestId) },
        data: {
          depositTransactionRef: solanaTxRef,
        },
      });

      const { body, status } = await request(server).get(`/v2/swaps/${solanaTxRef}`);
      expect(status).toBe(200);
      const { swapId, ...rest } = body;

      expect(rest).toMatchSnapshot();
    });

    it('works in maintenance mode', async () => {
      env.MAINTENANCE_MODE = true;

      await processEvents(swapEvents.slice(0, 1));

      const { status } = await request(server).get(`/v2/swaps/${channelId}`);

      expect(status).toBe(200);
    });

    it('retrieves a channel with affiliates', async () => {
      const depositChannelEvent = clone(swapEventMap['Swapping.SwapDepositAddressReady']);
      depositChannelEvent.args.brokerId =
        '0x9059e6d854b769a505d01148af212bf8cb7f8469a7153edce8dcaedd9d299125';
      depositChannelEvent.args.brokerCommissionRate = 15;
      (depositChannelEvent.args.affiliateFees as any) = [
        {
          account: ss58.toPublicKey('cFM8kRvLBXagj6ZXvrt7wCM4jGmHvb5842jTtXXg3mRHjrvKy'),
          bps: 100,
        },
        {
          account: ss58.toPublicKey('cFJvHp55aSUWL88R7N5G4StdsWcCv3d3rfDx8pgAkZdG4ew7e'),
          bps: 150,
        },
      ];

      await processEvents([depositChannelEvent]);

      const { status, body } = await request(server).get(`/v2/swaps/${channelId}`);

      expect(status).toBe(200);

      expect(body.brokers).toStrictEqual([
        {
          account: 'cFM8kRvLBXagj6ZXvrt7wCM4jGmHvb5842jTtXXg3mRHjrvKy',
          commissionBps: 15,
        },
        {
          account: 'cFM8kRvLBXagj6ZXvrt7wCM4jGmHvb5842jTtXXg3mRHjrvKy',
          commissionBps: 100,
        },
        {
          account: 'cFJvHp55aSUWL88R7N5G4StdsWcCv3d3rfDx8pgAkZdG4ew7e',
          commissionBps: 150,
        },
      ]);
      expect(body.depositChannel.affiliateBrokers).toStrictEqual([
        {
          account: 'cFM8kRvLBXagj6ZXvrt7wCM4jGmHvb5842jTtXXg3mRHjrvKy',
          commissionBps: 100,
        },
        {
          account: 'cFJvHp55aSUWL88R7N5G4StdsWcCv3d3rfDx8pgAkZdG4ew7e',
          commissionBps: 150,
        },
      ]);
    });

    it('retrieves boost details when channel swap was boosted', async () => {
      const depositChannelEvent = clone(swapEventMap['Swapping.SwapDepositAddressReady']);
      depositChannelEvent.args.boostFee = 30;
      await processEvents([
        depositChannelEvent,
        ...swapEvents.slice(1, 3),
        swapEventMap['EthereumIngressEgress.DepositBoosted'],
      ]);

      const { status, body } = await request(server).get(`/v2/swaps/${swapRequestId}`);

      expect(status).toBe(200);
      expect(body.state).toBe('SWAPPING');
      expect(body.deposit).toMatchObject({
        amount: '4999949999999650000',
        witnessedAt: 552000,
        witnessedBlockIndex: '92-400',
      });
      expect(body.boost).toMatchObject({
        effectiveBoostFeeBps: 5,
        maxBoostFeeBps: 7,
        boostedAt: 552000,
        boostedBlockIndex: '92-400',
      });
    });

    it('retrieves boost details when vault swap was boosted', async () => {
      const txHash = '0xb2dcb9ce8d50f0ab869995fee8482bcf304ffcfe5681ca748f90e34c0ad7b241';

      const requestedEvent = clone(swapEventMap['Swapping.SwapRequested']);
      (requestedEvent.args.origin as any) = {
        __kind: 'Vault',
        txId: {
          __kind: 'Bitcoin',
          value: txHash,
        },
      } as Extract<SwapRequestedArgs190['origin'], { __kind: 'Vault' }>;

      await processEvents([
        requestedEvent,
        swapEventMap['Swapping.SwapScheduled'],
        swapEventMap['EthereumIngressEgress.DepositBoosted'],
      ]);

      const { status, body } = await request(server).get(`/v2/swaps/${txHash}`);

      expect(status).toBe(200);
      expect(body.state).toBe('SWAPPING');
      expect(body.deposit).toMatchObject({
        amount: '4999949999999650000',
        witnessedAt: 552000,
        witnessedBlockIndex: '92-400',
      });
      expect(body.boost).toMatchObject({
        effectiveBoostFeeBps: 5,
        maxBoostFeeBps: 7,
        boostedAt: 552000,
        boostedBlockIndex: '92-400',
      });
    });

    it('does not retrieve boost details when a channel is not boostable', async () => {
      await processEvents(swapEvents.slice(0, 9));

      const { status, body } = await request(server).get(`/v2/swaps/${channelId}`);

      expect(status).toBe(200);
      expect(body.state).toBe('COMPLETED');
      expect(body.boost).toBe(undefined);
    });

    it('retrieves boost skipped properties when there was a failed boost attempt for the swap', async () => {
      const depositChannelEvent = clone(swapEventMap['Swapping.SwapDepositAddressReady']);
      depositChannelEvent.args.boostFee = 30;

      const finalizedEvent = clone(swapEventMap['EthereumIngressEgress.DepositFinalised']);
      finalizedEvent.args.maxBoostFeeBps = 30;

      await processEvents([
        depositChannelEvent,
        swapEventMap['EthereumIngressEgress.InsufficientBoostLiquidity'],
        ...swapEvents.slice(1, 3),
        finalizedEvent,
      ]);

      const { status, body } = await request(server).get(`/v2/swaps/${channelId}`);

      expect(status).toBe(200);
      expect(body.boost.effectiveBoostFeeBps).toBeUndefined();
      expect(body.boost.maxBoostFeeBps).toBe(30);
      expect(body.boost.skippedAt.valueOf()).toBe(RECEIVED_TIMESTAMP);
      expect(body.boost.skippedBlockIndex).toBe(RECEIVED_BLOCK_INDEX);
    });

    it(`retrieves a swap with FillOrKillParams in ${StateV2.Waiting} status`, async () => {
      const depositChannelEvent = clone(swapEventMap['Swapping.SwapDepositAddressReady']);
      depositChannelEvent.args.refundParameters = {
        minPrice: '99999999999999999999999999999999999999999999999999999000000000000000000',
        refundAddress: {
          value: '0x541f563237a309b3a61e33bdf07a8930bdba8d99',
          __kind: 'Eth',
        },
        retryDuration: 15,
      };

      await processEvents([depositChannelEvent]);

      const { body, status } = await request(server).get(`/v2/swaps/${channelId}`);

      expect(status).toBe(200);
      expect(body.fillOrKillParams).toMatchObject({
        minPrice: '29387358770557187699218413430556141945466.638919302188',
        refundAddress: '0x541f563237a309b3a61e33bdf07a8930bdba8d99',
        retryDurationBlocks: 15,
      });
      expect(body.depositChannel.fillOrKillParams).toMatchObject({
        minPrice: '29387358770557187699218413430556141945466.638919302188',
        refundAddress: '0x541f563237a309b3a61e33bdf07a8930bdba8d99',
        retryDurationBlocks: 15,
      });
      expect(body.state).toBe('WAITING');
    });

    it(`retrieves a swap with FillOrKillParams in ${StateV2.Failed} when refund aborted`, async () => {
      const depositChannelEvent = clone(swapEventMap['Swapping.SwapDepositAddressReady']);
      depositChannelEvent.args.refundParameters = {
        minPrice: '99999999999999999999999999999999999999999999999999999000000000000000000',
        refundAddress: {
          value: '0x541f563237a309b3a61e33bdf07a8930bdba8d99',
          __kind: 'Eth',
        },
        retryDuration: 15,
      };
      await processEvents([
        depositChannelEvent,
        ...swapEvents.slice(1, 4),
        swapEventMap['Swapping.RefundEgressScheduled'],
        swapEventMap['EthereumIngressEgress.BatchBroadcastRequested'],
        swapEventMap['EthereumBroadcaster.BroadcastAborted'],
      ]);

      const { body, status } = await request(server).get(`/v2/swaps/${channelId}`);

      expect(status).toBe(200);
      expect(body.state).toBe('FAILED');
      expect(body.fillOrKillParams).toMatchObject({
        minPrice: expect.any(String),
        refundAddress: expect.any(String),
        retryDurationBlocks: expect.any(Number),
      });
      expect(body.depositChannel.fillOrKillParams).toMatchObject({
        minPrice: expect.any(String),
        refundAddress: expect.any(String),
        retryDurationBlocks: expect.any(Number),
      });
      expect(body.refundEgress).toMatchObject({
        amount: '999844999999160000',
        scheduledAt: 564000,
        scheduledBlockIndex: '94-594',
        failure: expect.any(Object),
      });
    });

    it(`retrieves a swap with FillOrKillParams in ${StateV2.Completed}`, async () => {
      const depositChannelEvent = clone(swapEventMap['Swapping.SwapDepositAddressReady']);
      depositChannelEvent.args.refundParameters = {
        minPrice: '99999999999999999999999999999999999999999999999999999000000000000000000',
        refundAddress: {
          value: '0x541f563237a309b3a61e33bdf07a8930bdba8d99',
          __kind: 'Eth',
        },
        retryDuration: 15,
      };
      await processEvents([
        depositChannelEvent,
        ...swapEvents.slice(1, 4),
        swapEventMap['Swapping.RefundEgressScheduled'],
        swapEventMap['EthereumIngressEgress.BatchBroadcastRequested'],
        swapEventMap['EthereumBroadcaster.BroadcastSuccess'],
      ]);

      const { body, status } = await request(server).get(`/v2/swaps/${channelId}`);

      expect(status).toBe(200);
      expect(body).toMatchSnapshot();
    });

    it(`retrieves a swap with DcaParams in ${StateV2.Waiting} status`, async () => {
      const depositChannelEvent = clone(swapEventMap['Swapping.SwapDepositAddressReady']);
      depositChannelEvent.args.dcaParameters = {
        numberOfChunks: 10,
        chunkInterval: 3,
      };

      await processEvents([depositChannelEvent]);

      const { body, status } = await request(server).get(`/v2/swaps/${channelId}`);

      expect(status).toBe(200);

      expect(body.depositChannel.dcaParams).toMatchObject({
        numberOfChunks: 10,
        chunkIntervalBlocks: 3,
      });
      expect(body.state).toBe('WAITING');
    });

    it(`retrieves multiple DCA swaps in ${StateV2.Swapping} status`, async () => {
      const depositChannelEvent = clone(swapEventMap['Swapping.SwapDepositAddressReady']);
      depositChannelEvent.args.dcaParameters = {
        numberOfChunks: 10,
        chunkInterval: 3,
      };
      const requestedEvent = clone(swapEventMap['Swapping.SwapRequested']);
      const finalizedEvent = clone(swapEventMap['EthereumIngressEgress.DepositFinalised']);
      const scheduledEvent = clone(swapEventMap['Swapping.SwapScheduled']);
      const executedEvent = clone(swapEventMap['Swapping.SwapExecuted']);

      const doubleInput = BigInt(scheduledEvent.args.inputAmount) * 2n;
      requestedEvent.args.inputAmount = doubleInput.toString();
      finalizedEvent.args.amount = (
        doubleInput +
        BigInt(finalizedEvent.args.ingressFee) * 2n
      ).toString();

      await processEvents([
        depositChannelEvent,
        requestedEvent,
        swapEvents[2],
        finalizedEvent,
        ...swapEvents.slice(4, 5),
        incrementId(scheduledEvent),
        incrementId(executedEvent),
      ]);

      const { body, status } = await request(server).get(`/v2/swaps/${channelId}`);
      expect(status).toBe(200);
      expect(body).toMatchInlineSnapshot(`
        {
          "brokers": [],
          "dcaParams": {
            "chunkIntervalBlocks": 3,
            "numberOfChunks": 10,
          },
          "deposit": {
            "amount": "10000000000000000000",
            "witnessedAt": 552000,
            "witnessedBlockIndex": "92-400",
          },
          "depositChannel": {
            "affiliateBrokers": [],
            "brokerCommissionBps": 0,
            "createdAt": 516000,
            "dcaParams": {
              "chunkIntervalBlocks": 3,
              "numberOfChunks": 10,
            },
            "depositAddress": "0x6aa69332b63bb5b1d7ca5355387edd5624e181f2",
            "estimatedExpiryTime": 1640998260000,
            "fillOrKillParams": {
              "minPrice": "0",
              "refundAddress": "0x2afba9278e30ccf6a6ceb3a8b6e336b70068f045c666f2e7f4f9cc5f47db8972",
              "retryDurationBlocks": 100,
            },
            "id": "86-Ethereum-85",
            "isExpired": false,
            "openedThroughBackend": false,
            "srcChainExpiryBlock": "265",
          },
          "destAddress": "1yMmfLti1k3huRQM2c47WugwonQMqTvQ2GUFxnU7Pcs7xPo",
          "destAsset": "DOT",
          "destChain": "Polkadot",
          "estimatedDurationSeconds": 138,
          "estimatedDurationsSeconds": {
            "deposit": 30,
            "egress": 96,
            "swap": 12,
          },
          "fees": [
            {
              "amount": "9112484",
              "asset": "USDC",
              "chain": "Ethereum",
              "type": "NETWORK",
            },
            {
              "amount": "9999899999999300",
              "asset": "ETH",
              "chain": "Ethereum",
              "type": "LIQUIDITY",
            },
            {
              "amount": "9012338",
              "asset": "USDC",
              "chain": "Ethereum",
              "type": "LIQUIDITY",
            },
            {
              "amount": "91033720",
              "asset": "USDC",
              "chain": "Ethereum",
              "type": "BROKER",
            },
            {
              "amount": "50000000350000",
              "asset": "ETH",
              "chain": "Ethereum",
              "type": "INGRESS",
            },
          ],
          "fillOrKillParams": {
            "minPrice": "0",
            "refundAddress": "0x2afba9278e30ccf6a6ceb3a8b6e336b70068f045c666f2e7f4f9cc5f47db8972",
            "retryDurationBlocks": 100,
          },
          "lastStatechainUpdateAt": 1640995200000,
          "srcAsset": "ETH",
          "srcChain": "Ethereum",
          "srcChainRequiredBlockConfirmations": 2,
          "state": "SWAPPING",
          "swap": {
            "dca": {
              "currentChunk": null,
              "executedChunks": 2,
              "lastExecutedChunk": {
                "executedAt": 564000,
                "executedBlockIndex": "94-594",
                "inputAmount": "4999949999999650000",
                "intermediateAmount": "4506169140",
                "outputAmount": "4192904666034",
                "retryCount": 0,
                "scheduledAt": 552000,
                "scheduledBlockIndex": "92-399",
              },
              "remainingChunks": 8,
            },
            "originalInputAmount": "9999899999999300000",
            "remainingInputAmount": "0",
            "swappedInputAmount": "9999899999999300000",
            "swappedIntermediateAmount": "9012338280",
            "swappedOutputAmount": "8385809332068",
          },
          "swapId": "368",
        }
      `);
    });

    it(`retrieves multiple DCA swaps in ${StateV2.Sending} status`, async () => {
      const depositChannelEvent = clone(swapEventMap['Swapping.SwapDepositAddressReady']);
      depositChannelEvent.args.dcaParameters = {
        numberOfChunks: 10,
        chunkInterval: 3,
      };
      const requestedEvent = clone(swapEventMap['Swapping.SwapRequested']);
      const finalizedEvent = clone(swapEventMap['EthereumIngressEgress.DepositFinalised']);
      const scheduledEvent = clone(swapEventMap['Swapping.SwapScheduled']);
      const executedEvent = clone(swapEventMap['Swapping.SwapExecuted']);

      const doubleInput = BigInt(scheduledEvent.args.inputAmount) * 2n;
      requestedEvent.args.inputAmount = doubleInput.toString();
      finalizedEvent.args.amount = (
        doubleInput +
        BigInt(finalizedEvent.args.ingressFee) * 2n
      ).toString();

      await processEvents([
        depositChannelEvent,
        requestedEvent,
        swapEvents[2],
        finalizedEvent,
        ...swapEvents.slice(4, 5),
        incrementId(scheduledEvent),
        incrementId(executedEvent),
        ...swapEvents.slice(5, 8),
      ]);

      const { body, status } = await request(server).get(`/v2/swaps/${channelId}`);
      const { swapId, ...rest } = body;
      expect(status).toBe(200);
      expect(rest).toMatchInlineSnapshot(`
        {
          "brokers": [],
          "dcaParams": {
            "chunkIntervalBlocks": 3,
            "numberOfChunks": 10,
          },
          "deposit": {
            "amount": "10000000000000000000",
            "witnessedAt": 552000,
            "witnessedBlockIndex": "92-400",
          },
          "depositChannel": {
            "affiliateBrokers": [],
            "brokerCommissionBps": 0,
            "createdAt": 516000,
            "dcaParams": {
              "chunkIntervalBlocks": 3,
              "numberOfChunks": 10,
            },
            "depositAddress": "0x6aa69332b63bb5b1d7ca5355387edd5624e181f2",
            "estimatedExpiryTime": 1640998260000,
            "fillOrKillParams": {
              "minPrice": "0",
              "refundAddress": "0x2afba9278e30ccf6a6ceb3a8b6e336b70068f045c666f2e7f4f9cc5f47db8972",
              "retryDurationBlocks": 100,
            },
            "id": "86-Ethereum-85",
            "isExpired": false,
            "openedThroughBackend": false,
            "srcChainExpiryBlock": "265",
          },
          "destAddress": "1yMmfLti1k3huRQM2c47WugwonQMqTvQ2GUFxnU7Pcs7xPo",
          "destAsset": "DOT",
          "destChain": "Polkadot",
          "estimatedDurationSeconds": 138,
          "estimatedDurationsSeconds": {
            "deposit": 30,
            "egress": 96,
            "swap": 12,
          },
          "fees": [
            {
              "amount": "9112484",
              "asset": "USDC",
              "chain": "Ethereum",
              "type": "NETWORK",
            },
            {
              "amount": "9999899999999300",
              "asset": "ETH",
              "chain": "Ethereum",
              "type": "LIQUIDITY",
            },
            {
              "amount": "9012338",
              "asset": "USDC",
              "chain": "Ethereum",
              "type": "LIQUIDITY",
            },
            {
              "amount": "91033720",
              "asset": "USDC",
              "chain": "Ethereum",
              "type": "BROKER",
            },
            {
              "amount": "50000000350000",
              "asset": "ETH",
              "chain": "Ethereum",
              "type": "INGRESS",
            },
            {
              "amount": "197450000",
              "asset": "DOT",
              "chain": "Polkadot",
              "type": "EGRESS",
            },
          ],
          "fillOrKillParams": {
            "minPrice": "0",
            "refundAddress": "0x2afba9278e30ccf6a6ceb3a8b6e336b70068f045c666f2e7f4f9cc5f47db8972",
            "retryDurationBlocks": 100,
          },
          "lastStatechainUpdateAt": 1640995200000,
          "srcAsset": "ETH",
          "srcChain": "Ethereum",
          "srcChainRequiredBlockConfirmations": 2,
          "state": "SENDING",
          "swap": {
            "dca": {
              "currentChunk": null,
              "executedChunks": 2,
              "lastExecutedChunk": {
                "executedAt": 564000,
                "executedBlockIndex": "94-594",
                "inputAmount": "4999949999999650000",
                "intermediateAmount": "4506169140",
                "outputAmount": "4192904666034",
                "retryCount": 0,
                "scheduledAt": 552000,
                "scheduledBlockIndex": "92-399",
              },
              "remainingChunks": 8,
            },
            "originalInputAmount": "9999899999999300000",
            "remainingInputAmount": "0",
            "swappedInputAmount": "9999899999999300000",
            "swappedIntermediateAmount": "9012338280",
            "swappedOutputAmount": "8385809332068",
          },
          "swapEgress": {
            "amount": "4192707216034",
            "scheduledAt": 564000,
            "scheduledBlockIndex": "94-595",
          },
        }
      `);
    });

    it(`retrieves multiple DCA swaps in ${StateV2.Completed}`, async () => {
      const depositChannelEvent = clone(swapEventMap['Swapping.SwapDepositAddressReady']);
      depositChannelEvent.args.dcaParameters = {
        numberOfChunks: 10,
        chunkInterval: 3,
      };
      const requestedEvent = clone(swapEventMap['Swapping.SwapRequested']);
      const finalizedEvent = clone(swapEventMap['EthereumIngressEgress.DepositFinalised']);
      const scheduledEvent = clone(swapEventMap['Swapping.SwapScheduled']);
      const executedEvent = clone(swapEventMap['Swapping.SwapExecuted']);

      const doubleInput = BigInt(scheduledEvent.args.inputAmount) * 2n;
      requestedEvent.args.inputAmount = doubleInput.toString();
      finalizedEvent.args.amount = (
        doubleInput +
        BigInt(finalizedEvent.args.ingressFee) * 2n
      ).toString();

      await processEvents([
        depositChannelEvent,
        requestedEvent,
        swapEvents[2],
        finalizedEvent,
        ...swapEvents.slice(4, 5),
        incrementId(scheduledEvent),
        incrementId(executedEvent),
        ...swapEvents.slice(5, 9),
      ]);

      const { body, status } = await request(server).get(`/v2/swaps/${channelId}`);
      const { swapId, ...rest } = body;
      expect(status).toBe(200);
      expect(rest).toMatchInlineSnapshot(`
        {
          "brokers": [],
          "dcaParams": {
            "chunkIntervalBlocks": 3,
            "numberOfChunks": 10,
          },
          "deposit": {
            "amount": "10000000000000000000",
            "witnessedAt": 552000,
            "witnessedBlockIndex": "92-400",
          },
          "depositChannel": {
            "affiliateBrokers": [],
            "brokerCommissionBps": 0,
            "createdAt": 516000,
            "dcaParams": {
              "chunkIntervalBlocks": 3,
              "numberOfChunks": 10,
            },
            "depositAddress": "0x6aa69332b63bb5b1d7ca5355387edd5624e181f2",
            "estimatedExpiryTime": 1640998260000,
            "fillOrKillParams": {
              "minPrice": "0",
              "refundAddress": "0x2afba9278e30ccf6a6ceb3a8b6e336b70068f045c666f2e7f4f9cc5f47db8972",
              "retryDurationBlocks": 100,
            },
            "id": "86-Ethereum-85",
            "isExpired": false,
            "openedThroughBackend": false,
            "srcChainExpiryBlock": "265",
          },
          "destAddress": "1yMmfLti1k3huRQM2c47WugwonQMqTvQ2GUFxnU7Pcs7xPo",
          "destAsset": "DOT",
          "destChain": "Polkadot",
          "estimatedDurationSeconds": 138,
          "estimatedDurationsSeconds": {
            "deposit": 30,
            "egress": 96,
            "swap": 12,
          },
          "fees": [
            {
              "amount": "9112484",
              "asset": "USDC",
              "chain": "Ethereum",
              "type": "NETWORK",
            },
            {
              "amount": "9999899999999300",
              "asset": "ETH",
              "chain": "Ethereum",
              "type": "LIQUIDITY",
            },
            {
              "amount": "9012338",
              "asset": "USDC",
              "chain": "Ethereum",
              "type": "LIQUIDITY",
            },
            {
              "amount": "91033720",
              "asset": "USDC",
              "chain": "Ethereum",
              "type": "BROKER",
            },
            {
              "amount": "50000000350000",
              "asset": "ETH",
              "chain": "Ethereum",
              "type": "INGRESS",
            },
            {
              "amount": "197450000",
              "asset": "DOT",
              "chain": "Polkadot",
              "type": "EGRESS",
            },
          ],
          "fillOrKillParams": {
            "minPrice": "0",
            "refundAddress": "0x2afba9278e30ccf6a6ceb3a8b6e336b70068f045c666f2e7f4f9cc5f47db8972",
            "retryDurationBlocks": 100,
          },
          "lastStatechainUpdateAt": 1640995200000,
          "srcAsset": "ETH",
          "srcChain": "Ethereum",
          "srcChainRequiredBlockConfirmations": 2,
          "state": "COMPLETED",
          "swap": {
            "dca": {
              "currentChunk": null,
              "executedChunks": 2,
              "lastExecutedChunk": {
                "executedAt": 564000,
                "executedBlockIndex": "94-594",
                "inputAmount": "4999949999999650000",
                "intermediateAmount": "4506169140",
                "outputAmount": "4192904666034",
                "retryCount": 0,
                "scheduledAt": 552000,
                "scheduledBlockIndex": "92-399",
              },
              "remainingChunks": 8,
            },
            "originalInputAmount": "9999899999999300000",
            "remainingInputAmount": "0",
            "swappedInputAmount": "9999899999999300000",
            "swappedIntermediateAmount": "9012338280",
            "swappedOutputAmount": "8385809332068",
          },
          "swapEgress": {
            "amount": "4192707216034",
            "scheduledAt": 564000,
            "scheduledBlockIndex": "94-595",
            "txRef": "104-2",
            "witnessedAt": 624000,
            "witnessedBlockIndex": "104-7",
          },
        }
      `);
    });

    it(`retrieves multiple DCA swaps in ${StateV2.Failed} status if swap egress fails`, async () => {
      const depositChannelEvent = clone(swapEventMap['Swapping.SwapDepositAddressReady']);
      depositChannelEvent.args.dcaParameters = {
        numberOfChunks: 10,
        chunkInterval: 3,
      };
      const scheduledEvent = clone(swapEventMap['Swapping.SwapScheduled']);
      const executedEvent = clone(swapEventMap['Swapping.SwapExecuted']);

      await processEvents([
        depositChannelEvent,
        ...swapEvents.slice(1, 5),
        incrementId(scheduledEvent),
        incrementId(executedEvent),
        ...swapEvents.slice(5, 8),
        swapEventMap['PolkadotBroadcaster.BroadcastAborted'],
      ]);

      const { body, status } = await request(server).get(`/v2/swaps/${channelId}`);
      const { swapId, ...rest } = body;
      expect(status).toBe(200);
      expect(rest.state).toBe('FAILED');
      expect(rest.swapEgress.failure).toMatchObject({
        failedAt: 624000,
        failedBlockIndex: '104-7',
        mode: 'SENDING_FAILED',
        reason: {
          name: 'BroadcastAborted',
          message: 'The swap broadcast was aborted',
        },
      });
    });

    it(`retrieves multiple DCA swaps in ${StateV2.Failed} status if refund egress fails but swap completes`, async () => {
      const depositChannelEvent = clone(swapEventMap['Swapping.SwapDepositAddressReady']);
      depositChannelEvent.args.refundParameters = {
        minPrice: '99999999999999999999999999999999999999999999999999999000000000000000000',
        refundAddress: {
          value: '0x541f563237a309b3a61e33bdf07a8930bdba8d99',
          __kind: 'Eth',
        },
        retryDuration: 15,
      };
      depositChannelEvent.args.dcaParameters = {
        numberOfChunks: 10,
        chunkInterval: 3,
      };

      const requestedEvent = clone(swapEventMap['Swapping.SwapRequested']);
      const finalizedEvent = clone(swapEventMap['EthereumIngressEgress.DepositFinalised']);
      const scheduledEvent = clone(swapEventMap['Swapping.SwapScheduled']);
      const executedEvent = clone(swapEventMap['Swapping.SwapExecuted']);

      const doubleInput = BigInt(scheduledEvent.args.inputAmount) * 2n;
      requestedEvent.args.inputAmount = doubleInput.toString();
      finalizedEvent.args.amount = (
        doubleInput +
        BigInt(finalizedEvent.args.ingressFee) * 2n
      ).toString();

      await processEvents([
        depositChannelEvent,
        requestedEvent,
        swapEvents[2],
        finalizedEvent,
        ...swapEvents.slice(4, 5),
        incrementId(scheduledEvent),
        incrementId(executedEvent),
        swapEventMap['Swapping.SwapEgressScheduled'],
        swapEventMap['Swapping.RefundEgressScheduled'],
        swapEventMap['PolkadotIngressEgress.BatchBroadcastRequested'],
        swapEventMap['Swapping.RefundEgressIgnored'],
        swapEventMap['PolkadotBroadcaster.BroadcastSuccess'],
      ]);

      const { body, status } = await request(server).get(`/v2/swaps/${channelId}`);
      const { swapId, ...rest } = body;
      expect(status).toBe(200);
      expect(rest).toMatchSnapshot();
    });

    it(`retrieves multiple DCA swaps with correctly flattened fees (two egresses)`, async () => {
      const depositChannelEvent = clone(swapEventMap['Swapping.SwapDepositAddressReady']);
      depositChannelEvent.args.dcaParameters = {
        numberOfChunks: 10,
        chunkInterval: 3,
      };
      const requestedEvent = clone(swapEventMap['Swapping.SwapRequested']);
      const finalizedEvent = clone(swapEventMap['EthereumIngressEgress.DepositFinalised']);
      const scheduledEvent = clone(swapEventMap['Swapping.SwapScheduled']);
      const executedEvent = clone(swapEventMap['Swapping.SwapExecuted']);

      const doubleInput = BigInt(scheduledEvent.args.inputAmount) * 2n;
      requestedEvent.args.inputAmount = doubleInput.toString();
      finalizedEvent.args.amount = (
        doubleInput +
        BigInt(finalizedEvent.args.ingressFee) * 2n
      ).toString();

      await processEvents([
        depositChannelEvent,
        requestedEvent,
        swapEvents[2],
        finalizedEvent,
        ...swapEvents.slice(4, 5),
        incrementId(scheduledEvent),
        incrementId(executedEvent),
        swapEventMap['Swapping.SwapEgressScheduled'],
        swapEventMap['Swapping.RefundEgressScheduled'],
        swapEventMap['PolkadotIngressEgress.BatchBroadcastRequested'],
        swapEventMap['Swapping.RefundEgressIgnored'],
        swapEventMap['PolkadotBroadcaster.BroadcastSuccess'],
      ]);

      const { body } = await request(server).get(`/v2/swaps/${channelId}`);
      const { swapId, ...rest } = body;

      expect(rest.fees.filter((fee: any) => fee.type === 'EGRESS').length).toBe(2);
      expect(rest.fees.filter((fee: any) => fee.type === 'INGRESS').length).toBe(1);
      expect(rest.fees.filter((fee: any) => fee.type === 'NETWORK').length).toBe(1);
      expect(rest.fees.filter((fee: any) => fee.type === 'LIQUIDITY').length).toBe(2);
      expect(rest.fees.filter((fee: any) => fee.type === 'BROKER').length).toBe(1);
    });

    it(`returns ccmParams for swaps initiated via smart contract`, async () => {
      const requestedEvent = {
        id: '0000000092-000398-77afe',
        blockId: '0000000092-77afe',
        indexInBlock: 398,
        extrinsicId: '0000000092-000010-77afe',
        callId: '0000000092-000010-77afe',
        name: 'Swapping.SwapRequested',
        args: {
          origin: {
            txId: {
              value: '0x574cfc9a2173fa110a849d0871752587c710b55a5a3e7a6513a8a6118e4e3b00',
              __kind: 'Evm',
            },
            __kind: 'Vault',
          },
          brokerFees: [],
          inputAsset: {
            __kind: 'ArbEth',
          },
          inputAmount: '20000000000000000',
          outputAsset: {
            __kind: 'ArbUsdc',
          },
          requestType: {
            __kind: 'Regular',
            outputAddress: {
              value: '0x2afba9278e30ccf6a6ceb3a8b6e336b70068f045c666f2e7f4f9cc5f47db8972',
              __kind: 'Arb',
            },
            ccmDepositMetadata: {
              sourceChain: {
                __kind: 'Arbitrum',
              },
              sourceAddress: {
                value: '0x2afba9278e30ccf6a6ceb3a8b6e336b70068f045c666f2e7f4f9cc5f47db8972',
                __kind: 'Arb',
              },
              channelMetadata: {
                message:
                  '0x000000000000000000000000000000000000000000000000000000000000004000000000000000000000000067ff09c184d8e9e7b90c5187ed04cbfbdba741c8000000000000000000000000000000000000000000000000000000000000000c6461676f61746973686572650000000000000000000000000000000000000000',
                gasBudget: '200000000000000',
                ccmAdditionalData: '0x',
              },
            },
          },
          swapRequestId: '368',
        },
      };
      const scheduledEvent = clone(swapEventMap['Swapping.SwapScheduled']);
      const executedEvent = clone(swapEventMap['Swapping.SwapExecuted']);
      executedEvent.args.inputAsset.__kind = 'ArbEth';
      executedEvent.args.outputAsset.__kind = 'ArbUsdc';
      const egressScheduledEvent = clone(swapEventMap['Swapping.SwapEgressScheduled']);
      egressScheduledEvent.args = {
        asset: { __kind: 'ArbUsdc' },
        amount: '150000000',
        egressId: [{ __kind: 'Arbitrum' }, '220'],
        egressFee: '6364636424444258',
        swapRequestId: '368',
      };

      await processEvents([requestedEvent, scheduledEvent, executedEvent, egressScheduledEvent]);

      const { body } = await request(server).get(
        `/v2/swaps/${requestedEvent.args.origin.txId.value}`,
      );

      expect(body.ccmParams).not.toBeUndefined();
      expect(body).toMatchSnapshot();
    });

    it(`doesn't include GAS swaps in response for a single asset ccm swap`, async () => {
      const depositChannelEvent = clone(swapEventMap['Swapping.SwapDepositAddressReady']);
      depositChannelEvent.args.ccmParams = {
        gasBudget: '50000000',
        message: '0xd3adc0de',
      };
      depositChannelEvent.args.destinationAsset.__kind = 'Usdc';
      depositChannelEvent.args.sourceAsset.__kind = 'Usdc';
      const requestedEvent = clone(swapEventMap['Swapping.SwapRequested']);
      requestedEvent.args = {
        ...requestedEvent.args,
        inputAsset: { __kind: 'Usdc' },
        outputAsset: { __kind: 'Usdc' },
        __kind: 'Ccm',
        outputAddress: {
          value: '0x2afba9278e30ccf6a6ceb3a8b6e336b70068f045c666f2e7f4f9cc5f47db8972',
          __kind: 'Eth',
        },
        ccmDepositMetadata: {
          sourceChain: {
            __kind: 'Ethereum',
          },
          sourceAddress: {
            value: '0x2afba9278e30ccf6a6ceb3a8b6e336b70068f045c666f2e7f4f9cc5f47db8972',
            __kind: 'Eth',
          },
          channelMetadata: {
            message:
              '0x000000000000000000000000000000000000000000000000000000000000004000000000000000000000000067ff09c184d8e9e7b90c5187ed04cbfbdba741c8000000000000000000000000000000000000000000000000000000000000000c6461676f61746973686572650000000000000000000000000000000000000000',
            gasBudget: '50000000',
            cfParameters: '0x',
          },
        },
      };
      const finalizedEvent = clone(swapEventMap['EthereumIngressEgress.DepositFinalised']);
      finalizedEvent.args.asset.__kind = 'Usdc';
      const scheduledEvent = clone(swapEventMap['Swapping.SwapScheduled']);
      scheduledEvent.args.swapType.__kind = 'CcmGas';
      const executedEvent = clone(swapEventMap['Swapping.SwapExecuted']);
      executedEvent.args.inputAsset.__kind = 'Usdc';
      executedEvent.args.outputAsset.__kind = 'Usdc';
      const egressScheduledEvent = clone(swapEventMap['Swapping.SwapEgressScheduled']);
      egressScheduledEvent.args = {
        asset: { __kind: 'Usdc' },
        amount: '150000000',
        egressId: [{ __kind: 'Ethereum' }, '220'],
        egressFee: '6364636424444258',
        swapRequestId: requestedEvent.args.swapRequestId,
      };

      await processEvents([
        depositChannelEvent,
        requestedEvent,
        finalizedEvent,
        scheduledEvent,
        executedEvent,
        egressScheduledEvent,
      ]);

      const { body } = await request(server).get(`/v2/swaps/${channelId}`);

      expect(body.swap).toBeUndefined();
      expect(body).toMatchSnapshot();
    });

    it(`returns the correct DCA parameters at different stages of the swap`, async () => {
      const depositChannelEvent = clone(swapEventMap['Swapping.SwapDepositAddressReady']);
      depositChannelEvent.args.dcaParameters = {
        numberOfChunks: 10,
        chunkInterval: 3,
      };
      const requestedEvent = clone(swapEventMap['Swapping.SwapRequested']);
      requestedEvent.args.dcaParameters = {
        numberOfChunks: 2,
        chunkInterval: 3,
      };

      const finalizedEvent = clone(swapEventMap['EthereumIngressEgress.DepositFinalised']);
      const scheduledEvent = clone(swapEventMap['Swapping.SwapScheduled']);
      const executedEvent = clone(swapEventMap['Swapping.SwapExecuted']);

      const doubleInput = BigInt(scheduledEvent.args.inputAmount) * 2n;
      requestedEvent.args.inputAmount = doubleInput.toString();
      finalizedEvent.args.amount = (
        doubleInput +
        BigInt(finalizedEvent.args.ingressFee) * 2n
      ).toString();

      await processEvents([depositChannelEvent]);

      const { body, status } = await request(server).get(`/v2/swaps/${channelId}`);

      expect(status).toBe(200);
      expect(body.depositChannel.dcaParams).toMatchObject({
        numberOfChunks: 10,
        chunkIntervalBlocks: 3,
      });

      await processEvents([
        requestedEvent,
        swapEvents[2],
        finalizedEvent,
        ...swapEvents.slice(4, 5),
        incrementId(scheduledEvent),
        incrementId(executedEvent),
        ...swapEvents.slice(5, 9),
      ]);

      const { body: body2 } = await request(server).get(`/v2/swaps/${channelId}`);

      expect(body2.depositChannel.dcaParams).toMatchObject({
        numberOfChunks: 2,
        chunkIntervalBlocks: 3,
      });
    });

    it(`returns the vault swap details in ${StateV2.Receiving} status`, async () => {
      const txRef = '0x1234';
      env.CHAINFLIP_NETWORK = 'mainnet';
      vi.mocked(getPendingVaultSwap).mockResolvedValue({
        txRef,
        txConfirmations: 1,
        affiliateFees: [
          {
            account: 'cFHtoB6DrnqUVY4DwMHCVCtgCLsiHvv98oGw8k66tazF2ToFv',
            commissionBps: 10,
          },
        ],
        amount: 100n,
        brokerFee: {
          account: 'cFHsUq1uK5opJudRDczhdPVj6LGoVTqYsfj71tbHfKsTAzkJJ',
          commissionBps: 10,
        },
        ccmDepositMetadata: {
          channelMetadata: {
            ccmAdditionalData: '4d4f5245',
            gasBudget: '0x3039',
            message: '48454c4c4f',
          },
        },
        dcaParams: {
          chunkInterval: 100,
          numberOfChunks: 5,
        },
        depositChainBlockHeight: 1,
        destAddress: '0xcfcfcfcfcfcfcfcfcfcfcfcfcfcfcfcfcfcfcfcf',
        srcAsset: 'Eth',
        maxBoostFeeBps: 5,
        destAsset: 'Flip',
        refundParams: {
          minPrice: 0n,
          refundAddress: '0x541f563237a309b3a61e33bdf07a8930bdba8d99',
          retryDuration: 3,
        },
      });
      const { body, status } = await request(server).get(`/v2/swaps/${txRef}`);

      expect(status).toBe(200);
      expect(body.state).toBe('RECEIVING');
      expect(body).toMatchInlineSnapshot(`
        {
          "boost": {
            "maxBoostFeeBps": 5,
          },
          "brokers": [
            {
              "account": "cFHsUq1uK5opJudRDczhdPVj6LGoVTqYsfj71tbHfKsTAzkJJ",
              "commissionBps": 10,
            },
            {
              "account": "cFHtoB6DrnqUVY4DwMHCVCtgCLsiHvv98oGw8k66tazF2ToFv",
              "commissionBps": 10,
            },
          ],
          "ccmParams": {
            "gasBudget": "12345",
            "message": "48454c4c4f",
          },
          "dcaParams": {
            "chunkIntervalBlocks": 100,
            "numberOfChunks": 5,
          },
          "deposit": {
            "amount": "100",
            "txConfirmations": 1,
            "txRef": "0x1234",
          },
          "destAddress": "0xcfcfcfcfcfcfcfcfcfcfcfcfcfcfcfcfcfcfcfcf",
          "destAsset": "FLIP",
          "destChain": "Ethereum",
          "estimatedDurationSeconds": 144,
          "estimatedDurationsSeconds": {
            "deposit": 30,
            "egress": 102,
            "swap": 12,
          },
          "fees": [],
          "fillOrKillParams": {
            "minPrice": "0",
            "refundAddress": "0x541f563237a309b3a61e33bdf07a8930bdba8d99",
            "retryDurationBlocks": 3,
          },
          "lastStatechainUpdateAt": 1640995200000,
          "srcAsset": "ETH",
          "srcChain": "Ethereum",
          "srcChainRequiredBlockConfirmations": 2,
          "state": "RECEIVING",
        }
      `);
    });
  });
});

import * as ss58 from '@chainflip/utils/ss58';
import { Server } from 'http';
import request from 'supertest';
import { environment, mockRpcResponse } from '@/shared/tests/fixtures';
import env from '@/swap/config/env';
import prisma from '../../../client';
import metadata from '../../../event-handlers/__tests__/metadata.json';
import {
  createChainTrackingInfo,
  createPools,
  processEvents,
} from '../../../event-handlers/__tests__/utils';
import { getPendingBroadcast } from '../../../ingress-egress-tracking';
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

jest.mock('@/shared/rpc', () => ({
  ...jest.requireActual('@/shared/rpc'),
  getMetadata: jest.fn().mockResolvedValue(metadata.result),
}));

jest.mock('../../../utils/disallowChannel', () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue(false),
}));

jest.mock('timers/promises', () => ({
  setTimeout: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../../ingress-egress-tracking');

jest.mock('@/shared/broker', () => ({
  requestSwapDepositAddress: jest.fn().mockRejectedValue(Error('unhandled mock')),
}));

mockRpcResponse({ data: environment() });

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
    },
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
      },
      inputAsset: { __kind: 'Eth' },
      inputAmount: '4999949999999650000',
      outputAsset: { __kind: 'Dot' },
      requestType: {
        __kind: 'Regular',
        outputAddress: {
          value: '0x2afba9278e30ccf6a6ceb3a8b6e336b70068f045c666f2e7f4f9cc5f47db8972',
          __kind: 'Dot',
        },
      },
      swapRequestId: '368',
    },
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
      asset: { __kind: 'Eth' },
      action: { __kind: 'Swap', swapRequestId: '368' },
      amounts: [[4, '5000000000000000000']],
      boostFee: '2500000000000000',
      channelId: '85',
      ingressFee: '50000000350000',
      blockHeight: '222',
      depositAddress: '0x6aa69332b63bb5b1d7ca5355387edd5624e181f2',
      depositDetails: {},
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
  'EthereumIngressEgress.DepositIgnored': {
    id: '0000000092-000400-77afe',
    blockId: '0000000092-77afe',
    indexInBlock: 400,
    extrinsicId: '0000000092-000010-77afe',
    callId: '0000000092-000010-77afe',
    name: 'EthereumIngressEgress.DepositIgnored',
    args: {
      asset: { __kind: 'Eth' },
      amount: '1000000',
      reason: { __kind: 'BelowMinimumDeposit' },
      depositAddress: '0x6aa69332b63bb5b1d7ca5355387edd5624e181f2',
      depositDetails: {},
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
  jest.setTimeout(1000);

  beforeEach(async () => {
    await prisma.$queryRaw`TRUNCATE TABLE "SwapDepositChannel", private."DepositChannel", "SwapRequest", "Swap", "Egress", "Broadcast", "FailedSwap", "StateChainError", "IgnoredEgress" CASCADE`;
    await prisma.$queryRaw`TRUNCATE TABLE "ChainTracking" CASCADE`;
    server = app.listen(0);
  });

  afterEach((cb) => {
    server.close(cb);
  });

  describe('GET /v2/swaps/:id', () => {
    let oldEnv: typeof env;

    beforeEach(async () => {
      jest
        .useFakeTimers({ doNotFake: ['nextTick', 'setImmediate'] })
        .setSystemTime(new Date('2022-01-01'));
      await prisma.$queryRaw`TRUNCATE TABLE "Egress", "Broadcast", "Swap", "SwapDepositChannel", "SwapRequest", "Pool", "ChainTracking" CASCADE`;
      await createChainTrackingInfo();
      await createPools();
      oldEnv = { ...env };
    });

    afterEach(() => {
      jest.clearAllTimers();
      Object.assign(env, oldEnv);
    });

    it('throws an error if no swap deposit channel is found', async () => {
      const { body, status } = await request(server).get(`/v2/swaps/1`);

      expect(status).toBe(404);
      expect(body).toEqual({ message: 'resource not found' });
    });

    it(`retrieves a swap in ${StateV2.Receiving} status`, async () => {
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
        estimatedDurationSeconds: 48,
        depositChannel: {
          createdAt: 516000,
          brokerCommissionBps: 0,
          depositAddress: '0x6aa69332b63bb5b1d7ca5355387edd5624e181f2',
          srcChainExpiryBlock: '265',
          estimatedExpiryTime: 1699527060000,
          isExpired: false,
          openedThroughBackend: false,
        },
        deposit: {},
        swap: {},
      });
    });

    it(`retrieves a swap with a broker commission in ${StateV2.Receiving} status`, async () => {
      const depositAddressEvent = clone(swapEventMap['Swapping.SwapDepositAddressReady']);
      depositAddressEvent.args.brokerCommissionRate = 15;
      await processEvents([depositAddressEvent]);

      const { body, status } = await request(server).get(`/v2/swaps/${channelId}`);

      expect(status).toBe(200);
      expect(body).toMatchObject({
        state: 'RECEIVING',
        srcAsset: 'ETH',
        srcChain: 'Ethereum',
        destAsset: 'DOT',
        destChain: 'Polkadot',
        destAddress: '1yMmfLti1k3huRQM2c47WugwonQMqTvQ2GUFxnU7Pcs7xPo',
        estimatedDurationSeconds: 48,
        depositChannel: {
          createdAt: 516000,
          brokerCommissionBps: 15,
          depositAddress: '0x6aa69332b63bb5b1d7ca5355387edd5624e181f2',
          srcChainExpiryBlock: '265',
          estimatedExpiryTime: 1699527060000,
          isExpired: false,
          openedThroughBackend: false,
        },
        deposit: {},
        swap: {},
      });
    });

    it(`retrieves a swap with ccm metadata in ${StateV2.Receiving} status`, async () => {
      const depositAddressEvent = clone(swapEventMap['Swapping.SwapDepositAddressReady']);
      depositAddressEvent.args.channelMetadata = {
        message: '0xdeadbeef',
        gasBudget: '100000',
        cfParameters: '0x8ea88ab41897b921ef36ddd7dfd3e9',
      };
      await processEvents([depositAddressEvent]);

      const { body, status } = await request(server).get(`/v2/swaps/${channelId}`);

      expect(status).toBe(200);

      expect(body).toMatchObject({
        state: 'RECEIVING',
        ccm: {
          gasBudget: '100000',
          message: '0xdeadbeef',
        },
      });
    });

    it(`retrieves a swap in ${StateV2.Receiving} status and the channel is expired`, async () => {
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
        state: 'RECEIVING',
        depositChannel: {
          createdAt: 516000,
          brokerCommissionBps: 0,
          depositAddress: '0x6aa69332b63bb5b1d7ca5355387edd5624e181f2',
          srcChainExpiryBlock: '1',
          estimatedExpiryTime: 1699523892000,
          isExpired: true,
          openedThroughBackend: false,
        },
      });
    });

    it(`retrieves a swap in ${StateV2.Swapping} status`, async () => {
      await processEvents(swapEvents.slice(0, 4));

      const { body, status } = await request(server).get(`/v2/swaps/${channelId}`);

      expect(status).toBe(200);
      const { swapId, ...rest } = body;

      expect(BigInt(swapId)).toEqual(368n);

      expect(rest).toMatchObject({
        state: 'SWAPPING',
        srcAsset: 'ETH',
        srcChain: 'Ethereum',
        destAsset: 'DOT',
        destChain: 'Polkadot',
        destAddress: '1yMmfLti1k3huRQM2c47WugwonQMqTvQ2GUFxnU7Pcs7xPo',
        depositChannel: {
          createdAt: 516000,
          brokerCommissionBps: 0,
          depositAddress: '0x6aa69332b63bb5b1d7ca5355387edd5624e181f2',
          srcChainExpiryBlock: '265',
          estimatedExpiryTime: 1699527060000,
          isExpired: false,
          openedThroughBackend: false,
        },
        estimatedDurationSeconds: 48,
        deposit: {
          amount: '5000000000000000000',
          receivedAt: 552000,
          receivedBlockIndex: '92-400',
        },
        swap: {
          totalOutputAmountSwapped: '0',
          totalChunksExecuted: 0,
          currentChunk: {
            swapInputAmount: '4999949999999650000',
            scheduledAt: 552000,
            scheduledBlockIndex: '92-399',
            retryCount: 0,
            fees: [],
          },
          lastExecutedChunk: null,
          isDca: false,
          fees: [
            {
              amount: '50000000350000',
              asset: 'ETH',
              chain: 'Ethereum',
              type: 'INGRESS',
            },
          ],
        },
      });
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

      expect(rest).toMatchObject({
        state: 'SWAPPING',
        srcAsset: 'ETH',
        srcChain: 'Ethereum',
        destAsset: 'DOT',
        destChain: 'Polkadot',
        destAddress: '1yMmfLti1k3huRQM2c47WugwonQMqTvQ2GUFxnU7Pcs7xPo',
        estimatedDurationSeconds: 48,
        depositChannel: {
          createdAt: 516000,
          brokerCommissionBps: 0,
          depositAddress: '0x6aa69332b63bb5b1d7ca5355387edd5624e181f2',
          srcChainExpiryBlock: '265',
          estimatedExpiryTime: 1699527060000,
          isExpired: false,
          openedThroughBackend: false,
        },
        deposit: {
          amount: '5000000000000000000',
          txRef: '0xa2d5df86c6ec123283eb052c598a0f4b650367a81ad141b9ff3adb0286a86c17',
          receivedAt: 552000,
          receivedBlockIndex: '92-400',
        },
        swap: {
          totalOutputAmountSwapped: '0',
          totalChunksExecuted: 0,
          currentChunk: {
            swapInputAmount: '4999949999999650000',
            scheduledAt: 552000,
            scheduledBlockIndex: '92-399',
            retryCount: 0,
          },
          lastExecutedChunk: null,
          isDca: false,
          fees: [
            {
              amount: '50000000350000',
              asset: 'ETH',
              chain: 'Ethereum',
              type: 'INGRESS',
            },
          ],
        },
      });
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

    it(`retrieves a swap with a refund in ${StateV2.Sending} status`, async () => {
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
      ]);

      const { body, status } = await request(server).get(`/v2/swaps/${channelId}`);

      expect(status).toBe(200);
      const { swapId, ...rest } = body;

      expect(rest).toMatchSnapshot();
    });

    it(`retrieves a swap in ${StateV2.Sent} status`, async () => {
      jest.mocked(getPendingBroadcast).mockResolvedValueOnce({
        tx_ref: '0xdeadbeef',
      });

      await processEvents(swapEvents.slice(0, 8));

      const { body, status } = await request(server).get(`/v2/swaps/${channelId}`);

      expect(status).toBe(200);
      const { swapId, ...rest } = body;

      expect(rest).toMatchSnapshot();
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
        failedAtBlockIndex: '104-7',
        mode: 'SENDING_FAILED',
        reason: {
          name: 'BroadcastAborted',
          message: 'The swap broadcast was aborted',
        },
      });
    });

    it(`retrieves a swap in ${StateV2.Failed} status (deposit ignored)`, async () => {
      await processEvents([
        swapEventMap['Swapping.SwapDepositAddressReady'],
        swapEventMap['EthereumIngressEgress.DepositIgnored'],
      ]);

      const { body } = await request(server).get(`/v2/swaps/${channelId}`);

      expect(body.state).toBe('FAILED');
      expect(body.deposit.failure).toMatchObject({
        failedAt: 552000,
        failedAtBlockIndex: '92-400',
        mode: 'DEPOSIT_TOO_SMALL',
        reason: {
          name: 'BelowMinimumDeposit',
          message: 'The deposited amount was below the minimum required',
        },
      });
    });

    it(`retrieves a swap in ${StateV2.Failed} status (egress ignored)`, async () => {
      const txHash = '0x245466cbf3907aee42a64c5589ccd804ec3dcd3c54c28eb2b418c804cf009915';

      await processEvents(
        [
          {
            id: '0002382141-000681-74d0a',
            indexInBlock: 681,
            name: 'Swapping.SwapScheduled',
            args: {
              origin: {
                __kind: 'Vault',
                txHash,
              },
              swapId: '2275',
              swapType: {
                value: { value: '0xa56a6be23b6cf39d9448ff6e897c29c41c8fbdff', __kind: 'Eth' },
                __kind: 'Swap',
              },
              executeAt: 2382143,
              sourceAsset: { __kind: 'Eth' },
              depositAmount: '1',
              destinationAsset: { __kind: 'Flip' },
              destinationAddress: {
                value: '0xa56a6be23b6cf39d9448ff6e897c29c41c8fbdff',
                __kind: 'Eth',
              },
            },
          },
          {
            id: '0002382143-000816-1f1cf',
            indexInBlock: 816,
            name: 'Swapping.SwapExecuted',
            args: {
              swapId: '2275',
              swapType: {
                value: { value: '0xa56a6be23b6cf39d9448ff6e897c29c41c8fbdff', __kind: 'Eth' },
                __kind: 'Swap',
              },
              swapInput: '1',
              swapOutput: '0',
              sourceAsset: { __kind: 'Eth' },
              egressAmount: '0',
              depositAmount: '1',
              destinationAsset: { __kind: 'Flip' },
              intermediateAmount: '0',
            },
          },
          {
            id: '0002382143-000817-1f1cf',
            indexInBlock: 817,
            name: 'Swapping.SwapEgressIgnored',
            args: {
              asset: { __kind: 'Flip' },
              amount: '0',
              reason: { value: { error: '0x06000000', index: 32 }, __kind: 'Module' },
              swapId: '2275',
            },
          },
        ],
        '150',
      );

      const { body, status } = await request(server).get(`/v2/swaps/${txHash}`);

      expect(status).toBe(200);

      expect(body.state).toBe('FAILED');
      expect(body.swapEgress.failure).toMatchObject({
        failedAt: 14292858000,
        failedAtBlockIndex: '2382143-817',
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
        failedAtBlockIndex: '104-1',
        mode: 'REFUND_OUTPUT_TOO_SMALL',
        reason: {
          name: 'ethereumIngressEgress.BelowEgressDustLimit',
          message: 'The amount is below the minimum egress amount.',
        },
      });
    });

    // TODO: reinstate
    // it(`returns ${StateV2.Failed} status even if it has other completed swaps`, async () => {
    //   await processEvents([
    //     ...swapEvents.slice(0, 9),
    //     ...[
    //       ...swapEvents.slice(0, 4),
    //       swapEventMap['Swapping.RefundEgressScheduled'],
    //       swapEventMap['Swapping.RefundEgressIgnored'],
    //     ].map((obj) => incrementId(obj)),
    //   ]);
    //   const { body, status } = await request(server).get(`/v2/swaps/${channelId}`);

    //   expect(status).toBe(200);
    //   const { swapId, ...rest } = body;
    //   expect(rest).toMatchObject({
    //     state: 'FAILED',
    //     swapExecutedAt: 564000,
    //     error: {
    //       message: 'The deposited amount was below the minimum required',
    //       name: 'BelowMinimumDeposit',
    //     },
    //   });
    // });

    it('retrieves a swap from a vault origin', async () => {
      const txHash = '0xb2dcb9ce8d50f0ab869995fee8482bcf304ffcfe5681ca748f90e34c0ad7b241';

      const requestedEvent = clone(swapEventMap['Swapping.SwapRequested']);
      (requestedEvent.args.origin as any) = {
        __kind: 'Vault',
        txHash,
      };

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
        txHash,
      };

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

    it('works in maintenance mode', async () => {
      env.MAINTENANCE_MODE = true;

      await processEvents(swapEvents.slice(0, 1));

      const { status } = await request(server).get(`/v2/swaps/${channelId}`);

      expect(status).toBe(200);
    });

    it('retrieves a channel with affiliates', async () => {
      const depositChannelEvent = clone(swapEventMap['Swapping.SwapDepositAddressReady']);
      (depositChannelEvent.args.affiliateFees as any) = [
        {
          account: ss58.toPublicKey('cFM8kRvLBXagj6ZXvrt7wCM4jGmHvb5842jTtXXg3mRHjrvKy'),
          bps: 100,
        },
      ];

      await processEvents([depositChannelEvent]);

      const { status, body } = await request(server).get(`/v2/swaps/${channelId}`);

      expect(status).toBe(200);

      expect(body.depositChannel.affiliateBrokers).toStrictEqual([
        {
          account: 'cFM8kRvLBXagj6ZXvrt7wCM4jGmHvb5842jTtXXg3mRHjrvKy',
          commissionBps: 100,
        },
      ]);
    });

    it('retrieves boost details when swap was boosted', async () => {
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
      expect(body.boost).toMatchObject({
        effectiveBoostFeeBps: 5,
        maxBoostFeeBps: 30,
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
      await processEvents([
        depositChannelEvent,
        swapEventMap['EthereumIngressEgress.InsufficientBoostLiquidity'],
        ...swapEvents.slice(1, 4),
      ]);

      const { status, body } = await request(server).get(`/v2/swaps/${channelId}`);

      expect(status).toBe(200);
      expect(body.boost.effectiveBoostFeeBps).toBeUndefined();
      expect(body.boost.maxBoostFeeBps).toBe(30);
      expect(body.boost.skippedAt.valueOf()).toBe(RECEIVED_TIMESTAMP);
      expect(body.boost.skippedBlockIndex).toBe(RECEIVED_BLOCK_INDEX);
    });

    it(`retrieves a swap with FillOrKillParams in ${StateV2.Receiving} status`, async () => {
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
      expect(body.depositChannel.fillOrKillParams).toMatchObject({
        minPrice: '29387358770557187699218413430556141945466.638919302188',
        refundAddress: '0x541f563237a309b3a61e33bdf07a8930bdba8d99',
        retryDurationBlocks: 15,
      });
      expect(body.state).toBe('RECEIVING');
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

    it(`retrieves a swap with DcaParams in ${StateV2.Receiving} status`, async () => {
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
      expect(body.state).toBe('RECEIVING');
    });

    it(`retrieves mulitple DCA swaps in ${StateV2.Swapping} status`, async () => {
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
      ]);

      const { body, status } = await request(server).get(`/v2/swaps/${channelId}`);
      const { swapId, ...rest } = body;
      expect(status).toBe(200);
      expect(rest).toMatchObject({
        state: 'SWAPPING',
        srcAsset: 'ETH',
        srcChain: 'Ethereum',
        destAsset: 'DOT',
        destChain: 'Polkadot',
        destAddress: '1yMmfLti1k3huRQM2c47WugwonQMqTvQ2GUFxnU7Pcs7xPo',
        estimatedDurationSeconds: 48,
        depositChannel: {
          createdAt: 516000,
          brokerCommissionBps: 0,
          depositAddress: '0x6aa69332b63bb5b1d7ca5355387edd5624e181f2',
          srcChainExpiryBlock: '265',
          estimatedExpiryTime: 1699527060000,
          isExpired: false,
          openedThroughBackend: false,
          dcaParams: { numberOfChunks: 10, chunkIntervalBlocks: 3 },
        },
        deposit: {
          amount: '5000000000000000000',
          receivedAt: 552000,
          receivedBlockIndex: '92-400',
        },
        swap: {
          totalOutputAmountSwapped: '8385809332068',
          totalChunksExecuted: 2,
          currentChunk: {
            swapInputAmount: '4999949999999650000',
            swapOutputAmount: '4192904666034',
            scheduledAt: 552000,
            scheduledBlockIndex: '92-399',
            executedAt: 564000,
            executedBlockIndex: '94-594',
            retryCount: 0,
            fees: expect.any(Array),
          },
          lastExecutedChunk: {
            swapInputAmount: '4999949999999650000',
            swapOutputAmount: '4192904666034',
            scheduledAt: 552000,
            scheduledBlockIndex: '92-399',
            executedAt: 564000,
            executedBlockIndex: '94-594',
            retryCount: 0,
            fees: expect.any(Array),
          },
          isDca: true,
          fees: expect.any(Array),
        },
      });
    });

    it(`retrieves mulitple DCA swaps in ${StateV2.Sending} status`, async () => {
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
      ]);

      const { body, status } = await request(server).get(`/v2/swaps/${channelId}`);
      const { swapId, ...rest } = body;
      expect(status).toBe(200);
      expect(rest).toMatchObject({
        state: 'SENDING',
        srcAsset: 'ETH',
        srcChain: 'Ethereum',
        destAsset: 'DOT',
        destChain: 'Polkadot',
        destAddress: '1yMmfLti1k3huRQM2c47WugwonQMqTvQ2GUFxnU7Pcs7xPo',
        estimatedDurationSeconds: 48,
        depositChannel: {
          createdAt: 516000,
          brokerCommissionBps: 0,
          depositAddress: '0x6aa69332b63bb5b1d7ca5355387edd5624e181f2',
          srcChainExpiryBlock: '265',
          estimatedExpiryTime: 1699527060000,
          isExpired: false,
          openedThroughBackend: false,
          dcaParams: { numberOfChunks: 10, chunkIntervalBlocks: 3 },
        },
        deposit: {
          amount: '5000000000000000000',
          receivedAt: 552000,
          receivedBlockIndex: '92-400',
        },
        swap: {
          totalOutputAmountSwapped: '8385809332068',
          totalChunksExecuted: 2,
          currentChunk: {
            swapInputAmount: '4999949999999650000',
            swapOutputAmount: '4192904666034',
            scheduledAt: 552000,
            scheduledBlockIndex: '92-399',
            executedAt: 564000,
            executedBlockIndex: '94-594',
            retryCount: 0,
            fees: expect.any(Array),
          },
          lastExecutedChunk: {
            swapInputAmount: '4999949999999650000',
            swapOutputAmount: '4192904666034',
            scheduledAt: 552000,
            scheduledBlockIndex: '92-399',
            executedAt: 564000,
            executedBlockIndex: '94-594',
            retryCount: 0,
            fees: expect.any(Array),
          },
          isDca: true,
          fees: expect.any(Array),
        },
      });
    });

    it(`retrieves mulitple DCA swaps in ${StateV2.Completed}`, async () => {
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
        ...swapEvents.slice(5, 9),
      ]);

      const { body, status } = await request(server).get(`/v2/swaps/${channelId}`);
      const { swapId, ...rest } = body;
      expect(status).toBe(200);
      expect(rest).toMatchObject({
        state: 'COMPLETED',
        srcAsset: 'ETH',
        srcChain: 'Ethereum',
        destAsset: 'DOT',
        destChain: 'Polkadot',
        destAddress: '1yMmfLti1k3huRQM2c47WugwonQMqTvQ2GUFxnU7Pcs7xPo',
        estimatedDurationSeconds: 48,
        depositChannel: {
          createdAt: 516000,
          brokerCommissionBps: 0,
          depositAddress: '0x6aa69332b63bb5b1d7ca5355387edd5624e181f2',
          srcChainExpiryBlock: '265',
          estimatedExpiryTime: 1699527060000,
          isExpired: false,
          openedThroughBackend: false,
          dcaParams: { numberOfChunks: 10, chunkIntervalBlocks: 3 },
        },
        deposit: {
          amount: '5000000000000000000',
          receivedAt: 552000,
          receivedBlockIndex: '92-400',
        },
        swap: {
          totalOutputAmountSwapped: '8385809332068',
          totalChunksExecuted: 2,
          currentChunk: {
            swapInputAmount: '4999949999999650000',
            swapOutputAmount: '4192904666034',
            scheduledAt: 552000,
            scheduledBlockIndex: '92-399',
            executedAt: 564000,
            executedBlockIndex: '94-594',
            retryCount: 0,
            fees: expect.any(Array),
          },
          lastExecutedChunk: {
            swapInputAmount: '4999949999999650000',
            swapOutputAmount: '4192904666034',
            scheduledAt: 552000,
            scheduledBlockIndex: '92-399',
            executedAt: 564000,
            executedBlockIndex: '94-594',
            retryCount: 0,
            fees: expect.any(Array),
          },
          isDca: true,
          fees: expect.any(Array),
        },
      });
    });

    it(`retrieves mulitple DCA swaps in ${StateV2.Failed} status if swap egress fails`, async () => {
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
        failedAtBlockIndex: '104-7',
        mode: 'SENDING_FAILED',
        reason: {
          name: 'BroadcastAborted',
          message: 'The swap broadcast was aborted',
        },
      });
    });

    it(`retrieves mulitple DCA swaps in ${StateV2.Failed} status if refund egress fails but swap completes`, async () => {
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

      await processEvents([
        depositChannelEvent,
        ...swapEvents.slice(1, 5),
        incrementId(clone(swapEventMap['Swapping.SwapScheduled'])),
        incrementId(clone(swapEventMap['Swapping.SwapExecuted'])),
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

    it(`retrieves mulitple DCA swaps with correctly flattened fees (two egresses)`, async () => {
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
        swapEventMap['Swapping.SwapEgressScheduled'],
        swapEventMap['Swapping.RefundEgressScheduled'],
        swapEventMap['PolkadotIngressEgress.BatchBroadcastRequested'],
        swapEventMap['Swapping.RefundEgressIgnored'],
        swapEventMap['PolkadotBroadcaster.BroadcastSuccess'],
      ]);

      const { body } = await request(server).get(`/v2/swaps/${channelId}`);
      const { swapId, ...rest } = body;

      expect(rest.swap.fees.filter((fee: any) => fee.type === 'EGRESS').length).toBe(2);
      expect(rest.swap.fees.filter((fee: any) => fee.type === 'INGRESS').length).toBe(1);
      expect(rest.swap.fees.filter((fee: any) => fee.type === 'NETWORK').length).toBe(1);
      expect(rest.swap.fees.filter((fee: any) => fee.type === 'LIQUIDITY').length).toBe(2);
      expect(rest.swap.fees.filter((fee: any) => fee.type === 'BROKER').length).toBe(1);
    });
  });
});

import { ethereumIngressEgressDepositFailed } from '@chainflip/processor/180/ethereumIngressEgress/depositFailed';
import { reverseBytes } from '@chainflip/utils/bytes';
import * as ss58 from '@chainflip/utils/ss58';
import { Server } from 'http';
import request from 'supertest';
import { describe, it, beforeEach, afterEach, expect, vi, beforeAll } from 'vitest';
import z from 'zod';
import { environment, mockRpcResponse } from '@/shared/tests/fixtures.js';
import prisma from '../../client.js';
import env from '../../config/env.js';
import metadata from '../../event-handlers/__tests__/metadata.json' with { type: 'json' };
import {
  check,
  createChainTrackingInfo,
  createPools,
  processEvents,
} from '../../event-handlers/__tests__/utils.js';
import { DepositBoostedArgsMap } from '../../event-handlers/ingress-egress/depositBoosted.js';
import { DepositFinalisedArgsMap } from '../../event-handlers/ingress-egress/depositFinalised.js';
import { InsufficientBoostLiquidityArgsMap } from '../../event-handlers/ingress-egress/insufficientBoostLiquidity.js';
import { SwapDepositAddressReadyArgs } from '../../event-handlers/swapping/swapDepositAddressReady.js';
import { SwapEgressIgnoredArgs } from '../../event-handlers/swapping/swapEgressIgnored.js';
import { SwapEgressScheduledArgs } from '../../event-handlers/swapping/swapEgressScheduled.js';
import { SwapRequestedArgs190 } from '../../event-handlers/swapping/swapRequested.js';
import { SwapScheduledArgs } from '../../event-handlers/swapping/swapScheduled.js';
import { getPendingBroadcast } from '../../ingress-egress-tracking/index.js';
import app from '../../server.js';
import { State } from '../swap.js';

vi.mock('@/shared/rpc/index.js', async (importOriginal) => {
  const original = (await importOriginal()) as object;
  return {
    ...original,
    getMetadata: vi.fn().mockResolvedValue(metadata.result),
  };
});

vi.mock('../../utils/disallowChannel', () => ({
  default: vi.fn().mockResolvedValue(false),
}));

vi.mock('timers/promises', () => ({
  setTimeout: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../ingress-egress-tracking');

vi.mock('@/shared/broker.js', async (importOriginal) => {
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
    args: check<SwapScheduledArgs>({
      swapId: '423',
      swapType: { __kind: 'Swap' },
      executeAt: 94,
      inputAmount: '4999949999999650000',
      swapRequestId: '368',
    }),
  },
  'EthereumIngressEgress.DepositFinalised': {
    id: '0000000092-000400-77afe',
    blockId: '0000000092-77afe',
    indexInBlock: 400,
    extrinsicId: '0000000092-000010-77afe',
    callId: '0000000092-000010-77afe',
    name: 'EthereumIngressEgress.DepositFinalised',
    args: check<DepositFinalisedArgsMap['Ethereum']>({
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
      maxBoostFeeBps: 0,
    }),
  },
  'EthereumIngressEgress.DepositBoosted': {
    id: '0000000092-000400-77afe',
    blockId: '0000000092-77afe',
    indexInBlock: 400,
    extrinsicId: '0000000092-000010-77afe',
    callId: '0000000092-000010-77afe',
    name: 'EthereumIngressEgress.DepositBoosted',
    args: check<DepositBoostedArgsMap['Ethereum']>({
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
    }),
  },
  'EthereumIngressEgress.InsufficientBoostLiquidity': {
    id: '0000000092-000400-77afe',
    blockId: '0000000092-77afe',
    indexInBlock: 400,
    extrinsicId: '0000000092-000010-77afe',
    callId: '0000000092-000010-77afe',
    name: 'EthereumIngressEgress.InsufficientBoostLiquidity',
    args: check<InsufficientBoostLiquidityArgsMap['Ethereum']>({
      prewitnessedDepositId: '27',
      asset: { __kind: 'Eth' },
      amountAttempted: '5000000000000000000',
      channelId: '85',
      originType: { __kind: 'DepositChannel' },
    }),
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
    args: check<SwapEgressScheduledArgs>({
      asset: { __kind: 'Dot' },
      amount: '4192707216034',
      egressId: [{ __kind: 'Polkadot' }, '19'],
      egressFee: ['197450000', { __kind: 'Dot' }],
      swapRequestId: '368',
    }),
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
    args: check<SwapEgressScheduledArgs>({
      asset: { __kind: 'Eth' },
      amount: '999844999999160000',
      egressId: [{ __kind: 'Ethereum' }, '71'],
      egressFee: ['105000000490000', { __kind: 'Eth' }],
      swapRequestId: '368',
    }),
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
  vi.setConfig({ testTimeout: 1000 });

  beforeAll(() => {
    mockRpcResponse({ data: environment() });
    server = app.listen(0);

    return () => {
      server.close();
    };
  });

  describe('GET /swaps/:id', () => {
    let oldEnv: typeof env;

    beforeEach(async () => {
      const time = new Date('2022-01-01');
      vi.useFakeTimers({ toFake: ['performance'] }).setSystemTime(time);
      await prisma.$queryRaw`TRUNCATE TABLE "SwapDepositChannel", private."DepositChannel", "SwapRequest", "Swap", "Egress", "Broadcast", "FailedSwap", "StateChainError", "IgnoredEgress" , "ChainTracking", "Pool" CASCADE`;
      await createChainTrackingInfo(time);
      await createPools();
      oldEnv = { ...env };
    });

    afterEach(() => {
      vi.clearAllTimers();
      Object.assign(env, oldEnv);
    });

    it('throws an error if no swap deposit channel is found', async () => {
      const { body, status } = await request(server).get(`/swaps/1`);

      expect(status).toBe(404);
      expect(body).toEqual({ message: 'resource not found' });
    });

    it(`retrieves a swap in ${State.AwaitingDeposit} status`, async () => {
      await processEvents(swapEvents.slice(0, 1));

      const { body, status } = await request(server).get(`/swaps/${channelId}`);

      expect(status).toBe(200);
      expect(body).toMatchInlineSnapshot(`
        {
          "depositAddress": "0x6aa69332b63bb5b1d7ca5355387edd5624e181f2",
          "depositChannelBrokerCommissionBps": 0,
          "depositChannelCreatedAt": 516000,
          "depositChannelExpiryBlock": "265",
          "depositChannelMaxBoostFeeBps": 0,
          "depositChannelOpenedThroughBackend": false,
          "destAddress": "1yMmfLti1k3huRQM2c47WugwonQMqTvQ2GUFxnU7Pcs7xPo",
          "destAsset": "DOT",
          "destChain": "Polkadot",
          "estimatedDefaultDurationSeconds": 129,
          "estimatedDepositChannelExpiryTime": 1640998260000,
          "feesPaid": [],
          "fillOrKillParams": {
            "minPrice": "0",
            "refundAddress": "0x2afba9278e30ccf6a6ceb3a8b6e336b70068f045c666f2e7f4f9cc5f47db8972",
            "retryDurationBlocks": 100,
          },
          "isDepositChannelExpired": false,
          "lastStatechainUpdateAt": 1640995200000,
          "srcAsset": "ETH",
          "srcChain": "Ethereum",
          "srcChainRequiredBlockConfirmations": 2,
          "state": "AWAITING_DEPOSIT",
        }
      `);
    });

    it(`retrieves a swap with a broker commission in ${State.AwaitingDeposit} status`, async () => {
      const depositAddressEvent = clone(swapEventMap['Swapping.SwapDepositAddressReady']);
      depositAddressEvent.args.brokerCommissionRate = 15;
      await processEvents([depositAddressEvent]);

      const { body, status } = await request(server).get(`/swaps/${channelId}`);

      expect(status).toBe(200);
      expect(body).toMatchInlineSnapshot(`
        {
          "depositAddress": "0x6aa69332b63bb5b1d7ca5355387edd5624e181f2",
          "depositChannelBrokerCommissionBps": 15,
          "depositChannelCreatedAt": 516000,
          "depositChannelExpiryBlock": "265",
          "depositChannelMaxBoostFeeBps": 0,
          "depositChannelOpenedThroughBackend": false,
          "destAddress": "1yMmfLti1k3huRQM2c47WugwonQMqTvQ2GUFxnU7Pcs7xPo",
          "destAsset": "DOT",
          "destChain": "Polkadot",
          "estimatedDefaultDurationSeconds": 129,
          "estimatedDepositChannelExpiryTime": 1640998260000,
          "feesPaid": [],
          "fillOrKillParams": {
            "minPrice": "0",
            "refundAddress": "0x2afba9278e30ccf6a6ceb3a8b6e336b70068f045c666f2e7f4f9cc5f47db8972",
            "retryDurationBlocks": 100,
          },
          "isDepositChannelExpired": false,
          "lastStatechainUpdateAt": 1640995200000,
          "srcAsset": "ETH",
          "srcChain": "Ethereum",
          "srcChainRequiredBlockConfirmations": 2,
          "state": "AWAITING_DEPOSIT",
        }
      `);
    });

    it(`retrieves a swap with ccm metadata in ${State.AwaitingDeposit} status`, async () => {
      const depositAddressEvent = clone(swapEventMap['Swapping.SwapDepositAddressReady']);
      depositAddressEvent.args.channelMetadata = {
        message: '0xdeadbeef',
        gasBudget: '100000',
        ccmAdditionalData: '0x8ea88ab41897b921ef36ddd7dfd3e9',
      };
      await processEvents([depositAddressEvent]);

      const { body, status } = await request(server).get(`/swaps/${channelId}`);

      expect(status).toBe(200);
      expect(body).toMatchInlineSnapshot(`
        {
          "ccmParams": {
            "gasBudget": "100000",
            "message": "0xdeadbeef",
          },
          "depositAddress": "0x6aa69332b63bb5b1d7ca5355387edd5624e181f2",
          "depositChannelBrokerCommissionBps": 0,
          "depositChannelCreatedAt": 516000,
          "depositChannelExpiryBlock": "265",
          "depositChannelMaxBoostFeeBps": 0,
          "depositChannelOpenedThroughBackend": false,
          "destAddress": "1yMmfLti1k3huRQM2c47WugwonQMqTvQ2GUFxnU7Pcs7xPo",
          "destAsset": "DOT",
          "destChain": "Polkadot",
          "estimatedDefaultDurationSeconds": 129,
          "estimatedDepositChannelExpiryTime": 1640998260000,
          "feesPaid": [],
          "fillOrKillParams": {
            "minPrice": "0",
            "refundAddress": "0x2afba9278e30ccf6a6ceb3a8b6e336b70068f045c666f2e7f4f9cc5f47db8972",
            "retryDurationBlocks": 100,
          },
          "isDepositChannelExpired": false,
          "lastStatechainUpdateAt": 1640995200000,
          "srcAsset": "ETH",
          "srcChain": "Ethereum",
          "srcChainRequiredBlockConfirmations": 2,
          "state": "AWAITING_DEPOSIT",
        }
      `);
    });

    it(`retrieves a swap in ${State.AwaitingDeposit} status and the channel is expired`, async () => {
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

      const { body, status } = await request(server).get(`/swaps/${channelId}`);

      expect(status).toBe(200);
      expect(body).toMatchInlineSnapshot(
        {
          lastStatechainUpdateAt: expect.any(Number),
        },
        `
        {
          "depositAddress": "0x6aa69332b63bb5b1d7ca5355387edd5624e181f2",
          "depositChannelBrokerCommissionBps": 0,
          "depositChannelCreatedAt": 516000,
          "depositChannelExpiryBlock": "1",
          "depositChannelMaxBoostFeeBps": 0,
          "depositChannelOpenedThroughBackend": false,
          "destAddress": "1yMmfLti1k3huRQM2c47WugwonQMqTvQ2GUFxnU7Pcs7xPo",
          "destAsset": "DOT",
          "destChain": "Polkadot",
          "estimatedDefaultDurationSeconds": 129,
          "estimatedDepositChannelExpiryTime": 1640995092000,
          "feesPaid": [],
          "fillOrKillParams": {
            "minPrice": "0",
            "refundAddress": "0x2afba9278e30ccf6a6ceb3a8b6e336b70068f045c666f2e7f4f9cc5f47db8972",
            "retryDurationBlocks": 100,
          },
          "isDepositChannelExpired": true,
          "lastStatechainUpdateAt": Any<Number>,
          "srcAsset": "ETH",
          "srcChain": "Ethereum",
          "srcChainRequiredBlockConfirmations": 2,
          "state": "AWAITING_DEPOSIT",
        }
      `,
      );
    });

    it(`retrieves a swap in ${State.DepositReceived} status`, async () => {
      await processEvents(swapEvents.slice(0, 4));

      const { body, status } = await request(server).get(`/swaps/${channelId}`);

      expect(status).toBe(200);
      const { swapId, ...rest } = body;
      expect(BigInt(swapId)).toEqual(368n);
      expect(rest).toMatchInlineSnapshot(`
        {
          "depositAddress": "0x6aa69332b63bb5b1d7ca5355387edd5624e181f2",
          "depositAmount": "5000000000000000000",
          "depositChannelBrokerCommissionBps": 0,
          "depositChannelCreatedAt": 516000,
          "depositChannelExpiryBlock": "265",
          "depositChannelMaxBoostFeeBps": 0,
          "depositChannelOpenedThroughBackend": false,
          "depositReceivedAt": 552000,
          "depositReceivedBlockIndex": "92-400",
          "destAddress": "1yMmfLti1k3huRQM2c47WugwonQMqTvQ2GUFxnU7Pcs7xPo",
          "destAsset": "DOT",
          "destChain": "Polkadot",
          "estimatedDefaultDurationSeconds": 129,
          "estimatedDepositChannelExpiryTime": 1640998260000,
          "feesPaid": [
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
          "isDepositChannelExpired": false,
          "lastStatechainUpdateAt": 1640995200000,
          "srcAsset": "ETH",
          "srcChain": "Ethereum",
          "srcChainRequiredBlockConfirmations": 2,
          "state": "DEPOSIT_RECEIVED",
          "swapScheduledAt": 552000,
          "swapScheduledBlockIndex": "92-399",
          "type": "SWAP",
        }
      `);
    });

    it(`retrieves a swap in ${State.DepositReceived} status with a tx ref`, async () => {
      const depositFinalisedEvent = clone(swapEventMap['EthereumIngressEgress.DepositFinalised']);
      depositFinalisedEvent.args.depositDetails.txHashes = [
        '0xa2d5df86c6ec123283eb052c598a0f4b650367a81ad141b9ff3adb0286a86c17',
      ];

      await processEvents([...swapEvents.slice(0, 3), depositFinalisedEvent]);

      const { body, status } = await request(server).get(`/swaps/${channelId}`);

      expect(status).toBe(200);
      const { swapId, ...rest } = body;
      expect(rest).toMatchInlineSnapshot(`
        {
          "depositAddress": "0x6aa69332b63bb5b1d7ca5355387edd5624e181f2",
          "depositAmount": "5000000000000000000",
          "depositChannelBrokerCommissionBps": 0,
          "depositChannelCreatedAt": 516000,
          "depositChannelExpiryBlock": "265",
          "depositChannelMaxBoostFeeBps": 0,
          "depositChannelOpenedThroughBackend": false,
          "depositReceivedAt": 552000,
          "depositReceivedBlockIndex": "92-400",
          "depositTransactionRef": "0xa2d5df86c6ec123283eb052c598a0f4b650367a81ad141b9ff3adb0286a86c17",
          "destAddress": "1yMmfLti1k3huRQM2c47WugwonQMqTvQ2GUFxnU7Pcs7xPo",
          "destAsset": "DOT",
          "destChain": "Polkadot",
          "estimatedDefaultDurationSeconds": 129,
          "estimatedDepositChannelExpiryTime": 1640998260000,
          "feesPaid": [
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
          "isDepositChannelExpired": false,
          "lastStatechainUpdateAt": 1640995200000,
          "srcAsset": "ETH",
          "srcChain": "Ethereum",
          "srcChainRequiredBlockConfirmations": 2,
          "state": "DEPOSIT_RECEIVED",
          "swapScheduledAt": 552000,
          "swapScheduledBlockIndex": "92-399",
          "type": "SWAP",
        }
      `);
    });

    it(`retrieves a swap in ${State.SwapExecuted} status`, async () => {
      await processEvents(swapEvents.slice(0, 5));

      const { body, status } = await request(server).get(`/swaps/${channelId}`);

      expect(status).toBe(200);
      const { swapId, ...rest } = body;
      expect(rest).toMatchInlineSnapshot(`
        {
          "depositAddress": "0x6aa69332b63bb5b1d7ca5355387edd5624e181f2",
          "depositAmount": "5000000000000000000",
          "depositChannelBrokerCommissionBps": 0,
          "depositChannelCreatedAt": 516000,
          "depositChannelExpiryBlock": "265",
          "depositChannelMaxBoostFeeBps": 0,
          "depositChannelOpenedThroughBackend": false,
          "depositReceivedAt": 552000,
          "depositReceivedBlockIndex": "92-400",
          "destAddress": "1yMmfLti1k3huRQM2c47WugwonQMqTvQ2GUFxnU7Pcs7xPo",
          "destAsset": "DOT",
          "destChain": "Polkadot",
          "estimatedDefaultDurationSeconds": 129,
          "estimatedDepositChannelExpiryTime": 1640998260000,
          "feesPaid": [
            {
              "amount": "50000000350000",
              "asset": "ETH",
              "chain": "Ethereum",
              "type": "INGRESS",
            },
            {
              "amount": "4556242",
              "asset": "USDC",
              "chain": "Ethereum",
              "type": "NETWORK",
            },
            {
              "amount": "45516860",
              "asset": "USDC",
              "chain": "Ethereum",
              "type": "BROKER",
            },
          ],
          "fillOrKillParams": {
            "minPrice": "0",
            "refundAddress": "0x2afba9278e30ccf6a6ceb3a8b6e336b70068f045c666f2e7f4f9cc5f47db8972",
            "retryDurationBlocks": 100,
          },
          "intermediateAmount": "4506169140",
          "isDepositChannelExpired": false,
          "lastStatechainUpdateAt": 1640995200000,
          "srcAsset": "ETH",
          "srcChain": "Ethereum",
          "srcChainRequiredBlockConfirmations": 2,
          "state": "SWAP_EXECUTED",
          "swapExecutedAt": 564000,
          "swapExecutedBlockIndex": "94-594",
          "swapScheduledAt": 552000,
          "swapScheduledBlockIndex": "92-399",
          "type": "SWAP",
        }
      `);
    });

    it(`retrieves a swap in ${State.EgressScheduled} status`, async () => {
      await processEvents(swapEvents.slice(0, 7));

      const { body, status } = await request(server).get(`/swaps/${channelId}`);

      expect(status).toBe(200);
      const { swapId, ...rest } = body;
      expect(rest).toMatchInlineSnapshot(`
        {
          "depositAddress": "0x6aa69332b63bb5b1d7ca5355387edd5624e181f2",
          "depositAmount": "5000000000000000000",
          "depositChannelBrokerCommissionBps": 0,
          "depositChannelCreatedAt": 516000,
          "depositChannelExpiryBlock": "265",
          "depositChannelMaxBoostFeeBps": 0,
          "depositChannelOpenedThroughBackend": false,
          "depositReceivedAt": 552000,
          "depositReceivedBlockIndex": "92-400",
          "destAddress": "1yMmfLti1k3huRQM2c47WugwonQMqTvQ2GUFxnU7Pcs7xPo",
          "destAsset": "DOT",
          "destChain": "Polkadot",
          "egressAmount": "4192707216034",
          "egressScheduledAt": 564000,
          "egressScheduledBlockIndex": "94-595",
          "egressType": "SWAP",
          "estimatedDefaultDurationSeconds": 129,
          "estimatedDepositChannelExpiryTime": 1640998260000,
          "feesPaid": [
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
            {
              "amount": "4556242",
              "asset": "USDC",
              "chain": "Ethereum",
              "type": "NETWORK",
            },
            {
              "amount": "45516860",
              "asset": "USDC",
              "chain": "Ethereum",
              "type": "BROKER",
            },
          ],
          "fillOrKillParams": {
            "minPrice": "0",
            "refundAddress": "0x2afba9278e30ccf6a6ceb3a8b6e336b70068f045c666f2e7f4f9cc5f47db8972",
            "retryDurationBlocks": 100,
          },
          "intermediateAmount": "4506169140",
          "isDepositChannelExpired": false,
          "lastStatechainUpdateAt": 1640995200000,
          "srcAsset": "ETH",
          "srcChain": "Ethereum",
          "srcChainRequiredBlockConfirmations": 2,
          "state": "EGRESS_SCHEDULED",
          "swapExecutedAt": 564000,
          "swapExecutedBlockIndex": "94-594",
          "swapScheduledAt": 552000,
          "swapScheduledBlockIndex": "92-399",
          "type": "SWAP",
        }
      `);
    });

    it(`retrieves a swap with a refund in ${State.EgressScheduled} status`, async () => {
      await processEvents([
        ...swapEvents.slice(0, 4),
        swapEventMap['Swapping.RefundEgressScheduled'],
      ]);

      const { body, status } = await request(server).get(`/swaps/${channelId}`);

      expect(status).toBe(200);
      const { swapId, ...rest } = body;
      expect(rest).toMatchInlineSnapshot(`
        {
          "depositAddress": "0x6aa69332b63bb5b1d7ca5355387edd5624e181f2",
          "depositAmount": "5000000000000000000",
          "depositChannelBrokerCommissionBps": 0,
          "depositChannelCreatedAt": 516000,
          "depositChannelExpiryBlock": "265",
          "depositChannelMaxBoostFeeBps": 0,
          "depositChannelOpenedThroughBackend": false,
          "depositReceivedAt": 552000,
          "depositReceivedBlockIndex": "92-400",
          "destAddress": "1yMmfLti1k3huRQM2c47WugwonQMqTvQ2GUFxnU7Pcs7xPo",
          "destAsset": "DOT",
          "destChain": "Polkadot",
          "egressAmount": "999844999999160000",
          "egressScheduledAt": 564000,
          "egressScheduledBlockIndex": "94-594",
          "egressType": "REFUND",
          "estimatedDefaultDurationSeconds": 129,
          "estimatedDepositChannelExpiryTime": 1640998260000,
          "feesPaid": [
            {
              "amount": "50000000350000",
              "asset": "ETH",
              "chain": "Ethereum",
              "type": "INGRESS",
            },
            {
              "amount": "105000000490000",
              "asset": "ETH",
              "chain": "Ethereum",
              "type": "EGRESS",
            },
            {
              "amount": "3999949999999650000",
              "asset": "ETH",
              "chain": "Ethereum",
              "type": "REFUND",
            },
          ],
          "fillOrKillParams": {
            "minPrice": "0",
            "refundAddress": "0x2afba9278e30ccf6a6ceb3a8b6e336b70068f045c666f2e7f4f9cc5f47db8972",
            "retryDurationBlocks": 100,
          },
          "isDepositChannelExpired": false,
          "lastStatechainUpdateAt": 1640995200000,
          "srcAsset": "ETH",
          "srcChain": "Ethereum",
          "srcChainRequiredBlockConfirmations": 2,
          "state": "EGRESS_SCHEDULED",
          "swapScheduledAt": 552000,
          "swapScheduledBlockIndex": "92-399",
          "type": "SWAP",
        }
      `);
    });

    it(`retrieves a swap in ${State.Broadcasted} status`, async () => {
      vi.mocked(getPendingBroadcast).mockResolvedValueOnce({
        tx_out_id: { hash: '0xdeadbeef' },
        tx_ref: '100-3',
      });

      await processEvents(swapEvents.slice(0, 8));

      const { body, status } = await request(server).get(`/swaps/${channelId}`);

      expect(status).toBe(200);
      const { swapId, ...rest } = body;
      expect(rest).toMatchInlineSnapshot(`
        {
          "broadcastRequestedAt": 564000,
          "broadcastRequestedBlockIndex": "94-843",
          "broadcastTransactionRef": "100-3",
          "depositAddress": "0x6aa69332b63bb5b1d7ca5355387edd5624e181f2",
          "depositAmount": "5000000000000000000",
          "depositChannelBrokerCommissionBps": 0,
          "depositChannelCreatedAt": 516000,
          "depositChannelExpiryBlock": "265",
          "depositChannelMaxBoostFeeBps": 0,
          "depositChannelOpenedThroughBackend": false,
          "depositReceivedAt": 552000,
          "depositReceivedBlockIndex": "92-400",
          "destAddress": "1yMmfLti1k3huRQM2c47WugwonQMqTvQ2GUFxnU7Pcs7xPo",
          "destAsset": "DOT",
          "destChain": "Polkadot",
          "egressAmount": "4192707216034",
          "egressScheduledAt": 564000,
          "egressScheduledBlockIndex": "94-595",
          "egressType": "SWAP",
          "estimatedDefaultDurationSeconds": 129,
          "estimatedDepositChannelExpiryTime": 1640998260000,
          "feesPaid": [
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
            {
              "amount": "4556242",
              "asset": "USDC",
              "chain": "Ethereum",
              "type": "NETWORK",
            },
            {
              "amount": "45516860",
              "asset": "USDC",
              "chain": "Ethereum",
              "type": "BROKER",
            },
          ],
          "fillOrKillParams": {
            "minPrice": "0",
            "refundAddress": "0x2afba9278e30ccf6a6ceb3a8b6e336b70068f045c666f2e7f4f9cc5f47db8972",
            "retryDurationBlocks": 100,
          },
          "intermediateAmount": "4506169140",
          "isDepositChannelExpired": false,
          "lastStatechainUpdateAt": 1640995200000,
          "srcAsset": "ETH",
          "srcChain": "Ethereum",
          "srcChainRequiredBlockConfirmations": 2,
          "state": "BROADCASTED",
          "swapExecutedAt": 564000,
          "swapExecutedBlockIndex": "94-594",
          "swapScheduledAt": 552000,
          "swapScheduledBlockIndex": "92-399",
          "type": "SWAP",
        }
      `);
    });

    it(`retrieves a swap in ${State.BroadcastRequested} status`, async () => {
      await processEvents(swapEvents.slice(0, 8));

      const { body, status } = await request(server).get(`/swaps/${channelId}`);

      expect(status).toBe(200);
      const { swapId, ...rest } = body;
      expect(rest).toMatchInlineSnapshot(`
        {
          "broadcastRequestedAt": 564000,
          "broadcastRequestedBlockIndex": "94-843",
          "depositAddress": "0x6aa69332b63bb5b1d7ca5355387edd5624e181f2",
          "depositAmount": "5000000000000000000",
          "depositChannelBrokerCommissionBps": 0,
          "depositChannelCreatedAt": 516000,
          "depositChannelExpiryBlock": "265",
          "depositChannelMaxBoostFeeBps": 0,
          "depositChannelOpenedThroughBackend": false,
          "depositReceivedAt": 552000,
          "depositReceivedBlockIndex": "92-400",
          "destAddress": "1yMmfLti1k3huRQM2c47WugwonQMqTvQ2GUFxnU7Pcs7xPo",
          "destAsset": "DOT",
          "destChain": "Polkadot",
          "egressAmount": "4192707216034",
          "egressScheduledAt": 564000,
          "egressScheduledBlockIndex": "94-595",
          "egressType": "SWAP",
          "estimatedDefaultDurationSeconds": 129,
          "estimatedDepositChannelExpiryTime": 1640998260000,
          "feesPaid": [
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
            {
              "amount": "4556242",
              "asset": "USDC",
              "chain": "Ethereum",
              "type": "NETWORK",
            },
            {
              "amount": "45516860",
              "asset": "USDC",
              "chain": "Ethereum",
              "type": "BROKER",
            },
          ],
          "fillOrKillParams": {
            "minPrice": "0",
            "refundAddress": "0x2afba9278e30ccf6a6ceb3a8b6e336b70068f045c666f2e7f4f9cc5f47db8972",
            "retryDurationBlocks": 100,
          },
          "intermediateAmount": "4506169140",
          "isDepositChannelExpired": false,
          "lastStatechainUpdateAt": 1640995200000,
          "srcAsset": "ETH",
          "srcChain": "Ethereum",
          "srcChainRequiredBlockConfirmations": 2,
          "state": "BROADCAST_REQUESTED",
          "swapExecutedAt": 564000,
          "swapExecutedBlockIndex": "94-594",
          "swapScheduledAt": 552000,
          "swapScheduledBlockIndex": "92-399",
          "type": "SWAP",
        }
      `);
    });

    it(`retrieves a swap in ${State.BroadcastAborted} status`, async () => {
      await processEvents([
        ...swapEvents.slice(0, 8),
        swapEventMap['PolkadotBroadcaster.BroadcastAborted'],
      ]);

      const { body, status } = await request(server).get(`/swaps/${channelId}`);

      expect(status).toBe(200);
      const { swapId, ...rest } = body;
      expect(rest).toMatchInlineSnapshot(`
        {
          "broadcastAbortedAt": 624000,
          "broadcastAbortedBlockIndex": "104-7",
          "broadcastRequestedAt": 564000,
          "broadcastRequestedBlockIndex": "94-843",
          "depositAddress": "0x6aa69332b63bb5b1d7ca5355387edd5624e181f2",
          "depositAmount": "5000000000000000000",
          "depositChannelBrokerCommissionBps": 0,
          "depositChannelCreatedAt": 516000,
          "depositChannelExpiryBlock": "265",
          "depositChannelMaxBoostFeeBps": 0,
          "depositChannelOpenedThroughBackend": false,
          "depositReceivedAt": 552000,
          "depositReceivedBlockIndex": "92-400",
          "destAddress": "1yMmfLti1k3huRQM2c47WugwonQMqTvQ2GUFxnU7Pcs7xPo",
          "destAsset": "DOT",
          "destChain": "Polkadot",
          "egressAmount": "4192707216034",
          "egressScheduledAt": 564000,
          "egressScheduledBlockIndex": "94-595",
          "egressType": "SWAP",
          "estimatedDefaultDurationSeconds": 129,
          "estimatedDepositChannelExpiryTime": 1640998260000,
          "feesPaid": [
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
            {
              "amount": "4556242",
              "asset": "USDC",
              "chain": "Ethereum",
              "type": "NETWORK",
            },
            {
              "amount": "45516860",
              "asset": "USDC",
              "chain": "Ethereum",
              "type": "BROKER",
            },
          ],
          "fillOrKillParams": {
            "minPrice": "0",
            "refundAddress": "0x2afba9278e30ccf6a6ceb3a8b6e336b70068f045c666f2e7f4f9cc5f47db8972",
            "retryDurationBlocks": 100,
          },
          "intermediateAmount": "4506169140",
          "isDepositChannelExpired": false,
          "lastStatechainUpdateAt": 1640995200000,
          "srcAsset": "ETH",
          "srcChain": "Ethereum",
          "srcChainRequiredBlockConfirmations": 2,
          "state": "BROADCAST_ABORTED",
          "swapExecutedAt": 564000,
          "swapExecutedBlockIndex": "94-594",
          "swapScheduledAt": 552000,
          "swapScheduledBlockIndex": "92-399",
          "type": "SWAP",
        }
      `);
    });

    it(`retrieves a swap in ${State.Complete} status`, async () => {
      await processEvents(swapEvents.slice(0, 9));

      const { body, status } = await request(server).get(`/swaps/${channelId}`);

      expect(status).toBe(200);
      const { swapId, ...rest } = body;
      expect(rest).toMatchInlineSnapshot(`
        {
          "broadcastRequestedAt": 564000,
          "broadcastRequestedBlockIndex": "94-843",
          "broadcastSucceededAt": 624000,
          "broadcastSucceededBlockIndex": "104-7",
          "broadcastTransactionRef": "104-2",
          "depositAddress": "0x6aa69332b63bb5b1d7ca5355387edd5624e181f2",
          "depositAmount": "5000000000000000000",
          "depositChannelBrokerCommissionBps": 0,
          "depositChannelCreatedAt": 516000,
          "depositChannelExpiryBlock": "265",
          "depositChannelMaxBoostFeeBps": 0,
          "depositChannelOpenedThroughBackend": false,
          "depositReceivedAt": 552000,
          "depositReceivedBlockIndex": "92-400",
          "destAddress": "1yMmfLti1k3huRQM2c47WugwonQMqTvQ2GUFxnU7Pcs7xPo",
          "destAsset": "DOT",
          "destChain": "Polkadot",
          "egressAmount": "4192707216034",
          "egressScheduledAt": 564000,
          "egressScheduledBlockIndex": "94-595",
          "egressType": "SWAP",
          "estimatedDefaultDurationSeconds": 129,
          "estimatedDepositChannelExpiryTime": 1640998260000,
          "feesPaid": [
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
            {
              "amount": "4556242",
              "asset": "USDC",
              "chain": "Ethereum",
              "type": "NETWORK",
            },
            {
              "amount": "45516860",
              "asset": "USDC",
              "chain": "Ethereum",
              "type": "BROKER",
            },
          ],
          "fillOrKillParams": {
            "minPrice": "0",
            "refundAddress": "0x2afba9278e30ccf6a6ceb3a8b6e336b70068f045c666f2e7f4f9cc5f47db8972",
            "retryDurationBlocks": 100,
          },
          "intermediateAmount": "4506169140",
          "isDepositChannelExpired": false,
          "lastStatechainUpdateAt": 1640995200000,
          "srcAsset": "ETH",
          "srcChain": "Ethereum",
          "srcChainRequiredBlockConfirmations": 2,
          "state": "COMPLETE",
          "swapExecutedAt": 564000,
          "swapExecutedBlockIndex": "94-594",
          "swapScheduledAt": 552000,
          "swapScheduledBlockIndex": "92-399",
          "type": "SWAP",
        }
      `);
    });

    it(`retrieves a swap in ${State.Failed} status (deposit failed)`, async () => {
      await processEvents([
        swapEventMap['Swapping.SwapDepositAddressReady'],
        swapEventMap['EthereumIngressEgress.DepositFailed'],
      ]);

      const { body, status } = await request(server).get(`/swaps/${channelId}`);

      expect(status).toBe(200);

      expect(body).toMatchInlineSnapshot(`
        {
          "depositAddress": "0x6aa69332b63bb5b1d7ca5355387edd5624e181f2",
          "depositAmount": "100000000000000",
          "depositChannelBrokerCommissionBps": 0,
          "depositChannelCreatedAt": 516000,
          "depositChannelExpiryBlock": "265",
          "depositChannelMaxBoostFeeBps": 0,
          "depositChannelOpenedThroughBackend": false,
          "depositTransactionRef": "0xfae1ed",
          "destAddress": "1yMmfLti1k3huRQM2c47WugwonQMqTvQ2GUFxnU7Pcs7xPo",
          "destAsset": "DOT",
          "destChain": "Polkadot",
          "error": {
            "message": "The DCA parameters were improperly formatted",
            "name": "InvalidDcaParameters",
          },
          "estimatedDefaultDurationSeconds": 129,
          "estimatedDepositChannelExpiryTime": 1640998260000,
          "failedAt": "1970-01-01T00:09:12.000Z",
          "failedBlockIndex": "92-1",
          "failure": "DEPOSIT_IGNORED",
          "feesPaid": [],
          "fillOrKillParams": {
            "minPrice": "0",
            "refundAddress": "0x2afba9278e30ccf6a6ceb3a8b6e336b70068f045c666f2e7f4f9cc5f47db8972",
            "retryDurationBlocks": 100,
          },
          "isDepositChannelExpired": false,
          "lastStatechainUpdateAt": 1640995200000,
          "srcAsset": "ETH",
          "srcChain": "Ethereum",
          "srcChainRequiredBlockConfirmations": 2,
          "state": "FAILED",
        }
      `);
    });

    it(`retrieves a swap in ${State.Failed} status (egress ignored)`, async () => {
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

      const { body, status } = await request(server).get('/swaps/368');

      expect(status).toBe(200);

      expect(body).toMatchSnapshot();
    });

    it(`retrieves a swap in ${State.Failed} status (refund egress ignored)`, async () => {
      await processEvents([
        ...swapEvents.slice(0, 4),
        swapEventMap['Swapping.RefundEgressScheduled'],
        swapEventMap['Swapping.RefundEgressIgnored'],
      ]);

      const { body, status } = await request(server).get(`/swaps/${channelId}`);

      expect(status).toBe(200);

      expect(body).toMatchSnapshot();
    });

    it(`returns ${State.Complete} status even when the channel has other failed swaps`, async () => {
      await processEvents(swapEvents.slice(0, 9));
      const req1 = await request(server).get(`/swaps/${channelId}`);
      expect(req1.status).toBe(200);
      expect(req1.body.state).toBe('COMPLETE');
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
      const req2 = await request(server).get(`/swaps/${channelId}`);
      expect(req2.status).toBe(200);
      expect(req1.body).toStrictEqual(req2.body);
    });

    it('retrieves a swap from a vault origin', async () => {
      const txHash = '0xb2dcb9ce8d50f0ab869995fee8482bcf304ffcfe5681ca748f90e34c0ad7b241';

      const requestedEvent = clone(swapEventMap['Swapping.SwapRequested']);
      (requestedEvent.args.origin as any) = {
        __kind: 'Vault',
        txId: {
          __kind: 'Evm',
          value: txHash,
        },
      } as Extract<SwapRequestedArgs190['origin'], { __kind: 'Vault' }>;

      await processEvents([requestedEvent, ...swapEvents.slice(2, 4)]);

      const { body, status } = await request(server).get(`/swaps/${txHash}`);
      expect(status).toBe(200);
      const { swapId, ...rest } = body;
      expect(rest).toMatchInlineSnapshot(`
        {
          "depositAmount": "5000000000000000000",
          "depositReceivedAt": 552000,
          "depositReceivedBlockIndex": "92-400",
          "depositTransactionRef": "0xb2dcb9ce8d50f0ab869995fee8482bcf304ffcfe5681ca748f90e34c0ad7b241",
          "destAddress": "1yMmfLti1k3huRQM2c47WugwonQMqTvQ2GUFxnU7Pcs7xPo",
          "destAsset": "DOT",
          "destChain": "Polkadot",
          "estimatedDefaultDurationSeconds": 129,
          "feesPaid": [
            {
              "amount": "50000000350000",
              "asset": "ETH",
              "chain": "Ethereum",
              "type": "INGRESS",
            },
          ],
          "lastStatechainUpdateAt": 1640995200000,
          "srcAsset": "ETH",
          "srcChain": "Ethereum",
          "srcChainRequiredBlockConfirmations": 2,
          "state": "DEPOSIT_RECEIVED",
          "swapScheduledAt": 552000,
          "swapScheduledBlockIndex": "92-399",
          "type": "SWAP",
        }
      `);
    });

    it('retrieves a swap from a native swap id', async () => {
      await processEvents(swapEvents.slice(0, 4));

      const { body, status } = await request(server).get(`/swaps/${swapRequestId}`);
      expect(status).toBe(200);
      const { swapId, ...rest } = body;
      expect(rest).toMatchInlineSnapshot(`
        {
          "depositAddress": "0x6aa69332b63bb5b1d7ca5355387edd5624e181f2",
          "depositAmount": "5000000000000000000",
          "depositChannelBrokerCommissionBps": 0,
          "depositChannelCreatedAt": 516000,
          "depositChannelExpiryBlock": "265",
          "depositChannelMaxBoostFeeBps": 0,
          "depositChannelOpenedThroughBackend": false,
          "depositReceivedAt": 552000,
          "depositReceivedBlockIndex": "92-400",
          "destAddress": "1yMmfLti1k3huRQM2c47WugwonQMqTvQ2GUFxnU7Pcs7xPo",
          "destAsset": "DOT",
          "destChain": "Polkadot",
          "estimatedDefaultDurationSeconds": 129,
          "estimatedDepositChannelExpiryTime": 1640998260000,
          "feesPaid": [
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
          "isDepositChannelExpired": false,
          "lastStatechainUpdateAt": 1640995200000,
          "srcAsset": "ETH",
          "srcChain": "Ethereum",
          "srcChainRequiredBlockConfirmations": 2,
          "state": "DEPOSIT_RECEIVED",
          "swapScheduledAt": 552000,
          "swapScheduledBlockIndex": "92-399",
          "type": "SWAP",
        }
      `);
    });

    it('works in maintenance mode', async () => {
      env.MAINTENANCE_MODE = true;

      await processEvents(swapEvents.slice(0, 1));

      const { status } = await request(server).get(`/swaps/${channelId}`);

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

      const { status, body } = await request(server).get(`/swaps/${channelId}`);

      expect(status).toBe(200);

      expect(body.depositChannelAffiliateBrokers).toStrictEqual([
        {
          account: 'cFM8kRvLBXagj6ZXvrt7wCM4jGmHvb5842jTtXXg3mRHjrvKy',
          commissionBps: 100,
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

      const { status, body } = await request(server).get(`/swaps/${swapRequestId}`);

      expect(status).toBe(200);
      expect(body).toMatchSnapshot();
    });

    it('retrieves boost details when vault swap was boosted', async () => {
      const txHash = '0xb2dcb9ce8d50f0ab869995fee8482bcf304ffcfe5681ca748f90e34c0ad7b241';

      const requestedEvent = clone(swapEventMap['Swapping.SwapRequested']);
      (requestedEvent.args.origin as any) = check<
        Extract<SwapRequestedArgs190['origin'], { __kind: 'Vault' }>
      >({
        __kind: 'Vault',
        txId: {
          __kind: 'Bitcoin',
          value: txHash,
        },
      });

      await processEvents([
        requestedEvent,
        swapEventMap['Swapping.SwapScheduled'],
        swapEventMap['EthereumIngressEgress.DepositBoosted'],
      ]);

      const { body, status } = await request(server).get(`/swaps/${reverseBytes(txHash.slice(2))}`);

      expect(status).toBe(200);
      expect(body).toMatchSnapshot();
    });

    it('does not retrieve boost details when a channel is not boostable', async () => {
      await processEvents(swapEvents.slice(0, 9));

      const { status, body } = await request(server).get(`/swaps/${channelId}`);

      expect(status).toBe(200);
      expect(body.effectiveBoostFeeBps).toBeUndefined();
      expect(body.depositChannelMaxBoostFeeBps).toBe(0);
      expect(body.depositBoostedAt).toBeUndefined();
      expect(body.depositBoostedBlockIndex).toBeUndefined();
      expect(body.boostSkippedAt).toBeUndefined();
      expect(body.boostSkippedBlockIndex).toBeUndefined();
    });

    it('retrieves boost skipped properties when there was a failed boost attempt for the swap', async () => {
      const depositChannelEvent = clone(swapEventMap['Swapping.SwapDepositAddressReady']);
      depositChannelEvent.args.boostFee = 30;
      await processEvents([
        depositChannelEvent,
        swapEventMap['EthereumIngressEgress.InsufficientBoostLiquidity'],
        ...swapEvents.slice(1, 4),
      ]);

      const { status, body } = await request(server).get(`/swaps/${channelId}`);

      expect(status).toBe(200);
      expect(body.effectiveBoostFeeBps).toBeUndefined();
      expect(body.depositChannelMaxBoostFeeBps).toBe(30);
      expect(body.boostSkippedAt.valueOf()).toBe(RECEIVED_TIMESTAMP);
      expect(body.boostSkippedBlockIndex).toBe(RECEIVED_BLOCK_INDEX);
    });

    it(`retrieves a swap with FillOrKillParams in ${State.AwaitingDeposit} status`, async () => {
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

      const { body, status } = await request(server).get(`/swaps/${channelId}`);

      expect(status).toBe(200);
      expect(body).toMatchInlineSnapshot(`
        {
          "depositAddress": "0x6aa69332b63bb5b1d7ca5355387edd5624e181f2",
          "depositChannelBrokerCommissionBps": 0,
          "depositChannelCreatedAt": 516000,
          "depositChannelExpiryBlock": "265",
          "depositChannelMaxBoostFeeBps": 0,
          "depositChannelOpenedThroughBackend": false,
          "destAddress": "1yMmfLti1k3huRQM2c47WugwonQMqTvQ2GUFxnU7Pcs7xPo",
          "destAsset": "DOT",
          "destChain": "Polkadot",
          "estimatedDefaultDurationSeconds": 129,
          "estimatedDepositChannelExpiryTime": 1640998260000,
          "feesPaid": [],
          "fillOrKillParams": {
            "minPrice": "29387358770557187699218413430556141945466.638919302188",
            "refundAddress": "0x541f563237a309b3a61e33bdf07a8930bdba8d99",
            "retryDurationBlocks": 15,
          },
          "isDepositChannelExpired": false,
          "lastStatechainUpdateAt": 1640995200000,
          "srcAsset": "ETH",
          "srcChain": "Ethereum",
          "srcChainRequiredBlockConfirmations": 2,
          "state": "AWAITING_DEPOSIT",
        }
      `);
    });

    it(`retrieves a swap with FillOrKillParams in ${State.BroadcastAborted}`, async () => {
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

      const { body, status } = await request(server).get(`/swaps/${channelId}`);

      expect(status).toBe(200);
      expect(body).toMatchObject({
        fillOrKillParams: {
          minPrice: expect.any(String),
          refundAddress: expect.any(String),
          retryDurationBlocks: expect.any(Number),
        },
        state: 'BROADCAST_ABORTED',
        egressType: 'REFUND',
      });
    });

    it(`retrieves a swap with FillOrKillParams in ${State.Complete}`, async () => {
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

      const { body, status } = await request(server).get(`/swaps/${channelId}`);

      expect(status).toBe(200);
      expect(body).toMatchObject({
        fillOrKillParams: {
          minPrice: expect.any(String),
          refundAddress: expect.any(String),
          retryDurationBlocks: expect.any(Number),
        },
        state: 'COMPLETE',
        egressType: 'REFUND',
      });
    });
  });
});

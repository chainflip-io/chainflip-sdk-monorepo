import { Server } from 'http';
import prisma from 'packages/swap/src/client.js';
import { BroadcastSuccessArgsMap } from 'packages/swap/src/event-handlers/broadcaster/broadcastSuccess.js';
import { BatchBroadcastRequestedArgsMap } from 'packages/swap/src/event-handlers/ingress-egress/batchBroadcastRequested.js';
import { RefundEgressScheduledArgs } from 'packages/swap/src/event-handlers/swapping/refundEgressScheduled.js';
import { SwappingSwapAbortedArgs } from 'packages/swap/src/event-handlers/swapping/swapAborted.js';
import { SwapDepositAddressReadyArgs } from 'packages/swap/src/event-handlers/swapping/swapDepositAddressReady.js';
import { SwapEgressScheduledArgs } from 'packages/swap/src/event-handlers/swapping/swapEgressScheduled.js';
import request from 'supertest';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { environment, mockRpcResponse } from '@/shared/tests/fixtures.js';
import { check, processEvents } from '../../../../event-handlers/__tests__/utils.js';
import { DepositFinalisedArgsMap } from '../../../../event-handlers/ingress-egress/depositFinalised.js';
import { SwapExecutedArgs } from '../../../../event-handlers/swapping/swapExecuted.js';
import { SwapRequestCompletedArgs } from '../../../../event-handlers/swapping/swapRequestCompleted.js';
import { SwapRequestedArgs } from '../../../../event-handlers/swapping/swapRequested.js';
import { SwapScheduledArgs } from '../../../../event-handlers/swapping/swapScheduled.js';
import app from '../../../../server.js';

const events = [
  {
    id: '0010665480-001477-06cc2',
    blockId: '0010665480-06cc2',
    indexInBlock: 1477,
    name: 'Swapping.SwapDepositAddressReady',
    args: check<SwapDepositAddressReadyArgs>({
      boostFee: 0,
      brokerId: '0x30c6c14154dc299ead97e3aae15893c715ab565b32bb487efd77f7ebdccd3938',
      channelId: '854',
      sourceAsset: { __kind: 'Usdc' },
      affiliateFees: [],
      dcaParameters: { chunkInterval: 1, numberOfChunks: 12 },
      depositAddress: { value: '0x4b39858b89d4bdb449ff9e293af6a5fc3177f060', __kind: 'Eth' },
      destinationAsset: { __kind: 'Flip' },
      refundParameters: {
        minPrice: '888143638988668530799593004568335808542010541299334',
        refundAddress: { value: '0x608a6b0e501732d1af57f223bcdfe1b9d0631900', __kind: 'Eth' },
        retryDuration: 50,
      },
      channelOpeningFee: '0',
      destinationAddress: { value: '0x608a6b0e501732d1af57f223bcdfe1b9d0631900', __kind: 'Eth' },
      brokerCommissionRate: 15,
      sourceChainExpiryBlock: '23900106',
    }),
  },
  {
    id: '0010665506-001357-0e33e',
    blockId: '0010665506-0e33e',
    indexInBlock: 1357,
    name: 'Swapping.SwapRequested',
    args: check<SwapRequestedArgs>({
      origin: {
        __kind: 'DepositChannel',
        brokerId: '0x30c6c14154dc299ead97e3aae15893c715ab565b32bb487efd77f7ebdccd3938',
        channelId: '854',
        depositAddress: { value: '0x4b39858b89d4bdb449ff9e293af6a5fc3177f060', __kind: 'Eth' },
        depositBlockHeight: '23893942',
      },
      brokerFees: [
        { bps: 15, account: '0x30c6c14154dc299ead97e3aae15893c715ab565b32bb487efd77f7ebdccd3938' },
      ],
      inputAsset: { __kind: 'Usdc' },
      inputAmount: '2297316571',
      outputAsset: { __kind: 'Flip' },
      requestType: {
        __kind: 'Regular',
        outputAction: {
          __kind: 'Egress',
          outputAddress: { value: '0x608a6b0e501732d1af57f223bcdfe1b9d0631900', __kind: 'Eth' },
        },
      },
      dcaParameters: { chunkInterval: 1, numberOfChunks: 12 },
      swapRequestId: '1052770',
      priceLimitsAndExpiry: {
        minPrice: '888143638988668530799593004568335808542010541299334',
        expiryBehaviour: {
          __kind: 'RefundIfExpires',
          refundAddress: {
            value: { value: '0x608a6b0e501732d1af57f223bcdfe1b9d0631900', __kind: 'Eth' },
            __kind: 'ExternalAddress',
          },
          retryDuration: 50,
        },
      },
    }),
  },
  {
    id: '0010665506-001358-0e33e',
    blockId: '0010665506-0e33e',
    indexInBlock: 1358,
    name: 'Swapping.SwapScheduled',
    args: check<SwapScheduledArgs>({
      swapId: '1402784',
      swapType: { __kind: 'Swap' },
      executeAt: 10665508,
      inputAmount: '191443047',
      swapRequestId: '1052770',
    }),
  },
  {
    id: '0010665506-001359-0e33e',
    blockId: '0010665506-0e33e',
    indexInBlock: 1359,
    name: 'Swapping.SwapScheduled',
    args: check<SwapScheduledArgs>({
      swapId: '1402785',
      swapType: { __kind: 'Swap' },
      executeAt: 10665509,
      inputAmount: '191443047',
      swapRequestId: '1052770',
    }),
  },
  {
    id: '0010665506-001360-0e33e',
    blockId: '0010665506-0e33e',
    indexInBlock: 1360,
    name: 'EthereumIngressEgress.DepositFinalised',
    args: check<DepositFinalisedArgsMap['Ethereum']>({
      asset: { __kind: 'Usdc' },
      action: { __kind: 'Swap', swapRequestId: '1052770' },
      amount: '2297329141',
      channelId: '854',
      ingressFee: '12570',
      originType: { __kind: 'DepositChannel' },
      blockHeight: '23893942',
      depositAddress: '0x4b39858b89d4bdb449ff9e293af6a5fc3177f060',
      depositDetails: {
        txHashes: ['0x75dcd5891cd767160414ca15332a2d6e84328e1723695da2335e9fe1695c47a4'],
      },
      maxBoostFeeBps: 0,
    }),
  },
  {
    id: '0010665508-001851-4a6ad',
    blockId: '0010665508-4a6ad',
    indexInBlock: 1851,
    name: 'Swapping.SwapExecuted',
    args: check<SwapExecutedArgs>({
      swapId: '1402784',
      brokerFee: '286415',
      inputAsset: { __kind: 'Usdc' },
      networkFee: '500000',
      inputAmount: '190656632',
      outputAsset: { __kind: 'Flip' },
      outputAmount: '503903524209300772039',
      swapRequestId: '1052770',
    }),
  },
  {
    id: '0010665508-001852-4a6ad',
    blockId: '0010665508-4a6ad',
    indexInBlock: 1852,
    name: 'Swapping.SwapScheduled',
    args: check<SwapScheduledArgs>({
      swapId: '1402786',
      swapType: { __kind: 'Swap' },
      executeAt: 10665510,
      inputAmount: '191443047',
      swapRequestId: '1052770',
    }),
  },
  {
    id: '0010665509-001401-91672',
    blockId: '0010665509-91672',
    indexInBlock: 1401,
    name: 'Swapping.SwapExecuted',
    args: check<SwapExecutedArgs>({
      swapId: '1402785',
      brokerFee: '286415',
      inputAsset: { __kind: 'Usdc' },
      networkFee: '500000',
      inputAmount: '190656632',
      outputAsset: { __kind: 'Flip' },
      outputAmount: '503236676927995677601',
      swapRequestId: '1052770',
    }),
  },
  {
    id: '0010665509-001402-91672',
    blockId: '0010665509-91672',
    indexInBlock: 1402,
    name: 'Swapping.SwapScheduled',
    args: check<SwapScheduledArgs>({
      swapId: '1402788',
      swapType: { __kind: 'Swap' },
      executeAt: 10665511,
      inputAmount: '191443047',
      swapRequestId: '1052770',
    }),
  },
  {
    id: '0010665510-001339-b4f28',
    blockId: '0010665510-b4f28',
    indexInBlock: 1339,
    name: 'Swapping.SwapExecuted',
    args: check<SwapExecutedArgs>({
      swapId: '1402786',
      brokerFee: '287165',
      inputAsset: { __kind: 'Usdc' },
      networkFee: '0',
      inputAmount: '191155882',
      outputAsset: { __kind: 'Flip' },
      outputAmount: '503886303051575841122',
      swapRequestId: '1052770',
    }),
  },
  {
    id: '0010665510-001340-b4f28',
    blockId: '0010665510-b4f28',
    indexInBlock: 1340,
    name: 'Swapping.SwapScheduled',
    args: check<SwapScheduledArgs>({
      swapId: '1402790',
      swapType: { __kind: 'Swap' },
      executeAt: 10665512,
      inputAmount: '191443047',
      swapRequestId: '1052770',
    }),
  },
  {
    id: '0010665511-001201-100a8',
    blockId: '0010665511-100a8',
    indexInBlock: 1201,
    name: 'Swapping.SwapExecuted',
    args: check<SwapExecutedArgs>({
      swapId: '1402788',
      brokerFee: '287165',
      inputAsset: { __kind: 'Usdc' },
      networkFee: '0',
      inputAmount: '191155882',
      outputAsset: { __kind: 'Flip' },
      outputAmount: '503217746350251239404',
      swapRequestId: '1052770',
    }),
  },
  {
    id: '0010665511-001202-100a8',
    blockId: '0010665511-100a8',
    indexInBlock: 1202,
    name: 'Swapping.SwapScheduled',
    args: check<SwapScheduledArgs>({
      swapId: '1402791',
      swapType: { __kind: 'Swap' },
      executeAt: 10665513,
      inputAmount: '191443048',
      swapRequestId: '1052770',
    }),
  },
  {
    id: '0010665512-001541-f9f60',
    blockId: '0010665512-f9f60',
    indexInBlock: 1541,
    name: 'Swapping.SwapExecuted',
    args: check<SwapExecutedArgs>({
      swapId: '1402790',
      brokerFee: '287053',
      inputAsset: { __kind: 'Usdc' },
      networkFee: '74329',
      inputAmount: '191081665',
      outputAsset: { __kind: 'Flip' },
      outputAmount: '502354661453667401360',
      swapRequestId: '1052770',
    }),
  },
  {
    id: '0010665512-001542-f9f60',
    blockId: '0010665512-f9f60',
    indexInBlock: 1542,
    name: 'Swapping.SwapScheduled',
    args: check<SwapScheduledArgs>({
      swapId: '1402792',
      swapType: { __kind: 'Swap' },
      executeAt: 10665514,
      inputAmount: '191443048',
      swapRequestId: '1052770',
    }),
  },
  {
    id: '0010665513-001504-a078d',
    blockId: '0010665513-a078d',
    indexInBlock: 1504,
    name: 'Swapping.SwapExecuted',
    args: check<SwapExecutedArgs>({
      swapId: '1402791',
      brokerFee: '287053',
      inputAsset: { __kind: 'Usdc' },
      networkFee: '74329',
      inputAmount: '191081666',
      outputAsset: { __kind: 'Flip' },
      outputAmount: '501689280415830250981',
      swapRequestId: '1052770',
    }),
  },
  {
    id: '0010665513-001505-a078d',
    blockId: '0010665513-a078d',
    indexInBlock: 1505,
    name: 'Swapping.SwapScheduled',
    args: check<SwapScheduledArgs>({
      swapId: '1402794',
      swapType: { __kind: 'Swap' },
      executeAt: 10665515,
      inputAmount: '191443048',
      swapRequestId: '1052770',
    }),
  },
  {
    id: '0010665514-001514-04a8f',
    blockId: '0010665514-04a8f',
    indexInBlock: 1514,
    name: 'Swapping.SwapExecuted',
    args: check<SwapExecutedArgs>({
      swapId: '1402792',
      brokerFee: '286877',
      inputAsset: { __kind: 'Usdc' },
      networkFee: '191443',
      inputAmount: '190964728',
      outputAsset: { __kind: 'Flip' },
      outputAmount: '500719667826785355226',
      swapRequestId: '1052770',
    }),
  },
  {
    id: '0010665514-001515-04a8f',
    blockId: '0010665514-04a8f',
    indexInBlock: 1515,
    name: 'Swapping.SwapScheduled',
    args: check<SwapScheduledArgs>({
      swapId: '1402796',
      swapType: { __kind: 'Swap' },
      executeAt: 10665516,
      inputAmount: '191443048',
      swapRequestId: '1052770',
    }),
  },
  {
    id: '0010665515-001274-5d8b9',
    blockId: '0010665515-5d8b9',
    indexInBlock: 1274,
    name: 'Swapping.SwapExecuted',
    args: check<SwapExecutedArgs>({
      swapId: '1402794',
      brokerFee: '286877',
      inputAsset: { __kind: 'Usdc' },
      networkFee: '191443',
      inputAmount: '190964728',
      outputAsset: { __kind: 'Flip' },
      outputAmount: '500058467094209640352',
      swapRequestId: '1052770',
    }),
  },
  {
    id: '0010665515-001275-5d8b9',
    blockId: '0010665515-5d8b9',
    indexInBlock: 1275,
    name: 'Swapping.SwapScheduled',
    args: check<SwapScheduledArgs>({
      swapId: '1402798',
      swapType: { __kind: 'Swap' },
      executeAt: 10665517,
      inputAmount: '191443048',
      swapRequestId: '1052770',
    }),
  },
  {
    id: '0010665566-001244-95253',
    blockId: '0010665566-95253',
    indexInBlock: 1244,
    name: 'Swapping.SwapAborted',
    args: check<SwappingSwapAbortedArgs>({
      reason: { __kind: 'MinPriceViolation' },
      swapId: '1402796',
    }),
  },
  {
    id: '0010665566-001245-95253',
    blockId: '0010665566-95253',
    indexInBlock: 1245,
    name: 'Swapping.SwapAborted',
    args: check<SwappingSwapAbortedArgs>({
      reason: { __kind: 'PredecessorSwapFailure' },
      swapId: '1402798',
    }),
  },
  {
    id: '0010665566-001250-95253',
    blockId: '0010665566-95253',
    indexInBlock: 1250,
    name: 'Swapping.RefundEgressScheduled',
    args: check<RefundEgressScheduledArgs>({
      asset: { __kind: 'Usdc' },
      amount: '765258262',
      egressId: [{ __kind: 'Ethereum' }, '129180'],
      egressFee: ['13930', { __kind: 'Usdc' }],
      refundFee: '500000',
      swapRequestId: '1052770',
    }),
  },
  {
    id: '0010665566-001253-95253',
    blockId: '0010665566-95253',
    indexInBlock: 1253,
    name: 'Swapping.SwapEgressScheduled',
    args: check<SwapEgressScheduledArgs>({
      asset: { __kind: 'Flip' },
      amount: '4019045226454466531050',
      egressId: [{ __kind: 'Ethereum' }, '129181'],
      egressFee: ['21100875149647035', { __kind: 'Flip' }],
      swapRequestId: '1052770',
    }),
  },
  {
    id: '0010665566-001254-95253',
    blockId: '0010665566-95253',
    indexInBlock: 1254,
    name: 'Swapping.SwapRequestCompleted',
    args: check<SwapRequestCompletedArgs>({
      swapRequestId: '1052770',
      reason: { __kind: 'Executed' },
    }),
  },
  {
    id: '0010665566-001256-95253',
    blockId: '0010665566-95253',
    indexInBlock: 1256,
    name: 'EthereumIngressEgress.BatchBroadcastRequested',
    args: check<BatchBroadcastRequestedArgsMap['Ethereum']>({
      egressIds: [
        [{ __kind: 'Ethereum' }, '129180'],
        [{ __kind: 'Ethereum' }, '129181'],
      ],
      broadcastId: 148078,
    }),
  },
  {
    id: '0010665597-001640-e49c8',
    blockId: '0010665597-e49c8',
    indexInBlock: 1640,
    name: 'EthereumBroadcaster.BroadcastSuccess',
    args: check<BroadcastSuccessArgsMap['Ethereum']>({
      broadcastId: 148078,
      transactionRef: '0x95c2cf2710b54a3d417b56a693ac7eb69e0c9f9e912a8a6988f75246f92d96b0',
      transactionOutId: {
        s: '0xbce00de83991a05f804280c38229593ff023536c181c883c9c293b1ac8abcebf',
        kTimesGAddress: '0x1ba271fde9c3608ac3ba7db8693d78bb414dd546',
      },
    }),
  },
];

describe('account creation swap', () => {
  let server: Server;
  vi.setConfig({ testTimeout: 5000 });

  beforeAll(async () => {
    mockRpcResponse({ data: environment() });
    server = app.listen(0);

    return () => {
      server.close();
    };
  });

  beforeEach(async () => {
    await prisma.$queryRaw`TRUNCATE TABLE "SwapDepositChannel", "Swap", "SwapRequest", "FailedSwap", "Broadcast", "Egress", private."DepositChannel", "AccountCreationDepositChannel", "ChainTracking" CASCADE`;
  });

  it('gets the swap info by swap request id', async () => {
    await processEvents(events, [], '200');

    const { body, status } = await request(server).get(`/v2/swaps/1052770`);

    expect(status).toBe(200);
    expect(body).toMatchInlineSnapshot(`
      {
        "brokers": [
          {
            "account": "cFJySAo3RbrtKWWb9J86jqnfTjpDCXAQ4bcJR9kt6S37i7eey",
            "commissionBps": 15,
          },
        ],
        "dcaParams": {
          "chunkIntervalBlocks": 1,
          "numberOfChunks": 12,
        },
        "deposit": {
          "amount": "2297329141",
          "txRef": "0x75dcd5891cd767160414ca15332a2d6e84328e1723695da2335e9fe1695c47a4",
          "witnessedAt": 63993036000,
          "witnessedBlockIndex": "10665506-1360",
        },
        "depositChannel": {
          "affiliateBrokers": [],
          "brokerCommissionBps": 15,
          "createdAt": 63992880000,
          "dcaParams": {
            "chunkIntervalBlocks": 1,
            "numberOfChunks": 12,
          },
          "depositAddress": "0x4b39858b89d4bdb449ff9e293af6a5fc3177f060",
          "fillOrKillParams": {
            "minPrice": "2.610019575874822479",
            "refundAddress": "0x608a6b0e501732d1af57f223bcdfe1b9d0631900",
            "retryDurationBlocks": 50,
          },
          "id": "10665480-Ethereum-854",
          "isExpired": false,
          "openedThroughBackend": false,
          "srcChainExpiryBlock": "23900106",
        },
        "destAddress": "0x608a6b0e501732d1af57f223bcdfe1b9d0631900",
        "destAsset": "FLIP",
        "destChain": "Ethereum",
        "estimatedDurationSeconds": 132,
        "estimatedDurationsSeconds": {
          "deposit": 24,
          "egress": 96,
          "swap": 12,
        },
        "fees": [
          {
            "amount": "1531544",
            "asset": "USDC",
            "chain": "Ethereum",
            "type": "NETWORK",
          },
          {
            "amount": "2295020",
            "asset": "USDC",
            "chain": "Ethereum",
            "type": "BROKER",
          },
          {
            "amount": "12570",
            "asset": "USDC",
            "chain": "Ethereum",
            "type": "INGRESS",
          },
          {
            "amount": "13930",
            "asset": "USDC",
            "chain": "Ethereum",
            "type": "EGRESS",
          },
          {
            "amount": "500000",
            "asset": "USDC",
            "chain": "Ethereum",
            "type": "REFUND",
          },
          {
            "amount": "21100875149647035",
            "asset": "FLIP",
            "chain": "Ethereum",
            "type": "EGRESS",
          },
        ],
        "fillOrKillParams": {
          "minPrice": "2.610019575874822479",
          "refundAddress": "0x608a6b0e501732d1af57f223bcdfe1b9d0631900",
          "retryDurationBlocks": 50,
        },
        "refundEgress": {
          "amount": "765258262",
          "scheduledAt": 63993396000,
          "scheduledBlockIndex": "10665566-1250",
          "txRef": "0x95c2cf2710b54a3d417b56a693ac7eb69e0c9f9e912a8a6988f75246f92d96b0",
          "witnessedAt": 63993582000,
          "witnessedBlockIndex": "10665597-1640",
        },
        "srcAsset": "USDC",
        "srcChain": "Ethereum",
        "srcChainRequiredBlockConfirmations": 2,
        "state": "COMPLETED",
        "swap": {
          "dca": {
            "currentChunk": {
              "abortedAt": 63993396000,
              "abortedBlockIndex": "10665566-1244",
              "abortedReason": "MinPriceViolation",
              "inputAmount": "191443048",
              "retryCount": 0,
              "scheduledAt": 63993084000,
              "scheduledBlockIndex": "10665514-1515",
            },
            "executedChunks": 8,
            "lastExecutedChunk": {
              "executedAt": 63993090000,
              "executedBlockIndex": "10665515-1274",
              "inputAmount": "190964728",
              "outputAmount": "500058467094209640352",
              "retryCount": 0,
              "scheduledAt": 63993078000,
              "scheduledBlockIndex": "10665513-1505",
            },
            "remainingChunks": 4,
          },
          "originalInputAmount": "2297316571",
          "remainingInputAmount": "769598756",
          "swappedInputAmount": "1527717815",
          "swappedIntermediateAmount": "0",
          "swappedOutputAmount": "4019066327329616178100",
        },
        "swapEgress": {
          "amount": "4019045226454466531050",
          "scheduledAt": 63993396000,
          "scheduledBlockIndex": "10665566-1253",
          "txRef": "0x95c2cf2710b54a3d417b56a693ac7eb69e0c9f9e912a8a6988f75246f92d96b0",
          "witnessedAt": 63993582000,
          "witnessedBlockIndex": "10665597-1640",
        },
        "swapId": "1052770",
      }
    `);
  });
});

import { bytesToHex } from '@chainflip/utils/bytes';
import * as ss58 from '@chainflip/utils/ss58';
import { beforeEach, describe, it, expect } from 'vitest';
import prisma from '../../../client.js';
import { check } from '../../__tests__/utils.js';
import { EventHandlerArgs } from '../../index.js';
import refundedOnChain, { SwappingRefundedOnChainArgs } from '../refundedOnChain.js';

describe(refundedOnChain, () => {
  beforeEach(async () => {
    await prisma.$queryRaw`TRUNCATE TABLE "SwapDepositChannel", "Swap", "Egress", "SwapRequest" CASCADE`;
  });

  it('updates an existing swap request', async () => {
    await prisma.swapRequest.create({
      data: {
        srcAsset: 'Btc',
        swapInputAmount: '100000000',
        destAsset: 'Eth',
        nativeId: 1n,
        originType: 'ON_CHAIN',
        requestType: 'REGULAR',
        swapRequestedAt: new Date('2025-03-25T18:00:00Z'),
        swapRequestedBlockIndex: '1-1',
        totalBrokerCommissionBps: 0,
        onChainSwapInfo: {
          create: {
            accountId: 'cFNwtr2mPhpUEB5AyJq38DqMKMkSdzaL9548hajN2DRTwh7Mq',
          },
        },
        srcAddress: 'cFNwtr2mPhpUEB5AyJq38DqMKMkSdzaL9548hajN2DRTwh7Mq',
        destAddress: 'cFNwtr2mPhpUEB5AyJq38DqMKMkSdzaL9548hajN2DRTwh7Mq',
        fokRefundAddress: 'cFNwtr2mPhpUEB5AyJq38DqMKMkSdzaL9548hajN2DRTwh7Mq',
      },
    });

    await refundedOnChain({
      prisma,
      event: {
        args: check<SwappingRefundedOnChainArgs>({
          swapRequestId: '1',
          accountId: bytesToHex(
            ss58.decode('cFNwtr2mPhpUEB5AyJq38DqMKMkSdzaL9548hajN2DRTwh7Mq').data,
          ),
          refundFee: '2658298',
          amount: '100000000',
          asset: { __kind: 'Eth' },
        }),
      },
      block: {},
    } as unknown as EventHandlerArgs);

    expect(
      await prisma.swapRequest.findUnique({
        where: { nativeId: 1n },
        include: { onChainSwapInfo: true },
      }),
    ).toMatchInlineSnapshot(
      {
        id: expect.any(BigInt),
        onChainSwapInfo: {
          id: expect.any(Number),
          swapRequestId: expect.any(BigInt),
        },
      },
      `
      {
        "ccmGasBudget": null,
        "ccmMessage": null,
        "completedAt": null,
        "completedBlockIndex": null,
        "dcaChunkIntervalBlocks": null,
        "dcaNumberOfChunks": null,
        "depositAmount": null,
        "depositBoostedAt": null,
        "depositBoostedBlockIndex": null,
        "depositFinalisedAt": null,
        "depositFinalisedBlockIndex": null,
        "depositTransactionRef": null,
        "destAddress": "cFNwtr2mPhpUEB5AyJq38DqMKMkSdzaL9548hajN2DRTwh7Mq",
        "destAsset": "Eth",
        "effectiveBoostFeeBps": null,
        "egressId": null,
        "fallbackEgressId": null,
        "fokMinPriceX128": null,
        "fokRefundAddress": "cFNwtr2mPhpUEB5AyJq38DqMKMkSdzaL9548hajN2DRTwh7Mq",
        "fokRetryDurationBlocks": null,
        "id": Any<BigInt>,
        "maxBoostFeeBps": 0,
        "nativeId": 1n,
        "onChainSwapInfo": {
          "accountId": "cFNwtr2mPhpUEB5AyJq38DqMKMkSdzaL9548hajN2DRTwh7Mq",
          "id": Any<Number>,
          "outputAmount": null,
          "refundAmount": "100000000",
          "swapRequestId": Any<BigInt>,
        },
        "originType": "ON_CHAIN",
        "prewitnessedDepositId": null,
        "refundEgressId": null,
        "requestType": "REGULAR",
        "srcAddress": "cFNwtr2mPhpUEB5AyJq38DqMKMkSdzaL9548hajN2DRTwh7Mq",
        "srcAsset": "Btc",
        "swapDepositChannelId": null,
        "swapInputAmount": "100000000",
        "swapOutputAmount": null,
        "swapRequestedAt": 2025-03-25T18:00:00.000Z,
        "swapRequestedBlockIndex": "1-1",
        "totalBrokerCommissionBps": 0,
      }
    `,
    );
  });
  it('calculates the refund fee', async () => {
    await prisma.swapRequest.create({
      data: {
        srcAsset: 'Btc',
        swapInputAmount: '100000000',
        depositAmount: '100000000',
        destAsset: 'Eth',
        nativeId: 1n,
        originType: 'ON_CHAIN',
        requestType: 'REGULAR',
        swapRequestedAt: new Date('2025-03-25T18:00:00Z'),
        swapRequestedBlockIndex: '1-1',
        totalBrokerCommissionBps: 0,
        onChainSwapInfo: {
          create: {
            accountId: 'cFNwtr2mPhpUEB5AyJq38DqMKMkSdzaL9548hajN2DRTwh7Mq',
          },
        },
        srcAddress: 'cFNwtr2mPhpUEB5AyJq38DqMKMkSdzaL9548hajN2DRTwh7Mq',
        destAddress: 'cFNwtr2mPhpUEB5AyJq38DqMKMkSdzaL9548hajN2DRTwh7Mq',
        fokRefundAddress: 'cFNwtr2mPhpUEB5AyJq38DqMKMkSdzaL9548hajN2DRTwh7Mq',
      },
    });

    await refundedOnChain({
      prisma,
      event: {
        args: check<SwappingRefundedOnChainArgs>({
          swapRequestId: '1',
          accountId: bytesToHex(
            ss58.decode('cFNwtr2mPhpUEB5AyJq38DqMKMkSdzaL9548hajN2DRTwh7Mq').data,
          ),
          refundFee: '2658298',
          amount: '95000000',
          asset: { __kind: 'Eth' },
        }),
      },
      block: {},
    } as unknown as EventHandlerArgs);

    expect(
      await prisma.swapRequest.findUnique({
        where: { nativeId: 1n },
        include: { onChainSwapInfo: true, fees: true },
      }),
    ).toMatchInlineSnapshot(
      {
        id: expect.any(BigInt),
        onChainSwapInfo: {
          id: expect.any(Number),
          swapRequestId: expect.any(BigInt),
        },
        fees: [
          {
            swapRequestId: expect.any(BigInt),
            id: expect.any(BigInt),
          },
        ],
      }, `
      {
        "ccmGasBudget": null,
        "ccmMessage": null,
        "completedAt": null,
        "completedBlockIndex": null,
        "dcaChunkIntervalBlocks": null,
        "dcaNumberOfChunks": null,
        "depositAmount": "100000000",
        "depositBoostedAt": null,
        "depositBoostedBlockIndex": null,
        "depositFinalisedAt": null,
        "depositFinalisedBlockIndex": null,
        "depositTransactionRef": null,
        "destAddress": "cFNwtr2mPhpUEB5AyJq38DqMKMkSdzaL9548hajN2DRTwh7Mq",
        "destAsset": "Eth",
        "effectiveBoostFeeBps": null,
        "egressId": null,
        "fallbackEgressId": null,
        "fees": [
          {
            "amount": "2658298",
            "asset": "Eth",
            "id": Any<BigInt>,
            "swapId": null,
            "swapRequestId": Any<BigInt>,
            "type": "REFUND",
          },
        ],
        "fokMinPriceX128": null,
        "fokRefundAddress": "cFNwtr2mPhpUEB5AyJq38DqMKMkSdzaL9548hajN2DRTwh7Mq",
        "fokRetryDurationBlocks": null,
        "id": Any<BigInt>,
        "maxBoostFeeBps": 0,
        "nativeId": 1n,
        "onChainSwapInfo": {
          "accountId": "cFNwtr2mPhpUEB5AyJq38DqMKMkSdzaL9548hajN2DRTwh7Mq",
          "id": Any<Number>,
          "outputAmount": null,
          "refundAmount": "95000000",
          "swapRequestId": Any<BigInt>,
        },
        "originType": "ON_CHAIN",
        "prewitnessedDepositId": null,
        "refundEgressId": null,
        "requestType": "REGULAR",
        "srcAddress": "cFNwtr2mPhpUEB5AyJq38DqMKMkSdzaL9548hajN2DRTwh7Mq",
        "srcAsset": "Btc",
        "swapDepositChannelId": null,
        "swapInputAmount": "100000000",
        "swapOutputAmount": null,
        "swapRequestedAt": 2025-03-25T18:00:00.000Z,
        "swapRequestedBlockIndex": "1-1",
        "totalBrokerCommissionBps": 0,
      }
    `);
  });
});

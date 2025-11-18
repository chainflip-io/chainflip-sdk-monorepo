import { bytesToHex } from '@chainflip/utils/bytes';
import * as ss58 from '@chainflip/utils/ss58';
import { beforeEach, describe, it, expect } from 'vitest';
import prisma from '../../../client.js';
import { check } from '../../__tests__/utils.js';
import { EventHandlerArgs } from '../../index.js';
import creditedOnChain, { SwappingCreditedOnChainArgs } from '../creditedOnChain.js';

describe(creditedOnChain, () => {
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

    await creditedOnChain({
      prisma,
      event: {
        args: check<SwappingCreditedOnChainArgs>({
          swapRequestId: '1',
          accountId: bytesToHex(
            ss58.decode('cFNwtr2mPhpUEB5AyJq38DqMKMkSdzaL9548hajN2DRTwh7Mq').data,
          ),
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
      }, `
      {
        "accountCreationDepositChannelId": null,
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
        "fallbackRefundEgressId": null,
        "fokMaxOraclePriceSlippageBps": null,
        "fokMinPriceX128": null,
        "fokRefundAddress": "cFNwtr2mPhpUEB5AyJq38DqMKMkSdzaL9548hajN2DRTwh7Mq",
        "fokRetryDurationBlocks": null,
        "id": Any<BigInt>,
        "maxBoostFeeBps": 0,
        "nativeId": 1n,
        "onChainSwapInfo": {
          "accountId": "cFNwtr2mPhpUEB5AyJq38DqMKMkSdzaL9548hajN2DRTwh7Mq",
          "id": Any<Number>,
          "outputAmount": "100000000",
          "refundAmount": null,
          "swapRequestId": Any<BigInt>,
        },
        "oraclePriceDeltaBps": null,
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

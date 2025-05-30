import { describe, it, expect, beforeEach } from 'vitest';
import prisma from '../../../client.js';
import { check } from '../../__tests__/utils.js';
import { depositBoosted, DepositBoostedArgsMap } from '../depositBoosted.js';

export const depositBoostedBtcMock = async ({
  action = { __kind: 'Swap', swapRequestId: '1' },
  amounts,
  channelId,
}: {
  action?: DepositBoostedArgsMap['Bitcoin']['action'];
  amounts?: [[number, string]];
  channelId?: string;
} = {}) => {
  const args: DepositBoostedArgsMap['Bitcoin'] = {
    blockHeight: 120,
    asset: {
      __kind: 'Btc',
    },
    amounts: amounts ?? [[5, '1000000']],
    prewitnessedDepositId: '101',
    channelId: channelId ?? '1',
    ingressFee: '1000',
    boostFee: '500',
    action,
    depositAddress: {
      value: '0x52890cc3438775253262c88df4ab47841581ac04',
      __kind: 'P2PKH',
    },
    depositDetails: {
      id: {
        txId: '0x626b620f866caa7474598d3a34a752dba98e5c55f1e3de1c310b75ad093b32c7',
        vout: 0,
      },
      amount: '255548712',
      depositAddress: {
        pubkeyX: '0x04c3c844e48ea19973666e17e70d7ee33ebbec90c88cbd272b0997771827780b',
        scriptPath: {
          salt: 27377,
          tapleafHash: '0x9d6db76a5217b39fabbb7fa04dc9c64a8ae8a721f0201a6bf09f2f4f6f057f7a',
          unlockScript: {
            bytes: '0x02f16a752004c3c844e48ea19973666e17e70d7ee33ebbec90c88cbd272b0997771827780bac',
          },
          tweakedPubkeyBytes:
            '0x02c17b73da6f7f3d6b98bf2adafc2a040ac06d88203d63d6f9ca62bb0ac6190597',
        },
      },
    },
    maxBoostFeeBps: 0,
    originType: { __kind: 'DepositChannel' },
  };

  if (action.__kind === 'Swap' || action.__kind === 'CcmTransfer') {
    await prisma.swapRequest.create({
      data: {
        nativeId: BigInt(action.swapRequestId),
        srcAsset: 'Btc',
        destAsset: 'Flip',
        originType: 'VAULT',
        requestType: 'LEGACY_SWAP',
        depositAmount: '1000000',
        swapInputAmount: '1000000',
        swapRequestedAt: new Date('2023-01-01T00:00:00.000Z'),
        swapRequestedBlockIndex: '92-398',
        totalBrokerCommissionBps: 0,
      },
    });
  }

  return {
    block: {
      height: 120,
      timestamp: 1670337105000,
      hash: '0x123',
      specId: 'test@150',
    },
    event: {
      args,
      name: 'BitcoinIngressEgress.DepositBoosted',
      indexInBlock: 7,
    },
  } as const;
};

describe('depositBoosted', () => {
  beforeEach(async () => {
    await prisma.$queryRaw`TRUNCATE TABLE "private"."DepositChannel" CASCADE`;
    await prisma.$queryRaw`TRUNCATE TABLE "SwapDepositChannel", "Swap", "SwapRequest" CASCADE`;
  });

  it('updates the values for an existing swap', async () => {
    const { event, block } = await depositBoostedBtcMock({ amounts: [[5, '1000000']] });

    await depositBoosted('Bitcoin')({ prisma, event, block });

    const request = await prisma.swapRequest.findFirstOrThrow({
      include: { fees: { select: { asset: true, amount: true, type: true } } },
    });

    expect(request).toMatchSnapshot({
      id: expect.any(BigInt),
    });
  });

  it('updates the values for an existing ccm swap', async () => {
    const { event, block } = await depositBoostedBtcMock({
      action: { __kind: 'CcmTransfer', swapRequestId: '1' },
      amounts: [[5, '1000000']],
    });

    await depositBoosted('Bitcoin')({ prisma, event, block });

    const request = await prisma.swapRequest.findFirstOrThrow({
      include: { fees: { select: { asset: true, amount: true, type: true } } },
    });

    expect(request).toMatchSnapshot({
      id: expect.any(BigInt),
    });
  });

  it('updates the values for event with 180 schema', async () => {
    await prisma.swapRequest.create({
      data: {
        nativeId: 159,
        srcAsset: 'Btc',
        destAsset: 'Eth',
        destAddress: '0x41ad2bc63a2059f9b623533d87fe99887d794847',
        swapInputAmount: '10000000',
        originType: 'VAULT',
        requestType: 'REGULAR',
        swapRequestedAt: new Date('2024-08-06T00:00:00.000Z'),
        swapRequestedBlockIndex: '1-1',
        totalBrokerCommissionBps: 0,
      },
    });

    await depositBoosted('Bitcoin')({
      prisma,
      block: {
        height: 120,
        timestamp: 1670337105000,
        hash: '0x123',
        specId: 'test@150',
      },
      event: {
        args: check<DepositBoostedArgsMap['Bitcoin']>({
          asset: {
            __kind: 'Btc',
          },
          action: {
            __kind: 'Swap',
            swapRequestId: '159',
          },
          amounts: [[4, '10000000']],
          boostFee: '4000',
          channelId: '7',
          ingressFee: '79',
          originType: {
            __kind: 'DepositChannel',
          },
          blockHeight: '49020',
          depositAddress: {
            value: '0x6637a004f3e8536158ee981490b559d6ea0ae92f086d4911454ab88fdbc2c523',
            __kind: 'Taproot',
          },
          depositDetails: {
            id: {
              txId: '0xcc76691987ad74f75e247bf86549d643f281ff1bd2256e994c899a549d6809a6',
              vout: 0,
            },
            amount: '10000000',
            depositAddress: {
              pubkeyX: '0xd02106f2d8b619bc95b662340f904af6d67bd0efebd1692a839cbc172bbd8a07',
              scriptPath: {
                salt: 7,
                tapleafHash: '0x5c2c1bf4030a5249bb8911aa6ee785f4969764ed6f1752adfbf643ffd011808d',
                unlockScript: {
                  bytes:
                    '0x577520d02106f2d8b619bc95b662340f904af6d67bd0efebd1692a839cbc172bbd8a07ac',
                },
                tweakedPubkeyBytes:
                  '0x026637a004f3e8536158ee981490b559d6ea0ae92f086d4911454ab88fdbc2c523',
              },
            },
          },
          maxBoostFeeBps: 7,
          prewitnessedDepositId: '6',
        }),
        name: 'BitcoinIngressEgress.DepositBoosted',
        indexInBlock: 7,
      },
    });

    const request = await prisma.swapRequest.findFirstOrThrow({
      include: { fees: { select: { asset: true, amount: true, type: true } } },
    });

    expect(request).toMatchSnapshot({
      id: expect.any(BigInt),
    });
  });
});

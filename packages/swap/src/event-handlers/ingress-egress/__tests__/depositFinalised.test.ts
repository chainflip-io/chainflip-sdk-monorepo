import { vi, describe, it, expect, beforeEach } from 'vitest';
import prisma from '../../../client.js';
import { check, createDepositChannel } from '../../__tests__/utils.js';
import { depositFinalised, DepositFinalisedArgsMap } from '../depositFinalised.js';

vi.mock('@chainflip/solana');

describe(depositFinalised, () => {
  beforeEach(async () => {
    await prisma.$queryRaw`TRUNCATE TABLE "SwapDepositChannel", "Swap", "SwapRequest" CASCADE`;
  });

  describe('Bitcoin', () => {
    beforeEach(async () => {
      const btcSwapDepositChannel = await createDepositChannel({
        srcChain: 'Bitcoin',
        srcAsset: 'Btc',
        destAsset: 'Eth',
        depositAddress: 'bcrt1pzjdpc799qa5f7m65hpr66880res5ac3lr6y2chc4jsa',
        destAddress: '0x41ad2bc63a2059f9b623533d87fe99887d794847',
        isExpired: true,
      });

      await prisma.swapRequest.create({
        data: {
          nativeId: 57034,
          srcAsset: 'Btc',
          destAsset: 'Eth',
          destAddress: '0x41ad2bc63a2059f9b623533d87fe99887d794847',
          swapDepositChannelId: btcSwapDepositChannel.id,
          swapInputAmount: '100000000',
          originType: 'DEPOSIT_CHANNEL',
          requestType: 'REGULAR',
          swapRequestedAt: new Date('2024-08-06T00:00:00.000Z'),
          swapRequestedBlockIndex: '1-1',
          totalBrokerCommissionBps: 0,
        },
      });
    });

    it('updates swap request for regular deposit', async () => {
      await depositFinalised('Bitcoin')({
        prisma,
        block: {
          height: 10,
          specId: 'test@190',
          timestamp: '2024-08-06T00:00:06.000Z',
          hash: '0x123',
        },
        event: {
          args: {
            asset: {
              __kind: 'Btc',
            },
            action: {
              __kind: 'Swap',
              swapRequestId: '57034',
            },
            amount: '1000000',
            channelId: '0',
            ingressFee: '4668',
            depositAddress: {
              value: '0xeafd844c99bda909de3087d9398ce50764f3f615d1b443fc89e315c3353ede8c',
              __kind: 'Taproot',
            },
            depositDetails: {
              id: {
                txId: '0x2f5fb94313817636321d9091465215f6fd353c8ab7d19c8a07e10a9b5c892108',
                vout: 0,
              },
              amount: '255548712',
              depositAddress: {
                pubkeyX: '0x04c3c844e48ea19973666e17e70d7ee33ebbec90c88cbd272b0997771827780b',
                scriptPath: {
                  salt: 27377,
                  tapleafHash: '0x9d6db76a5217b39fabbb7fa04dc9c64a8ae8a721f0201a6bf09f2f4f6f057f7a',
                  unlockScript: {
                    bytes:
                      '0x02f16a752004c3c844e48ea19973666e17e70d7ee33ebbec90c88cbd272b0997771827780bac',
                  },
                  tweakedPubkeyBytes:
                    '0x02c17b73da6f7f3d6b98bf2adafc2a040ac06d88203d63d6f9ca62bb0ac6190597',
                },
              },
            },
            blockHeight: '128',
            maxBoostFeeBps: 0,
            originType: { __kind: 'DepositChannel' },
          },
          indexInBlock: 7,
        } as any,
      });

      expect(
        await prisma.swapRequest.findFirstOrThrow({ include: { fees: true } }),
      ).toMatchSnapshot({
        id: expect.any(BigInt),
        swapDepositChannelId: expect.any(BigInt),
        fees: [{ id: expect.any(BigInt), swapRequestId: expect.any(BigInt) }],
      });
    });

    it('updates swap request for regular deposit with 190 schema', async () => {
      await depositFinalised('Bitcoin')({
        prisma,
        block: {
          height: 10,
          specId: 'test@150',
          timestamp: '2024-08-06T00:00:06.000Z',
          hash: '0x123',
        },
        event: {
          args: check<DepositFinalisedArgsMap['Bitcoin']>({
            asset: {
              __kind: 'Btc',
            },
            action: {
              __kind: 'Swap',
              swapRequestId: '57034',
            },
            amount: '10000000',
            channelId: '7',
            ingressFee: '2500',
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
            maxBoostFeeBps: 4,
          }),
          indexInBlock: 7,
        } as any,
      });

      expect(
        await prisma.swapRequest.findFirstOrThrow({ include: { fees: true } }),
      ).toMatchSnapshot({
        id: expect.any(BigInt),
        swapDepositChannelId: expect.any(BigInt),
        fees: [{ id: expect.any(BigInt), swapRequestId: expect.any(BigInt) }],
      });
    });

    it('updates swap request for boosted deposit', async () => {
      await prisma.swapRequest.update({
        where: {
          nativeId: 57034,
        },
        data: {
          prewitnessedDepositId: 5265,
        },
      });

      await depositFinalised('Bitcoin')({
        prisma,
        block: {
          height: 10,
          specId: 'test@190',
          timestamp: '2024-08-06T00:00:06.000Z',
          hash: '0x123',
        },
        event: {
          args: check<DepositFinalisedArgsMap['Bitcoin']>({
            asset: {
              __kind: 'Btc',
            },
            action: {
              __kind: 'BoostersCredited',
              prewitnessedDepositId: '5265',
              networkFeeFromBoost: '0',
            },
            amount: '1000000',
            channelId: '0',
            ingressFee: '4668',
            depositAddress: {
              value: '0xeafd844c99bda909de3087d9398ce50764f3f615d1b443fc89e315c3353ede8c',
              __kind: 'Taproot',
            },
            depositDetails: {
              id: {
                txId: '0x2f5fb94313817636321d9091465215f6fd353c8ab7d19c8a07e10a9b5c892108',
                vout: 0,
              },
              amount: '255548712',
              depositAddress: {
                pubkeyX: '0x04c3c844e48ea19973666e17e70d7ee33ebbec90c88cbd272b0997771827780b',
                scriptPath: {
                  salt: 27377,
                  tapleafHash: '0x9d6db76a5217b39fabbb7fa04dc9c64a8ae8a721f0201a6bf09f2f4f6f057f7a',
                  unlockScript: {
                    bytes:
                      '0x02f16a752004c3c844e48ea19973666e17e70d7ee33ebbec90c88cbd272b0997771827780bac',
                  },
                  tweakedPubkeyBytes:
                    '0x02c17b73da6f7f3d6b98bf2adafc2a040ac06d88203d63d6f9ca62bb0ac6190597',
                },
              },
            },
            blockHeight: '128',
            maxBoostFeeBps: 0,
            originType: { __kind: 'DepositChannel' },
          }),
          indexInBlock: 7,
        } as any,
      });

      expect(await prisma.swapRequest.findFirstOrThrow()).toMatchSnapshot({
        id: expect.any(BigInt),
        swapDepositChannelId: expect.any(BigInt),
      });
    });
  });

  it('extracts deposit details for Solana', async () => {
    const request = await prisma.swapRequest.create({
      data: {
        nativeId: 57034,
        srcAsset: 'Sol',
        destAsset: 'Eth',
        destAddress: '0x41ad2bc63a2059f9b623533d87fe99887d794847',
        swapInputAmount: '100000000',
        originType: 'VAULT',
        requestType: 'REGULAR',
        swapRequestedAt: new Date('2024-08-06T00:00:00.000Z'),
        swapRequestedBlockIndex: '1-1',
        totalBrokerCommissionBps: 0,
      },
    });

    await expect(
      depositFinalised('Solana')({
        prisma,
        block: {
          height: 10,
          specId: 'test@190',
          timestamp: '2024-08-06T00:00:06.000Z',
          hash: '0x123',
        },
        event: {
          name: 'SolanaIngressEgress.DepositFinalised',
          args: check<DepositFinalisedArgsMap['Solana']>({
            action: { __kind: 'Swap', swapRequestId: request.nativeId.toString() },
            amount: '100000000',
            asset: { __kind: 'Sol' },
            blockHeight: '128',
            ingressFee: '0',
            maxBoostFeeBps: 0,
            originType: { __kind: 'Vault' },
          }),
          indexInBlock: 7,
        },
      }),
    ).resolves.not.toThrow();
  });

  it('handles vault swap refunds', async () => {
    await depositFinalised('Solana')({
      prisma,
      block: {
        height: 10,
        specId: 'test@190',
        timestamp: '2024-08-06T00:00:06.000Z',
        hash: '0x123',
      },
      event: {
        name: 'SolanaIngressEgress.DepositFinalised',
        args: check<DepositFinalisedArgsMap['Solana']>({
          action: {
            __kind: 'Refund',
            amount: '99999999',
            reason: { __kind: 'CcmInvalidMetadata' },
            egressId: [{ __kind: 'Solana' }, 1],
          },
          amount: '100000000',
          asset: { __kind: 'Sol' },
          blockHeight: '128',
          ingressFee: '0',
          maxBoostFeeBps: 0,
          originType: { __kind: 'Vault' },
          depositAddress: '0x8275ca5db8b35bfe42ce5a53a27bf794d99cc0f33dfb97a96cb6f88e9b2a536a',
        }),
        indexInBlock: 7,
      },
    });

    const fs = await prisma.failedSwap.findFirstOrThrow({
      include: { refundEgress: true, solanaPendingTxRef: true },
    });

    expect(fs).toMatchInlineSnapshot(
      {
        id: expect.any(Number),
        refundEgressId: expect.any(BigInt),
        solanaPendingTxRef: [
          {
            id: expect.any(Number),
            failedVaultSwapId: expect.any(Number),
          },
        ],
        refundEgress: {
          id: expect.any(BigInt),
        },
      },
      `
      {
        "ccmAdditionalData": null,
        "ccmGasBudget": null,
        "ccmMessage": null,
        "depositAmount": "100000000",
        "depositTransactionRef": null,
        "destAddress": null,
        "destAsset": null,
        "destChain": null,
        "failedAt": 2024-08-06T00:00:06.000Z,
        "failedBlockIndex": "10-7",
        "id": Any<Number>,
        "reason": "CcmInvalidMetadata",
        "refundBroadcastId": null,
        "refundEgress": {
          "amount": "99999999",
          "broadcastId": null,
          "chain": "Solana",
          "fallbackDestinationAddress": null,
          "id": Any<BigInt>,
          "nativeId": 1n,
          "scheduledAt": 2024-08-06T00:00:06.000Z,
          "scheduledBlockIndex": "10-7",
        },
        "refundEgressId": Any<BigInt>,
        "solanaPendingTxRef": [
          {
            "address": "9nGBAS5eSSYLak3QgsmPTEsJtpquXdCCXrSGU5ffMC1X",
            "failedVaultSwapId": Any<Number>,
            "id": Any<Number>,
            "slot": 128n,
            "swapDepositChannelId": null,
            "vaultSwapRequestId": null,
          },
        ],
        "srcAsset": "Sol",
        "srcChain": "Solana",
        "swapDepositChannelId": null,
      }
    `,
    );
  });
});

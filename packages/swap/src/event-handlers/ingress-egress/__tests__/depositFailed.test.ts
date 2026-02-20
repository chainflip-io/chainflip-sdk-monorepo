import * as base58 from '@chainflip/utils/base58';
import { bytesToHex } from '@chainflip/utils/bytes';
import * as ss58 from '@chainflip/utils/ss58';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import prisma, { SwapDepositChannel } from '../../../client.js';
import {
  BTC_ADDRESS,
  DOT_ADDRESS,
  ETH_ADDRESS,
  buildDepositFailedEvent,
  createDepositChannel,
} from '../../__tests__/utils.js';
import networkDepositFailed from '../depositFailed.js';

const ethDepositFailedMock = buildDepositFailedEvent({
  reason: { __kind: 'BelowMinimumDeposit' },
  details: {
    __kind: 'DepositFailedDepositChannelVariantEthereum',
    depositWitness: {
      asset: { __kind: 'Eth' },
      amount: '100000000000000',
      depositAddress: ETH_ADDRESS,
      depositDetails: {
        txHashes: ['0x1234'],
      },
    },
  },
  blockHeight: 1234,
});
const dotDepositFailedMock = buildDepositFailedEvent({
  reason: { __kind: 'BelowMinimumDeposit' },
  details: {
    __kind: 'DepositFailedDepositChannelVariantAssethub',
    depositWitness: {
      asset: { __kind: 'HubDot' },
      amount: '190000000000',
      depositAddress: bytesToHex(ss58.decode(DOT_ADDRESS).data),
      depositDetails: 2,
    },
  },
  blockHeight: 12140,
});
const btcDepositFailedMock = buildDepositFailedEvent({
  reason: { __kind: 'BelowMinimumDeposit' },
  details: {
    __kind: 'DepositFailedDepositChannelVariantBitcoin',
    depositWitness: {
      asset: { __kind: 'Btc' },
      amount: '100000000000',
      depositAddress: {
        __kind: 'Taproot',
        value: '0x68a3db628eea903d159131fcb4a1f6ed0be6980c4ff42b80d5229ea26a38439e',
      },
      depositDetails: {
        id: {
          txId: '0x012345',
          vout: 0,
        },
        amount: '100000000000',
        depositAddress: {
          pubkeyX: '0x',
          scriptPath: {
            salt: 0,
            tweakedPubkeyBytes: '0x',
            tapleafHash: '0x',
            unlockScript: { bytes: '0x' },
          },
        },
      },
    },
  },
  blockHeight: 1234,
});
const SOL_ADDRESS = 'HZC6KyQYbxbKGiyWbBrwhxrPPecFi2yKG9jMwFqwNEtJ';
const solDepositFailedMock = buildDepositFailedEvent({
  reason: { __kind: 'BelowMinimumDeposit' },
  details: {
    __kind: 'DepositFailedDepositChannelVariantSolana',
    depositWitness: {
      asset: { __kind: 'Sol' },
      amount: '1000000000',
      depositAddress: bytesToHex(base58.decode(SOL_ADDRESS)),
      depositDetails: {
        __kind: 'VaultSwapAccount',
        value: [bytesToHex(base58.decode(SOL_ADDRESS)), '1234'],
      },
    },
  },
  blockHeight: 1234,
});
const solVaultDepositFailedMock = buildDepositFailedEvent({
  reason: { __kind: 'BelowMinimumDeposit' },
  details: {
    __kind: 'DepositFailedVaultVariantSolana',
    vaultWitness: {
      inputAsset: { __kind: 'Sol' },
      outputAsset: { __kind: 'Eth' },
      depositAmount: '1000000000',
      destinationAddress: { __kind: 'Eth', value: ETH_ADDRESS },
      depositAddress: bytesToHex(base58.decode(SOL_ADDRESS)),
      txId: [bytesToHex(base58.decode(SOL_ADDRESS)), '1234'],
      affiliateFees: [],
      boostFee: 0,
      refundParams: {
        minPrice: '0',
        refundAddress: ETH_ADDRESS,
        retryDuration: 100,
      },
      depositDetails: {
        __kind: 'VaultSwapAccount',
        value: [bytesToHex(base58.decode(SOL_ADDRESS)), '1234'],
      },
    },
  },
  blockHeight: 1234,
});

const createGenericChannel = async (channel: SwapDepositChannel) =>
  prisma.depositChannel.create({
    data: {
      isSwapping: true,
      depositAddress: channel.depositAddress,
      issuedBlock: channel.issuedBlock,
      srcChain: channel.srcChain,
      channelId: channel.channelId,
      type: 'SWAP',
    },
  });

describe(networkDepositFailed, () => {
  beforeEach(async () => {
    await prisma.$queryRaw`TRUNCATE TABLE "SwapDepositChannel", private."DepositChannel", private."SolanaPendingTxRef" CASCADE`;
    await prisma.$queryRaw`TRUNCATE TABLE "FailedSwap", "Swap" CASCADE`;
  });

  afterEach(async () => {
    vi.resetAllMocks();
  });

  describe('11000', () => {
    it('handles failed eth deposits', async () => {
      const channel = await createDepositChannel({
        id: 100n,
        srcChain: 'Ethereum',
        depositAddress: ETH_ADDRESS,
        channelId: 99n,
        destAsset: 'HubDot',
        destAddress: DOT_ADDRESS,
      });

      await createGenericChannel(channel);

      await networkDepositFailed('Ethereum')({
        prisma,
        ...ethDepositFailedMock,
      });

      const { id, swapDepositChannelId, ...failedSwap } =
        await prisma.failedSwap.findFirstOrThrow();
      expect(swapDepositChannelId).toBe(channel.id);
      expect(failedSwap).toMatchInlineSnapshot(`
        {
          "accountCreationDepositChannelId": null,
          "ccmAdditionalData": null,
          "ccmGasBudget": null,
          "ccmMessage": null,
          "depositAmount": "100000000000000",
          "depositTransactionRef": "0x1234",
          "destAddress": "1yMmfLti1k3huRQM2c47WugwonQMqTvQ2GUFxnU7Pcs7xPo",
          "destAsset": "HubDot",
          "destChain": "Ethereum",
          "failedAt": 2022-12-06T14:31:33.000Z,
          "failedBlockIndex": "100-0",
          "reason": "BelowMinimumDeposit",
          "refundBroadcastId": null,
          "refundEgressId": null,
          "srcAsset": "Eth",
          "srcChain": "Ethereum",
        }
      `);
    });

    it('handles failed dot deposits', async () => {
      const channel = await createDepositChannel({
        id: 100n,
        srcChain: 'Assethub',
        depositAddress: DOT_ADDRESS,
        channelId: 99n,
        destAsset: 'Eth',
        destAddress: ETH_ADDRESS,
      });

      await createGenericChannel(channel);

      await networkDepositFailed('Assethub')({
        prisma,
        ...dotDepositFailedMock,
      });

      const { id, swapDepositChannelId, ...failedSwap } =
        await prisma.failedSwap.findFirstOrThrow();
      expect(swapDepositChannelId).toBe(channel.id);
      expect(failedSwap).toMatchInlineSnapshot(`
        {
          "accountCreationDepositChannelId": null,
          "ccmAdditionalData": null,
          "ccmGasBudget": null,
          "ccmMessage": null,
          "depositAmount": "190000000000",
          "depositTransactionRef": "12140-2",
          "destAddress": "0x6Aa69332B63bB5b1d7Ca5355387EDd5624e181F2",
          "destAsset": "Eth",
          "destChain": "Ethereum",
          "failedAt": 2022-12-06T14:31:33.000Z,
          "failedBlockIndex": "100-0",
          "reason": "BelowMinimumDeposit",
          "refundBroadcastId": null,
          "refundEgressId": null,
          "srcAsset": "Eth",
          "srcChain": "Assethub",
        }
      `);
    });

    it('handles failed btc deposits', async () => {
      const channel = await createDepositChannel({
        id: 100n,
        srcChain: 'Bitcoin',
        depositAddress: BTC_ADDRESS,
        channelId: 99n,
        destAsset: 'Eth',
        destAddress: ETH_ADDRESS,
      });

      await createGenericChannel(channel);

      await networkDepositFailed('Bitcoin')({
        prisma,
        ...btcDepositFailedMock,
      });

      const { id, swapDepositChannelId, ...failedSwap } =
        await prisma.failedSwap.findFirstOrThrow();
      expect(swapDepositChannelId).toBe(channel.id);
      expect(failedSwap).toMatchInlineSnapshot(`
        {
          "accountCreationDepositChannelId": null,
          "ccmAdditionalData": null,
          "ccmGasBudget": null,
          "ccmMessage": null,
          "depositAmount": "100000000000",
          "depositTransactionRef": "452301",
          "destAddress": "0x6Aa69332B63bB5b1d7Ca5355387EDd5624e181F2",
          "destAsset": "Eth",
          "destChain": "Ethereum",
          "failedAt": 2022-12-06T14:31:33.000Z,
          "failedBlockIndex": "100-0",
          "reason": "BelowMinimumDeposit",
          "refundBroadcastId": null,
          "refundEgressId": null,
          "srcAsset": "Eth",
          "srcChain": "Bitcoin",
        }
      `);
    });

    it('handles failed sol channel deposits', async () => {
      const channel = await createDepositChannel({
        id: 100n,
        srcChain: 'Solana',
        srcAsset: 'Sol',
        depositAddress: SOL_ADDRESS,
        channelId: 99n,
        destAsset: 'Eth',
        destAddress: ETH_ADDRESS,
      });

      await createGenericChannel(channel);

      await networkDepositFailed('Solana')({
        prisma,
        ...solDepositFailedMock,
      });

      const { id, swapDepositChannelId, ...failedSwap } =
        await prisma.failedSwap.findFirstOrThrow();
      expect(swapDepositChannelId).toBe(channel.id);
      expect(failedSwap).toMatchInlineSnapshot(`
        {
          "accountCreationDepositChannelId": null,
          "ccmAdditionalData": null,
          "ccmGasBudget": null,
          "ccmMessage": null,
          "depositAmount": "1000000000",
          "depositTransactionRef": null,
          "destAddress": "0x6Aa69332B63bB5b1d7Ca5355387EDd5624e181F2",
          "destAsset": "Eth",
          "destChain": "Solana",
          "failedAt": 2022-12-06T14:31:33.000Z,
          "failedBlockIndex": "100-0",
          "reason": "BelowMinimumDeposit",
          "refundBroadcastId": null,
          "refundEgressId": null,
          "srcAsset": "Sol",
          "srcChain": "Solana",
        }
      `);
      const pendingSolanaTxRef = await prisma.solanaPendingTxRef.findFirstOrThrow({
        where: { swapDepositChannelId: channel.id },
      });
      expect(pendingSolanaTxRef).toMatchInlineSnapshot(
        {
          id: expect.any(Number),
          swapDepositChannelId: expect.any(BigInt),
        },
        `
        {
          "accountCreationDepositChannelId": null,
          "address": null,
          "failedVaultSwapId": null,
          "id": Any<Number>,
          "slot": null,
          "swapDepositChannelId": Any<BigInt>,
          "vaultSwapRequestId": null,
        }
      `,
      );
    });

    it('handles failed sol vault deposits', async () => {
      await networkDepositFailed('Solana')({ prisma, ...solVaultDepositFailedMock });

      const { id, ...failedSwap } = await prisma.failedSwap.findFirstOrThrow();
      expect(failedSwap).toMatchInlineSnapshot(`
        {
          "accountCreationDepositChannelId": null,
          "ccmAdditionalData": null,
          "ccmGasBudget": null,
          "ccmMessage": null,
          "depositAmount": "1000000000",
          "depositTransactionRef": null,
          "destAddress": "0x6Aa69332B63bB5b1d7Ca5355387EDd5624e181F2",
          "destAsset": "Eth",
          "destChain": "Solana",
          "failedAt": 2022-12-06T14:31:33.000Z,
          "failedBlockIndex": "100-0",
          "reason": "BelowMinimumDeposit",
          "refundBroadcastId": null,
          "refundEgressId": null,
          "srcAsset": "Sol",
          "srcChain": "Solana",
          "swapDepositChannelId": null,
        }
      `);
      const pendingSolanaTxRef = await prisma.solanaPendingTxRef.findFirstOrThrow({
        where: { failedVaultSwapId: id },
      });
      expect(pendingSolanaTxRef).toMatchInlineSnapshot(
        {
          id: expect.any(Number),
          failedVaultSwapId: expect.any(Number),
        },
        `
        {
          "accountCreationDepositChannelId": null,
          "address": "HZC6KyQYbxbKGiyWbBrwhxrPPecFi2yKG9jMwFqwNEtJ",
          "failedVaultSwapId": Any<Number>,
          "id": Any<Number>,
          "slot": 1234n,
          "swapDepositChannelId": null,
          "vaultSwapRequestId": null,
        }
      `,
      );
    });
  });
});

import { bytesToHex } from '@chainflip/utils/bytes';
import * as ss58 from '@chainflip/utils/ss58';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  BTC_ADDRESS,
  DOT_ADDRESS,
  ETH_ADDRESS,
  buildDepositFailedEvent,
  createDepositChannel,
} from './utils';
import prisma, { SwapDepositChannel } from '../../client';
import networkDepositFailed from '../networkDepositFailed';

const ethDepositFailedMock = buildDepositFailedEvent({
  reason: { __kind: 'BelowMinimumDeposit' },
  details: {
    __kind: 'DepositChannel',
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
    __kind: 'DepositChannel',
    depositWitness: {
      asset: { __kind: 'Dot' },
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
    __kind: 'DepositChannel',
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

const createGenericChannel = async (channel: SwapDepositChannel) =>
  prisma.depositChannel.create({
    data: {
      isSwapping: true,
      depositAddress: channel.depositAddress,
      issuedBlock: channel.issuedBlock,
      srcChain: channel.srcChain,
      channelId: channel.channelId,
    },
  });

describe(networkDepositFailed, () => {
  beforeEach(async () => {
    await prisma.$queryRaw`TRUNCATE TABLE "SwapDepositChannel", private."DepositChannel", "Swap" CASCADE`;
    await prisma.$queryRaw`TRUNCATE TABLE "FailedSwap", "Swap" CASCADE`;
  });

  afterEach(async () => {
    vi.resetAllMocks();
  });

  it('handles failed eth deposits', async () => {
    const channel = await createDepositChannel({
      id: 100n,
      srcChain: 'Ethereum',
      depositAddress: ETH_ADDRESS,
      channelId: 99n,
      destAsset: 'Dot',
      destAddress: DOT_ADDRESS,
    });

    await createGenericChannel(channel);

    await networkDepositFailed('Ethereum')({
      prisma,
      ...ethDepositFailedMock,
    });

    const { id, swapDepositChannelId, ...failedSwap } = await prisma.failedSwap.findFirstOrThrow();
    expect(swapDepositChannelId).toBe(channel.id);
    expect(failedSwap).toMatchInlineSnapshot(`
      {
        "ccmAdditionalData": null,
        "ccmGasBudget": null,
        "ccmMessage": null,
        "depositAmount": "100000000000000",
        "depositTransactionRef": "0x1234",
        "destAddress": "1yMmfLti1k3huRQM2c47WugwonQMqTvQ2GUFxnU7Pcs7xPo",
        "destAsset": "Dot",
        "destChain": "Ethereum",
        "failedAt": 2022-12-06T14:31:33.000Z,
        "failedBlockIndex": "100-0",
        "reason": "BelowMinimumDeposit",
        "refundBroadcastId": null,
        "srcAsset": "Eth",
        "srcChain": "Ethereum",
      }
    `);
  });

  it('handles failed dot deposits', async () => {
    const channel = await createDepositChannel({
      id: 100n,
      srcChain: 'Polkadot',
      depositAddress: DOT_ADDRESS,
      channelId: 99n,
      destAsset: 'Eth',
      destAddress: ETH_ADDRESS,
    });

    await createGenericChannel(channel);

    await networkDepositFailed('Polkadot')({
      prisma,
      ...dotDepositFailedMock,
    });

    const { id, swapDepositChannelId, ...failedSwap } = await prisma.failedSwap.findFirstOrThrow();
    expect(swapDepositChannelId).toBe(channel.id);
    expect(failedSwap).toMatchInlineSnapshot(`
      {
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
        "srcAsset": "Eth",
        "srcChain": "Polkadot",
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

    const { id, swapDepositChannelId, ...failedSwap } = await prisma.failedSwap.findFirstOrThrow();
    expect(swapDepositChannelId).toBe(channel.id);
    expect(failedSwap).toMatchInlineSnapshot(`
      {
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
        "srcAsset": "Eth",
        "srcChain": "Bitcoin",
      }
    `);
  });
});
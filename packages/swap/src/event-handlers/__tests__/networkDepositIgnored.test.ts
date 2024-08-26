import { bytesToHex } from '@chainflip/utils/bytes';
import * as ss58 from '@chainflip/utils/ss58';
import {
  BTC_ADDRESS,
  DOT_ADDRESS,
  ETH_ADDRESS,
  buildDepositIgnoredEvent,
  createDepositChannel,
} from './utils';
import { events } from '..';
import prisma from '../../client';
import networkDepositIgnored from '../networkDepositIgnored';

const ethDepositIgnoredMock = buildDepositIgnoredEvent(
  {
    asset: { __kind: 'Eth' },
    amount: '100000000000000',
    depositAddress: ETH_ADDRESS,
    reason: { __kind: 'BelowMinimumDeposit' },
  },
  events.EthereumIngressEgress.DepositIgnored,
);
const dotDepositIgnoredMock = buildDepositIgnoredEvent(
  {
    asset: { __kind: 'Dot' },
    amount: '1000000000',
    depositAddress: bytesToHex(ss58.decode(DOT_ADDRESS).data),
    reason: { __kind: 'NotEnoughToPayFees' },
  },
  events.PolkadotIngressEgress.DepositIgnored,
);
const btcDepositIgnoredMock = buildDepositIgnoredEvent(
  {
    asset: { __kind: 'Btc' },
    amount: '100000000000',
    depositAddress: {
      __kind: 'Taproot',
      value: '0x68a3db628eea903d159131fcb4a1f6ed0be6980c4ff42b80d5229ea26a38439e',
    },
    reason: { __kind: 'BelowMinimumDeposit' },
    depositDetails: {
      txId: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
      vout: 0,
    },
  },
  events.BitcoinIngressEgress.DepositIgnored,
);

describe(networkDepositIgnored, () => {
  beforeEach(async () => {
    await prisma.$queryRaw`TRUNCATE TABLE "SwapDepositChannel", "Swap" CASCADE`;
    await prisma.$queryRaw`TRUNCATE TABLE "FailedSwap", "Swap" CASCADE`;
  });

  afterEach(async () => {
    jest.resetAllMocks();
  });

  it('handles ignored eth deposits', async () => {
    const channel = await createDepositChannel({
      id: 100n,
      srcChain: 'Ethereum',
      depositAddress: ETH_ADDRESS,
      channelId: 99n,
      destAsset: 'Dot',
      destAddress: DOT_ADDRESS,
    });

    prisma.swapDepositChannel.findFirst = jest.fn().mockResolvedValueOnce(channel);
    prisma.failedSwap.create = jest.fn();

    await networkDepositIgnored('Ethereum')({
      prisma,
      block: ethDepositIgnoredMock.block as any,
      event: ethDepositIgnoredMock.event as any,
    });

    expect(prisma.swapDepositChannel.findFirst).toHaveBeenCalledTimes(1);
    expect(prisma.swapDepositChannel.findFirst).toHaveBeenNthCalledWith(1, {
      where: {
        srcChain: 'Ethereum',
        depositAddress: ETH_ADDRESS,
      },
      orderBy: { issuedBlock: 'desc' },
    });
    expect(prisma.failedSwap.create).toHaveBeenCalledTimes(1);
    expect(prisma.failedSwap.create).toHaveBeenNthCalledWith(1, {
      data: {
        destAddress: DOT_ADDRESS,
        destChain: 'Polkadot',
        depositAmount: ethDepositIgnoredMock.event.args.amount,
        srcAsset: 'Eth',
        srcChain: 'Ethereum',
        swapDepositChannelId: 100n,
        reason: 'BelowMinimumDeposit',
        failedAt: new Date(ethDepositIgnoredMock.block.timestamp),
        failedBlockIndex: `${ethDepositIgnoredMock.block.height}-${ethDepositIgnoredMock.event.indexInBlock}`,
      },
    });
  });

  it('handles ignored dot deposits', async () => {
    const channel = await createDepositChannel({
      id: 100n,
      srcChain: 'Polkadot',
      depositAddress: DOT_ADDRESS,
      channelId: 99n,
      destAsset: 'Eth',
      destAddress: ETH_ADDRESS,
    });

    prisma.swapDepositChannel.findFirst = jest.fn().mockResolvedValueOnce(channel);
    prisma.failedSwap.create = jest.fn();

    await networkDepositIgnored('Polkadot')({
      prisma,
      block: dotDepositIgnoredMock.block as any,
      event: dotDepositIgnoredMock.event as any,
    });

    expect(prisma.swapDepositChannel.findFirst).toHaveBeenCalledTimes(1);
    expect(prisma.swapDepositChannel.findFirst).toHaveBeenNthCalledWith(1, {
      where: {
        srcChain: 'Polkadot',
        depositAddress: DOT_ADDRESS,
      },
      orderBy: { issuedBlock: 'desc' },
    });
    expect(prisma.failedSwap.create).toHaveBeenCalledTimes(1);
    expect(prisma.failedSwap.create).toHaveBeenNthCalledWith(1, {
      data: {
        destAddress: ETH_ADDRESS,
        destChain: 'Ethereum',
        depositAmount: dotDepositIgnoredMock.event.args.amount,
        srcAsset: 'Dot',
        srcChain: 'Polkadot',
        swapDepositChannelId: 100n,
        reason: 'NotEnoughToPayFees',
        failedAt: new Date(ethDepositIgnoredMock.block.timestamp),
        failedBlockIndex: `${ethDepositIgnoredMock.block.height}-${ethDepositIgnoredMock.event.indexInBlock}`,
      },
    });
  });

  it('handles ignored btc deposits', async () => {
    const channel = await createDepositChannel({
      id: 100n,
      srcChain: 'Bitcoin',
      depositAddress: BTC_ADDRESS,
      channelId: 99n,
      destAsset: 'Eth',
      destAddress: ETH_ADDRESS,
    });

    prisma.swapDepositChannel.findFirst = jest.fn().mockResolvedValueOnce(channel);
    prisma.failedSwap.create = jest.fn();

    await networkDepositIgnored('Bitcoin')({
      prisma,
      block: btcDepositIgnoredMock.block as any,
      event: btcDepositIgnoredMock.event as any,
    });

    expect(prisma.swapDepositChannel.findFirst).toHaveBeenCalledTimes(1);
    expect(prisma.swapDepositChannel.findFirst).toHaveBeenNthCalledWith(1, {
      where: {
        srcChain: 'Bitcoin',
        depositAddress: BTC_ADDRESS,
      },
      orderBy: { issuedBlock: 'desc' },
    });
    expect(prisma.failedSwap.create).toHaveBeenCalledTimes(1);
    expect(prisma.failedSwap.create).toHaveBeenNthCalledWith(1, {
      data: {
        destAddress: ETH_ADDRESS,
        destChain: 'Ethereum',
        depositAmount: btcDepositIgnoredMock.event.args.amount,
        srcAsset: 'Btc',
        srcChain: 'Bitcoin',
        swapDepositChannelId: 100n,
        reason: 'BelowMinimumDeposit',
        failedAt: new Date(ethDepositIgnoredMock.block.timestamp),
        failedBlockIndex: `${ethDepositIgnoredMock.block.height}-${ethDepositIgnoredMock.event.indexInBlock}`,
      },
    });
  });
});

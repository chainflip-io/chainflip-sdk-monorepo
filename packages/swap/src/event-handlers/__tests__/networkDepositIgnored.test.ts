import { bytesToHex } from '@chainflip/utils/bytes';
import * as ss58 from '@chainflip/utils/ss58';
import {
  BTC_ADDRESS,
  DOT_ADDRESS,
  ETH_ADDRESS,
  buildDepositIgnoredEvent,
  createDepositChannel,
} from './utils';
import prisma from '../../client';
import networkDepositIgnored, {
  DepositIgnoredArgs,
  depositIgnoredArgs,
} from '../networkDepositIgnored';

const ethDepositIgnoredMock = buildDepositIgnoredEvent({
  asset: { __kind: 'Eth' },
  amount: '100000000000000',
  depositAddress: ETH_ADDRESS,
  reason: { __kind: 'BelowMinimumDeposit' },
  depositDetails: { txHashes: [] },
});
const dotDepositIgnoredMock = buildDepositIgnoredEvent({
  asset: { __kind: 'Dot' },
  amount: '1000000000',
  depositAddress: bytesToHex(ss58.decode(DOT_ADDRESS).data),
  reason: { __kind: 'NotEnoughToPayFees' },
  depositDetails: 2,
});
const btcDepositIgnoredMock = buildDepositIgnoredEvent({
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
});

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
      ...ethDepositIgnoredMock,
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
      ...dotDepositIgnoredMock,
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
      ...btcDepositIgnoredMock,
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
        depositTransactionRef: 'efcdab9078563412efcdab9078563412efcdab9078563412efcdab9078563412',
        srcAsset: 'Btc',
        srcChain: 'Bitcoin',
        swapDepositChannelId: 100n,
        reason: 'BelowMinimumDeposit',
        failedAt: new Date(ethDepositIgnoredMock.block.timestamp),
        failedBlockIndex: `${ethDepositIgnoredMock.block.height}-${ethDepositIgnoredMock.event.indexInBlock}`,
      },
    });
  });

  it('parses solana addresses', () => {
    const args: DepositIgnoredArgs = {
      asset: { __kind: 'Sol' },
      amount: '1000000000',
      depositAddress: '0x1ce359ed5a012e04fa142b9c751a1c5e87cfd0a0161b9c85ffd31b78cdfcd8f6',
      reason: { __kind: 'NotEnoughToPayFees' },
    };
    expect(depositIgnoredArgs.parse(args)).toMatchSnapshot();
  });
});

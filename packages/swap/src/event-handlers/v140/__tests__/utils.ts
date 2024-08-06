import prisma from '../../../client';

export const createBtcSwapDepositChannel = async (args: {
  channelId?: string;
  depositAmount?: string;
}) => {
  const { channelId, depositAmount } = args;

  await prisma.depositChannel.create({
    data: {
      srcChain: 'Bitcoin',
      depositAddress: 'tb1pdz3akc5wa2gr69v3x87tfg0ka597dxqvfl6zhqx4y202y63cgw0q3rgpm6',
      channelId: channelId ? BigInt(channelId) : 1n,
      issuedBlock: 0,
      isSwapping: true,
    },
  });

  return prisma.swapDepositChannel.create({
    data: {
      srcAsset: 'Btc',
      srcChain: 'Bitcoin',
      srcChainExpiryBlock: 100,
      depositAddress: 'tb1pdz3akc5wa2gr69v3x87tfg0ka597dxqvfl6zhqx4y202y63cgw0q3rgpm6',
      expectedDepositAmount: 0,
      destAddress: '0x6fd76a7699e6269af49e9c63f01f61464ab21d1c',
      brokerCommissionBps: 0,
      destAsset: 'Eth',
      channelId: 3,
      issuedBlock: 0,
      openingFeePaid: 0,
      swaps: {
        create: {
          swapInputAmount: '1000000',
          depositAmount: depositAmount ?? '1000000',
          srcAsset: 'Btc',
          destAsset: 'Eth',
          destAddress: '0x6fd76a7699e6269af49e9c63f01f61464ab21d1c',
          type: 'SWAP',
          nativeId: 1,
          depositReceivedAt: new Date(1670337099000),
          depositReceivedBlockIndex: `0-15`,
          latestSwapScheduledAt: new Date(1670337099000),
          latestSwapScheduledBlockIndex: `0-15`,
        },
      },
    },
  });
};

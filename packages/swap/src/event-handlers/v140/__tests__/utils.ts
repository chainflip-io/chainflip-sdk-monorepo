import prisma from '../../../client';

export const createBtcSwapDepositChannel = async (
  args: { channelId?: string; depositAmount?: string } = {},
) => {
  const { channelId } = args;

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
      totalBrokerCommissionBps: 0,
      destAsset: 'Eth',
      channelId: channelId ? BigInt(channelId) : 1n,
      issuedBlock: 0,
      openingFeePaid: 0,
    },
  });
};

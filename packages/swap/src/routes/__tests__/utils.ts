import { Assets, Chains } from '@/shared/enums';
import prisma, { SwapDepositChannel } from '../../client';

type SwapChannelData = Parameters<
  (typeof prisma)['swapDepositChannel']['create']
>[0]['data'];

export const ETH_ADDRESS = '0x6Aa69332B63bB5b1d7Ca5355387EDd5624e181F2';
export const DOT_ADDRESS = '5F3sa2TJAWMqDhXG6jhV4N8ko9SxwGy8TpaNS1repo5EYjQX';

export const createDepositChannel = (
  data: Partial<SwapChannelData> = {},
): Promise<SwapDepositChannel> =>
  prisma.swapDepositChannel.create({
    data: {
      channelId: 1n,
      srcChain: Chains.Ethereum,
      srcAsset: Assets.ETH,
      destAsset: Assets.DOT,
      depositAddress: ETH_ADDRESS,
      destAddress: DOT_ADDRESS,
      expectedDepositAmount: '10000000000',
      issuedBlock: 100,
      ...data,
      createdAt: new Date(1690556052834),
    },
  });

import { z } from 'zod';
import { u64, chainflipAssetEnum } from '@/shared/parsers';
import { encodedAddress } from './common';
import { EventHandlerArgs } from './index';

const swapDepositAddressReadyArgs = z.object({
  depositAddress: encodedAddress,
  destinationAddress: encodedAddress,
  sourceAsset: chainflipAssetEnum,
  destinationAsset: chainflipAssetEnum,
  channelId: u64,
});

export type SwapDepositAddressReadyEvent = z.input<
  typeof swapDepositAddressReadyArgs
>;

export const swapDepositAddressReady = async ({
  prisma,
  event,
  block,
}: EventHandlerArgs): Promise<void> => {
  const issuedBlock = block.height;

  const {
    depositAddress,
    destinationAddress,
    sourceAsset,
    destinationAsset,
    channelId,
    ...rest
  } = swapDepositAddressReadyArgs.parse(event.args);

  await prisma.swapDepositChannel.upsert({
    where: {
      issuedBlock_srcChain_channelId: {
        channelId,
        issuedBlock,
        srcChain: depositAddress.chain,
      },
    },
    create: {
      srcChain: depositAddress.chain,
      srcAsset: sourceAsset,
      depositAddress: depositAddress.address,
      expectedDepositAmount: 0,
      destAsset: destinationAsset,
      destAddress: destinationAddress.address,
      issuedBlock,
      channelId,
      ...rest,
    },
    update: {},
  });
};

export default swapDepositAddressReady;

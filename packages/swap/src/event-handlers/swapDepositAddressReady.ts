import { z } from 'zod';
import { u64, chainflipAssetEnum, u128 } from '@/shared/parsers';
import { encodedAddress } from './common';
import { EventHandlerArgs } from './index';

const swapDepositAddressReadyArgs = z.object({
  depositAddress: encodedAddress,
  destinationAddress: encodedAddress,
  // TODO(mainnet): remove this
  expiryBlock: z.number().int().positive().safe().optional(),
  sourceAsset: chainflipAssetEnum,
  destinationAsset: chainflipAssetEnum,
  channelId: u64,
  sourceChainExpiryBlock: u128.optional(),
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
    sourceChainExpiryBlock,
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
      srcChainExpiryBlock: sourceChainExpiryBlock,
      issuedBlock,
      channelId,
      ...rest,
    },
    update: {},
  });
};

export default swapDepositAddressReady;

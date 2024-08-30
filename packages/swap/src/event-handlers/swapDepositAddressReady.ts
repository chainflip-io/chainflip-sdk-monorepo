import { swappingSwapDepositAddressReady as schema141 } from '@chainflip/processor/141/swapping/swapDepositAddressReady';
import { swappingSwapDepositAddressReady as schema150 } from '@chainflip/processor/150/swapping/swapDepositAddressReady';
import { swappingSwapDepositAddressReady as schema160 } from '@chainflip/processor/160/swapping/swapDepositAddressReady';
import { z } from 'zod';
import { calculateExpiryTime } from '../utils/function';
import { EventHandlerArgs } from './index';

const swapDepositAddressReadyArgs = z.union([
  schema160,
  schema150,
  schema141.transform((args) => ({ ...args, refundParameters: undefined })),
]);

export type SwapDepositAddressReadyEvent = z.input<typeof swapDepositAddressReadyArgs>;

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
    channelMetadata,
    brokerCommissionRate,
    boostFee,
    channelOpeningFee,
    affiliateFees,
    refundParameters,
    ...rest
  } = swapDepositAddressReadyArgs.parse(event.args);

  const chainInfo = await prisma.chainTracking.findFirst({
    where: {
      chain: depositAddress.chain,
    },
  });

  const estimatedExpiryTime = calculateExpiryTime({
    chainInfo,
    expiryBlock: sourceChainExpiryBlock,
  });

  const data = {
    srcChain: depositAddress.chain,
    srcAsset: sourceAsset,
    depositAddress: depositAddress.address,
    destAsset: destinationAsset,
    destAddress: destinationAddress.address,
    srcChainExpiryBlock: sourceChainExpiryBlock,
    brokerCommissionBps: brokerCommissionRate,
    maxBoostFeeBps: boostFee,
    issuedBlock,
    channelId,
    openingFeePaid: channelOpeningFee.toString(),
    fokMinPriceX128: refundParameters?.minPrice.toString(),
    fokRefundAddress: refundParameters?.refundAddress.address,
    fokRetryDurationBlocks: refundParameters?.retryDuration,
    ...rest,
  };

  await Promise.all([
    prisma.depositChannel.create({
      data: {
        srcChain: data.srcChain,
        issuedBlock: data.issuedBlock,
        depositAddress: data.depositAddress,
        channelId: data.channelId,
        isSwapping: true,
      },
    }),
    prisma.swapDepositChannel.upsert({
      where: {
        issuedBlock_srcChain_channelId: {
          channelId,
          issuedBlock,
          srcChain: depositAddress.chain,
        },
      },
      create: {
        affiliates: {
          createMany: {
            data: affiliateFees.map((affiliate) => ({
              account: affiliate.account,
              commissionBps: affiliate.bps,
            })),
          },
        },
        estimatedExpiryAt: estimatedExpiryTime,
        ccmGasBudget: channelMetadata?.gasBudget.toString(),
        ccmMessage: channelMetadata?.message,
        ...data,
      },
      update: data,
    }),
  ]);
};

export default swapDepositAddressReady;

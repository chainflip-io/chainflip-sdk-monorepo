import { swappingSwapDepositAddressReady } from '@chainflip/processor/160/swapping/swapDepositAddressReady';
import { z } from 'zod';
import { calculateExpiryTime } from '../utils/function';
import { EventHandlerArgs } from './index';

const swapDepositAddressReadyArgs = swappingSwapDepositAddressReady;

export type SwapDepositAddressReadyArgs = z.input<typeof swapDepositAddressReadyArgs>;

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
    dcaParameters,
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

  const beneficiaries = [
    {
      type: 'SUBMITTER' as const,
      account: '', // https://linear.app/chainflip/issue/PRO-1948/expose-broker-on-swapdepositaddressready-event
      commissionBps: brokerCommissionRate,
    },
    ...affiliateFees.map((affiliate) => ({
      type: 'AFFILIATE' as const,
      account: affiliate.account,
      commissionBps: affiliate.bps,
    })),
  ].filter(({ commissionBps }) => commissionBps > 0);

  const data = {
    srcChain: depositAddress.chain,
    srcAsset: sourceAsset,
    depositAddress: depositAddress.address,
    destAsset: destinationAsset,
    destAddress: destinationAddress.address,
    srcChainExpiryBlock: sourceChainExpiryBlock,
    totalBrokerCommissionBps: beneficiaries.reduce((acc, b) => acc + b.commissionBps, 0),
    maxBoostFeeBps: boostFee,
    issuedBlock,
    channelId,
    openingFeePaid: channelOpeningFee.toString(),
    fokMinPriceX128: refundParameters?.minPrice.toString(),
    fokRefundAddress: refundParameters?.refundAddress.address,
    fokRetryDurationBlocks: refundParameters?.retryDuration,
    numberOfChunks: dcaParameters?.numberOfChunks,
    chunkIntervalBlocks: dcaParameters?.chunkInterval,
    createdAt: new Date(block.timestamp),
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
        beneficiaries: {
          createMany: {
            data: beneficiaries,
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

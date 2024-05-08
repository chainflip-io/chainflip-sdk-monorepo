import { z } from 'zod';
import { u64, internalAssetEnum, u128, accountId } from '@/shared/parsers';
import { ccmMetadataSchema } from '@/shared/schemas';
import { encodedAddress } from './common';
import { calculateExpiryTime } from '../utils/function';
import { EventHandlerArgs } from './index';

const affiliateSchema = z.object({
  bps: z.number().int().positive(),
  account: accountId,
});

const swapDepositAddressReadyArgs = z.object({
  depositAddress: encodedAddress,
  destinationAddress: encodedAddress,
  sourceAsset: internalAssetEnum,
  destinationAsset: internalAssetEnum,
  channelId: u64,
  brokerCommissionRate: z.number().int(),
  sourceChainExpiryBlock: u128.optional(),
  channelMetadata: ccmMetadataSchema.optional(),
  boostFee: z.number().int().optional(),
  channelOpeningFee: u128.optional().default(0),
  affiliateFees: z.array(affiliateSchema).optional().default([]),
});

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
    boostFeeBps: boostFee,
    issuedBlock,
    channelId,
    openingFeePaid: channelOpeningFee.toString(),
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
        beneficiaries: {
          createMany: {
            data: affiliateFees.map((affiliate) => ({
              account: affiliate.account,
              commissionBps: affiliate.bps,
            })),
          },
        },
        estimatedExpiryAt: estimatedExpiryTime,
        ccmGasBudget: channelMetadata?.gasBudget,
        ccmMessage: channelMetadata?.message,
        ...data,
      },
      update: data,
    }),
  ]);
};

export default swapDepositAddressReady;

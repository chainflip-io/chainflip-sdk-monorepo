import { swappingSwapDepositAddressReady as schema180 } from '@chainflip/processor/180/swapping/swapDepositAddressReady';
import assert from 'assert';
import request from 'graphql-request';
import { z } from 'zod';
import { accountId } from '@/shared/parsers';
import env from '../config/env';
import { GET_EXTRINSIC } from '../gql/query';
import { calculateExpiryTime } from '../utils/function';
import { EventHandlerArgs } from './index';

const swapDepositAddressReadyArgs = schema180;

const signatureSchema = z.object({
  address: z.object({
    value: accountId,
    __kind: z.literal('Id'),
  }),
});

const getSubmitterFromExtrinsic = async (event: EventHandlerArgs['event']) => {
  assert(typeof event.extrinsicId === 'string', 'extrinsicId must be defined');
  const data = await request(env.INGEST_GATEWAY_URL, GET_EXTRINSIC, { id: event.extrinsicId });
  return signatureSchema.parse(data.extrinsic?.signature).address.value;
};

export type SwapDepositAddressReadyArgs = z.input<typeof swapDepositAddressReadyArgs>;

export const swapDepositAddressReady = async ({
  prisma,
  event,
  block,
}: EventHandlerArgs): Promise<void> => {
  console.log(event.args);
  console.log(swapDepositAddressReadyArgs.parse(event.args));

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
    brokerId,
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
      account: brokerId ?? (await getSubmitterFromExtrinsic(event)), // broker id was added to event in 180
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
    dcaNumberOfChunks: dcaParameters?.numberOfChunks,
    dcaChunkIntervalBlocks: dcaParameters?.chunkInterval,
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

import { swappingSwapScheduled as schema141 } from '@chainflip/processor/141/swapping/swapScheduled';
import { swappingSwapScheduled as schema150 } from '@chainflip/processor/150/swapping/swapScheduled';
import { swappingSwapScheduled as schema160 } from '@chainflip/processor/160/swapping/swapScheduled';
import { z } from 'zod';
import { parseSpecNumber } from './common';
import { getOriginInfo } from './swapRequested';
import type { EventHandlerArgs } from '.';

const allSchemas = z.union([schema160, schema150, schema141]);

export type SwapScheduledEvent = z.input<typeof allSchemas>;

const preRefactorSchema = z.union([schema150, schema141]);

const swapTypeMap = {
  CcmGas: 'GAS',
  CcmPrincipal: 'PRINCIPAL',
  Swap: 'SWAP',
  NetworkFee: 'NETWORK_FEE',
  IngressEgressFee: 'INGRESS_EGRESS_FEE',
} as const;

export default async function swapScheduled({
  prisma,
  block,
  event,
}: EventHandlerArgs): Promise<void> {
  let swapId;
  let swapRequestId;
  let inputAmount;
  let swapType;

  const spec = parseSpecNumber(block.specId);

  let swapRequest;
  if (spec < 160) {
    const parsed = preRefactorSchema.parse(event.args);

    ({
      swapId,
      swapId: swapRequestId,
      depositAmount: inputAmount,
      swapType: { __kind: swapType },
    } = parsed);

    const {
      sourceAsset,
      destinationAddress,
      destinationAsset,
      origin,
      brokerCommission,
      brokerFee,
    } = parsed;

    const brokerFeeOrCommission = brokerFee ?? brokerCommission;

    const { originType, depositTransactionRef, swapDepositChannelId } = await getOriginInfo(
      prisma,
      sourceAsset,
      origin,
    );

    swapRequest = await prisma.swapRequest.create({
      data: {
        nativeId: swapRequestId,
        originType,
        depositTransactionRef,
        swapDepositChannelId,
        srcAsset: sourceAsset,
        destAsset: destinationAsset,
        depositAmount: inputAmount.toString(),
        requestType: 'LEGACY_SWAP',
        destAddress: destinationAddress.address,
        swapRequestedAt: new Date(block.timestamp),
        // this is changing soon anyway
        fees: brokerFeeOrCommission
          ? {
              create: {
                type: 'BROKER' as const,
                asset: sourceAsset,
                amount: brokerFeeOrCommission.toString(),
              },
            }
          : undefined,
      },
    });
  } else {
    ({ swapId, swapRequestId, inputAmount, swapType } = schema160.parse(event.args));

    swapRequest = await prisma.swapRequest.findUniqueOrThrow({
      where: { nativeId: swapRequestId },
    });
  }

  await prisma.swap.create({
    data: {
      swapRequestId: swapRequest.id,
      swapInputAmount: inputAmount.toString(),
      srcAsset: swapRequest.srcAsset,
      destAsset: swapRequest.destAsset,
      nativeId: swapId,
      type: swapTypeMap[swapType],
      swapScheduledAt: new Date(block.timestamp),
      swapScheduledBlockIndex: `${block.height}-${event.indexInBlock}`,
    },
  });
}

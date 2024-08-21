import { swappingSwapRequested as schema160 } from '@chainflip/processor/160/swapping/swapRequested';
import z from 'zod';
import { InternalAsset } from '@/shared/enums';
import { assertNever } from '@/shared/guards';
import { foreignChainAddress } from '@/shared/parsers';
import { pascalCaseToScreamingSnakeCase } from '@/shared/strings';
import { Prisma } from '../client';
import env from '../config/env';
import type { EventHandlerArgs } from './index';

type RequestType = z.output<typeof schema160>['requestType'];
type Origin = z.output<typeof schema160>['origin'];

const optionalForeignChainAddress = foreignChainAddress(env.CHAINFLIP_NETWORK).optional();

const getRequestInfo = (requestType: RequestType) => {
  let destAddress;
  let ccmMetadata;

  if (requestType.__kind === 'Regular') {
    destAddress = requestType.outputAddress.address;
  } else if (requestType.__kind === 'Ccm') {
    ccmMetadata = {
      ...requestType.ccmDepositMetadata,
      sourceAddress: optionalForeignChainAddress.parse(
        requestType.ccmDepositMetadata.sourceAddress,
      ),
    };
    destAddress = requestType.outputAddress.address;
  }

  if (requestType.__kind === 'Regular' || requestType.__kind === 'Ccm') {
    return { destAddress, ccmMetadata };
  }

  if (requestType.__kind === 'IngressEgressFee' || requestType.__kind === 'NetworkFee') {
    return { destAddress: undefined, ccmMetadata: undefined };
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return assertNever(requestType, `unexpected request type: ${(requestType as any).__kind}`);
};

const getOriginInfo = async (
  prisma: Prisma.TransactionClient,
  srcAsset: InternalAsset,
  origin: Origin,
) => {
  if (origin.__kind === 'DepositChannel') {
    const depositChannel = await prisma.swapDepositChannel.findFirstOrThrow({
      where: {
        srcAsset,
        depositAddress: origin.depositAddress.address,
        channelId: origin.channelId,
        isExpired: false,
      },
      orderBy: {
        issuedBlock: 'desc',
      },
      select: { id: true },
    });

    return {
      originType: 'DEPOSIT_CHANNEL' as const,
      swapDepositChannelId: depositChannel.id,
      depositTransactionRef: undefined,
    };
  }

  if (origin.__kind === 'Vault') {
    return {
      originType: 'VAULT' as const,
      swapDepositChannelId: undefined,
      depositTransactionRef: origin.txHash,
    };
  }

  if (origin.__kind === 'Internal') {
    return {
      originType: 'INTERNAL' as const,
      swapDepositChannelId: undefined,
      depositTransactionRef: undefined,
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return assertNever(origin, `unexpected origin: ${(origin as any).__kind}`);
};

export default async function swapRequested({
  prisma,
  event,
  block,
}: EventHandlerArgs): Promise<void> {
  const { inputAmount, inputAsset, swapRequestId, outputAsset, origin, brokerFee, requestType } =
    schema160.parse(event.args);

  const { originType, swapDepositChannelId, depositTransactionRef } = await getOriginInfo(
    prisma,
    inputAsset,
    origin,
  );

  const { destAddress, ccmMetadata } = getRequestInfo(requestType);

  await prisma.swapRequest.create({
    data: {
      nativeId: swapRequestId,
      originType,
      depositTransactionRef,
      swapDepositChannelId,
      srcAsset: inputAsset,
      destAsset: outputAsset,
      depositAmount: inputAmount.toString(),
      requestType: pascalCaseToScreamingSnakeCase(requestType.__kind),
      ccmGasBudget: ccmMetadata?.channelMetadata.gasBudget.toString(),
      ccmMessage: ccmMetadata?.channelMetadata.message,
      srcAddress: ccmMetadata?.sourceAddress,
      destAddress,
      swapRequestedAt: new Date(block.timestamp),
      // this is changing soon anyway
      fees:
        brokerFee > 0n
          ? { create: { amount: brokerFee.toString(), type: 'BROKER', asset: inputAsset } }
          : undefined,
    },
  });
}

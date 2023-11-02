import { z } from 'zod';
import { encodedAddress } from './common';
import { u128, u64 } from '../parsers';
import type { EventHandlerArgs } from '.';

const ccmChannelMetadataArgs = z.object({
  message: z.string(),
  gasBudget: u128,
});

const ccmDepositMetadataArgs = z.object({
  channelMetadata: ccmChannelMetadataArgs,
});

const ccmDepositReceivedArgs = z.object({
  ccmId: u64,
  principalSwapId: u64.nullable().optional(),
  gasSwapId: u64.nullable().optional(),
  depositAmount: u128,
  destinationAddress: encodedAddress,
  depositMetadata: ccmDepositMetadataArgs,
});

export type CcmDepositReceivedArgs = z.input<typeof ccmDepositReceivedArgs>;

export default async function ccmDepositReceived({
  prisma,
  event,
}: EventHandlerArgs) {
  const { principalSwapId, depositMetadata } = ccmDepositReceivedArgs.parse(
    event.args,
  );

  if (principalSwapId) {
    prisma.swap.update({
      where: {
        nativeId: principalSwapId,
      },
      data: {
        ccmGasBudget: depositMetadata.channelMetadata.gasBudget.toString(),
        ccmMessage: depositMetadata.channelMetadata.message,
      },
    });
  }
}

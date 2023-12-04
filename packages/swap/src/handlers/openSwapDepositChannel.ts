import { z } from 'zod';
import * as broker from '@/shared/broker';
import { openSwapDepositChannelSchema } from '@/shared/schemas';
import { validateAddress } from '@/shared/validation/addressValidation';
import prisma from '../client';
import { isProduction } from '../utils/consts';
import { calculateExpiryTime } from '../utils/function';
import { getMinimumSwapAmount } from '../utils/rpc';
import ServiceError from '../utils/ServiceError';

export default async function openSwapDepositChannel(
  input: z.output<typeof openSwapDepositChannelSchema>,
) {
  if (!validateAddress(input.destChain, input.destAddress, isProduction)) {
    throw ServiceError.badRequest('provided address is not valid');
  }

  const minimumAmount = await getMinimumSwapAmount(
    process.env.RPC_NODE_HTTP_URL as string,
    { asset: input.srcAsset, chain: input.srcChain },
  );

  if (BigInt(input.expectedDepositAmount) < minimumAmount) {
    throw ServiceError.badRequest(
      'expected amount is below minimum swap amount',
    );
  }

  const {
    address: depositAddress,
    sourceChainExpiryBlock: srcChainExpiryBlock,
    ...blockInfo
  } = await broker.requestSwapDepositAddress(input, {
    url: process.env.RPC_BROKER_HTTPS_URL as string,
    commissionBps: 0,
  });

  const { destChain, ...rest } = input;

  const chainInfo = await prisma.chainTracking.findFirst({
    where: {
      chain: input.srcChain,
    },
  });
  const estimatedExpiryTime = calculateExpiryTime({
    chainInfo,
    expiryBlock: srcChainExpiryBlock,
  });

  const {
    issuedBlock,
    srcChain,
    channelId,
    depositAddress: channelDepositAddress,
  } = await prisma.swapDepositChannel.upsert({
    where: {
      issuedBlock_srcChain_channelId: {
        channelId: blockInfo.channelId,
        issuedBlock: blockInfo.issuedBlock,
        srcChain: input.srcChain,
      },
    },
    create: {
      ...rest,
      depositAddress,
      srcChainExpiryBlock,
      estimatedExpiryAt: estimatedExpiryTime,
      openedThroughBackend: true,
      ...blockInfo,
    },
    update: {
      openedThroughBackend: true,
    },
  });

  return {
    id: `${issuedBlock}-${srcChain}-${channelId}`,
    depositAddress: channelDepositAddress,
    issuedBlock,
    srcChainExpiryBlock,
    estimatedExpiryTime: estimatedExpiryTime?.valueOf(),
  };
}

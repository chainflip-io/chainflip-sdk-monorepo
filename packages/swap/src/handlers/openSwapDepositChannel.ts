import { z } from 'zod';
import * as broker from '@/shared/broker';
import { getInternalAssets } from '@/shared/enums';
import { openSwapDepositChannelSchema } from '@/shared/schemas';
import { validateAddress } from '@/shared/validation/addressValidation';
import prisma from '../client';
import env from '../config/env';
import { calculateExpiryTime } from '../utils/function';
import { validateSwapAmount } from '../utils/rpc';
import screenAddress from '../utils/screenAddress';
import ServiceError from '../utils/ServiceError';

export default async function openSwapDepositChannel(
  input: z.output<typeof openSwapDepositChannelSchema>,
) {
  if (!validateAddress(input.destChain, input.destAddress, env.CHAINFLIP_NETWORK)) {
    throw ServiceError.badRequest(
      `Address "${input.destAddress}" is not a valid "${input.destChain}" address`,
    );
  }

  if (await screenAddress(input.destAddress)) {
    throw ServiceError.badRequest(`Address "${input.destAddress}" is sanctioned`);
  }

  const { srcAsset, destAsset } = getInternalAssets(input);
  if (env.DISABLED_INTERNAL_ASSETS.includes(srcAsset)) {
    throw ServiceError.unavailable(`Asset ${srcAsset} is disabled`);
  }
  if (env.DISABLED_INTERNAL_ASSETS.includes(destAsset)) {
    throw ServiceError.unavailable(`Asset ${destAsset} is disabled`);
  }

  const result = await validateSwapAmount(srcAsset, BigInt(input.expectedDepositAmount));

  if (!result.success) throw ServiceError.badRequest(result.reason);

  const openChannelCount = await prisma.swapDepositChannel.count({
    where: {
      destAddress: {
        equals: input.destAddress,
        mode: 'insensitive',
      },
      srcAsset,
      destAsset,
      isExpired: false,
    },
  });

  if (openChannelCount >= env.MAX_CHANNELS_OPEN_PER_ADDRESS) {
    throw ServiceError.badRequest('too many channels');
  }

  const {
    address: depositAddress,
    sourceChainExpiryBlock: srcChainExpiryBlock,
    channelOpeningFee,
    ...blockInfo
  } = await broker.requestSwapDepositAddress(
    input,
    { url: env.RPC_BROKER_HTTPS_URL, commissionBps: 0 },
    env.CHAINFLIP_NETWORK,
  );

  const { expectedDepositAmount, destAddress, boostFeeBps, srcChain, ccmMetadata } = input;

  const chainInfo = await prisma.chainTracking.findFirst({
    where: {
      chain: srcChain,
    },
  });
  const estimatedExpiryTime = calculateExpiryTime({
    chainInfo,
    expiryBlock: srcChainExpiryBlock,
  });

  const channel = await prisma.swapDepositChannel.upsert({
    where: {
      issuedBlock_srcChain_channelId: {
        channelId: blockInfo.channelId,
        issuedBlock: blockInfo.issuedBlock,
        srcChain,
      },
    },
    create: {
      expectedDepositAmount,
      destAddress,
      srcChain,
      srcAsset,
      destAsset,
      depositAddress,
      srcChainExpiryBlock,
      estimatedExpiryAt: estimatedExpiryTime,
      ccmGasBudget: ccmMetadata?.gasBudget,
      ccmMessage: ccmMetadata?.message,
      brokerCommissionBps: 0,
      boostFeeBps: Number(boostFeeBps) || 0,
      openedThroughBackend: true,
      openingFeePaid: channelOpeningFee.toString(),
      ...blockInfo,
    },
    update: {
      openedThroughBackend: true,
    },
  });

  return {
    id: `${channel.issuedBlock}-${channel.srcChain}-${channel.channelId}`,
    depositAddress: channel.depositAddress,
    brokerCommissionBps: channel.brokerCommissionBps,
    boostFeeBps: channel.boostFeeBps,
    issuedBlock: channel.issuedBlock,
    srcChainExpiryBlock,
    estimatedExpiryTime: estimatedExpiryTime?.valueOf(),
    channelOpeningFee,
  };
}

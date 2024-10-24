import { z } from 'zod';
import * as broker from '@/shared/broker';
import { getInternalAssets } from '@/shared/enums';
import { openSwapDepositChannelSchema } from '@/shared/schemas';
import { validateAddress } from '@/shared/validation/addressValidation';
import prisma from '../client';
import env from '../config/env';
import disallowChannel from '../utils/disallowChannel';
import { calculateExpiryTime } from '../utils/function';
import logger from '../utils/logger';
import { validateSwapAmount } from '../utils/rpc';
import ServiceError from '../utils/ServiceError';

export default async function openSwapDepositChannel(
  input: z.output<typeof openSwapDepositChannelSchema>,
) {
  if (!validateAddress(input.destChain, input.destAddress, env.CHAINFLIP_NETWORK)) {
    throw ServiceError.badRequest(
      `Address "${input.destAddress}" is not a valid "${input.destChain}" address`,
    );
  }

  if (
    await disallowChannel(
      input.destAddress,
      input.srcAddress,
      input.fillOrKillParams?.refundAddress,
    )
  ) {
    logger.info('Blocked address found', input);
    throw ServiceError.internalError('Failed to open deposit channel, please try again later');
  }

  logger.info('Opening swap deposit channel', input);

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

  // DEPRECATED(1.5): use ccmParams instead of ccmMetadata
  input.ccmParams ??= input.ccmMetadata; // eslint-disable-line no-param-reassign

  const swapDepositAddress = await broker.requestSwapDepositAddress(
    input,
    { url: env.RPC_BROKER_HTTPS_URL },
    env.CHAINFLIP_NETWORK,
  );

  logger.info('Swap deposit channel opened', swapDepositAddress);

  const {
    address: depositAddress,
    sourceChainExpiryBlock: srcChainExpiryBlock,
    channelOpeningFee,
    ...blockInfo
  } = swapDepositAddress;

  const {
    expectedDepositAmount,
    destAddress,
    maxBoostFeeBps,
    srcChain,
    ccmParams,
    fillOrKillParams,
    dcaParams,
  } = input;

  const chainInfo = await prisma.chainTracking.findFirst({
    where: {
      chain: srcChain,
    },
  });
  const estimatedExpiryTime = calculateExpiryTime({
    chainInfo,
    expiryBlock: srcChainExpiryBlock,
  });
  const quoteParam = input.quote && {
    create: {
      srcAsset,
      destAsset,
      maxBoostFeeBps,
      numberOfChunks: dcaParams?.numberOfChunks,
      depositAmount: input.expectedDepositAmount,
      intermediateAmount: input.quote.intermediateAmount,
      egressAmount: input.quote.egressAmount,
      estimatedPrice: input.quote.estimatedPrice,
    },
  };

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
      ccmGasBudget: ccmParams?.gasBudget && BigInt(ccmParams.gasBudget).toString(),
      ccmMessage: ccmParams?.message,
      brokerCommissionBps: 0,
      maxBoostFeeBps: Number(maxBoostFeeBps) || 0,
      openedThroughBackend: true,
      openingFeePaid: channelOpeningFee.toString(),
      fokMinPriceX128: fillOrKillParams?.minPriceX128,
      fokRetryDurationBlocks: fillOrKillParams?.retryDurationBlocks,
      fokRefundAddress: fillOrKillParams?.refundAddress,
      chunkIntervalBlocks: dcaParams?.chunkIntervalBlocks,
      numberOfChunks: dcaParams?.numberOfChunks,
      quote: quoteParam,
      ...blockInfo,
    },
    update: {
      openedThroughBackend: true,
      quote: quoteParam,
    },
  });

  return {
    id: `${channel.issuedBlock}-${channel.srcChain}-${channel.channelId}`,
    depositAddress: channel.depositAddress,
    brokerCommissionBps: channel.brokerCommissionBps,
    maxBoostFeeBps: channel.maxBoostFeeBps,
    issuedBlock: channel.issuedBlock,
    srcChainExpiryBlock,
    estimatedExpiryTime: estimatedExpiryTime?.valueOf(),
    channelOpeningFee,
  };
}

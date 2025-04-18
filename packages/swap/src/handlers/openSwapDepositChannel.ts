import { getInternalAssets } from '@chainflip/utils/chainflip';
import { z } from 'zod';
import * as broker from '@/shared/broker';
import { getPriceFromPriceX128 } from '@/shared/functions';
import { asset, chain, numericString } from '@/shared/parsers';
import {
  ccmParamsSchema,
  dcaParams as dcaParamsSchema,
  fillOrKillParams as fillOrKillParamsSchema,
} from '@/shared/schemas';
import { validateAddress } from '@/shared/validation/addressValidation';
import prisma from '../client';
import env from '../config/env';
import { assertRouteEnabled } from '../utils/env';
import { calculateExpiryTime } from '../utils/function';
import isDisallowedSwap from '../utils/isDisallowedSwap';
import logger from '../utils/logger';
import { validateSwapAmount } from '../utils/rpc';
import ServiceError from '../utils/ServiceError';

export const openSwapDepositChannelSchema = z
  .object({
    srcAsset: asset,
    destAsset: asset,
    srcChain: chain,
    destChain: chain,
    destAddress: z.string(),
    amount: numericString,
    ccmParams: ccmParamsSchema.optional(),
    maxBoostFeeBps: z.number().optional(),
    srcAddress: z.string().optional(),
    fillOrKillParams: fillOrKillParamsSchema,
    dcaParams: dcaParamsSchema.optional(),
    quote: z
      .object({
        intermediateAmount: z.string().optional(),
        egressAmount: z.string(),
        estimatedPrice: z.string(),
        recommendedSlippageTolerancePercent: z.number().optional(),
      })
      .optional(),
  })
  .transform(({ amount, ...rest }) => ({
    ...rest,
    expectedDepositAmount: amount,
  }));

const getSlippageTolerancePercent = (input: z.output<typeof openSwapDepositChannelSchema>) => {
  const { srcAsset, destAsset } = getInternalAssets(input);
  const estimatedPrice = Number(input.quote?.estimatedPrice);
  const fokMinPrice = Number(
    getPriceFromPriceX128(input.fillOrKillParams.minPriceX128, srcAsset, destAsset),
  );

  return estimatedPrice && fokMinPrice && (100 * (estimatedPrice - fokMinPrice)) / estimatedPrice;
};

export const openSwapDepositChannel = async (
  input: z.output<typeof openSwapDepositChannelSchema>,
) => {
  if (!validateAddress(input.destChain, input.destAddress, env.CHAINFLIP_NETWORK)) {
    throw ServiceError.badRequest(
      `Address "${input.destAddress}" is not a valid "${input.destChain}" address`,
    );
  }

  if (
    await isDisallowedSwap(
      input.destAddress,
      input.srcAddress,
      input.fillOrKillParams.refundAddress,
    )
  ) {
    logger.info('Blocked address found for deposit channel', input);
    throw ServiceError.internalError('Failed to open deposit channel, please try again later');
  }

  logger.info('Opening swap deposit channel', input);

  const { srcAsset, destAsset } = getInternalAssets(input);
  assertRouteEnabled({ srcAsset, destAsset });

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
      ccmMessage: input.ccmParams?.message, // aggregators like squid use their router as destination address
      isExpired: false,
    },
  });

  if (openChannelCount >= env.MAX_CHANNELS_OPEN_PER_ADDRESS) {
    throw ServiceError.badRequest('too many channels');
  }

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
      channelOpenedAt: new Date(),
      srcAsset,
      destAsset,
      maxBoostFeeBps,
      numberOfChunks: dcaParams?.numberOfChunks,
      expectedDepositAmount: input.expectedDepositAmount,
      quotedIntermediateAmount: input.quote.intermediateAmount,
      quotedEgressAmount: input.quote.egressAmount,
      quotedPrice: input.quote.estimatedPrice,
      slippageTolerancePercent: getSlippageTolerancePercent(input),
      recommendedSlippageTolerancePercent: input.quote.recommendedSlippageTolerancePercent,
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
      totalBrokerCommissionBps: 0,
      maxBoostFeeBps: Number(maxBoostFeeBps) || 0,
      openedThroughBackend: true,
      openingFeePaid: channelOpeningFee.toString(),
      fokMinPriceX128: fillOrKillParams.minPriceX128,
      fokRetryDurationBlocks: fillOrKillParams.retryDurationBlocks,
      fokRefundAddress: fillOrKillParams.refundAddress,
      dcaChunkIntervalBlocks: dcaParams?.chunkIntervalBlocks,
      dcaNumberOfChunks: dcaParams?.numberOfChunks,
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
    brokerCommissionBps: channel.totalBrokerCommissionBps,
    maxBoostFeeBps: channel.maxBoostFeeBps,
    issuedBlock: channel.issuedBlock,
    srcChainExpiryBlock,
    estimatedExpiryTime: estimatedExpiryTime?.valueOf(),
    channelOpeningFee,
  };
};

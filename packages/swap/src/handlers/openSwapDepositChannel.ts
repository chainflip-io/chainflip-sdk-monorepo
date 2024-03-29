import { z } from 'zod';
import * as broker from '@/shared/broker';
import { getInternalAsset } from '@/shared/enums';
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

  const result = await validateSwapAmount(
    { asset: input.srcAsset, chain: input.srcChain },
    BigInt(input.expectedDepositAmount),
  );

  if (!result.success) throw ServiceError.badRequest(result.reason);

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

  const { srcChain, srcAsset, destChain, destAsset, ccmMetadata, ...rest } = input;

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
      ...rest,
      srcChain,
      srcAsset: getInternalAsset({ asset: srcAsset, chain: srcChain }),
      destAsset: getInternalAsset({ asset: destAsset, chain: destChain }),
      depositAddress,
      srcChainExpiryBlock,
      estimatedExpiryAt: estimatedExpiryTime,
      ccmGasBudget: ccmMetadata?.gasBudget,
      ccmMessage: ccmMetadata?.message,
      brokerCommissionBps: 0,
      boostFeeBps: Number(rest.boostFeeBps) || 0,
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

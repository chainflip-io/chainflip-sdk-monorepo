import { z } from 'zod';
import * as broker from '@/shared/broker';
import { ChainflipNetwork } from '@/shared/enums';
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
  if (!validateAddress(input.destAsset, input.destAddress, isProduction)) {
    throw ServiceError.badRequest('provided address is not valid');
  }

  const minimumAmount = await getMinimumSwapAmount(
    process.env.CHAINFLIP_NETWORK as ChainflipNetwork,
    input.srcAsset,
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

  const { destAsset, srcAsset, ...rest } = input;
  const [
    { issuedBlock, srcChain, channelId, depositAddress: channelDepositAddress },
    chainInfo,
  ] = await Promise.all([
    prisma.swapDepositChannel.upsert({
      where: {
        issuedBlock_srcChain_channelId: {
          channelId: blockInfo.channelId,
          issuedBlock: blockInfo.issuedBlock,
          srcChain: srcAsset.chain,
        },
      },
      create: {
        ...rest,
        depositAddress,
        srcChainExpiryBlock,
        srcAsset: srcAsset.asset,
        srcChain: srcAsset.chain,
        destAsset: destAsset.asset,
        ...blockInfo,
      },
      update: {},
    }),
    prisma.chainTracking.findFirst({
      where: {
        chain: srcAsset.chain,
      },
    }),
  ]);

  const estimatedExpiryTime = calculateExpiryTime({
    chain: srcAsset.chain,
    startBlock: chainInfo?.height,
    expiryBlock: srcChainExpiryBlock,
  });

  return {
    id: `${issuedBlock}-${srcChain}-${channelId}`,
    depositAddress: channelDepositAddress,
    issuedBlock,
    srcChainExpiryBlock,
    estimatedExpiryTime: estimatedExpiryTime?.valueOf(),
  };
}

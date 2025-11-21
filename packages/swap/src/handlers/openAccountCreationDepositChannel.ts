import { HttpClient } from '@chainflip/rpc';
import { getInternalAsset } from '@chainflip/utils/chainflip';
import { z } from 'zod';
import { getAccountCreationDepositChannelSchema } from '@/shared/api/openAccountCreationDepositChannel.js';
import { DepositChannelInfo } from '@/shared/api/openSwapDepositChannel.js';
import prisma from '../client.js';
import env from '../config/env.js';

const broker = new HttpClient(env.RPC_BROKER_HTTPS_URL);

export const openAccountCreationDepositChannel = async (
  params: z.output<ReturnType<typeof getAccountCreationDepositChannelSchema>>,
): Promise<z.input<typeof DepositChannelInfo>> => {
  const result = await broker.sendRequest(
    'broker_request_account_creation_deposit_address',
    params.signatureData,
    params.transactionMetadata,
    params.asset,
    params.boostFeeBps,
    params.refundAddress,
  );

  const channel = await prisma.accountCreationDepositChannel.upsert({
    where: {
      issuedBlock_chain_channelId: {
        issuedBlock: result.issued_block,
        channelId: result.channel_id,
        chain: params.asset.chain,
      },
    },
    create: {
      asset: getInternalAsset(params.asset),
      chain: params.asset.chain,
      channelId: result.channel_id,
      depositAddress: result.address,
      createdAt: new Date(),
      maxBoostFeeBps: params.boostFeeBps,
      depositChainExpiryBlock: result.deposit_chain_expiry_block,
      isExpired: false,
      openingFeePaid: result.channel_opening_fee.toString(),
      issuedBlock: result.issued_block,
      lpAccountId: result.requested_for,
      openedThroughBackend: true,
      refundAddress: params.refundAddress,
    },
    update: {
      openedThroughBackend: true,
    },
  });

  return {
    id: `${channel.issuedBlock}-${channel.chain}-${channel.channelId}`,
    depositAddress: channel.depositAddress,
    brokerCommissionBps: 0,
    maxBoostFeeBps: channel.maxBoostFeeBps,
    issuedBlock: channel.issuedBlock,
    srcChainExpiryBlock: channel.depositChainExpiryBlock.toString(),
    estimatedExpiryTime: channel.estimatedExpiryAt?.getTime(),
    channelOpeningFee: channel.openingFeePaid.toString(),
  };
};

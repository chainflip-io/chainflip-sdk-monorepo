import { type Chain } from '.prisma/client';
import { z } from 'zod';
import { assetConstants } from '@/shared/enums';
import {
  internalAssetEnum,
  rustEnum,
  u128,
  encodeDotAddress,
  depositAddressSchema,
} from '@/shared/parsers';
import env from '../config/env';
import logger from '../utils/logger';
import type { EventHandlerArgs } from './index';

const reasonSchema = rustEnum(['BelowMinimumDeposit', 'NotEnoughToPayFees']);

const depositIgnoredArgs = z
  .object({
    asset: internalAssetEnum,
    amount: u128,
    depositAddress: depositAddressSchema(env.CHAINFLIP_NETWORK),
    reason: reasonSchema,
  })
  .transform(encodeDotAddress);

export type DepositIgnoredArgs = z.input<typeof depositIgnoredArgs>;

export const depositIgnored =
  (chain: Chain) =>
  async ({ prisma, event, block }: EventHandlerArgs) => {
    const { amount, depositAddress, reason, asset } = depositIgnoredArgs.parse(event.args);

    const channel = await prisma.swapDepositChannel.findFirst({
      where: {
        srcChain: chain,
        depositAddress,
      },
      orderBy: { issuedBlock: 'desc' },
    });

    if (!channel) {
      logger.warn('deposit ignored for unknown channel', { depositAddress, chain });
      return;
    }

    await prisma.failedSwap.create({
      data: {
        reason,
        swapDepositChannelId: channel.id,
        srcChain: chain,
        srcAsset: asset,
        destAddress: channel.destAddress,
        destChain: assetConstants[channel.destAsset].chain,
        depositAmount: amount.toString(),
        failedAt: new Date(block.timestamp),
        failedBlockIndex: `${block.height}-${event.indexInBlock}`,
      },
    });
  };

export default depositIgnored;

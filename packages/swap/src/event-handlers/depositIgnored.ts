import { type Chain } from '.prisma/client';
import { z } from 'zod';
import { assetConstants } from '@/shared/enums';
import { internalAssetEnum, u128, depositAddressSchema, encodeDotAddress } from '@/shared/parsers';
import env from '../config/env';
import type { EventHandlerArgs } from './index';

const depositIgnoredArgs = z
  .object({
    asset: internalAssetEnum,
    amount: u128,
    depositAddress: depositAddressSchema(env.CHAINFLIP_NETWORK),
  })
  .transform(encodeDotAddress);

export type DepositIgnoredArgs = z.input<typeof depositIgnoredArgs>;

export const depositIgnored =
  (chain: Chain) =>
  async ({ prisma, event, block }: EventHandlerArgs) => {
    const { amount, depositAddress } = depositIgnoredArgs.parse(event.args);

    const channel = await prisma.swapDepositChannel.findFirstOrThrow({
      where: {
        srcChain: chain,
        depositAddress,
      },
      orderBy: { issuedBlock: 'desc' },
    });

    await prisma.failedSwap.create({
      data: {
        reason: 'BelowMinimumDeposit',
        swapDepositChannelId: channel.id,
        srcAsset: channel.srcAsset,
        srcChain: chain,
        destAddress: channel.destAddress,
        destChain: assetConstants[channel.destAsset].chain,
        depositAmount: amount.toString(),
        failedAt: new Date(block.timestamp),
        failedBlockIndex: `${block.height}-${event.indexInBlock}`,
      },
    });
  };

export default depositIgnored;

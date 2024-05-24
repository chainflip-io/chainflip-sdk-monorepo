import { type Chain } from '.prisma/client';
import * as ss58 from '@chainflip/utils/ss58';
import { HexString } from '@chainflip/utils/types';
import { z } from 'zod';
import { encodeAddress as encodeBitcoinAddress } from '@/shared/bitcoin';
import { assetConstants, InternalAsset } from '@/shared/enums';
import { internalAssetEnum, DOT_PREFIX, hexString, rustEnum, u128 } from '@/shared/parsers';
import env from '../config/env';
import logger from '../utils/logger';
import type { EventHandlerArgs } from './index';

const reasonSchema = rustEnum(['BelowMinimumDeposit', 'NotEnoughToPayFees']);

type Reason = z.output<typeof reasonSchema>;

const depositIgnoredArgs = z
  .object({
    asset: internalAssetEnum,
    amount: u128,
    depositAddress: z.union([
      z.object({ __kind: z.literal('Taproot'), value: hexString }).transform((o) => {
        try {
          return encodeBitcoinAddress(o.value, env.CHAINFLIP_NETWORK);
        } catch {
          return null;
        }
      }),
      hexString,
    ]),
    reason: reasonSchema,
  })
  .refine(
    (
      args,
    ): args is {
      amount: bigint;
      asset: InternalAsset;
      depositAddress: string;
      reason: Reason;
    } => args.depositAddress !== null,
    { message: 'failed to parse bitcoin deposit address' },
  )
  .transform((args) => {
    if (args.asset === 'Dot') {
      return {
        ...args,
        depositAddress: ss58.encode({
          data: args.depositAddress as HexString,
          ss58Format: DOT_PREFIX,
        }),
      };
    }
    return args;
  });

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

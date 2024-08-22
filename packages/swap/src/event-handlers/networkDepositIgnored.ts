import { type Chain } from '.prisma/client';
import { bitcoinIngressEgressDepositIgnored } from '@chainflip/processor/131/bitcoinIngressEgress/depositIgnored';
import { arbitrumIngressEgressDepositIgnored } from '@chainflip/processor/150/arbitrumIngressEgress/depositIgnored';
import { ethereumIngressEgressDepositIgnored } from '@chainflip/processor/150/ethereumIngressEgress/depositIgnored';
import { polkadotIngressEgressDepositIgnored } from '@chainflip/processor/150/polkadotIngressEgress/depositIgnored';
import { solanaIngressEgressDepositIgnored } from '@chainflip/processor/160/solanaIngressEgress/depositIgnored';
import { z } from 'zod';
import { assetConstants } from '@/shared/enums';
import { foreignChainAddress } from '@/shared/parsers';
import env from '../config/env';
import logger from '../utils/logger';
import type { EventHandlerArgs } from './index';

const foreignChainAddressSchema = foreignChainAddress(env.CHAINFLIP_NETWORK);

const depositIgnoredArgs = z.union([
  bitcoinIngressEgressDepositIgnored.transform(({ depositAddress, ...rest }) => ({
    depositAddress: foreignChainAddressSchema.parse(depositAddress),
    ...rest,
  })),
  arbitrumIngressEgressDepositIgnored,
  ethereumIngressEgressDepositIgnored,
  polkadotIngressEgressDepositIgnored,
  solanaIngressEgressDepositIgnored,
]);

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

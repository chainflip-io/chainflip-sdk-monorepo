import { type Chain } from '.prisma/client';
import { polkadotIngressEgressDepositIgnored as polkadotSchema120 } from '@chainflip/processor/120/polkadotIngressEgress/depositIgnored';
import { bitcoinIngressEgressDepositIgnored } from '@chainflip/processor/131/bitcoinIngressEgress/depositIgnored';
import { ethereumIngressEgressDepositIgnored as ethereumSchema131 } from '@chainflip/processor/131/ethereumIngressEgress/depositIgnored';
import { arbitrumIngressEgressDepositIgnored as arbitrumSchema141 } from '@chainflip/processor/141/arbitrumIngressEgress/depositIgnored';
import { arbitrumIngressEgressDepositIgnored as arbitrumSchema150 } from '@chainflip/processor/150/arbitrumIngressEgress/depositIgnored';
import { ethereumIngressEgressDepositIgnored as ethereumSchema150 } from '@chainflip/processor/150/ethereumIngressEgress/depositIgnored';
import { polkadotIngressEgressDepositIgnored as polkadotSchema150 } from '@chainflip/processor/150/polkadotIngressEgress/depositIgnored';
import { solanaIngressEgressDepositIgnored } from '@chainflip/processor/160/solanaIngressEgress/depositIgnored';
import { z } from 'zod';
import { assetConstants } from '@/shared/enums';
import { foreignChainAddress } from '@/shared/parsers';
import env from '../config/env';
import logger from '../utils/logger';
import type { EventHandlerArgs } from './index';

const foreignChainAddressSchema = foreignChainAddress(env.CHAINFLIP_NETWORK);

const arbitrumSchema = z.union([arbitrumSchema150, arbitrumSchema141]);
const ethereumSchema = z.union([ethereumSchema150, ethereumSchema131]);
const polkadotSchema = z.union([polkadotSchema150, polkadotSchema120]);

const depositIgnoredArgs = z.union([
  bitcoinIngressEgressDepositIgnored.transform(({ depositAddress, ...rest }) => ({
    depositAddress: foreignChainAddressSchema.parse(depositAddress),
    ...rest,
  })),
  arbitrumSchema,
  ethereumSchema,
  polkadotSchema,
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

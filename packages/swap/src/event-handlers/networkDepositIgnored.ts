import { type Chain } from '.prisma/client';
import { bitcoinIngressEgressDepositIgnored } from '@chainflip/processor/131/bitcoinIngressEgress/depositIgnored';
import { arbitrumIngressEgressDepositIgnored } from '@chainflip/processor/150/arbitrumIngressEgress/depositIgnored';
import { ethereumIngressEgressDepositIgnored } from '@chainflip/processor/150/ethereumIngressEgress/depositIgnored';
import { polkadotIngressEgressDepositIgnored } from '@chainflip/processor/150/polkadotIngressEgress/depositIgnored';
import { solanaIngressEgressDepositIgnored } from '@chainflip/processor/160/solanaIngressEgress/depositIgnored';
import * as base58 from '@chainflip/utils/base58';
import { hexToBytes } from '@chainflip/utils/bytes';
import * as ss58 from '@chainflip/utils/ss58';
import { z } from 'zod';
import { assetConstants } from '@/shared/enums';
import { bitcoinScriptPubKey } from '@/shared/parsers';
import env from '../config/env';
import logger from '../utils/logger';
import type { EventHandlerArgs } from './index';

const bitcoinScriptPubKeySchema = bitcoinScriptPubKey(env.CHAINFLIP_NETWORK);

export const depositIgnoredArgs = z.union([
  bitcoinIngressEgressDepositIgnored.transform(({ depositAddress, ...rest }) => ({
    depositAddress: bitcoinScriptPubKeySchema.parse(depositAddress),
    ...rest,
  })),
  arbitrumIngressEgressDepositIgnored,
  ethereumIngressEgressDepositIgnored,
  polkadotIngressEgressDepositIgnored.transform(({ depositAddress, ...rest }) => ({
    depositAddress: ss58.encode({ data: hexToBytes(depositAddress), ss58Format: 0 }),
    ...rest,
  })),
  solanaIngressEgressDepositIgnored.transform(({ depositAddress, ...rest }) => ({
    depositAddress: base58.encode(hexToBytes(depositAddress)),
    ...rest,
  })),
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

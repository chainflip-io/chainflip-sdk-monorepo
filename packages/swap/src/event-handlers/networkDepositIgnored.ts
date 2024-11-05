import { type Chain } from '.prisma/client';
import { bitcoinIngressEgressDepositIgnored as bitcoinSchema131 } from '@chainflip/processor/131/bitcoinIngressEgress/depositIgnored';
import { arbitrumIngressEgressDepositIgnored as arbitrumSchema150 } from '@chainflip/processor/150/arbitrumIngressEgress/depositIgnored';
import { ethereumIngressEgressDepositIgnored as ethereumSchema150 } from '@chainflip/processor/150/ethereumIngressEgress/depositIgnored';
import { polkadotIngressEgressDepositIgnored as polkadotSchema150 } from '@chainflip/processor/150/polkadotIngressEgress/depositIgnored';
import { solanaIngressEgressDepositIgnored as solanaSchema160 } from '@chainflip/processor/160/solanaIngressEgress/depositIgnored';
import { arbitrumIngressEgressDepositIgnored as arbitrumSchema170 } from '@chainflip/processor/170/arbitrumIngressEgress/depositIgnored';
import { bitcoinIngressEgressDepositIgnored as bitcoinSchema170 } from '@chainflip/processor/170/bitcoinIngressEgress/depositIgnored';
import { ethereumIngressEgressDepositIgnored as ethereumSchema170 } from '@chainflip/processor/170/ethereumIngressEgress/depositIgnored';
import { polkadotIngressEgressDepositIgnored as polkadotSchema170 } from '@chainflip/processor/170/polkadotIngressEgress/depositIgnored';
import { solanaIngressEgressDepositIgnored as solanaSchema170 } from '@chainflip/processor/170/solanaIngressEgress/depositIgnored';
import * as base58 from '@chainflip/utils/base58';
import { hexToBytes } from '@chainflip/utils/bytes';
import * as ss58 from '@chainflip/utils/ss58';
import { z } from 'zod';
import { assetConstants } from '@/shared/enums';
import { bitcoinScriptPubKey } from '@/shared/parsers';
import { getDepositTxRef } from './common';
import env from '../config/env';
import logger from '../utils/logger';
import type { EventHandlerArgs } from './index';

const bitcoinScriptPubKeySchema = bitcoinScriptPubKey(env.CHAINFLIP_NETWORK);

const bitcoinIngressEgressDepositIgnored = z.union([bitcoinSchema170, bitcoinSchema131]);
const arbitrumIngressEgressDepositIgnored = z.union([arbitrumSchema170, arbitrumSchema150]);
const ethereumIngressEgressDepositIgnored = z.union([ethereumSchema170, ethereumSchema150]);
const polkadotIngressEgressDepositIgnored = z.union([polkadotSchema170, polkadotSchema150]);
const solanaIngressEgressDepositIgnored = z.union([solanaSchema170, solanaSchema160]);

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
    const { amount, depositAddress, reason, asset, ...rest } = depositIgnoredArgs.parse(event.args);

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
        depositTransactionRef:
          'depositDetails' in rest ? getDepositTxRef(chain, rest.depositDetails) : undefined,
      },
    });
  };

export default depositIgnored;

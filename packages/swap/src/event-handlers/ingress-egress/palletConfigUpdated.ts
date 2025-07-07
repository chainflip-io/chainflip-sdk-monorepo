import { arbitrumIngressEgressPalletConfigUpdated } from '@chainflip/processor/11000/arbitrumIngressEgress/palletConfigUpdated';
import { assethubIngressEgressPalletConfigUpdated } from '@chainflip/processor/11000/assethubIngressEgress/palletConfigUpdated';
import { bitcoinIngressEgressPalletConfigUpdated } from '@chainflip/processor/11000/bitcoinIngressEgress/palletConfigUpdated';
import { ethereumIngressEgressPalletConfigUpdated } from '@chainflip/processor/11000/ethereumIngressEgress/palletConfigUpdated';
import { polkadotIngressEgressPalletConfigUpdated } from '@chainflip/processor/11000/polkadotIngressEgress/palletConfigUpdated';
import { solanaIngressEgressPalletConfigUpdated } from '@chainflip/processor/11000/solanaIngressEgress/palletConfigUpdated';
import { ChainflipChain } from '@chainflip/utils/chainflip';
import { z } from 'zod';
import { Chain } from '../../client.js';
import { EventHandlerArgs } from '../index.js';

const palletConfigUpdatedSchemas = {
  Solana: solanaIngressEgressPalletConfigUpdated,
  Arbitrum: arbitrumIngressEgressPalletConfigUpdated,
  Bitcoin: bitcoinIngressEgressPalletConfigUpdated,
  Ethereum: ethereumIngressEgressPalletConfigUpdated,
  Polkadot: polkadotIngressEgressPalletConfigUpdated,
  Assethub: assethubIngressEgressPalletConfigUpdated,
} as const satisfies Record<ChainflipChain, z.ZodTypeAny>;

export type PalletConfigUpdatedArgsMap = {
  [C in Chain]: z.input<(typeof palletConfigUpdatedSchemas)[C]>;
};

export const palletConfigUpdated =
  (chain: Chain) =>
  async ({ prisma, event }: EventHandlerArgs) => {
    const { update } = palletConfigUpdatedSchemas[chain].parse(event.args);

    if (update.__kind.startsWith('SetBoostDelay') && 'delayBlocks' in update) {
      const data = {
        chain,
        numBlocks: update.delayBlocks,
      };
      await prisma.boostDelayChainflipBlocks.upsert({
        create: data,
        update: data,
        where: {
          chain,
        },
      });
    }
  };

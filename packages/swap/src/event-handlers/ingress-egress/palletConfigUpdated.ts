import { arbitrumIngressEgressPalletConfigUpdated } from '@chainflip/processor/11000/arbitrumIngressEgress/palletConfigUpdated';
import { assethubIngressEgressPalletConfigUpdated } from '@chainflip/processor/11000/assethubIngressEgress/palletConfigUpdated';
import { bitcoinIngressEgressPalletConfigUpdated } from '@chainflip/processor/11000/bitcoinIngressEgress/palletConfigUpdated';
import { ethereumIngressEgressPalletConfigUpdated } from '@chainflip/processor/11000/ethereumIngressEgress/palletConfigUpdated';
import { polkadotIngressEgressPalletConfigUpdated } from '@chainflip/processor/11000/polkadotIngressEgress/palletConfigUpdated';
import { solanaIngressEgressPalletConfigUpdated } from '@chainflip/processor/11000/solanaIngressEgress/palletConfigUpdated';
import { ChainflipChain } from '@chainflip/utils/chainflip';
import { z } from 'zod';
import { Chain } from '../../client.js';

const palletConfigUpdatedSchemas = {
  Solana: solanaIngressEgressPalletConfigUpdated,
  Arbitrum: arbitrumIngressEgressPalletConfigUpdated,
  Ethereum: ethereumIngressEgressPalletConfigUpdated,
  Bitcoin: bitcoinIngressEgressPalletConfigUpdated,
  Polkadot: polkadotIngressEgressPalletConfigUpdated,
  Assethub: assethubIngressEgressPalletConfigUpdated,
} as const satisfies Record<ChainflipChain, z.ZodTypeAny>;

export type PalletConfigUpdatedArgsMap = {
  [C in Chain]: z.input<(typeof palletConfigUpdatedSchemas)[C]>;
};
// const enumMatches = <E extends { __kind: string }, const T extends string>(
//   e: E,
//   prefix: T,
// ): e is Extract<E, { __kind: `${T}${string}` }> => e.__kind.startsWith(prefix);

export const palletConfigUpdated = (_chain: Chain) => async () => {
  // this was deprecated - leaving here as example
  // if (enumMatches(update, 'SetBoostDelay')) {
  //   const data = {
  //     chain,
  //     numBlocks: update.delayBlocks,
  //   };
  //   await prisma.boostDelayChainflipBlocks.upsert({
  //     create: data,
  //     update: data,
  //     where: {
  //       chain,
  //     },
  //   });
  // }
};

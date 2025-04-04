import { arbitrumIngressEgressBoostPoolCreated } from '@chainflip/processor/141/arbitrumIngressEgress/boostPoolCreated';
import { bitcoinIngressEgressBoostPoolCreated } from '@chainflip/processor/141/bitcoinIngressEgress/boostPoolCreated';
import { ethereumIngressEgressBoostPoolCreated } from '@chainflip/processor/141/ethereumIngressEgress/boostPoolCreated';
import { polkadotIngressEgressBoostPoolCreated } from '@chainflip/processor/141/polkadotIngressEgress/boostPoolCreated';
import { solanaIngressEgressBoostPoolCreated } from '@chainflip/processor/160/solanaIngressEgress/boostPoolCreated';
import { assethubIngressEgressBoostPoolCreated } from '@chainflip/processor/190/assethubIngressEgress/boostPoolCreated';
import { ChainflipChain } from '@chainflip/utils/chainflip';
import { z } from 'zod';
import { EventHandlerArgs } from '..';

const schemas = {
  Arbitrum: arbitrumIngressEgressBoostPoolCreated,
  Bitcoin: bitcoinIngressEgressBoostPoolCreated,
  Ethereum: ethereumIngressEgressBoostPoolCreated,
  Polkadot: polkadotIngressEgressBoostPoolCreated,
  Solana: solanaIngressEgressBoostPoolCreated,
  Assethub: assethubIngressEgressBoostPoolCreated,
} as const satisfies Record<ChainflipChain, z.ZodTypeAny>;

export const boostPoolCreated =
  (chain: ChainflipChain) =>
  async ({ prisma, event }: EventHandlerArgs) => {
    const {
      boostPool: { asset, tier },
    } = schemas[chain].parse(event.args);

    await prisma.boostPool.upsert({
      create: {
        asset,
        feeTierPips: tier,
        // safe mode is disabled by default which means pools are active
        boostEnabled: true,
        depositEnabled: true,
        withdrawEnabled: true,
      },
      where: {
        asset_feeTierPips: {
          asset,
          feeTierPips: tier,
        },
      },
      update: {},
    });
  };

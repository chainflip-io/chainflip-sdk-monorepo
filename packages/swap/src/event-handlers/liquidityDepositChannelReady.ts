import { liquidityProviderLiquidityDepositAddressReady as schema141 } from '@chainflip/processor/141/liquidityProvider/liquidityDepositAddressReady';
import { liquidityProviderLiquidityDepositAddressReady as schema150 } from '@chainflip/processor/150/liquidityProvider/liquidityDepositAddressReady';
import { liquidityProviderLiquidityDepositAddressReady as schema160 } from '@chainflip/processor/160/liquidityProvider/liquidityDepositAddressReady';
import { z } from 'zod';
import type { EventHandlerArgs } from './index';

const liquidityDepositAddressReadyArgs = z.union([schema160, schema150, schema141]);

export type LiquidityDepositAddressReadyArgs = z.input<typeof liquidityDepositAddressReadyArgs>;

export const liquidityDepositAddressReady = async ({ prisma, event, block }: EventHandlerArgs) => {
  const { depositAddress, channelId } = liquidityDepositAddressReadyArgs.parse(event.args);

  await prisma.depositChannel.create({
    data: {
      channelId,
      issuedBlock: block.height,
      srcChain: depositAddress.chain,
      depositAddress: depositAddress.address,
      isSwapping: false,
    },
  });
};

export default liquidityDepositAddressReady;

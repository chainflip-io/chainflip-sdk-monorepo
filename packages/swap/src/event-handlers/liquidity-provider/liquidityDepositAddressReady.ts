import { liquidityProviderLiquidityDepositAddressReady } from '@chainflip/processor/160/liquidityProvider/liquidityDepositAddressReady';
import { z } from 'zod';
import type { EventHandlerArgs } from '../index';

const liquidityDepositAddressReadyArgs = liquidityProviderLiquidityDepositAddressReady;

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

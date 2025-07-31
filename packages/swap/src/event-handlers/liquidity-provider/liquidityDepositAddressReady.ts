import { liquidityProviderLiquidityDepositAddressReady as schema190 } from '@chainflip/processor/190/liquidityProvider/liquidityDepositAddressReady';
import { z } from 'zod';
import type { EventHandlerArgs } from '../index.js';

const liquidityProviderLiquidityDepositAddressReady = schema190;

export type LiquidityDepositAddressReadyArgs = z.input<
  typeof liquidityProviderLiquidityDepositAddressReady
>;

const liquidityDepositAddressReady = async ({ prisma, event, block }: EventHandlerArgs) => {
  const { depositAddress, channelId } = liquidityProviderLiquidityDepositAddressReady.parse(
    event.args,
  );

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

import { liquidityProviderLiquidityDepositAddressReady as schema220 } from '@chainflip/processor/220/liquidityProvider/liquidityDepositAddressReady';
import { z } from 'zod';
import type { EventHandlerArgs } from '../index.js';

const liquidityProviderLiquidityDepositAddressReady = schema220.strict();

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
      type: 'LIQUIDITY',
    },
  });
};

export default liquidityDepositAddressReady;

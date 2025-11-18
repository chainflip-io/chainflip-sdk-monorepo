import { swappingAccountCreationDepositAddressReady } from '@chainflip/processor/200/swapping/accountCreationDepositAddressReady';
import z from 'zod';
import { EventHandlerArgs } from '../index.js';

export type SwappingAccountCreationDepositAddressReadyArgs = z.input<
  typeof swappingAccountCreationDepositAddressReady
>;

export default async function accountCreationDepositAddressReady({
  prisma,
  event,
  block,
}: EventHandlerArgs) {
  const { channelId, depositAddress } = swappingAccountCreationDepositAddressReady.parse(
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
}

import { swappingAccountCreationDepositAddressReady } from '@chainflip/processor/200/swapping/accountCreationDepositAddressReady';
import z from 'zod';
import { formatForeignChainAddress } from '../common.js';
import { EventHandlerArgs } from '../index.js';

export type SwappingAccountCreationDepositAddressReadyArgs = z.input<
  typeof swappingAccountCreationDepositAddressReady
>;

export default async function accountCreationDepositAddressReady({
  prisma,
  event,
  block,
}: EventHandlerArgs) {
  const {
    channelId,
    depositAddress,
    asset,
    boostFee,
    channelOpeningFee,
    depositChainExpiryBlock,
    refundAddress,
    requestedBy,
    requestedFor,
  } = swappingAccountCreationDepositAddressReady.parse(event.args);

  await Promise.all([
    prisma.depositChannel.create({
      data: {
        channelId,
        issuedBlock: block.height,
        srcChain: depositAddress.chain,
        depositAddress: depositAddress.address,
        isSwapping: false,
      },
    }),
    prisma.accountCreationDepositChannel.create({
      data: {
        asset,
        chain: depositAddress.chain,
        channelId,
        issuedBlock: block.height,
        depositAddress: depositAddress.address,
        depositChainExpiryBlock,
        maxBoostFeeBps: boostFee,
        openingFeePaid: channelOpeningFee.toString(),
        refundAddress: formatForeignChainAddress(refundAddress),
        lpAccountId: requestedFor,
        broker: {
          create: {
            account: requestedBy,
            commissionBps: 0,
            type: 'SUBMITTER',
          },
        },
      },
    }),
  ]);
}

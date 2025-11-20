import { swappingAccountCreationDepositAddressReady } from '@chainflip/processor/200/swapping/accountCreationDepositAddressReady';
import z from 'zod';
import { calculateExpiryTime } from '../../utils/function.js';
import { formatForeignChainAddress } from '../common.js';
import { EventHandlerArgs } from '../index.js';

export type AccountCreationDepositAddressReadyArgs = z.input<
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

  const estimatedExpiryAt = calculateExpiryTime({
    chainInfo: await prisma.chainTracking.findFirst({ where: { chain: depositAddress.chain } }),
    expiryBlock: depositChainExpiryBlock,
  });
  await Promise.all([
    prisma.depositChannel.create({
      data: {
        channelId,
        issuedBlock: block.height,
        srcChain: depositAddress.chain,
        depositAddress: depositAddress.address,
        isSwapping: false,
        type: 'ACCOUNT_CREATION',
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
        isExpired: false,
        openedThroughBackend: false,
        createdAt: block.timestamp,
        estimatedExpiryAt,
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

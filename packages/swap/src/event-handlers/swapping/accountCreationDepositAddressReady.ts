import { swappingAccountCreationDepositAddressReady as schema200 } from '@chainflip/processor/200/swapping/accountCreationDepositAddressReady';
import { swappingAccountCreationDepositAddressReady as schema210 } from '@chainflip/processor/210/swapping/accountCreationDepositAddressReady';
import { z } from 'zod';
import { calculateExpiryTime } from '../../utils/function.js';
import { EventHandlerArgs } from '../index.js';

const swappingAccountCreationDepositAddressReady = z.union([
  schema210.strict(),
  schema200.strict(),
]);

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
    prisma.accountCreationDepositChannel.upsert({
      where: {
        issuedBlock_chain_channelId: {
          issuedBlock: block.height,
          channelId,
          chain: depositAddress.chain,
        },
      },
      create: {
        asset,
        chain: depositAddress.chain,
        channelId,
        issuedBlock: block.height,
        depositAddress: depositAddress.address,
        depositChainExpiryBlock,
        maxBoostFeeBps: boostFee,
        openingFeePaid: channelOpeningFee.toString(),
        refundAddress: refundAddress.address,
        lpAccountId: requestedFor,
        isExpired: false,
        openedThroughBackend: false,
        createdAt: block.timestamp,
        estimatedExpiryAt,
        swapBeneficiaries: {
          create: {
            account: requestedBy,
            commissionBps: 0,
            type: 'SUBMITTER',
          },
        },
      },
      update: {
        createdAt: block.timestamp,
        swapBeneficiaries: {
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

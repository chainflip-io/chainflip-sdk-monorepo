import { z } from 'zod';
import { u64, u128, internalAssetEnum } from '@/shared/parsers';
import { encodedAddress } from './common';
import { EventHandlerArgs } from '.';

const depositChannelSwapOrigin = z.object({
  __kind: z.literal('DepositChannel'),
  depositAddress: encodedAddress,
  channelId: u64,
});
const vaultSwapOrigin = z.object({
  __kind: z.literal('Vault'),
  txHash: z.string(),
});

const swapAmountTooLowArgs = z.object({
  asset: internalAssetEnum,
  amount: u128,
  destinationAddress: encodedAddress,
  origin: z.union([depositChannelSwapOrigin, vaultSwapOrigin]),
});

export type SwapAmountTooLowEvent = z.input<typeof swapAmountTooLowArgs>;

/** @deprecated no longer exists after v1.2.0 */
export default async function swapAmountTooLow({
  prisma,
  event,
  block,
}: EventHandlerArgs): Promise<void> {
  const { origin, amount, destinationAddress, asset } = swapAmountTooLowArgs.parse(event.args);
  let sourceChain;
  let dbDepositChannel;
  let txHash;
  let sourceAsset;
  if (origin.__kind === 'DepositChannel') {
    dbDepositChannel = await prisma.swapDepositChannel.findFirstOrThrow({
      where: {
        srcChain: origin.depositAddress.chain,
        depositAddress: origin.depositAddress.address,
        channelId: origin.channelId,
        isExpired: false,
      },
      orderBy: { issuedBlock: 'desc' },
    });
    sourceChain = origin.depositAddress.chain;
    sourceAsset = dbDepositChannel.srcAsset;
  } else {
    // Vault
    sourceChain = 'Ethereum' as const;
    txHash = origin.txHash;
    sourceAsset = asset;
  }

  await prisma.failedSwap.create({
    data: {
      reason: 'BelowMinimumDeposit',
      destAddress: destinationAddress.address,
      destChain: destinationAddress.chain,
      depositAmount: amount.toString(),
      srcChain: sourceChain,
      srcAsset: sourceAsset,
      swapDepositChannelId: dbDepositChannel?.id,
      depositTransactionRef: txHash,
      failedAt: new Date(block.timestamp),
      failedBlockIndex: `${block.height}-${event.indexInBlock}`,
    },
  });
}

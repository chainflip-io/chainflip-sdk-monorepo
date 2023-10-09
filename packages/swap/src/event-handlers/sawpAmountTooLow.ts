import { z } from 'zod';
import { u64, u128, chainflipAssetEnum } from '@/shared/parsers';
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
  asset: chainflipAssetEnum,
  amount: u128,
  destinationAddress: encodedAddress,
  origin: z.union([depositChannelSwapOrigin, vaultSwapOrigin]),
});

export type SwapAmountTooLowEvent = z.input<typeof swapAmountTooLowArgs>;

export default async function swapAmountTooLow({
  prisma,
  block,
  event,
}: EventHandlerArgs): Promise<void> {
  const { origin, amount, destinationAddress } = swapAmountTooLowArgs.parse(
    event.args,
  );
  let sourceChain;
  let dbDepositChannel;
  let txHash;
  if (origin.__kind === 'DepositChannel') {
    dbDepositChannel = await prisma.swapDepositChannel.findFirstOrThrow({
      where: {
        srcChain: origin.depositAddress.chain,
        depositAddress: origin.depositAddress.address,
        channelId: origin.channelId,
        issuedBlock: { lte: block.height },
      },
      orderBy: { id: 'desc' },
    });
    sourceChain = origin.depositAddress.chain;
  } else {
    // Vault
    sourceChain = 'Ethereum' as const;
    txHash = origin.txHash;
  }

  await prisma.failedSwap.create({
    data: {
      destinationAddress: destinationAddress.address,
      destinationChain: destinationAddress.chain,
      depositAmount: amount.toString(),
      sourceChain,
      swapDepositChannelId: dbDepositChannel?.id,
      txHash,
    },
  });
}

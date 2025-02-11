import {
  findVaultSwapSignature,
  findTransactionSignatures,
  type DepositInfo,
} from '@chainflip/solana/deposit';
import { sleep } from '@chainflip/utils/async';
import assert from 'assert';
import { isAxiosError } from 'axios';
import { z } from 'zod';
import { assertUnreachable } from '@/shared/functions';
import prisma from '../client';
import env from '../config/env';
import { handleExit } from '../utils/function';
import baseLogger from '../utils/logger';

const logger = baseLogger.child({ module: 'solana-queue' });

const pendingTxRefSchema = z.union([
  z
    .object({ swapDepositChannelId: z.bigint() })
    .transform((args) => ({ type: 'CHANNEL' as const, channelId: args.swapDepositChannelId })),
  z
    .object({ vaultSwapRequestId: z.bigint(), slot: z.bigint(), address: z.string() })
    .transform(({ vaultSwapRequestId, ...args }) => ({
      type: 'VAULT_SWAP' as const,
      status: 'SUCCESS' as const,
      id: vaultSwapRequestId,
      ...args,
    })),
  z
    .object({ failedVaultSwapId: z.number(), slot: z.bigint(), address: z.string() })
    .transform(({ failedVaultSwapId, ...args }) => ({
      type: 'VAULT_SWAP' as const,
      status: 'FAILED' as const,
      id: failedVaultSwapId,
      ...args,
    })),
]);

type PendingTxRef = z.output<typeof pendingTxRefSchema>;
type PendingChannelTxRef = Extract<PendingTxRef, { type: 'CHANNEL' }>;

const sortBlockIndexDesc = (a: { blockIndex: string }, b: { blockIndex: string }) => {
  const [aBlock, aIndex] = a.blockIndex.split('-').map(Number);
  const [bBlock, bIndex] = b.blockIndex.split('-').map(Number);

  return bBlock - aBlock || bIndex - aIndex;
};

type KeyMap = {
  SWAP_REQUEST: bigint;
  FAILED_SWAP: number;
};

type DepositType = keyof KeyMap;

type Deposit = {
  [K in DepositType]: {
    id: KeyMap[K];
    type: K;
  } & DepositInfo;
}[DepositType];

const updateChannel = async (data: PendingChannelTxRef) => {
  const channel = await prisma.swapDepositChannel.findUniqueOrThrow({
    where: { id: data.channelId },
    include: { failedSwaps: true, swapRequests: true },
  });

  assert(channel.srcAsset === 'Sol' || channel.srcAsset === 'SolUsdc', 'unexpected asset');

  const deposits: Deposit[] = [
    ...channel.swapRequests.map((sr) => ({
      id: sr.id,
      type: 'SWAP_REQUEST' as const,
      blockIndex: sr.swapRequestedBlockIndex,
      amount: BigInt(sr.depositAmount!.toFixed()),
      maxSlot: Infinity, // FIXME: get max slot from indexer
    })),
    ...channel.failedSwaps.map((fs) => ({
      id: fs.id,
      type: 'FAILED_SWAP' as const,
      blockIndex: fs.failedBlockIndex,
      amount: BigInt(fs.depositAmount.toFixed()),
      maxSlot: Infinity,
    })),
  ].sort(sortBlockIndexDesc);

  const txRefs = await findTransactionSignatures(
    env.SOLANA_RPC_HTTP_URL,
    channel.depositAddress,
    channel.srcAsset,
    deposits,
  );

  await prisma.$transaction(async (txClient) =>
    Promise.all(
      deposits.map((d, i) =>
        d.type === 'SWAP_REQUEST'
          ? txClient.swapRequest.update({
              where: { id: d.id },
              // the last element is the oldest transaction signature
              data: { depositTransactionRef: txRefs[i].at(-1) },
            })
          : txClient.failedSwap.update({
              where: { id: d.id },
              // the last element is the oldest transaction signature
              data: { depositTransactionRef: txRefs[i].at(-1) },
            }),
      ),
    ),
  );
};

type VaultSwapPendingTxRef = Extract<PendingTxRef, { type: 'VAULT_SWAP' }>;

const updateVaultSwap = async (data: VaultSwapPendingTxRef) => {
  const signature = await findVaultSwapSignature(
    env.SOLANA_RPC_HTTP_URL,
    data.address,
    Number(data.slot),
  );

  if (data.status === 'SUCCESS') {
    await prisma.swapRequest.update({
      where: { id: data.id },
      data: { depositTransactionRef: signature },
    });
  } else if (data.status === 'FAILED') {
    await prisma.failedSwap.update({
      where: { id: data.id },
      data: { depositTransactionRef: signature },
    });
  } else {
    assertUnreachable(data, 'unexpected vault swap status');
  }
};

export const start = async () => {
  const controller = new AbortController();
  const clean = handleExit(() => {
    controller.abort();
  });

  logger.info('starting solana tx ref queue');

  while (!controller.signal.aborted) {
    try {
      await sleep(env.SOLANA_TX_REF_QUEUE_INTERVAL, { signal: controller.signal });
    } catch {
      break;
    }

    const pendingTxRef = await prisma.solanaPendingTxRef.findFirst();

    // eslint-disable-next-line no-continue
    if (!pendingTxRef) continue;

    let parsed;

    try {
      parsed = pendingTxRefSchema.parse(pendingTxRef);

      switch (parsed.type) {
        case 'CHANNEL':
          await updateChannel(parsed);
          break;
        case 'VAULT_SWAP':
          await updateVaultSwap(parsed);
          break;
        default:
          assertUnreachable(parsed, 'unexpected pending tx ref type');
      }
    } catch (error) {
      if (isAxiosError(error)) {
        logger.warn('network error while processing solana tx ref', {
          error: error.toJSON(),
          pendingTxRef,
        });
        // eslint-disable-next-line no-continue
        continue;
      }
      logger.error('error processing solana tx ref', { error, pendingTxRef, parsed });
      break;
    }
  }

  logger.info('exiting solana tx ref queue');

  clean();
};

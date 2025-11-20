import {
  findVaultSwapSignature,
  findTransactionSignatures,
  type DepositInfo,
  TransactionMatchingError,
} from '@chainflip/solana';
import { sleep } from '@chainflip/utils/async';
import assert from 'assert';
import { isAxiosError } from 'axios';
import * as util from 'util';
import { z } from 'zod';
import { assertUnreachable } from '@/shared/functions.js';
import prisma from '../client.js';
import env from '../config/env.js';
import { handleExit } from '../utils/function.js';
import baseLogger from '../utils/logger.js';

const logger = baseLogger.child({ module: 'solana-queue' });

const pendingTxRefSchema = z.union([
  z.object({ swapDepositChannelId: z.bigint() }).transform((args) => ({
    type: 'CHANNEL' as const,
    model: 'swapDepositChannel' as const,
    channelId: args.swapDepositChannelId,
  })),
  z.object({ accountCreationDepositChannelId: z.bigint() }).transform((args) => ({
    type: 'CHANNEL' as const,
    model: 'accountCreationDepositChannel' as const,
    channelId: args.accountCreationDepositChannelId,
  })),
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

type SolanaNetwork = Parameters<typeof findTransactionSignatures>[4];

const updateChannel = async (url: string, data: PendingChannelTxRef, network: SolanaNetwork) => {
  let channel;
  let asset;

  if (data.model === 'swapDepositChannel') {
    channel = await prisma.swapDepositChannel.findUniqueOrThrow({
      where: { id: data.channelId },
      include: { failedSwaps: true, swapRequests: true },
    });
    asset = channel.srcAsset;
  } else if (data.model === 'accountCreationDepositChannel') {
    channel = await prisma.accountCreationDepositChannel.findUniqueOrThrow({
      where: { id: data.channelId },
      include: { failedSwaps: true, swapRequests: true },
    });
    asset = channel.asset;
  } else {
    return assertUnreachable(data, 'unexpected channel model');
  }

  assert(asset === 'Sol' || asset === 'SolUsdc', 'unexpected asset');

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

  let txRefs;

  try {
    txRefs = await findTransactionSignatures(url, channel.depositAddress, asset, deposits, network);
  } catch (error) {
    logger.error('failed to find transaction signatures', {
      error,
      channel: { address: channel.depositAddress, asset },
      ...(error instanceof TransactionMatchingError
        ? { deposits: error.deposits, transfers: error.transfers }
        : { deposits }),
    });

    throw error;
  }

  await prisma.$transaction(async (txClient) =>
    Promise.all(
      deposits.map((d, i) => {
        // the last element is the oldest transaction signature
        const newData = { depositTransactionRef: txRefs[i].at(-1) };

        switch (d.type) {
          case 'FAILED_SWAP':
            return txClient.failedSwap.update({ where: { id: d.id }, data: newData });
          case 'SWAP_REQUEST':
            return txClient.swapRequest.update({ where: { id: d.id }, data: newData });
          default:
            return assertUnreachable(d, 'unexpected deposit type');
        }
      }),
    ),
  );
};

type VaultSwapPendingTxRef = Extract<PendingTxRef, { type: 'VAULT_SWAP' }>;

const updateVaultSwap = async (url: string, data: VaultSwapPendingTxRef) => {
  const signature = await findVaultSwapSignature(url, data.address, Number(data.slot));

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
  const url = env.SOLANA_RPC_HTTP_URL;

  if (!url) {
    logger.info('no solana rpc url present');
    return;
  }

  let network: SolanaNetwork | undefined;
  if (env.CHAINFLIP_NETWORK === 'mainnet') {
    network = 'mainnet';
  } else if (env.CHAINFLIP_NETWORK === 'perseverance') {
    network = 'devnet';
  }

  if (!network) {
    logger.info('no solana network present');
    return;
  }

  const controller = new AbortController();
  const clean = handleExit(() => {
    controller.abort();
  });

  logger.info('starting solana tx ref queue');

  let retries = 0;

  while (!controller.signal.aborted) {
    try {
      const backoff = Math.min(env.SOLANA_TX_REF_QUEUE_INTERVAL * 2 ** retries, 60_000);
      await sleep(backoff, { signal: controller.signal });
    } catch {
      break;
    }

    const pendingTxRef = await prisma.solanaPendingTxRef.findFirst();

    // eslint-disable-next-line no-continue
    if (!pendingTxRef) continue;

    let parsed;

    try {
      parsed = pendingTxRefSchema.parse(pendingTxRef);

      logger.info('processing solana tx ref', parsed);

      switch (parsed.type) {
        case 'CHANNEL':
          await updateChannel(url, parsed, network);
          break;
        case 'VAULT_SWAP':
          await updateVaultSwap(url, parsed);
          break;
        default:
          assertUnreachable(parsed, 'unexpected pending tx ref type');
      }

      retries = 0;

      await prisma.solanaPendingTxRef.delete({ where: { id: pendingTxRef.id } });
    } catch (error) {
      if (isAxiosError(error)) {
        logger.warn('network error while processing solana tx ref', {
          error: error.toJSON(),
          pendingTxRef,
        });
      } else {
        logger.error('error processing solana tx ref', {
          error: util.inspect(error),
          pendingTxRef,
          parsed,
        });

        retries += 1;
        logger.info('retrying request', { retries });
      }
    }
  }

  logger.info('exiting solana tx ref queue');

  clean();
};

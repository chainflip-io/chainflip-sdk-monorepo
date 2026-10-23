import { findTransactionSignatures } from '@chainflip/solana';
import { sleep } from '@chainflip/utils/async';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import prisma from '../../client.js';
import { handleExit } from '../../utils/function.js';
import logger from '../../utils/logger.js';
import { start } from '../solanaTxRefs.js';

vi.mock('../../utils/function.js');
vi.mock('@chainflip/utils/async');
vi.mock('@chainflip/solana', () => ({
  findTransactionSignatures: vi.fn().mockRejectedValue(new Error('test error')),
}));
vi.mock('../updateChannel.js');

const noop = () => {
  // no operation
};

const ONE_SECOND = 1000;
const ONE_HOUR = 60 * 60 * 1000;

const createPendingChannelTxRef = (channelId: number, depositAddress: string) =>
  prisma.solanaPendingTxRef.create({
    data: {
      swapDepositChannel: {
        create: {
          channelId,
          srcAsset: 'Sol',
          srcChain: 'Solana',
          depositAddress,
          destAddress: 'dest address',
          destAsset: 'SolUsdc',
          issuedBlock: 1,
          openingFeePaid: 0,
          totalBrokerCommissionBps: 0,
        },
      },
    },
  });

const runQueue = async ({ ticks, tickMs }: { ticks: number; tickMs: number }) => {
  const tickTimes: number[] = [];
  let stop = noop;
  vi.mocked(handleExit).mockImplementation((cb) => {
    stop = cb;
    return noop;
  });
  vi.mocked(sleep).mockImplementation(async () => {
    if (tickTimes.length === ticks) {
      stop();
      return;
    }
    vi.setSystemTime(Date.now() + tickMs);
    tickTimes.push(Date.now());
  });

  await start();

  return tickTimes;
};

const failOnStuckAddress = async (url: string, address: string) => {
  if (address === 'stuck address') throw new Error('test error');
  return [];
};

const attemptedAddresses = () =>
  vi.mocked(findTransactionSignatures).mock.calls.map(([, address]) => address);

describe('solana queue', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.mocked(findTransactionSignatures).mockRejectedValue(new Error('test error'));
    vi.useFakeTimers({ toFake: ['Date'] });
    await prisma.$queryRaw`TRUNCATE TABLE "SwapDepositChannel" CASCADE`;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('backs off a failing tx ref exponentially up to 30 minutes', async () => {
    await createPendingChannelTxRef(1, 'stuck address');
    const infoSpy = vi.spyOn(logger, 'info');

    const tickTimes = await runQueue({ ticks: 14, tickMs: ONE_HOUR });

    const nextAttemptTimes = (infoSpy.mock.calls as unknown as [string, { nextAttemptAt: Date }][])
      .filter(([message]) => message === 'retrying solana tx ref')
      .map(([, meta]) => meta.nextAttemptAt.getTime());
    expect(nextAttemptTimes.map((time, i) => time - tickTimes[i])).toEqual([
      1000, 2000, 4000, 8000, 16000, 32000, 64000, 128000, 256000, 512000, 1024000, 1800000,
      1800000, 1800000,
    ]);
  });

  it('skips a failing tx ref until its next attempt is due', async () => {
    await createPendingChannelTxRef(1, 'stuck address');

    await runQueue({ ticks: 10, tickMs: ONE_SECOND });

    expect(attemptedAddresses()).toHaveLength(4);
  });

  it('processes a tx ref queued behind a failing one in the same batch', async () => {
    await createPendingChannelTxRef(1, 'stuck address');
    await createPendingChannelTxRef(2, 'healthy address');
    vi.mocked(findTransactionSignatures).mockImplementation(failOnStuckAddress);

    await runQueue({ ticks: 1, tickMs: ONE_SECOND });

    expect(attemptedAddresses()).toEqual(['stuck address', 'healthy address']);
    expect(await prisma.solanaPendingTxRef.findMany()).toEqual([
      expect.objectContaining({ abandonedAt: null }),
    ]);
  });

  it('abandons a tx ref a day after its first failure', async () => {
    const stuck = await createPendingChannelTxRef(1, 'stuck address');
    const severeSpy = vi.spyOn(logger, 'severe');

    await runQueue({ ticks: 28, tickMs: ONE_HOUR });

    expect(attemptedAddresses()).toHaveLength(25);
    expect(severeSpy).toHaveBeenCalledWith(
      'giving up on solana tx ref after a day of retries',
      expect.objectContaining({ pendingTxRef: expect.objectContaining({ id: stuck.id }) }),
    );
    expect(await prisma.solanaPendingTxRef.findMany()).toEqual([
      expect.objectContaining({ id: stuck.id, abandonedAt: expect.any(Date) }),
    ]);
  });

  it('retries the give-up when marking a tx ref as abandoned fails', async () => {
    const stuck = await createPendingChannelTxRef(1, 'stuck address');
    const update = prisma.solanaPendingTxRef.update.bind(prisma.solanaPendingTxRef);
    let abandonFailed = false;
    vi.spyOn(prisma.solanaPendingTxRef, 'update').mockImplementation(((args: { data: object }) => {
      if (!abandonFailed && 'abandonedAt' in args.data) {
        abandonFailed = true;
        return Promise.reject(new Error('db error'));
      }
      return update(args as Parameters<typeof update>[0]);
    }) as unknown as typeof update);
    const severeSpy = vi.spyOn(logger, 'severe');

    await runQueue({ ticks: 28, tickMs: ONE_HOUR });

    expect(attemptedAddresses()).toHaveLength(26);
    expect(severeSpy).toHaveBeenCalledTimes(1);
    expect(await prisma.solanaPendingTxRef.findMany()).toEqual([
      expect.objectContaining({ id: stuck.id, abandonedAt: expect.any(Date) }),
    ]);
  });
});

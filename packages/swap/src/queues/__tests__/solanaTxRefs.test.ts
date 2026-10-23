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

const runQueueHourly = async (iterations: number) => {
  vi.useFakeTimers({ toFake: ['Date'] });
  let calls = 0;
  let stop = noop;
  vi.mocked(handleExit).mockImplementation((cb) => {
    stop = cb;
    return noop;
  });
  vi.mocked(sleep).mockImplementation(async () => {
    calls += 1;
    vi.setSystemTime(Date.now() + 60 * 60 * 1000);
    if (calls === iterations) stop();
  });

  await start();
};

const failOnStuckAddress = async (url: string, address: string) => {
  if (address === 'stuck address') throw new Error('test error');
  return [];
};

describe('solana queue', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.mocked(findTransactionSignatures).mockRejectedValue(new Error('test error'));
    await prisma.$queryRaw`TRUNCATE TABLE "SwapDepositChannel" CASCADE`;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('retries with exponential backoff', async () => {
    await createPendingChannelTxRef(1, 'solana address');
    let calls = 0;

    let stop = noop;
    vi.mocked(handleExit).mockImplementation((cb) => {
      stop = cb;
      return noop;
    });

    vi.mocked(sleep).mockImplementation(async () => {
      calls += 1;

      if (calls === 14) {
        stop();
      }
    });

    const promise = start();

    await promise;

    expect(vi.mocked(sleep).mock.calls.map(([ms]) => ms)).toMatchInlineSnapshot(`
      [
        500,
        1000,
        2000,
        4000,
        8000,
        16000,
        32000,
        64000,
        128000,
        256000,
        512000,
        1024000,
        1800000,
        1800000,
      ]
    `);
  });

  it('gives up on a tx ref after a day of failures and moves on to the next one', async () => {
    const stuck = await createPendingChannelTxRef(1, 'stuck address');
    await createPendingChannelTxRef(2, 'healthy address');
    vi.mocked(findTransactionSignatures).mockImplementation(failOnStuckAddress);
    const severeSpy = vi.spyOn(logger, 'severe');

    await runQueueHourly(28);

    expect(vi.mocked(findTransactionSignatures).mock.calls.map(([, address]) => address)).toEqual([
      ...Array(25).fill('stuck address'),
      'healthy address',
    ]);
    expect(severeSpy).toHaveBeenCalledWith(
      'giving up on solana tx ref after a day of retries',
      expect.objectContaining({ pendingTxRef: expect.objectContaining({ id: stuck.id }) }),
    );
    expect(await prisma.solanaPendingTxRef.findMany()).toEqual([
      expect.objectContaining({ id: stuck.id, abandonedAt: expect.any(Date) }),
    ]);
  });

  it('keeps polling and retries the give-up when marking a tx ref as abandoned fails', async () => {
    const stuck = await createPendingChannelTxRef(1, 'stuck address');
    await createPendingChannelTxRef(2, 'healthy address');
    vi.mocked(findTransactionSignatures).mockImplementation(failOnStuckAddress);
    const update = prisma.solanaPendingTxRef.update.bind(prisma.solanaPendingTxRef);
    vi.spyOn(prisma.solanaPendingTxRef, 'update')
      .mockImplementation(update)
      .mockRejectedValueOnce(new Error('db error'));
    const severeSpy = vi.spyOn(logger, 'severe');

    await runQueueHourly(28);

    expect(vi.mocked(findTransactionSignatures).mock.calls.map(([, address]) => address)).toEqual([
      ...Array(26).fill('stuck address'),
      'healthy address',
    ]);
    expect(severeSpy).toHaveBeenCalledTimes(1);
    expect(await prisma.solanaPendingTxRef.findMany()).toEqual([
      expect.objectContaining({ id: stuck.id, abandonedAt: expect.any(Date) }),
    ]);
  });
});

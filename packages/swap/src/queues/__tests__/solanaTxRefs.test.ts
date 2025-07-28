import { sleep } from '@chainflip/utils/async';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import prisma from '../../client.js';
import { handleExit } from '../../utils/function.js';
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

describe('solana queue', () => {
  beforeEach(async () => {
    await prisma.$queryRaw`TRUNCATE TABLE "SwapDepositChannel" CASCADE`;
  });

  it('retries with exponential backoff', async () => {
    await prisma.solanaPendingTxRef.create({
      data: {
        swapDepositChannel: {
          create: {
            channelId: 1,
            srcAsset: 'Sol',
            srcChain: 'Solana',
            depositAddress: 'solana address',
            destAddress: 'dest address',
            destAsset: 'SolUsdc',
            issuedBlock: 1,
            openingFeePaid: 0,
            totalBrokerCommissionBps: 0,
          },
        },
      },
    });
    let calls = 0;

    let stop = noop;
    vi.mocked(handleExit).mockImplementation((cb) => {
      stop = cb;
      return noop;
    });

    vi.mocked(sleep).mockImplementation(async () => {
      calls += 1;

      if (calls === 10) {
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
        60000,
        60000,
        60000,
      ]
    `);
  });
});

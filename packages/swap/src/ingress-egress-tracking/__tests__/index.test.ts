import Redis from 'ioredis';
import { getPendingBroadcast, getPendingDeposit } from '..';
import prisma from '../../client';
import logger from '../../utils/logger';

jest.mock('../../config/env', () => ({
  REDIS_URL: 'redis://localhost:6379',
}));

jest.mock('../../utils/logger');

describe('ingress-egress-tracking', () => {
  let redis: Redis;

  beforeAll(() => {
    redis = new Redis();
  });

  afterEach(async () => {
    await redis.flushall();
    await prisma.chainTracking.deleteMany();
  });

  afterAll(async () => {
    await redis.quit();
  });

  describe(getPendingDeposit, () => {
    it('gets pending deposits from redis', async () => {
      await prisma.chainTracking.create({
        data: {
          chain: 'Ethereum',
          height: BigInt(1234567893),
        },
      });

      await redis.set(
        'deposit:Ethereum:0x1234',
        JSON.stringify([
          {
            amount: '0x9000',
            asset: { asset: 'FLIP', chain: 'Ethereum' },
            deposit_chain_block_height: 1234567890,
          },
        ]),
      );

      const deposit = await getPendingDeposit('Ethereum', 'FLIP', '0x1234');

      expect(deposit).toEqual({ amount: '36864', transactionConfirmations: 3 });
    });

    it('returns undefined if the deposit is not found', async () => {
      await prisma.chainTracking.create({
        data: {
          chain: 'Ethereum',
          height: BigInt(1234567893),
        },
      });

      const deposit = await getPendingDeposit('Ethereum', 'FLIP', '0x1234');

      expect(deposit).toBeUndefined();
      expect(logger.error).not.toHaveBeenCalled();
    });

    it('returns undefined if the redis client throws', async () => {
      jest.spyOn(Redis.prototype, 'get').mockRejectedValueOnce(new Error());
      await prisma.chainTracking.create({
        data: {
          chain: 'Ethereum',
          height: BigInt(1234567893),
        },
      });

      const deposit = await getPendingDeposit('Ethereum', 'FLIP', '0x1234');

      expect(deposit).toBeUndefined();
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe(getPendingBroadcast, () => {
    it('gets pending broadcasts from redis', async () => {
      await redis.set(
        'broadcast:Ethereum:1',
        JSON.stringify({
          tx_out_id: { signature: { s: [], k_times_g_address: [] } },
        }),
      );

      expect(await getPendingBroadcast('Ethereum', 1n)).not.toBeNull();
    });

    it('returns null if the broadcast is not found', async () => {
      expect(await getPendingBroadcast('Ethereum', 1n)).toBeNull();
      expect(logger.error).not.toHaveBeenCalled();
    });

    it('returns null if the client throws an error', async () => {
      jest.spyOn(Redis.prototype, 'get').mockRejectedValueOnce(new Error());

      expect(await getPendingBroadcast('Ethereum', 1n)).toBeNull();
      expect(logger.error).toHaveBeenCalled();
    });
  });
});

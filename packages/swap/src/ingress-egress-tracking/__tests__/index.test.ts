import Redis from 'ioredis';
import { vi, describe, expect, beforeAll, beforeEach, it } from 'vitest';
import { Chain } from '@/shared/enums';
import { getPendingBroadcast, getPendingDeposit } from '..';
import prisma, { Broadcast } from '../../client';
import logger from '../../utils/logger';

vi.mock('../../utils/logger');

const updateChainTracking = async (data: {
  chain: Chain;
  height: bigint;
  stateChainHeight?: number;
}) => {
  const { chain, height, stateChainHeight } = data;
  await prisma.state.create({ data: { height: stateChainHeight ?? 1 } });
  await prisma.chainTracking.upsert({
    where: { chain },
    update: { chain, height, previousHeight: height - 1n, eventWitnessedBlock: 1 },
    create: { chain, height, previousHeight: height - 1n, eventWitnessedBlock: 1 },
  });
};

describe('ingress-egress-tracking', () => {
  let redis: Redis;

  beforeAll(() => {
    redis = new Redis();

    return async () => {
      await redis.quit();
    };
  });

  beforeEach(async () => {
    await redis.flushall();
    await prisma.chainTracking.deleteMany();
    await prisma.state.deleteMany();
    vi.resetAllMocks();
  });

  describe(getPendingDeposit, () => {
    it('gets pending non-bitcoin deposits from redis', async () => {
      await updateChainTracking({ chain: 'Ethereum', height: 1234567893n });

      await redis.rpush(
        'deposit:Ethereum:0x1234',
        JSON.stringify({
          amount: '0x9000',
          asset: 'FLIP',
          deposit_chain_block_height: 1234567890,
          deposit_details: {
            tx_hashes: ['0x1234'],
          },
        }),
      );

      const deposit = await getPendingDeposit('Flip', '0x1234');

      expect(deposit).toEqual({
        amount: '36864',
        txConfirmations: 3,
        txRef: '0x1234',
      });
    });

    it('ensures foreign block height is used only after 1 extra state chain block', async () => {
      await updateChainTracking({ chain: 'Ethereum', height: 1234567893n, stateChainHeight: 2 });

      await redis.rpush(
        'deposit:Ethereum:0x1234',
        JSON.stringify({
          amount: '0x9000',
          asset: 'FLIP',
          deposit_chain_block_height: 1234567890,
          deposit_details: {
            tx_hashes: ['0x1234'],
          },
        }),
      );

      const deposit = await getPendingDeposit('Flip', '0x1234');

      expect(deposit).toEqual({
        amount: '36864',
        txConfirmations: 4,
        txRef: '0x1234',
      });
    });

    it('returns null if the non-bitcoin deposit is not found', async () => {
      await updateChainTracking({ chain: 'Ethereum', height: 1234567893n });

      const deposit = await getPendingDeposit('Flip', '0x1234');

      expect(deposit).toBeNull();
      expect(logger.error).not.toHaveBeenCalled();
    });

    it('gets mempool txs for bitcoin from redis', async () => {
      await redis.set(
        'mempool:Bitcoin:tb1q8uzv43phxxsndlxglj74ryc6umxuzuz22u7erf',
        JSON.stringify({
          tx_hash: 'deadc0de',
          value: '0x9000',
          confirmations: 3,
        }),
      );

      const deposit = await getPendingDeposit('Btc', 'tb1q8uzv43phxxsndlxglj74ryc6umxuzuz22u7erf');

      expect(logger.error).not.toHaveBeenCalled();
      expect(deposit).toEqual({
        amount: '36864',
        txConfirmations: 0,
        txRef: 'deadc0de',
      });
    });

    it('gets pending bitcoin deposits from redis', async () => {
      await Promise.all([
        redis.set(
          'mempool:Bitcoin:tb1q8uzv43phxxsndlxglj74ryc6umxuzuz22u7erf',
          JSON.stringify({
            tx_hash: 'deadc0de',
            value: '0x9000',
            confirmations: 1,
          }),
        ),
        redis.rpush(
          'deposit:Bitcoin:tb1q8uzv43phxxsndlxglj74ryc6umxuzuz22u7erf',
          JSON.stringify({
            amount: '0x9000',
            asset: 'BTC',
            deposit_chain_block_height: 1234567890,
            deposit_details: { tx_id: '0x1234', vout: 1 },
          }),
        ),
        updateChainTracking({ chain: 'Bitcoin', height: 1234567894n }),
      ]);

      const deposit = await getPendingDeposit('Btc', 'tb1q8uzv43phxxsndlxglj74ryc6umxuzuz22u7erf');

      expect(logger.error).not.toHaveBeenCalled();
      expect(deposit).toEqual({
        amount: '36864',
        txConfirmations: 4,
        txRef: '3412',
      });
    });

    it('returns null if the bitcoin deposit is not found', async () => {
      const deposit = await getPendingDeposit('Btc', 'tb1q8uzv43phxxsndlxglj74ryc6umxuzuz22u7erf');

      expect(logger.error).not.toHaveBeenCalled();
      expect(deposit).toBeNull();
    });

    it('returns null if the redis client throws (non-bitcoin)', async () => {
      vi.spyOn(Redis.prototype, 'lrange').mockRejectedValueOnce(new Error());
      await updateChainTracking({ chain: 'Ethereum', height: 1234567893n });

      const deposit = await getPendingDeposit('Flip', '0x1234');

      expect(deposit).toBeNull();
      expect(logger.error).toHaveBeenCalled();
    });

    it('returns null if the redis client throws (bitcoin)', async () => {
      vi.spyOn(Redis.prototype, 'lrange').mockRejectedValueOnce(new Error());

      const deposit = await getPendingDeposit('Btc', '');

      expect(deposit).toBeNull();
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe(getPendingBroadcast, () => {
    const broadcast = {
      chain: 'Ethereum',
      nativeId: 1n,
      id: 1234n,
    } as Broadcast;

    it('gets pending broadcasts from redis', async () => {
      await redis.set(
        'broadcast:Ethereum:1',
        JSON.stringify({
          tx_out_id: { signature: { s: [], k_times_g_address: [] } },
          tx_ref: {
            hash: '0xcafebabe',
          },
        }),
      );

      expect(await getPendingBroadcast(broadcast)).not.toBeNull();
    });

    it('returns null if the broadcast is not found', async () => {
      expect(await getPendingBroadcast(broadcast)).toBeNull();
      expect(logger.error).not.toHaveBeenCalled();
    });

    it('returns null if the client throws an error', async () => {
      vi.spyOn(Redis.prototype, 'get').mockRejectedValueOnce(new Error());

      expect(await getPendingBroadcast(broadcast)).toBeNull();
      expect(logger.error).toHaveBeenCalled();
    });
  });
});

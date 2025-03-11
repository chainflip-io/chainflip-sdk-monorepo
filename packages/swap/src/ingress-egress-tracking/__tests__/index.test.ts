import Redis from 'ioredis';
import { vi, describe, expect, beforeAll, beforeEach, it } from 'vitest';
import { Chain } from '@/shared/enums';
import { getPendingBroadcast, getPendingDeposit, getPendingVaultSwap } from '..';
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
    vi.restoreAllMocks();
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

  describe(getPendingVaultSwap, () => {
    it('gets pending vault swap from redis', async () => {
      await updateChainTracking({ chain: 'Bitcoin', height: 1234567893n });

      await redis.set(
        'vault_deposit:Bitcoin:0x396255c0153a4af5f2b7f07adbdb60ff41c7eaff6e6137e5d48c8d11dadca477',
        JSON.stringify({
          deposit_chain_block_height: 1234567890,
          input_asset: { chain: 'Bitcoin', asset: 'BTC' },
          output_asset: { chain: 'Ethereum', asset: 'ETH' },
          amount: '0x7a120',
          destination_address: '0xa56a6be23b6cf39d9448ff6e897c29c41c8fbdff',
          ccm_deposit_metadata: null,
          deposit_details: {
            tx_id: '0x396255c0153a4af5f2b7f07adbdb60ff41c7eaff6e6137e5d48c8d11dadca477',
            vout: 0,
          },
          broker_fee: { account: 'cFMTNSQQVfBo2HqtekvhLPfZY764kuJDVFG1EvnnDGYxc3LRW', bps: 0 },
          affiliate_fees: [],
          refund_params: {
            retry_duration: 100,
            refund_address: 'tb1qhjurnfz4qah4rg7ntue6x287ehdvded20rj9vh',
            min_price: '0x31c3c809255ce9e5e2478854cdb79e2c85e29c4ec',
          },
          dca_params: { number_of_chunks: 1, chunk_interval: 2 },
          max_boost_fee: 30,
        }),
      );

      const swap = await getPendingVaultSwap(
        'perseverance',
        '77a4dcda118d8cd4e537616effeac741ff60dbdb7af0b7f2f54a3a15c0556239',
      );

      expect(swap).toMatchInlineSnapshot(`
        {
          "affiliateFees": [],
          "amount": 500000n,
          "brokerFee": {
            "account": "cFMTNSQQVfBo2HqtekvhLPfZY764kuJDVFG1EvnnDGYxc3LRW",
            "commissionBps": 0,
          },
          "ccmDepositMetadata": null,
          "dcaParams": {
            "chunkInterval": 2,
            "numberOfChunks": 1,
          },
          "depositChainBlockHeight": 1234567890,
          "destAddress": "0xa56a6be23b6cf39d9448ff6e897c29c41c8fbdff",
          "destAsset": "Eth",
          "maxBoostFeeBps": 30,
          "refundParams": {
            "minPrice": 4545705898455570139320688941272887895134904632556n,
            "refundAddress": "tb1qhjurnfz4qah4rg7ntue6x287ehdvded20rj9vh",
            "retryDuration": 100,
          },
          "srcAsset": "Btc",
          "txConfirmations": 3,
          "txRef": "77a4dcda118d8cd4e537616effeac741ff60dbdb7af0b7f2f54a3a15c0556239",
        }
      `);
    });

    it('ensures foreign block height is used only after 1 extra state chain block', async () => {
      await updateChainTracking({ chain: 'Bitcoin', height: 1234567893n, stateChainHeight: 2 });

      await redis.set(
        'vault_deposit:Bitcoin:0x396255c0153a4af5f2b7f07adbdb60ff41c7eaff6e6137e5d48c8d11dadca477',
        JSON.stringify({
          deposit_chain_block_height: 1234567890,
          input_asset: { chain: 'Bitcoin', asset: 'BTC' },
          output_asset: { chain: 'Ethereum', asset: 'ETH' },
          amount: '0x7a120',
          destination_address: '0xa56a6be23b6cf39d9448ff6e897c29c41c8fbdff',
          ccm_deposit_metadata: null,
          deposit_details: {
            tx_id: '0x396255c0153a4af5f2b7f07adbdb60ff41c7eaff6e6137e5d48c8d11dadca477',
            vout: 0,
          },
          broker_fee: { account: 'cFMTNSQQVfBo2HqtekvhLPfZY764kuJDVFG1EvnnDGYxc3LRW', bps: 0 },
          affiliate_fees: [],
          refund_params: {
            retry_duration: 100,
            refund_address: 'tb1qhjurnfz4qah4rg7ntue6x287ehdvded20rj9vh',
            min_price: '0x31c3c809255ce9e5e2478854cdb79e2c85e29c4ec',
          },
          dca_params: { number_of_chunks: 1, chunk_interval: 2 },
          max_boost_fee: 30,
        }),
      );

      const swap = await getPendingVaultSwap(
        'perseverance',
        '77a4dcda118d8cd4e537616effeac741ff60dbdb7af0b7f2f54a3a15c0556239',
      );

      expect(swap?.txConfirmations).toEqual(4);
    });

    it('returns null swap is not found', async () => {
      const swap = await getPendingVaultSwap(
        'perseverance',
        '77a4dcda118d8cd4e537616effeac741ff60dbdb7af0b7f2f54a3a15c0556239',
      );

      expect(swap).toBeNull();
      expect(logger.error).not.toHaveBeenCalled();
    });

    it('returns null if the redis client throws (bitcoin)', async () => {
      vi.spyOn(Redis.prototype, 'get').mockRejectedValueOnce(new Error());

      const swap = await getPendingVaultSwap(
        'perseverance',
        '77a4dcda118d8cd4e537616effeac741ff60dbdb7af0b7f2f54a3a15c0556239',
      );

      expect(swap).toBeNull();
      expect(logger.error).toHaveBeenCalled();
    });
  });
});

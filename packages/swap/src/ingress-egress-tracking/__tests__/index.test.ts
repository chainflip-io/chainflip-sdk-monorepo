import { findVaultSwapData as findBitcoinVaultSwapData } from '@chainflip/bitcoin';
import RedisClient from '@chainflip/redis';
import { findVaultSwapData as findSolanaVaultSwapData } from '@chainflip/solana';
import { ChainflipChain } from '@chainflip/utils/chainflip';
import { Redis } from 'ioredis';
import { vi, describe, expect, beforeAll, beforeEach, it } from 'vitest';
import prisma, { Broadcast } from '../../client.js';
import logger from '../../utils/logger.js';
import { getPendingBroadcast, getPendingDeposit, getPendingVaultSwap } from '../index.js';

vi.mock('../../utils/logger.js');
vi.mock('@chainflip/solana');
vi.mock('@chainflip/bitcoin');

const updateChainTracking = async (data: {
  chain: ChainflipChain;
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
          asset: { asset: 'FLIP', chain: 'Ethereum' },
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
          asset: { asset: 'FLIP', chain: 'Ethereum' },
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
            asset: { asset: 'BTC', chain: 'Bitcoin' },
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
      vi.spyOn(RedisClient.prototype, 'getDeposits').mockRejectedValueOnce(new Error());
      await updateChainTracking({ chain: 'Ethereum', height: 1234567893n });

      const deposit = await getPendingDeposit('Flip', '0x1234');

      expect(deposit).toBeNull();
      expect(logger.error).toHaveBeenCalled();
    });

    it('returns null if the redis client throws (bitcoin)', async () => {
      vi.spyOn(RedisClient.prototype, 'getDeposits').mockRejectedValueOnce(new Error());

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
      vi.spyOn(RedisClient.prototype, 'getBroadcast').mockRejectedValueOnce(new Error());

      expect(await getPendingBroadcast(broadcast)).toBeNull();
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe(getPendingVaultSwap, () => {
    it('gets pending vault swap from redis for bitcoin', async () => {
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

    it('gets pending vault swap from redis for ethereum', async () => {
      await updateChainTracking({ chain: 'Ethereum', height: 1234567893n });

      await redis.set(
        'vault_deposit:Ethereum:0x648b916f4aef7dbae2d74ee8f0f4d498b2468151cd2f83d4a3f8a1d80f27f9f6',
        JSON.stringify({
          deposit_chain_block_height: 7881101,
          input_asset: { chain: 'Ethereum', asset: 'USDC' },
          output_asset: { chain: 'Ethereum', asset: 'FLIP' },
          amount: '0x1dcd6500',
          destination_address: '0xcb583c817964a2c527608f8b813a4c9bddb559a9',
          ccm_deposit_metadata: null,
          deposit_details: {
            tx_hashes: ['0x648b916f4aef7dbae2d74ee8f0f4d498b2468151cd2f83d4a3f8a1d80f27f9f6'],
          },
          broker_fee: { account: 'cFMTNSQQVfBo2HqtekvhLPfZY764kuJDVFG1EvnnDGYxc3LRW', bps: 0 },
          affiliate_fees: [],
          refund_params: {
            retry_duration: 100,
            refund_address: '0xcb583c817964a2c527608f8b813a4c9bddb559a9',
            min_price: '0x10cd34f57ffac0c62e4d1a650614163779e9d0e992',
          },
          dca_params: null,
          max_boost_fee: 0,
        }),
      );

      const swap = await getPendingVaultSwap(
        '0x648b916f4aef7dbae2d74ee8f0f4d498b2468151cd2f83d4a3f8a1d80f27f9f6',
      );

      expect(swap).toMatchInlineSnapshot(`
        {
          "affiliateFees": [],
          "amount": 500000000n,
          "brokerFee": {
            "account": "cFMTNSQQVfBo2HqtekvhLPfZY764kuJDVFG1EvnnDGYxc3LRW",
            "commissionBps": 0,
          },
          "ccmDepositMetadata": null,
          "dcaParams": null,
          "depositChainBlockHeight": 7881101,
          "destAddress": "0xcb583c817964a2c527608f8b813a4c9bddb559a9",
          "destAsset": "Flip",
          "maxBoostFeeBps": 0,
          "refundParams": {
            "minPrice": 24555550330122879205878251867179474586941715966354n,
            "refundAddress": "0xcb583c817964a2c527608f8b813a4c9bddb559a9",
            "retryDuration": 100,
          },
          "srcAsset": "Usdc",
          "txConfirmations": 1226686792,
          "txRef": "0x648b916f4aef7dbae2d74ee8f0f4d498b2468151cd2f83d4a3f8a1d80f27f9f6",
        }
      `);
    });

    it('gets pending vault swap from toolkit for solana', async () => {
      await updateChainTracking({ chain: 'Solana', height: 1234567893n });

      vi.mocked(findSolanaVaultSwapData).mockResolvedValueOnce({
        depositChainBlockHeight: 366638629,
        inputAsset: 'Sol',
        amount: 1500000000n,
        destinationAddress: '0xa56a6be23b6cf39d9448ff6e897c29c41c8fbdff',
        outputAsset: 'Eth',
        affiliateFees: [],
        dcaParams: null,
        ccmDepositMetadata: null,
        brokerFee: {
          account: 'cFMTNSQQVfBo2HqtekvhLPfZY764kuJDVFG1EvnnDGYxc3LRW',
          commissionBps: 0,
        },
        maxBoostFee: 0,
        refundParams: {
          refundAddress: 'EeZzXuKNsaYHTLwbRZspvym89wuEar1V2LuoGbffonTe',
          refundCcmMetadata: null,
          maxOraclePriceSlippage: null,
          minPrice: 3071330626886068140327341989949900729308836351n,
          retryDuration: 100,
        },
      });

      const swap = await getPendingVaultSwap(
        '4C8eMMsbpworHSTqDoqd31HnTFF4dJdG5mJVEJaK7Vjjeu7fC99ZDkDakiMHRNRsiWqcaQzyavoTrnH6gSkQR3Xj',
      );

      expect(swap).toMatchInlineSnapshot(`
        {
          "affiliateFees": [],
          "amount": 1500000000n,
          "brokerFee": {
            "account": "cFMTNSQQVfBo2HqtekvhLPfZY764kuJDVFG1EvnnDGYxc3LRW",
            "commissionBps": 0,
          },
          "ccmDepositMetadata": null,
          "dcaParams": null,
          "depositChainBlockHeight": 366638629,
          "destAddress": "0xa56a6be23b6cf39d9448ff6e897c29c41c8fbdff",
          "destAsset": "Eth",
          "maxBoostFeeBps": 0,
          "refundParams": {
            "maxOraclePriceSlippage": null,
            "minPrice": 3071330626886068140327341989949900729308836351n,
            "refundAddress": "EeZzXuKNsaYHTLwbRZspvym89wuEar1V2LuoGbffonTe",
            "refundCcmMetadata": null,
            "retryDuration": 100,
          },
          "srcAsset": "Sol",
          "txConfirmations": 867929264,
          "txRef": "4C8eMMsbpworHSTqDoqd31HnTFF4dJdG5mJVEJaK7Vjjeu7fC99ZDkDakiMHRNRsiWqcaQzyavoTrnH6gSkQR3Xj",
        }
      `);
      expect(findSolanaVaultSwapData).toHaveBeenCalledTimes(1);
      expect(findSolanaVaultSwapData).toHaveBeenCalledWith(
        'http://solana-rpc.test',
        '4C8eMMsbpworHSTqDoqd31HnTFF4dJdG5mJVEJaK7Vjjeu7fC99ZDkDakiMHRNRsiWqcaQzyavoTrnH6gSkQR3Xj',
      );
    });

    it('gets pending vault swap from toolkit for bitcoin', async () => {
      await updateChainTracking({ chain: 'Bitcoin', height: 1234567893n });

      vi.mocked(findBitcoinVaultSwapData).mockResolvedValueOnce({
        inputAsset: 'Btc',
        amount: 500000n,
        depositAddress: 'tb1pce9k3fq67hl8g8qxnwu45fpacxmfhvqtd543kclyk459ukwd3kkq6xshnl',
        refundParams: {
          refundAddress: 'tb1qhjurnfz4qah4rg7ntue6x287ehdvded20rj9vh',
          retryDuration: 100,
          minPrice: 17756447149729355758171422264767581477873599056965n,
          maxOraclePriceSlippage: 100,
          refundCcmMetadata: null,
        },
        destinationAddress: '0xa56a6be23b6cf39d9448ff6e897c29c41c8fbdff',
        outputAsset: 'Eth',
        brokerFee: { account: null, commissionBps: 0 },
        affiliateFees: [],
        ccmDepositMetadata: null,
        maxBoostFee: 30,
        dcaParams: { chunkInterval: 2, numberOfChunks: 1 },
        depositChainBlockHeight: 4046637,
      });

      const swap = await getPendingVaultSwap(
        '91d7edcdca97558e74d3d69205402026e3bb70158ec9d8cc063a5072fcbc5024',
      );

      expect(swap).toMatchInlineSnapshot(`
        {
          "affiliateFees": [],
          "amount": 500000n,
          "brokerFee": {
            "account": "",
            "commissionBps": 0,
          },
          "ccmDepositMetadata": null,
          "dcaParams": {
            "chunkInterval": 2,
            "numberOfChunks": 1,
          },
          "depositAddress": "tb1pce9k3fq67hl8g8qxnwu45fpacxmfhvqtd543kclyk459ukwd3kkq6xshnl",
          "depositChainBlockHeight": 4046637,
          "destAddress": "0xa56a6be23b6cf39d9448ff6e897c29c41c8fbdff",
          "destAsset": "Eth",
          "maxBoostFeeBps": 30,
          "refundParams": {
            "maxOraclePriceSlippage": 100,
            "minPrice": 17756447149729355758171422264767581477873599056965n,
            "refundAddress": "tb1qhjurnfz4qah4rg7ntue6x287ehdvded20rj9vh",
            "refundCcmMetadata": null,
            "retryDuration": 100,
          },
          "srcAsset": "Btc",
          "txConfirmations": 1230521256,
          "txRef": "91d7edcdca97558e74d3d69205402026e3bb70158ec9d8cc063a5072fcbc5024",
        }
      `);
      expect(findBitcoinVaultSwapData).toHaveBeenCalledTimes(1);
      expect(findBitcoinVaultSwapData).toHaveBeenCalledWith(
        'http://bitcoin-rpc.test',
        '91d7edcdca97558e74d3d69205402026e3bb70158ec9d8cc063a5072fcbc5024',
      );
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
        '77a4dcda118d8cd4e537616effeac741ff60dbdb7af0b7f2f54a3a15c0556239',
      );

      expect(swap?.txConfirmations).toEqual(4);
    });

    it('returns null swap is not found', async () => {
      const swap = await getPendingVaultSwap(
        '0x6187fbe7da29b6ca48f02fe1f07fa7f02b5570cc2d8950c53f4f427ced57db72',
      );

      expect(swap).toBeNull();
      expect(logger.error).not.toHaveBeenCalled();
    });

    it('returns null if the redis client throws', async () => {
      vi.spyOn(RedisClient.prototype, 'getPendingVaultSwap').mockRejectedValueOnce(new Error());

      const swap = await getPendingVaultSwap(
        '0x6187fbe7da29b6ca48f02fe1f07fa7f02b5570cc2d8950c53f4f427ced57db72',
      );

      expect(swap).toBeNull();
      expect(logger.error).toHaveBeenCalled();
    });
  });
});

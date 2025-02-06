import Redis from 'ioredis';
import { describe, it, expect, vi } from 'vitest';
import RedisClient from '../redis';

vi.mock('ioredis');
const url = 'redis://localhost:6379';

describe(RedisClient, () => {
  describe(RedisClient.prototype.constructor, () => {
    it('creates a new Redis client', () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const client = new RedisClient(url);
      expect(Redis).toHaveBeenCalledWith(url);
    });
  });

  describe(RedisClient.prototype.getBroadcast, () => {
    it('returns null if the broadcast does not exist', async () => {
      const mock = vi.mocked(Redis.prototype.get).mockResolvedValueOnce(null);
      const client = new RedisClient(url);
      const broadcast = await client.getBroadcast('Ethereum', 1);
      expect(broadcast).toBeNull();
      expect(mock).toHaveBeenCalledWith('broadcast:Ethereum:1');
    });

    it.each([
      ['Bitcoin' as const, { hash: '0x1234' }, { hash: '0xdeadc0de' }],
      [
        'Polkadot' as const,
        { signature: '0x1234' },
        { transaction_id: { block_number: 100, extrinsic_index: 20 } },
      ],
      [
        'Ethereum' as const,
        { signature: { s: [], k_times_g_address: [] } },
        { hash: '0xdeadc0de' },
      ],
    ])('parses a %s broadcast', async (chain, txOutId, txRef) => {
      const mock = vi
        .mocked(Redis.prototype.get)
        .mockResolvedValueOnce(JSON.stringify({ tx_out_id: txOutId, tx_ref: txRef }));
      const client = new RedisClient(url);
      const broadcast = await client.getBroadcast(chain, 1);
      expect(broadcast).toMatchSnapshot(`${chain} broadcast`);
      expect(mock).toHaveBeenCalledWith(`broadcast:${chain}:1`);
    });
  });

  describe(RedisClient.prototype.getMempoolTransaction, () => {
    it('returns null if no tx is found for the address', async () => {
      const mock = vi.mocked(Redis.prototype.get).mockResolvedValueOnce(null);
      const client = new RedisClient(url);
      const broadcast = await client.getMempoolTransaction(
        'Bitcoin',
        'tb1pdz3akc5wa2gr69v3x87tfg0ka597dxqvfl6zhqx4y202y63cgw0q3rgpm6',
      );
      expect(broadcast).toBeNull();
      expect(mock).toHaveBeenCalledWith(
        'mempool:Bitcoin:tb1pdz3akc5wa2gr69v3x87tfg0ka597dxqvfl6zhqx4y202y63cgw0q3rgpm6',
      );
    });

    it('returns the tx if found', async () => {
      const mock = vi.mocked(Redis.prototype.get).mockResolvedValueOnce(
        JSON.stringify({
          confirmations: 4,
          value: '0x12b74280',
          tx_hash: '1234',
          deposit_chain_block_height: 402,
        }),
      );
      const client = new RedisClient(url);
      const tx = await client.getMempoolTransaction(
        'Bitcoin',
        'tb1pdz3akc5wa2gr69v3x87tfg0ka597dxqvfl6zhqx4y202y63cgw0q3rgpm6',
      );
      expect(tx).toEqual({
        confirmations: 4,
        value: 314000000n,
        tx_hash: '1234',
        deposit_chain_block_height: 402,
      });
      expect(mock).toHaveBeenCalledWith(
        'mempool:Bitcoin:tb1pdz3akc5wa2gr69v3x87tfg0ka597dxqvfl6zhqx4y202y63cgw0q3rgpm6',
      );
    });
  });

  describe(RedisClient.prototype.getDeposits, () => {
    it('returns an empty array if no deposits are found', async () => {
      const mock = vi.mocked(Redis.prototype.lrange).mockResolvedValueOnce([]);
      const client = new RedisClient(url);
      const deposits = await client.getDeposits('Ethereum', 'ETH', '0x1234');
      expect(deposits).toEqual([]);
      expect(mock).toHaveBeenCalledWith('deposit:Ethereum:0x1234', 0, -1);
    });

    it('returns the deposits if found', async () => {
      const mock = vi.mocked(Redis.prototype.lrange).mockResolvedValueOnce([
        JSON.stringify({
          amount: '0x8000',
          asset: 'ETH',
          deposit_chain_block_height: 1234,
          deposit_details: {
            tx_hashes: ['0xdeadc0de'],
          },
        }),
      ]);
      const client = new RedisClient(url);
      const deposits = await client.getDeposits('Ethereum', 'ETH', '0x1234');
      expect(deposits).toEqual([
        {
          amount: 0x8000n,
          asset: 'ETH',
          deposit_chain_block_height: 1234,
          tx_refs: ['0xdeadc0de'],
        },
      ]);
      expect(mock).toHaveBeenCalledWith('deposit:Ethereum:0x1234', 0, -1);
    });

    it('returns the deposits if found - Polkadot', async () => {
      const mock = vi.mocked(Redis.prototype.lrange).mockResolvedValueOnce([
        JSON.stringify({
          amount: '0x8000',
          asset: 'DOT',
          deposit_chain_block_height: 100,
          deposit_details: {
            extrinsic_index: 20,
          },
        }),
      ]);

      const client = new RedisClient(url);
      const deposits = await client.getDeposits(
        'Polkadot',
        'DOT',
        '121LWHo3TJYdvSuDVhdCY6P9Bk6Cd5wMkkvMnU5joWJfuWBJ',
      );
      expect(deposits).toEqual([
        {
          amount: 0x8000n,
          asset: 'DOT',
          deposit_chain_block_height: 100,
          tx_refs: ['100-20'],
        },
      ]);
      expect(mock).toHaveBeenCalledWith(
        'deposit:Polkadot:0x2c7de4a2d760264b29f2033b67aa882f300e1785bc7d130fbf67f5b127202169',
        0,
        -1,
      );
    });

    it('>V120 returns the deposits if found', async () => {
      const mock = vi.mocked(Redis.prototype.lrange).mockResolvedValueOnce([
        JSON.stringify({
          amount: '0x8000',
          asset: {
            asset: 'BTC',
            chain: 'Bitcoin',
          },
          deposit_chain_block_height: 1234,
          deposit_details: {
            tx_id: '0x1234',
            vout: 1,
          },
        }),
      ]);
      const client = new RedisClient(url);
      const deposits = await client.getDeposits('Bitcoin', 'BTC', '0x1234');
      expect(deposits).toEqual([
        {
          amount: 0x8000n,
          asset: 'BTC',
          deposit_chain_block_height: 1234,
          tx_refs: ['3412'],
        },
      ]);
      expect(mock).toHaveBeenCalledWith('deposit:Bitcoin:0x1234', 0, -1);
    });

    it('filters out other assets for the same chain', async () => {
      const mock = vi.mocked(Redis.prototype.lrange).mockResolvedValueOnce([
        JSON.stringify({
          amount: '0x8000',
          asset: 'FLIP',
          deposit_chain_block_height: 1234,
          deposit_details: {
            tx_hashes: ['0x65f4c6ba793815c4d1a9e4f0fd43c0f6f26ff5f1678a621d543a8928c1c2e978'],
          },
        }),
      ]);
      const client = new RedisClient(url);
      const deposits = await client.getDeposits('Ethereum', 'ETH', '0x1234');
      expect(deposits).toEqual([]);
      expect(mock).toHaveBeenCalledWith('deposit:Ethereum:0x1234', 0, -1);
    });
  });

  describe(RedisClient.prototype.getPendingVaultSwap, () => {
    it('returns if no vault swaps are found', async () => {
      const mock = vi.mocked(Redis.prototype.get).mockResolvedValue(null);
      const client = new RedisClient(url);
      const deposits = await client.getPendingVaultSwap('mainnet', '0x1234');
      expect(deposits).toEqual(null);
      expect(mock).toHaveBeenCalledWith('vault_deposit:Ethereum:0x1234');
      expect(mock).toHaveBeenCalledWith('vault_deposit:Bitcoin:0x1234');
      expect(mock).toHaveBeenCalledWith('vault_deposit:Solana:0x1234');
      expect(mock).toHaveBeenCalledWith('vault_deposit:Arbitrum:0x1234');
      expect(mock).not.toHaveBeenCalledWith('vault_deposit:Polkadot:0x1234');
    });

    it('returns the vault swaps if found', async () => {
      const mock = vi.mocked(Redis.prototype.get).mockResolvedValue(
        JSON.stringify({
          affiliate_fees: [
            { account: 'cFHtoB6DrnqUVY4DwMHCVCtgCLsiHvv98oGw8k66tazF2ToFv', bps: 10 },
          ],
          amount: '0x64',
          broker_fee: { account: 'cFHsUq1uK5opJudRDczhdPVj6LGoVTqYsfj71tbHfKsTAzkJJ', bps: 10 },
          ccm_deposit_metadata: {
            channel_metadata: {
              ccm_additional_data: '4d4f5245',
              gas_budget: '0x3039',
              message: '48454c4c4f',
            },
            source_address: { Eth: '0xcfcfcfcfcfcfcfcfcfcfcfcfcfcfcfcfcfcfcfcf' },
            source_chain: 'Ethereum',
          },
          dca_params: { chunk_interval: 100, number_of_chunks: 5 },
          deposit_chain_block_height: 1,
          deposit_details: null,
          destination_address: '0xcfcfcfcfcfcfcfcfcfcfcfcfcfcfcfcfcfcfcfcf',
          input_asset: { asset: 'ETH', chain: 'Ethereum' },
          max_boost_fee: 5,
          output_asset: { asset: 'FLIP', chain: 'Ethereum' },
          refund_params: {
            min_price: '0x0',
            refund_address: '0x541f563237a309b3a61e33bdf07a8930bdba8d99',
            retry_duration: 0,
          },
        }),
      );

      const client = new RedisClient(url);
      const vaultDeposit = await client.getPendingVaultSwap('mainnet', '0x1234');

      expect(vaultDeposit).toMatchInlineSnapshot(`
        {
          "affiliateFees": [
            {
              "account": "cFHtoB6DrnqUVY4DwMHCVCtgCLsiHvv98oGw8k66tazF2ToFv",
              "bps": 10,
            },
          ],
          "amount": 100n,
          "brokerFee": {
            "account": "cFHsUq1uK5opJudRDczhdPVj6LGoVTqYsfj71tbHfKsTAzkJJ",
            "bps": 10,
          },
          "ccmDepositMetadata": {
            "channelMetadata": {
              "ccmAdditionalData": "4d4f5245",
              "gasBudget": "0x3039",
              "message": "48454c4c4f",
            },
            "sourceAddress": {
              "Eth": "0xcfcfcfcfcfcfcfcfcfcfcfcfcfcfcfcfcfcfcfcf",
            },
            "sourceChain": "Ethereum",
          },
          "dcaParams": {
            "chunkInterval": 100,
            "numberOfChunks": 5,
          },
          "depositChainBlockHeight": 1,
          "destinationAddress": "0xcfcfcfcfcfcfcfcfcfcfcfcfcfcfcfcfcfcfcfcf",
          "inputAsset": "Eth",
          "maxBoostFee": 5,
          "outputAsset": "Flip",
          "refundParams": {
            "minPrice": 0n,
            "refundAddress": "0x541f563237a309b3a61e33bdf07a8930bdba8d99",
            "retryDuration": 0,
          },
        }
      `);

      expect(mock).toHaveBeenCalledWith('vault_deposit:Ethereum:0x1234');
      expect(mock).toHaveBeenCalledWith('vault_deposit:Bitcoin:0x1234');
      expect(mock).toHaveBeenCalledWith('vault_deposit:Solana:0x1234');
      expect(mock).toHaveBeenCalledWith('vault_deposit:Arbitrum:0x1234');
    });
  });
});

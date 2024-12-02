import Redis from 'ioredis';
import RedisClient from '../redis';

jest.mock('ioredis');
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
      const mock = jest.mocked(Redis.prototype.get).mockResolvedValueOnce(null);
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
      const mock = jest
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
      const mock = jest.mocked(Redis.prototype.get).mockResolvedValueOnce(null);
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
      const mock = jest.mocked(Redis.prototype.get).mockResolvedValueOnce(
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
      const mock = jest.mocked(Redis.prototype.lrange).mockResolvedValueOnce([]);
      const client = new RedisClient(url);
      const deposits = await client.getDeposits('Ethereum', 'ETH', '0x1234');
      expect(deposits).toEqual([]);
      expect(mock).toHaveBeenCalledWith('deposit:Ethereum:0x1234', 0, -1);
    });

    it('returns the deposits if found', async () => {
      const mock = jest.mocked(Redis.prototype.lrange).mockResolvedValueOnce([
        JSON.stringify({
          amount: '0x8000',
          asset: 'ETH',
          deposit_chain_block_height: 1234,
          deposit_details: {
            tx_hashes: [
              '0x6e1bb8a886326085d5fc9f8aa3e0e3fd0076e1035f43399052c3917f7380fbc9',
              '0x4abb22dbe369911543c51c48ff7967e331b552a461db2b5c39fd46ddbd1e400d',
            ],
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
          deposit_details: {
            tx_hashes: [
              '0x6e1bb8a886326085d5fc9f8aa3e0e3fd0076e1035f43399052c3917f7380fbc9',
              '0x4abb22dbe369911543c51c48ff7967e331b552a461db2b5c39fd46ddbd1e400d',
            ],
          },
        },
      ]);
      expect(mock).toHaveBeenCalledWith('deposit:Ethereum:0x1234', 0, -1);
    });

    it('>V120 returns the deposits if found', async () => {
      const mock = jest.mocked(Redis.prototype.lrange).mockResolvedValueOnce([
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
          deposit_details: {
            tx_id: '0x1234',
            vout: 1,
          },
        },
      ]);
      expect(mock).toHaveBeenCalledWith('deposit:Bitcoin:0x1234', 0, -1);
    });

    it('filters out other assets for the same chain', async () => {
      const mock = jest.mocked(Redis.prototype.lrange).mockResolvedValueOnce([
        JSON.stringify({
          amount: '0x8000',
          asset: 'FLIP',
          deposit_chain_block_height: 1234,
          deposit_details: {
            tx_hashes: [
              '0x6e1bb8a886326085d5fc9f8aa3e0e3fd0076e1035f43399052c3917f7380fbc9',
              '0x4abb22dbe369911543c51c48ff7967e331b552a461db2b5c39fd46ddbd1e400d',
            ],
          },
        }),
      ]);
      const client = new RedisClient(url);
      const deposits = await client.getDeposits('Ethereum', 'ETH', '0x1234');
      expect(deposits).toEqual([]);
      expect(mock).toHaveBeenCalledWith('deposit:Ethereum:0x1234', 0, -1);
    });
  });
});

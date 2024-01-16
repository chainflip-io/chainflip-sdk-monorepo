import { decodeAddress } from '@polkadot/util-crypto';
// eslint-disable-next-line import/no-extraneous-dependencies
import Redis from 'ioredis';
import { z } from 'zod';
import type { Chain } from './enums';
import { number, u128, string } from './parsers';

const ss58ToHex = (address: string) =>
  `0x${Buffer.from(decodeAddress(address)).toString('hex')}`;

const asset = z.object({
  asset: string,
  chain: string,
});

const deposits = z.array(
  z.object({
    amount: u128,
    asset,
    deposit_chain_block_height: number,
  }),
);

const broadcastParsers = {
  Ethereum: z.object({
    tx_out_id: z.object({
      signature: z.object({
        k_times_g_address: z.array(number),
        s: z.array(number),
      }),
    }),
  }),
  Polkadot: z.object({ tx_out_id: z.object({ signature: string }) }),
  Bitcoin: z.object({ tx_out_id: z.object({ hash: string }) }),
};

type ChainBroadcast<C extends Chain> = z.infer<(typeof broadcastParsers)[C]>;

type EthereumBroadcast = ChainBroadcast<'Ethereum'>;
type PolkadotBroadcast = ChainBroadcast<'Polkadot'>;
type BitcoinBroadcast = ChainBroadcast<'Bitcoin'>;
type Broadcast = ChainBroadcast<Chain>;

const mempoolTransaction = z.object({ confirmations: number });

export default class RedisClient {
  private client;

  constructor(url: `redis://${string}` | `rediss://${string}`) {
    this.client = new Redis(url);
  }

  async getBroadcast(
    chain: 'Ethereum',
    broadcastId: number,
  ): Promise<EthereumBroadcast | null>;
  async getBroadcast(
    chain: 'Polkadot',
    broadcastId: number,
  ): Promise<PolkadotBroadcast | null>;
  async getBroadcast(
    chain: 'Bitcoin',
    broadcastId: number,
  ): Promise<BitcoinBroadcast | null>;
  async getBroadcast(
    chain: Chain,
    broadcastId: number,
  ): Promise<Broadcast | null>;
  async getBroadcast(
    chain: Chain,
    broadcastId: number,
  ): Promise<Broadcast | null> {
    const key = `broadcast:${chain}:${broadcastId}`;
    const value = await this.client.get(key);
    return value ? broadcastParsers[chain].parse(JSON.parse(value)) : null;
  }

  async getDeposits(chain: Chain, address: string) {
    const parsedAddress = chain === 'Polkadot' ? ss58ToHex(address) : address;
    const key = `deposit:${chain}:${parsedAddress}`;
    const value = await this.client.get(key);
    return value ? deposits.parse(JSON.parse(value)) : [];
  }

  async getMempoolTransaction(chain: 'Bitcoin', address: string) {
    const key = `confirmations:${chain}:${address}`;
    const value = await this.client.get(key);
    return value ? mempoolTransaction.parse(JSON.parse(value)) : null;
  }
}

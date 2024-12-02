import * as ss58 from '@chainflip/utils/ss58';
import Redis from 'ioredis';
import { z } from 'zod';
import { sorter } from '../arrays';
import { type Asset, type Chain } from '../enums';
import { number, u128, string, uncheckedAssetAndChain, hexString } from '../parsers';

const ss58ToHex = (address: string) =>
  `0x${Buffer.from(ss58.decode(address).data).toString('hex')}`;

const jsonString = string.transform((value) => JSON.parse(value));

const chainAsset = uncheckedAssetAndChain.transform(({ asset }) => asset);

const PolkadotExtrinsicIndex = z.number();

const BitcoinDeposit = z.object({
  tx_id: hexString,
  vout: z.number().int(),
});

const EthereumDeposit = z.object({
  tx_hashes: z.array(hexString),
});
const PolkadotDeposit = z.object({
  extrinsic_index: PolkadotExtrinsicIndex,
});

const ArbitrumDeposit = z.object({
  tx_hashes: z.array(hexString),
});

const depositSchema = jsonString.pipe(
  z.object({
    amount: u128,
    asset: z.union([string, chainAsset]),
    deposit_chain_block_height: number,
    deposit_details: z.union([BitcoinDeposit, EthereumDeposit, PolkadotDeposit, ArbitrumDeposit]),
  }),
);

type Deposit = z.infer<typeof depositSchema>;

const sortDepositAscending = sorter<Deposit>('deposit_chain_block_height');

const broadcastParsers = {
  Ethereum: z.object({
    tx_out_id: z.object({
      signature: z.object({
        k_times_g_address: z.array(number),
        s: z.array(number),
      }),
    }),
    tx_ref: z
      .object({
        hash: hexString,
      })
      .transform(({ hash }) => hash)
      .optional(), // TODO: V130 -- remove optional after v130
  }),
  Polkadot: z.object({
    tx_out_id: z.object({ signature: string }),
    tx_ref: z
      .object({
        transaction_id: z.object({
          block_number: number,
          extrinsic_index: number,
        }),
      })
      .transform(
        ({ transaction_id }) => `${transaction_id.block_number}-${transaction_id.extrinsic_index}`,
      )
      .optional(), // TODO: V130 -- remove optional after v130
  }),
  Bitcoin: z.object({
    tx_out_id: z.object({ hash: string }),
    tx_ref: z
      .object({
        hash: string.transform((value) => (value.startsWith('0x') ? value.slice(2) : value)),
      })
      .transform(({ hash }) => hash)
      .optional(), // TODO: V130 -- remove optional after v130
  }),
  Arbitrum: z
    .object({
      tx_out_id: z.object({
        signature: z.object({
          k_times_g_address: z.array(number),
          s: z.array(number),
        }),
      }),
      tx_ref: z
        .object({
          hash: hexString,
        })
        .transform(({ hash }) => hash)
        .optional(), // TODO: remove once Arbitrum is fully supported
    })
    .optional(), // TODO: remove once Arbitrum is available on all networks
};

type ChainBroadcast<C extends Exclude<Chain, 'Solana'>> = z.infer<(typeof broadcastParsers)[C]>;

type EthereumBroadcast = ChainBroadcast<'Ethereum'>;
type PolkadotBroadcast = ChainBroadcast<'Polkadot'>;
type BitcoinBroadcast = ChainBroadcast<'Bitcoin'>;
type Broadcast = ChainBroadcast<Exclude<Chain, 'Solana'>>;

const mempoolTransaction = jsonString.pipe(
  z.object({
    confirmations: number,
    value: u128,
    tx_hash: string,
    deposit_chain_block_height: number.optional(),
  }),
);

export default class RedisClient {
  private client;

  constructor(url: `redis://${string}` | `rediss://${string}`) {
    this.client = new Redis(url);
  }

  async getBroadcast(
    chain: 'Ethereum',
    broadcastId: number | bigint,
  ): Promise<EthereumBroadcast | null>;
  async getBroadcast(
    chain: 'Polkadot',
    broadcastId: number | bigint,
  ): Promise<PolkadotBroadcast | null>;
  async getBroadcast(
    chain: 'Bitcoin',
    broadcastId: number | bigint,
  ): Promise<BitcoinBroadcast | null>;
  async getBroadcast(
    chain: 'Arbitrum',
    broadcastId: number | bigint,
  ): Promise<EthereumBroadcast | null>;
  async getBroadcast(chain: Chain, broadcastId: number | bigint): Promise<Broadcast | null>;
  async getBroadcast(chain: Chain, broadcastId: number | bigint): Promise<Broadcast | null> {
    if (chain === 'Solana') return null;
    const key = `broadcast:${chain}:${broadcastId}`;
    const value = await this.client.get(key);
    return value ? broadcastParsers[chain].parse(JSON.parse(value)) : null;
  }

  async getDeposits(chain: Chain, asset: Asset, address: string) {
    const parsedAddress = chain === 'Polkadot' ? ss58ToHex(address) : address;
    const key = `deposit:${chain}:${parsedAddress}`;
    const deposits = await this.client.lrange(key, 0, -1);
    return deposits
      .map((deposit) => depositSchema.parse(deposit))
      .filter((deposit) => deposit.asset === asset)
      .sort(sortDepositAscending);
  }

  async getMempoolTransaction(chain: 'Bitcoin', address: string) {
    const key = `mempool:${chain}:${address}`;
    const value = await this.client.get(key);
    return value ? mempoolTransaction.parse(value) : null;
  }

  quit() {
    return this.client.quit();
  }
}

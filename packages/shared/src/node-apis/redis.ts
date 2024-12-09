import { reverseBytes } from '@chainflip/utils/bytes';
import { hexEncodeNumber } from '@chainflip/utils/number';
import * as ss58 from '@chainflip/utils/ss58';
import { isHex } from '@chainflip/utils/string';
import Redis from 'ioredis';
import { z } from 'zod';
import { sorter } from '../arrays';
import { formatTxRef } from '../common';
import { getInternalAsset, type Asset, type Chain } from '../enums';
import { assertNever } from '../guards';
import { transformKeysToCamelCase } from '../objects';
import {
  number,
  u128,
  string,
  uncheckedAssetAndChain,
  hexString,
  numericString,
  chainflipAddress,
  assetAndChain,
} from '../parsers';

const ss58ToHex = (address: string) =>
  `0x${Buffer.from(ss58.decode(address).data).toString('hex')}`;

const jsonString = string.transform((value) => JSON.parse(value));

const chainAsset = uncheckedAssetAndChain.transform(({ asset }) => asset);

const bitcoinDeposit = z
  .object({
    tx_id: hexString.transform((value) => formatTxRef('Bitcoin', value)),
    vout: z.number().int(),
  })
  .transform((obj) => ({ ...obj, type: 'Bitcoin' as const }));

const evmDeposit = z
  .object({ tx_hashes: z.array(hexString) })
  .transform((obj) => ({ ...obj, type: 'EVM' as const }));

const polkadotDeposit = z
  .object({ extrinsic_index: z.number() })
  .transform((obj) => ({ ...obj, type: 'Polkadot' as const }));

const depositSchema = jsonString.pipe(
  z.object({
    amount: u128,
    asset: z.union([string, chainAsset]),
    deposit_chain_block_height: number,
    deposit_details: z.union([evmDeposit, bitcoinDeposit, polkadotDeposit]).nullable(),
  }),
);

type PendingDeposit = Omit<z.output<typeof depositSchema>, 'deposit_details'> & {
  tx_refs: string[];
};

const sortDepositAscending = sorter<PendingDeposit>('deposit_chain_block_height');

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
      .transform(({ hash }) => hash),
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
      ),
  }),
  Bitcoin: z.object({
    tx_out_id: z.object({ hash: string }),
    tx_ref: z
      .object({
        hash: string.transform((value) => (value.startsWith('0x') ? value.slice(2) : value)),
      })
      .transform(({ hash }) => hash),
  }),
  Arbitrum: z.object({
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
      .transform(({ hash }) => hash),
  }),
  Solana: z.any(),
  Assethub: z.object({
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
      ),
  }),
};

const accountFee = z
  .object({
    account: chainflipAddress,
    bps: number,
  })
  .transform(({ account, bps }) => ({ account, commissionBps: bps }));

const vaultDepositSchema = jsonString.pipe(
  z
    .object({
      amount: u128,
      destination_address: z.string(),
      input_asset: assetAndChain.transform((obj) => getInternalAsset(obj)),
      output_asset: assetAndChain.transform((obj) => getInternalAsset(obj)),
      deposit_chain_block_height: number.nullable().optional(),
      affiliate_fees: z.array(accountFee),
      broker_fee: accountFee.optional(),
      max_boost_fee: z.number().optional(),
      dca_params: z
        .object({
          chunk_interval: number,
          number_of_chunks: number,
        })
        .nullable()
        .optional(),
      refund_params: z
        .object({
          min_price: u128,
          retry_duration: number,
          refund_address: z.string(),
        })
        .nullable()
        .optional(),
      ccm_deposit_metadata: z
        .object({
          channel_metadata: z.object({
            ccm_additional_data: z.any(),
            message: z.string(),
            gas_budget: z
              .union([numericString, hexString])
              .transform((n) => hexEncodeNumber(BigInt(n))),
          }),
        })
        .nullable()
        .optional(),
    })
    .transform(transformKeysToCamelCase),
);

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

  async getDeposits(chain: Chain, asset: Asset, address: string): Promise<PendingDeposit[]> {
    const parsedAddress = chain === 'Polkadot' ? ss58ToHex(address) : address;
    const key = `deposit:${chain}:${parsedAddress}`;
    const deposits = await this.client.lrange(key, 0, -1);
    return deposits
      .map((depositString) => {
        const parsedDeposit = depositSchema.parse(depositString);
        const deposit = {
          amount: parsedDeposit.amount,
          asset: parsedDeposit.asset,
          deposit_chain_block_height: parsedDeposit.deposit_chain_block_height,
        };
        const { deposit_details, deposit_chain_block_height } = parsedDeposit;

        switch (deposit_details?.type) {
          case 'EVM':
            return { ...deposit, tx_refs: deposit_details.tx_hashes };
          case 'Bitcoin':
            return { ...deposit, tx_refs: [deposit_details.tx_id] };
          case 'Polkadot':
            return {
              ...deposit,
              tx_refs: [`${deposit_chain_block_height}-${deposit_details.extrinsic_index}`],
            };
          default:
            if (deposit_details === null) return { ...deposit, tx_refs: [] };
            return assertNever(deposit_details, 'Invalid deposit details');
        }
      })
      .filter((deposit) => deposit.asset === asset)
      .sort(sortDepositAscending);
  }

  async getMempoolTransaction(chain: 'Bitcoin', address: string) {
    const key = `mempool:${chain}:${address}`;
    const value = await this.client.get(key);
    return value ? mempoolTransaction.parse(value) : null;
  }

  async getPendingVaultSwap(chain: Chain, txId: string) {
    const unavailableChains: Chain[] = ['Solana', 'Polkadot'];
    if (unavailableChains.includes(chain)) return null;

    const redisTxId = chain === 'Bitcoin' && isHex(`0x${txId}`) ? reverseBytes(`0x${txId}`) : txId;
    const value = await this.client.get(`vault_deposit:${chain}:${redisTxId}`);
    return value ? vaultDepositSchema.parse(value) : null;
  }

  quit() {
    return this.client.quit();
  }
}

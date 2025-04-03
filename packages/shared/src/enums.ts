import { ChainflipNetwork } from '@chainflip/bitcoin';
import {
  AssetAndChain,
  ChainflipAsset,
  ChainflipChain,
  assetConstants,
  chainConstants,
  internalAssetToRpcAsset,
} from '@chainflip/utils/chainflip';

export const isTestnet = (network: ChainflipNetwork): boolean => network !== 'mainnet';

// https://github.com/chainflip-io/chainflip-backend/blob/4540356c923f30777aea46446b81066db1203a6d/state-chain/primitives/src/chains/assets.rs#L402
// export const assetConstants = {
//   [InternalAssets.Eth]: {
//     chain: 'Ethereum',
//     asset: 'ETH',
//     name: 'Ether',
//     decimals: 18,
//     contractId: 1,
//   },
//   [InternalAssets.Flip]: {
//     chain: 'Ethereum',
//     asset: 'FLIP',
//     name: 'FLIP',
//     decimals: 18,
//     contractId: 2,
//   },
//   [InternalAssets.Usdc]: {
//     chain: 'Ethereum',
//     asset: 'USDC',
//     name: 'USDC',
//     decimals: 6,
//     contractId: 3,
//   },
//   [InternalAssets.Usdt]: {
//     chain: 'Ethereum',
//     asset: 'USDT',
//     name: 'USDT',
//     decimals: 6,
//     contractId: 8,
//   },
//   [InternalAssets.Dot]: {
//     chain: 'Polkadot',
//     asset: 'DOT',
//     name: 'Polkadot',
//     decimals: 10,
//     contractId: 4,
//   },
//   [InternalAssets.Btc]: {
//     chain: 'Bitcoin',
//     asset: 'BTC',
//     name: 'Bitcoin',
//     decimals: 8,
//     contractId: 5,
//   },
//   [InternalAssets.ArbEth]: {
//     chain: 'Arbitrum',
//     asset: 'ETH',
//     name: 'Arbitrum Ether',
//     decimals: 18,
//     contractId: 6,
//   },
//   [InternalAssets.ArbUsdc]: {
//     chain: 'Arbitrum',
//     asset: 'USDC',
//     name: 'Arbitrum USDC',
//     decimals: 6,
//     contractId: 7,
//   },
//   [InternalAssets.Sol]: {
//     chain: 'Solana',
//     asset: 'SOL',
//     name: 'Solana',
//     decimals: 9,
//     contractId: 9,
//   },
//   [InternalAssets.SolUsdc]: {
//     chain: 'Solana',
//     asset: 'USDC',
//     name: 'Solana USDC',
//     decimals: 6,
//     contractId: 10,
//   },
// } as const satisfies Record<
//   ChainflipAsset,
//   {
//     chain: ChainflipChain;
//     asset: AssetOfChain<ChainflipChain>; // use AssetOfChain to enforce adding the asset to one of the chains
//     name: string;
//     decimals: number;
//     contractId: number;
//   }
// >;

// https://github.com/chainflip-io/chainflip-backend/blob/a2a3c2e447e7b629c4b96797d9eed22eb5b87a0b/state-chain/primitives/src/chains.rs#L52-L56
// export const chainConstants = {
//   Ethereum: {
//     assets: ['ETH', 'FLIP', 'USDC', 'USDT'],
//     gasAsset: InternalAssets.Eth,
//     contractId: 1,
//     blockTimeSeconds: 12,
//   },
//   Polkadot: {
//     assets: ['DOT'],
//     gasAsset: InternalAssets.Dot,
//     contractId: 2,
//     blockTimeSeconds: 6,
//   },
//   Bitcoin: {
//     assets: ['BTC'],
//     gasAsset: InternalAssets.Btc,
//     contractId: 3,
//     blockTimeSeconds: 10 * 60,
//   },
//   Arbitrum: {
//     assets: ['ETH', 'USDC'],
//     gasAsset: InternalAssets.ArbEth,
//     contractId: 4,
//     blockTimeSeconds: 0.26,
//   },
//   Solana: {
//     assets: ['SOL', 'USDC'],
//     gasAsset: InternalAssets.Sol,
//     contractId: 5,
//     blockTimeSeconds: (400 + 800) / 2 / 1000,
//   },
// } as const satisfies Record<
//   Chain,
//   {
//     assets: Asset[];
//     gasAsset: ChainflipAsset;
//     contractId: number;
//     blockTimeSeconds: number;
//   }
// >;

export type AssetOfChain<C extends ChainflipChain> =
  (typeof chainConstants)[C]['rpcAssets'][number];

type MutablePick<T, K extends keyof T> = { -readonly [P in K]: T[P] };

type RenameKey<T extends Record<string, unknown>, K extends keyof T, N extends string> = {
  [P in keyof T as P extends K ? N : P]: T[P];
};

type AssetAndChainFor<A extends ChainflipAsset> = {
  [K in A]: RenameKey<
    MutablePick<(typeof assetConstants)[K], 'chain' | 'rpcAsset'>,
    'rpcAsset',
    'asset'
  >;
}[A];

export type BaseAssetAndChain = Exclude<AssetAndChain, { chain: 'Ethereum'; asset: 'USDC' }>;

export type ChainMap<T> = {
  [C in ChainflipChain]: T;
};

export type InternalAssetMap<T> = {
  [A in ChainflipAsset]: T;
};

/** not general purpose */
type RemapKeys<T, P extends string> = {
  [K in keyof T as `${P}${K extends string ? Capitalize<K> : never}`]: T[K];
};

type PrefixedAssetAndChainFor<I extends ChainflipAsset, P extends string> = RemapKeys<
  AssetAndChainFor<I>,
  P
>;

export function getAssetAndChain<const A extends ChainflipAsset>(
  internalAsset: A,
): AssetAndChainFor<A>;
export function getAssetAndChain<const A extends ChainflipAsset, const T extends string>(
  internalAsset: A,
  prefix: T,
): PrefixedAssetAndChainFor<A, T>;
export function getAssetAndChain<const A extends ChainflipAsset, const T extends string>(
  internalAsset: A,
  prefix?: T,
): AssetAndChainFor<A> | PrefixedAssetAndChainFor<A, T> {
  const { chain, asset } = internalAssetToRpcAsset[internalAsset];

  if (prefix) {
    return {
      [`${prefix}Asset`]: asset,
      [`${prefix}Chain`]: chain,
    } as PrefixedAssetAndChainFor<A, T>;
  }

  return { chain, asset } as AssetAndChainFor<A>;
}

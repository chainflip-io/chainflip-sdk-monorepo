type ArrayToMap<T extends readonly string[]> = {
  [K in T[number]]: K;
};

const arrayToMap = <const T extends readonly string[]>(array: T): ArrayToMap<T> =>
  Object.fromEntries(array.map((key) => [key, key])) as ArrayToMap<T>;

export const InternalAssets = arrayToMap([
  'Flip',
  'Usdc',
  'Dot',
  'Eth',
  'Btc',
  'Usdt',
  'ArbUsdc',
  'ArbEth',
  'Sol',
  'SolUsdc',
]);
export type InternalAsset = (typeof InternalAssets)[keyof typeof InternalAssets];

export const Chains = arrayToMap(['Bitcoin', 'Ethereum', 'Polkadot', 'Arbitrum', 'Solana']);
export type Chain = (typeof Chains)[keyof typeof Chains];

export const Assets = arrayToMap(['FLIP', 'USDC', 'DOT', 'ETH', 'BTC', 'USDT', 'SOL']);
export type Asset = (typeof Assets)[keyof typeof Assets];

export const ChainflipNetworks = arrayToMap(['backspin', 'sisyphos', 'perseverance', 'mainnet']);

export type ChainflipNetwork = (typeof ChainflipNetworks)[keyof typeof ChainflipNetworks];

export const isTestnet = (network: ChainflipNetwork): boolean =>
  network !== ChainflipNetworks.mainnet;

// https://github.com/chainflip-io/chainflip-backend/blob/4540356c923f30777aea46446b81066db1203a6d/state-chain/primitives/src/chains/assets.rs#L402
export const assetConstants = {
  [InternalAssets.Eth]: {
    chain: Chains.Ethereum,
    asset: Assets.ETH,
    name: 'Ether',
    decimals: 18,
    contractId: 1,
  },
  [InternalAssets.Flip]: {
    chain: Chains.Ethereum,
    asset: Assets.FLIP,
    name: 'FLIP',
    decimals: 18,
    contractId: 2,
  },
  [InternalAssets.Usdc]: {
    chain: Chains.Ethereum,
    asset: Assets.USDC,
    name: 'USDC',
    decimals: 6,
    contractId: 3,
  },
  [InternalAssets.Usdt]: {
    chain: Chains.Ethereum,
    asset: Assets.USDT,
    name: 'USDT',
    decimals: 6,
    contractId: 8,
  },
  [InternalAssets.Dot]: {
    chain: Chains.Polkadot,
    asset: Assets.DOT,
    name: 'Polkadot',
    decimals: 10,
    contractId: 4,
  },
  [InternalAssets.Btc]: {
    chain: Chains.Bitcoin,
    asset: Assets.BTC,
    name: 'Bitcoin',
    decimals: 8,
    contractId: 5,
  },
  [InternalAssets.ArbEth]: {
    chain: Chains.Arbitrum,
    asset: Assets.ETH,
    name: 'Arbitrum Ether',
    decimals: 18,
    contractId: 6,
  },
  [InternalAssets.ArbUsdc]: {
    chain: Chains.Arbitrum,
    asset: Assets.USDC,
    name: 'Arbitrum USDC',
    decimals: 6,
    contractId: 7,
  },
  [InternalAssets.Sol]: {
    chain: Chains.Solana,
    asset: Assets.SOL,
    name: 'Solana',
    decimals: 9,
    contractId: 9,
  },
  [InternalAssets.SolUsdc]: {
    chain: Chains.Solana,
    asset: Assets.USDC,
    name: 'Solana USDC',
    decimals: 6,
    contractId: 10,
  },
} as const satisfies Record<
  InternalAsset,
  {
    chain: Chain;
    asset: AssetOfChain<Chain>; // use AssetOfChain to enforce adding the asset to one of the chains
    name: string;
    decimals: number;
    contractId: number;
  }
>;

// https://github.com/chainflip-io/chainflip-backend/blob/a2a3c2e447e7b629c4b96797d9eed22eb5b87a0b/state-chain/primitives/src/chains.rs#L52-L56
export const chainConstants = {
  [Chains.Ethereum]: {
    assets: [Assets.ETH, Assets.FLIP, Assets.USDC, Assets.USDT],
    gasAsset: Assets.ETH,
    contractId: 1,
    blockTimeSeconds: 12,
  },
  [Chains.Polkadot]: {
    assets: [Assets.DOT],
    gasAsset: Assets.DOT,
    contractId: 2,
    blockTimeSeconds: 6,
  },
  [Chains.Bitcoin]: {
    assets: [Assets.BTC],
    gasAsset: Assets.BTC,
    contractId: 3,
    blockTimeSeconds: 10 * 60,
  },
  [Chains.Arbitrum]: {
    assets: [Assets.ETH, Assets.USDC],
    gasAsset: Assets.ETH,
    contractId: 4,
    blockTimeSeconds: 0.26,
  },
  [Chains.Solana]: {
    assets: [Assets.SOL, Assets.USDC],
    gasAsset: Assets.SOL,
    contractId: 5,
    blockTimeSeconds: (400 + 800) / 2,
  },
} as const satisfies Record<
  Chain,
  {
    assets: Asset[];
    gasAsset: Asset;
    contractId: number;
    blockTimeSeconds: number;
  }
>;

export type AssetOfChain<C extends Chain> = (typeof chainConstants)[C]['assets'][number];

export type UncheckedAssetAndChain = {
  asset: Asset;
  chain: Chain;
};

export type AssetAndChain = {
  [C in Chain]: {
    [A in AssetOfChain<C>]: { chain: C; asset: A };
  }[AssetOfChain<C>];
}[Chain];

type MutablePick<T, K extends keyof T> = { -readonly [P in K]: T[P] };

type AssetAndChainFor<A extends InternalAsset> = {
  [K in A]: MutablePick<(typeof assetConstants)[K], 'chain' | 'asset'>;
}[A];

export type BaseAssetAndChain = Exclude<AssetAndChain, { chain: 'Ethereum'; asset: 'USDC' }>;

export type ChainAssetMap<T> = {
  [C in Chain]: {
    [A in AssetOfChain<C>]: T;
  };
};

export type ChainMap<T> = {
  [C in Chain]: T;
};

export function isValidAssetAndChain(
  assetAndChain: UncheckedAssetAndChain,
): assetAndChain is AssetAndChain {
  const { asset, chain } = assetAndChain;
  if (!(chain in Chains)) return false;

  const validAssets = chainConstants[chain as Chain].assets as string[];
  return validAssets.includes(asset);
}

export const readChainAssetValue = <T>(map: ChainAssetMap<T>, asset: InternalAsset): T => {
  const { chain, asset: symbol } = assetConstants[asset];
  const chainValues = map[chain];
  return chainValues[symbol as keyof typeof chainValues];
};

export function getInternalAsset(asset: UncheckedAssetAndChain): InternalAsset;
export function getInternalAsset(asset: UncheckedAssetAndChain, assert: true): InternalAsset;
export function getInternalAsset(
  asset: UncheckedAssetAndChain,
  assert: boolean,
): InternalAsset | null;
export function getInternalAsset(asset: UncheckedAssetAndChain, assert = true) {
  if (!isValidAssetAndChain(asset)) {
    if (assert) {
      throw new Error(`invalid asset and chain combination: ${JSON.stringify(asset)}`);
    }

    return null;
  }

  const map: ChainAssetMap<InternalAsset> = {
    [Chains.Ethereum]: {
      [Assets.USDC]: InternalAssets.Usdc,
      [Assets.FLIP]: InternalAssets.Flip,
      [Assets.ETH]: InternalAssets.Eth,
      [Assets.USDT]: InternalAssets.Usdt,
    },
    [Chains.Bitcoin]: {
      [Assets.BTC]: InternalAssets.Btc,
    },
    [Chains.Polkadot]: {
      [Assets.DOT]: InternalAssets.Dot,
    },
    [Chains.Arbitrum]: {
      [Assets.USDC]: InternalAssets.ArbUsdc,
      [Assets.ETH]: InternalAssets.ArbEth,
    },
    [Chains.Solana]: {
      [Assets.SOL]: InternalAssets.Sol,
      [Assets.USDC]: InternalAssets.SolUsdc,
    },
  };

  const chain = map[asset.chain];

  return chain[asset.asset as keyof typeof chain] as InternalAsset;
}

export function getInternalAssets(data: {
  srcAsset: Asset;
  srcChain: Chain;
  destAsset: Asset;
  destChain: Chain;
}): { srcAsset: InternalAsset; destAsset: InternalAsset };
export function getInternalAssets(
  data: { srcAsset: Asset; srcChain: Chain; destAsset: Asset; destChain: Chain },
  assert: true,
): { srcAsset: InternalAsset; destAsset: InternalAsset };
export function getInternalAssets(
  data: { srcAsset: Asset; srcChain: Chain; destAsset: Asset; destChain: Chain },
  assert: boolean,
): { srcAsset: InternalAsset | null; destAsset: InternalAsset | null };
export function getInternalAssets(
  {
    srcAsset,
    srcChain,
    destAsset,
    destChain,
  }: { srcAsset: Asset; srcChain: Chain; destAsset: Asset; destChain: Chain },
  assert = true,
) {
  return {
    srcAsset: getInternalAsset({ asset: srcAsset, chain: srcChain }, assert),
    destAsset: getInternalAsset({ asset: destAsset, chain: destChain }, assert),
  };
}
/** not general purpose */
type RemapKeys<T, P extends string> = {
  [K in keyof T as `${P}${K extends string ? Capitalize<K> : never}`]: T[K];
};

type PrefixedAssetAndChainFor<I extends InternalAsset, P extends string> = RemapKeys<
  AssetAndChainFor<I>,
  P
>;

export function getAssetAndChain<const A extends InternalAsset>(
  internalAsset: A,
): AssetAndChainFor<A>;
export function getAssetAndChain<const A extends InternalAsset, const T extends string>(
  internalAsset: A,
  prefix: T,
): PrefixedAssetAndChainFor<A, T>;
export function getAssetAndChain<const A extends InternalAsset, const T extends string>(
  internalAsset: A,
  prefix?: T,
): AssetAndChainFor<A> | PrefixedAssetAndChainFor<A, T> {
  const { chain, asset } = assetConstants[internalAsset];

  if (prefix) {
    return {
      [`${prefix}Asset`]: asset,
      [`${prefix}Chain`]: chain,
    } as PrefixedAssetAndChainFor<A, T>;
  }

  return { chain, asset } as AssetAndChainFor<A>;
}

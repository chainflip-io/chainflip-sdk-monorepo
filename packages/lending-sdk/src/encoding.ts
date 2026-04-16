import type { ChainflipAsset, AssetAmount, CollateralEntries } from './types.js';

/** Encode a ChainflipAsset into the pallet's enum variant format, e.g. 'Usdc' → { Usdc: {} } */
export function encodeAsset(asset: ChainflipAsset): Record<string, object> {
  return { [asset]: {} };
}

/** Encode an optional asset for extrinsics that take Option<Asset>. Returns null (→ None) when undefined. */
export function encodeOptionalAsset(asset?: ChainflipAsset): Record<string, object> | null {
  return asset ? encodeAsset(asset) : null;
}

/** Build a BTreeMap<Asset, AssetAmount> from [asset, amount] pairs. */
export function encodeCollateral(entries: CollateralEntries): Map<Record<string, object>, AssetAmount> {
  return new Map(entries.map(([asset, amount]) => [encodeAsset(asset), amount]));
}

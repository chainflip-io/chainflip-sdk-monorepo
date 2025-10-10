/**
 * This file provides backwards compatibility for exports from before we started
 * moving common stuff to the toolkit
 */
import {
  chainflipAssets,
  chainflipChains,
  chainflipNetworks,
  assetSymbols,
} from '@chainflip/utils/chainflip';

const arrayToMap = <T extends string>(array: readonly T[]): { [K in T]: K } =>
  Object.fromEntries(array.map((item) => [item, item])) as { [K in T]: K };

export const ChainflipNetworks = arrayToMap(chainflipNetworks);
export const InternalAssets = arrayToMap(chainflipAssets.filter((asset) => asset !== 'Dot'));
export const Chains = arrayToMap(chainflipChains.filter((chain) => chain !== 'Polkadot'));
export const Assets = arrayToMap(assetSymbols);

export {
  type ChainflipAsset as InternalAsset,
  type ChainflipChain as Chain,
  type UncheckedAssetAndChain,
  getInternalAsset,
  type ChainflipNetwork,
  type AssetSymbol as Asset,
} from '@chainflip/utils/chainflip';

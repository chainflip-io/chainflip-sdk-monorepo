/**
 * This file provides backwards compatibility for exports from before we started
 * moving common stuff to the toolkit
 */
import {
  chainflipAssets,
  chainflipChains,
  chainflipNetworks,
  rpcAssets,
} from '@chainflip/utils/chainflip';

const arrayToMap = <T>(array: readonly T[]): Map<T, T> =>
  Object.fromEntries(array.map((item) => [item, item])) as Map<T, T>;

export const ChainflipNetworks = arrayToMap(chainflipNetworks);
export const InternalAssets = arrayToMap(chainflipAssets);
export const Chains = arrayToMap(chainflipChains);
export const Assets = arrayToMap(rpcAssets);
export type Asset = (typeof rpcAssets)[number];

export {
  type ChainflipAsset as InternalAsset,
  type ChainflipChain as Chain,
  type UncheckedAssetAndChain,
  getInternalAsset,
  type ChainflipNetwork,
} from '@chainflip/utils/chainflip';

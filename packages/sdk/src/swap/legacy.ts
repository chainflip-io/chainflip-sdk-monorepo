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

const arrayToMap = <T extends string>(array: readonly T[]): { [K in T]: K } =>
  Object.fromEntries(array.map((item) => [item, item])) as { [K in T]: K };

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

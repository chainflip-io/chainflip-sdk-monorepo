import { ChainflipNetwork } from '@chainflip/bitcoin';
import { ChainflipAsset, ChainflipChain, chainConstants } from '@chainflip/utils/chainflip';

export const isTestnet = (network: ChainflipNetwork): boolean => network !== 'mainnet';

export type AssetOfChain<C extends ChainflipChain> =
  (typeof chainConstants)[C]['rpcAssets'][number];

export type ChainMap<T> = {
  [C in ChainflipChain]: T;
};

export type InternalAssetMap<T> = {
  [A in ChainflipAsset]: T;
};

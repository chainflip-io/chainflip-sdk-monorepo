import { ChainflipAsset } from '@chainflip/utils/chainflip';

export const isAssetHub = (asset: ChainflipAsset): asset is 'HubDot' | 'HubUsdc' | 'HubUsdt' =>
  asset === 'HubDot' || asset === 'HubUsdc' || asset === 'HubUsdt';

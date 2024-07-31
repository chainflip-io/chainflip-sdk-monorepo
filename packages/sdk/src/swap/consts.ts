import { ChainflipNetworks } from '@/shared/enums';
import { version } from '../../package.json';

export const CF_SDK_VERSION_HEADERS = { 'Cf-Sdk-Version': version };

export const BACKEND_SERVICE_URLS = {
  [ChainflipNetworks.backspin]: 'https://chainflip-swap-backspin.staging/',
  [ChainflipNetworks.sisyphos]: 'https://chainflip-swap.staging/',
  [ChainflipNetworks.perseverance]: 'https://chainflip-swap-perseverance.chainflip.io/',
  [ChainflipNetworks.mainnet]: 'https://chainflip-swap.chainflip.io/',
} as const;

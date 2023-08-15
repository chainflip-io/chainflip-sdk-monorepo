import { ChainflipNetworks } from '@/shared/enums';

export const BACKEND_SERVICE_URLS = {
  [ChainflipNetworks.sisyphos]: 'https://chainflip-swap.staging/',
  [ChainflipNetworks.perseverance]:
    'https://chainflip-swap-perseverance.chainflip.io/',
  [ChainflipNetworks.partnernet]:
    'https://chainflip-swap-partnernet.chainflip.io/',
  [ChainflipNetworks.backspin]: 'https://chainflip-backspin.staging/',
} as const;

import { ChainflipNetworks } from '@/shared/enums';

export const BACKEND_SERVICE_URLS = {
  [ChainflipNetworks.backspin]: 'https://chainflip-swap-backspin.staging/',
  [ChainflipNetworks.sisyphos]: 'https://chainflip-swap.staging/',
  [ChainflipNetworks.perseverance]:
    'https://chainflip-swap-perseverance.chainflip.io/',
} as const;

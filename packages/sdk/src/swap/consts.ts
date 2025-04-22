import { ChainflipNetwork } from '@chainflip/utils/chainflip';
import pkg from '../../package.json' with { type: 'json' };

export const CF_SDK_VERSION_HEADERS = { 'X-Chainflip-Sdk-Version': pkg.version };

export const BACKEND_SERVICE_URLS: Record<ChainflipNetwork, string> = {
  backspin: 'https://chainflip-swap-backspin.staging/',
  sisyphos: 'https://chainflip-swap.staging/',
  perseverance: 'https://chainflip-swap-perseverance.chainflip.io/',
  mainnet: 'https://chainflip-swap.chainflip.io/',
} as const;

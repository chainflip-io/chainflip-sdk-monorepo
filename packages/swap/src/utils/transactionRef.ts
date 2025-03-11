import { CHARSET as BASE58_CHARSET } from '@chainflip/utils/base58';
import { Chain } from '@/shared/enums';

const hexRegex = /^(0x)?[a-f0-9]+$/i;
const base58Regex = new RegExp(`^[${BASE58_CHARSET}]+$`);
const dotRegex = /^\d+-\d+$/;

export const isTransactionRef = (txRef: string) =>
  hexRegex.test(txRef) || base58Regex.test(txRef) || dotRegex.test(txRef);

export const getTransactionRefChains = (txRef: string): Chain[] => {
  if (hexRegex.test(txRef) && txRef.startsWith('0x')) {
    return ['Ethereum', 'Arbitrum'];
  }
  if (hexRegex.test(txRef) && !txRef.startsWith('0x')) {
    return ['Bitcoin'];
  }
  if (base58Regex.test(txRef)) {
    return ['Solana'];
  }
  if (dotRegex.test(txRef)) {
    return ['Polkadot'];
  }

  return [];
};

import { CHARSET as BASE58_CHARSET } from '@chainflip/utils/base58';
import { ChainflipChain } from '@chainflip/utils/chainflip';

const hexNoPrefixRegex = /^[a-f0-9]+$/i;
const hexWithPrefixRegex = /^0x[a-f0-9]+$/i;
const base58Regex = new RegExp(`^[${BASE58_CHARSET}]+$`);
const dotRegex = /^\d+-\d+$/;

export const isTransactionRef = (txRef: string) =>
  hexNoPrefixRegex.test(txRef) ||
  hexWithPrefixRegex.test(txRef) ||
  base58Regex.test(txRef) ||
  dotRegex.test(txRef);

export const getTransactionRefChains = (txRef: string): ChainflipChain[] => {
  if (hexNoPrefixRegex.test(txRef)) {
    return ['Bitcoin'];
  }
  if (hexWithPrefixRegex.test(txRef)) {
    return ['Ethereum', 'Arbitrum'];
  }
  if (base58Regex.test(txRef)) {
    return ['Solana'];
  }
  if (dotRegex.test(txRef)) {
    return ['Assethub'];
  }

  return [];
};

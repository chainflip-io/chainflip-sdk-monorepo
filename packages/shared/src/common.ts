import * as base58 from '@chainflip/utils/base58';
import { hexToBytes, reverseBytes } from '@chainflip/utils/bytes';
import type { HexString } from '@chainflip/utils/types';
import { Chain } from './enums';

export function formatTxHash(chain: Chain, txHash: string): string;
export function formatTxHash(chain: Chain, txHash: string | undefined): string | undefined;
export function formatTxHash(chain: Chain, txHash: string | undefined) {
  if (!txHash) return txHash;

  switch (chain) {
    case 'Bitcoin':
      return reverseBytes(txHash.slice(2));
    case 'Solana':
      return base58.encode(hexToBytes(txHash as HexString));
    default:
      return txHash;
  }
}

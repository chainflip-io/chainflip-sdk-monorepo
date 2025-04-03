import * as base58 from '@chainflip/utils/base58';
import { hexToBytes, reverseBytes } from '@chainflip/utils/bytes';
import { ChainflipChain } from '@chainflip/utils/chainflip';
import type { HexString } from '@chainflip/utils/types';

export function formatTxRef(chain: ChainflipChain, txRef: string): string;
export function formatTxRef(chain: ChainflipChain, txRef: string | undefined): string | undefined;
export function formatTxRef(chain: ChainflipChain, txRef: string | undefined) {
  if (!txRef) return txRef;

  switch (chain) {
    case 'Bitcoin':
      return reverseBytes(txRef.slice(2));
    case 'Solana':
      return base58.encode(hexToBytes(txRef as HexString));
    default:
      return txRef;
  }
}

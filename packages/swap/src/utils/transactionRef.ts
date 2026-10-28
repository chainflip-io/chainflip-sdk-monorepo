import { CHARSET as BASE58_CHARSET, decode as decodeBase58 } from '@chainflip/utils/base58';
import { ChainflipChain } from '@chainflip/utils/chainflip';
import { z } from 'zod';

const U32_MAX = 2 ** 32 - 1;

// zod still runs refinements after a failed regex check, so every refinement has to validate the
// format itself before doing any work on the input
const base58Regex = new RegExp(`^[${BASE58_CHARSET}]{64,88}$`);
const assethubRegex = /^\d{1,10}-\d{1,10}$/;

const withChains =
  (chains: ChainflipChain[]) =>
  (txRef: string): { txRef: string; chains: ChainflipChain[] } => ({ txRef, chains });

// 32 byte transaction hash with a 0x prefix
const evmTxRef = z.string().regex(/^0x[a-f0-9]{64}$/i);

// 32 byte transaction id without a 0x prefix (tron tx refs share this format)
const bitcoinTxRef = z.string().regex(/^[a-f0-9]{64}$/i);

// 64 byte signature, the length cap keeps the quadratic base58 decoding cheap
const solanaTxRef = z
  .string()
  .refine((txRef) => base58Regex.test(txRef) && decodeBase58(txRef).length === 64);

// `${blockNumber}-${extrinsicIndex}`
const assethubTxRef = z
  .string()
  .refine(
    (txRef) => assethubRegex.test(txRef) && txRef.split('-').every((n) => Number(n) <= U32_MAX),
  );

export const transactionRef = z.union([
  evmTxRef.transform(withChains(['Ethereum', 'Arbitrum'])),
  bitcoinTxRef.transform(withChains(['Bitcoin'])),
  solanaTxRef.transform(withChains(['Solana'])),
  assethubTxRef.transform(withChains(['Assethub'])),
]);

export type TransactionRef = z.output<typeof transactionRef>;

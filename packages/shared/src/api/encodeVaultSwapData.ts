import { z } from 'zod';
import { hexString } from '../parsers.js';

export const EncodedVaultSwapData = z.discriminatedUnion('chain', [
  z.object({
    chain: z.literal('Bitcoin'),
    nulldataPayload: hexString,
    depositAddress: z.string(),
  }),
  z.object({
    chain: z.enum(['Ethereum', 'Arbitrum']),
    value: z.string(),
    to: hexString,
    calldata: hexString,
    sourceTokenAddress: hexString.optional(),
  }),
  z.object({
    chain: z.literal('Solana'),
    programId: z.string(),
    data: hexString,
    accounts: z.array(
      z.object({
        pubkey: z.string(),
        isSigner: z.boolean(),
        isWritable: z.boolean(),
      }),
    ),
  }),
]);

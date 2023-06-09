import { createInterface } from 'node:readline/promises';
import { z } from 'zod';
import { chainflipNetwork } from '@/shared/enums';

export const askForPrivateKey = async () => {
  const rl = createInterface({ input: process.stdin, output: process.stdout });

  try {
    return await rl.question("Please enter your wallet's private key: ");
  } finally {
    rl.close();
  }
};

export const signerSchema = z.object({
  walletPrivateKey: z.string().optional(),
  chainflipNetwork: z.union([chainflipNetwork, z.literal('localnet')]),
  ethNetwork: z.string().optional(),
});

import { createInterface } from 'node:readline/promises';
import { chainflipNetwork } from '@/shared/parsers';

export const askForPrivateKey = async () => {
  const rl = createInterface({ input: process.stdin, output: process.stdout });

  try {
    return await rl.question("Please enter your wallet's private key: ");
  } finally {
    rl.close();
  }
};

export const cliNetworks = [...Object.values(chainflipNetwork.enum), 'localnet'] as const;

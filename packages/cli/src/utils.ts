import { chainflipNetworks } from '@chainflip/utils/chainflip';
import { createInterface } from 'node:readline/promises';

export const askForPrivateKey = async () => {
  const rl = createInterface({ input: process.stdin, output: process.stdout });

  try {
    return await rl.question("Please enter your wallet's private key: ");
  } finally {
    rl.close();
  }
};

export const cliNetworks = [...chainflipNetworks, 'localnet'] as const;

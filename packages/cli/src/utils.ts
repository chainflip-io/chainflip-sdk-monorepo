import { createInterface } from 'node:readline/promises';
import { ChainflipNetworks } from '@/shared/enums';
import { chainflipNetwork } from '@/shared/parsers';
import { ChainflipNetwork } from './enums';

export const askForPrivateKey = async () => {
  const rl = createInterface({ input: process.stdin, output: process.stdout });

  try {
    return await rl.question("Please enter your wallet's private key: ");
  } finally {
    rl.close();
  }
};

export const cliNetworks = [...Object.values(chainflipNetwork.enum), 'localnet'] as const;

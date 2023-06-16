import { createInterface } from 'node:readline/promises';
import { ChainflipNetwork } from './enums';

export const askForPrivateKey = async () => {
  const rl = createInterface({ input: process.stdin, output: process.stdout });

  try {
    return await rl.question("Please enter your wallet's private key: ");
  } finally {
    rl.close();
  }
};

type GetEthNetworkOptions =
  | { chainflipNetwork: 'localnet'; ethNetwork: string }
  | { chainflipNetwork: ChainflipNetwork };

export function getEthNetwork(opts: GetEthNetworkOptions) {
  if (opts.chainflipNetwork === 'localnet') return opts.ethNetwork;
  if (opts.chainflipNetwork === 'mainnet') return 'mainnet';
  return 'goerli';
}

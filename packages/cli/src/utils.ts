import { createInterface } from 'node:readline/promises';
import yargs from 'yargs/yargs';
import { Assets, ChainflipNetworks } from '@/shared/enums';
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

type GetEthNetworkOptions =
  | { chainflipNetwork: 'localnet'; ethNetwork: string }
  | { chainflipNetwork: ChainflipNetwork };

export function getEthNetwork(opts: GetEthNetworkOptions) {
  if (opts.chainflipNetwork === 'localnet') return opts.ethNetwork;
  if (opts.chainflipNetwork === ChainflipNetworks.mainnet) return 'mainnet';
  return 'goerli';
}
const networks = [...Object.values(chainflipNetwork.enum), 'localnet'];
export const parseArgs = (args: string[]) =>
  yargs(args)
    .scriptName('chainflip-cli')
    .usage('$0 <cmd> [args]')
    .command('swap', '', (y) => {
      y.option('src-asset', {
        choices: Object.values(Assets),
        // demandOption: true,
        describe: 'The asset to swap from',
      })
        .option('dest-asset', {
          choices: Object.values(Assets),
          demandOption: true,
          describe: 'The asset to swap to',
        })
        .option('chainflip-network', {
          choices: networks,
          describe: 'The Chainflip network to execute the swap on',
          default: ChainflipNetworks.sisyphos,
        })
        .option('amount', {
          type: 'string',
          demandOption: true,
          describe: 'The amount to swap',
        })
        .option('dest-address', {
          type: 'string',
          demandOption: true,
          describe: 'The address to send the swapped assets to',
        })
        .option('wallet-private-key', {
          type: 'string',
          describe: 'The private key of the wallet to use',
        })
        .option('src-token-contract-address', {
          type: 'string',
          describe:
            'The contract address of the token to swap from when `chainflip-network` is `localnet`',
        })
        .option('vault-contract-address', {
          type: 'string',
          describe:
            'The contract address of the vault when `chainflip-network` is `localnet`',
        })
        .option('eth-network', {
          type: 'string',
          describe:
            'The eth network URL to use when `chainflip-network` is `localnet`',
        });
    })
    .command('fund-state-chain-account', '', (y) => {
      y.option('account-id', {
        type: 'string',
        demandOption: true,
        describe: 'The account ID for the validator to be funded',
      })
        .option('chainflip-network', {
          choices: networks,
          describe: 'The Chainflip network to execute the swap on',
          default: ChainflipNetworks.sisyphos,
        })
        .option('amount', {
          type: 'string',
          demandOption: true,
          describe: 'The amount in Flipperino to fund',
        })
        .option('wallet-private-key', {
          type: 'string',
          describe: 'The private key of the wallet to use',
        })
        .option('state-chain-manager-contract-address', {
          type: 'string',
          describe:
            'The contract address of the state chain manager when `chainflip-network` is `localnet`',
        })
        .option('flip-token-contract-address', {
          type: 'string',
          describe:
            'The contract address for the FLIP token when `chainflip-network` is `localnet`',
        })
        .option('eth-network', {
          type: 'string',
          describe:
            'The eth network URL to use when `chainflip-network` is `localnet`',
        });
    })
    .help()
    .parseSync();

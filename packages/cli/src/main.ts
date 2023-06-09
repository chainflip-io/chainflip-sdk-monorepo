#! /usr/bin/env node
import yargs from 'yargs/yargs';
import { chainflipNetwork, supportedAsset } from '@/shared/enums';
import cliExecuteSwap from './cliExecuteSwap';
import cliFundStateChainAccount from './cliFundStateChainAccount';

const networks = [...Object.values(chainflipNetwork.enum), 'localnet'];

const {
  _: [command],
  ...args
} = yargs(process.argv.slice(2))
  .scriptName('chainflip-cli')
  .usage('$0 <cmd> [args]')
  .command('swap', '', (y) => {
    y.option('src-token', {
      choices: Object.values(supportedAsset.enum),
      // demandOption: true,
      describe: 'The token to swap from',
    })
      .option('dest-token', {
        choices: Object.values(supportedAsset.enum),
        demandOption: true,
        describe: 'The token to swap to',
      })
      .option('chainflip-network', {
        choices: networks,
        describe: 'The Chainflip network to execute the swap on',
        default: 'sisyphos',
      })
      .option('amount', {
        type: 'string',
        demandOption: true,
        describe: 'The amount to swap',
      })
      .option('dest-address', {
        type: 'string',
        demandOption: true,
        describe: 'The address to send the swapped tokens to',
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
        default: 'sisyphos',
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
      });
  })
  .help()
  .parseSync();

if (command === 'swap') {
  cliExecuteSwap(args);
} else if (command === 'fund-state-chain-account') {
  cliFundStateChainAccount(args);
}

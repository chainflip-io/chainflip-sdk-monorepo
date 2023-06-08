#! /usr/bin/env node
import yargs from 'yargs/yargs';
import { chainflipNetwork, supportedAsset } from '@/shared/enums';
import cliExecuteSwap from './cliExecuteSwap';

const args = yargs(process.argv.slice(2))
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
        choices: [...Object.values(chainflipNetwork.enum), 'localnet'],
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
      });
  })
  .help()
  .parse();

cliExecuteSwap(args);

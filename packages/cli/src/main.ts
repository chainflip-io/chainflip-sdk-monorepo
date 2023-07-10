#! /usr/bin/env node
import yargs from 'yargs/yargs';
import cliExecuteCall, {
  yargsOptions as cliExecuteCallOptions,
} from './cliExecuteCall';
import cliExecuteSwap, {
  yargsOptions as cliExecuteSwapOptions,
} from './cliExecuteSwap';
import cliFundStateChainAccount, {
  yargsOptions as cliFundStateChainAccountOptions,
} from './cliFundStateChainAccount';

yargs(process.argv.slice(2))
  .scriptName('chainflip-cli')
  .usage('$0 <cmd> [args]')
  .command('swap', '', cliExecuteSwapOptions, cliExecuteSwap)
  .command('call', '', cliExecuteCallOptions, cliExecuteCall)
  .command(
    'fund-state-chain-account',
    '',
    cliFundStateChainAccountOptions,
    cliFundStateChainAccount,
  )
  .help()
  .parse();

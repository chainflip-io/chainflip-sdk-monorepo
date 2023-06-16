#! /usr/bin/env node
import cliExecuteSwap from './cliExecuteSwap';
import cliFundStateChainAccount from './cliFundStateChainAccount';
import { parseArgs } from './utils';

const {
  _: [command],
  ...args
} = parseArgs(process.argv.slice(2));

if (command === 'swap') {
  cliExecuteSwap(args);
} else if (command === 'fund-state-chain-account') {
  cliFundStateChainAccount(args);
}

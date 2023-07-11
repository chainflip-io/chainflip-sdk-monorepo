import yargs from 'yargs/yargs';
import cliExecuteCall, {
  yargsOptions as cliExecuteCallOptions,
} from './commands/cliExecuteCall';
import cliExecuteSwap, {
  yargsOptions as cliExecuteSwapOptions,
} from './commands/cliExecuteSwap';
import cliFundStateChainAccount, {
  yargsOptions as cliFundStateChainAccountOptions,
} from './commands/cliFundStateChainAccount';

export default async function cli(args: string[]) {
  return yargs(args)
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
    .wrap(0)
    .strict()
    .help()
    .parse();
}

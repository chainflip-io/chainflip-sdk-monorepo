import yargs from 'yargs/yargs';
import cliExecuteSwap, { yargsOptions as cliExecuteSwapOptions } from './commands/cliExecuteSwap';
import cliFundStateChainAccount, {
  yargsOptions as cliFundStateChainAccountOptions,
} from './commands/cliFundStateChainAccount';
import cliGetVaultSwapData, {
  yargsOptions as cliGetVaultSwapDataOptions,
} from './commands/cliGetVaultSwapData';
import cliRequestSwapDepositAddress, {
  yargsOptions as cliRequestSwapDepositAddressOptions,
} from './commands/cliRequestSwapDepositAddress';

export default async function cli(args: string[]) {
  return yargs(args)
    .scriptName('chainflip-cli')
    .usage('$0 <cmd> [args]')
    .command('swap', '', cliExecuteSwapOptions, cliExecuteSwap)
    .command(
      'fund-state-chain-account',
      '',
      cliFundStateChainAccountOptions,
      cliFundStateChainAccount,
    )
    .command(
      'request-swap-deposit-address',
      '',
      cliRequestSwapDepositAddressOptions,
      cliRequestSwapDepositAddress,
    )
    .command('get-vault-swap-data', '', cliGetVaultSwapDataOptions, cliGetVaultSwapData)
    .wrap(0)
    .strict()
    .help()
    .parse();
}

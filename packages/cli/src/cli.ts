import yargs from 'yargs/yargs';
import cliEncodeVaultSwapData, {
  yargsOptions as cliEncodeVaultSwapDataOptions,
} from './commands/cliEncodeVaultSwapData.js';
import cliFundStateChainAccount, {
  yargsOptions as cliFundStateChainAccountOptions,
} from './commands/cliFundStateChainAccount.js';
import cliRequestSwapDepositAddress, {
  yargsOptions as cliRequestSwapDepositAddressOptions,
} from './commands/cliRequestSwapDepositAddress.js';

export default async function cli(args: string[]) {
  return yargs(args)
    .scriptName('chainflip-cli')
    .usage('$0 <cmd> [args]')
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
    .command('get-vault-swap-data', '', cliEncodeVaultSwapDataOptions, cliEncodeVaultSwapData)
    .wrap(0)
    .strict()
    .help()
    .parse();
}

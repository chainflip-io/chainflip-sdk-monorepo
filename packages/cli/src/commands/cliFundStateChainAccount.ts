import { Wallet, getDefaultProvider } from 'ethers';
import { ArgumentsCamelCase, InferredOptionTypes, Options } from 'yargs';
import { getEvmChainId } from '@/shared/consts.js';
import { FundingNetworkOptions, fundStateChainAccount } from '../lib/index.js';
import { askForPrivateKey, cliNetworks } from '../utils.js';

export const yargsOptions = {
  'src-account-id': {
    type: 'string',
    demandOption: true,
    describe: 'The account ID for the validator to be funded',
  },
  'chainflip-network': {
    choices: cliNetworks,
    describe: 'The Chainflip network to execute the swap on',
    default: 'sisyphos',
  },
  amount: {
    type: 'string',
    demandOption: true,
    describe: 'The amount in Flipperino to fund',
  },
  'wallet-private-key': {
    type: 'string',
    describe: 'The private key of the wallet to use',
  },
  'state-chain-manager-contract-address': {
    type: 'string',
    describe:
      'The contract address of the state chain manager when `chainflip-network` is `localnet`',
  },
  'flip-token-contract-address': {
    type: 'string',
    describe: 'The contract address for the FLIP token when `chainflip-network` is `localnet`',
  },
  'eth-network': {
    type: 'string',
    describe: 'The eth network URL to use when `chainflip-network` is `localnet`',
  },
} as const satisfies { [key: string]: Options };

export default async function cliFundStateChainAccount(
  args: ArgumentsCamelCase<InferredOptionTypes<typeof yargsOptions>>,
) {
  const privateKey = args.walletPrivateKey ?? (await askForPrivateKey());

  const ethNetwork =
    args.chainflipNetwork === 'localnet'
      ? args.ethNetwork
      : getEvmChainId('Ethereum', args.chainflipNetwork);

  const wallet = new Wallet(privateKey).connect(
    getDefaultProvider(ethNetwork, { etherscan: '-' }), // disable etherscan provider because it is unreliable
  );

  const networkOpts: FundingNetworkOptions =
    args.chainflipNetwork === 'localnet'
      ? {
          stateChainGatewayContractAddress: args.stateChainManagerContractAddress as string,
          flipContractAddress: args.flipTokenContractAddress as string,
          signer: wallet,
          network: args.chainflipNetwork,
        }
      : { network: args.chainflipNetwork, signer: wallet };

  const tx = await fundStateChainAccount(
    args.srcAccountId as `0x${string}`,
    BigInt(args.amount),
    networkOpts,
    {},
  );

  console.log(`Call executed. Transaction hash: ${tx.hash}`);
}

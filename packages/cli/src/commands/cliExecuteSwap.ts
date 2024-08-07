import { getDefaultProvider, Wallet } from 'ethers';
import { ArgumentsCamelCase, InferredOptionTypes, Options } from 'yargs';
import { getEvmChainId } from '@/shared/consts';
import { InternalAssets, ChainflipNetworks, assetConstants } from '@/shared/enums';
import { assert } from '@/shared/guards';
import { executeSwap, type SwapNetworkOptions, type ExecuteSwapParams } from '@/shared/vault';
import { askForPrivateKey, cliNetworks } from '../utils';

export const yargsOptions = {
  'src-asset': {
    choices: Object.values(InternalAssets),
    demandOption: true,
    describe: 'The asset to swap from',
  },
  'dest-asset': {
    choices: Object.values(InternalAssets),
    demandOption: true,
    describe: 'The asset to swap to',
  },
  'chainflip-network': {
    choices: cliNetworks,
    describe: 'The Chainflip network to execute the swap on',
    default: ChainflipNetworks.sisyphos,
  },
  amount: {
    type: 'string',
    demandOption: true,
    describe: 'The amount to swap',
  },
  'dest-address': {
    type: 'string',
    demandOption: true,
    describe: 'The address to send the swapped assets to',
  },
  message: {
    type: 'string',
    describe: 'The message that is sent along with the swapped assets',
  },
  'gas-budget': {
    type: 'string',
    describe: 'The amount of gas that is sent with the message',
  },
  'wallet-private-key': {
    type: 'string',
    describe: 'The private key of the wallet to use',
  },
  'src-token-contract-address': {
    type: 'string',
    describe:
      'The contract address of the token to swap from when `chainflip-network` is `localnet`',
  },
  'vault-contract-address': {
    type: 'string',
    describe: 'The contract address of the vault when `chainflip-network` is `localnet`',
  },
  'eth-network': {
    type: 'string',
    describe: 'The eth network URL to use when `chainflip-network` is `localnet`',
  },
} as const satisfies { [key: string]: Options };

export default async function cliExecuteSwap(
  args: ArgumentsCamelCase<InferredOptionTypes<typeof yargsOptions>>,
) {
  const privateKey = args.walletPrivateKey ?? (await askForPrivateKey());

  const ethNetwork =
    args.chainflipNetwork === 'localnet'
      ? args.ethNetwork
      : getEvmChainId(assetConstants[args.srcAsset].chain, args.chainflipNetwork);

  const wallet = new Wallet(privateKey).connect(
    getDefaultProvider(ethNetwork, { etherscan: '-' }), // disable etherscan provider because it is unreliable
  );

  const networkOpts: SwapNetworkOptions =
    args.chainflipNetwork === 'localnet'
      ? {
          vaultContractAddress: args.vaultContractAddress as string,
          srcTokenContractAddress: args.srcTokenContractAddress as string,
          signer: wallet,
          network: args.chainflipNetwork,
        }
      : { network: args.chainflipNetwork, signer: wallet };

  let ccmParams;
  if (args.gasBudget || args.message) {
    assert(args.gasBudget, 'missing gas budget');
    assert(args.message, 'missing message');
    ccmParams = {
      message: args.message,
      gasBudget: args.gasBudget,
    };
  }

  const tx = await executeSwap(
    {
      srcChain: assetConstants[args.srcAsset].chain,
      srcAsset: assetConstants[args.srcAsset].asset,
      destChain: assetConstants[args.destAsset].chain,
      destAsset: assetConstants[args.destAsset].asset,
      amount: args.amount,
      destAddress: args.destAddress,
      ccmParams,
    } as ExecuteSwapParams,
    networkOpts,
    {},
  );

  console.log(`Swap executed. Transaction hash: ${tx.hash}`);
}

import { getDefaultProvider, providers, Wallet } from 'ethers';
import { z } from 'zod';
import { assetChains } from '@/shared/enums';
import {
  numericString,
  hexString,
  chainflipAsset,
  chainflipNetwork,
} from '@/shared/parsers';
import {
  type ExecuteOptions,
  executeCall,
  type ExecuteCallParams,
} from '@/shared/vault';
import { askForPrivateKey, getEthNetwork } from './utils';

export const schema = z
  .intersection(
    z.union([
      z.object({
        chainflipNetwork: z.literal('localnet'),
        ethNetwork: z.string(),
        srcTokenContractAddress: z.string(),
        vaultContractAddress: z.string(),
      }),
      z.object({
        chainflipNetwork,
        ethNetwork: z
          .string()
          .optional()
          .transform(() => undefined),
        srcTokenContractAddress: z
          .string()
          .optional()
          .transform(() => undefined),
        vaultContractAddress: z
          .string()
          .optional()
          .transform(() => undefined),
      }),
    ]),
    z.object({
      walletPrivateKey: z.string().optional(),
      srcAsset: chainflipAsset.optional(),
      destAsset: chainflipAsset,
      amount: numericString,
      destAddress: z.string(),
      message: hexString,
      gasAmount: numericString,
    }),
  )
  .transform(({ destAsset, srcAsset, ...rest }) => ({
    ...rest,
    destChain: assetChains[destAsset],
    destAsset,
    ...(srcAsset && { srcAsset }),
  }));

export default async function cliExecuteCall(unvalidatedArgs: unknown) {
  const { walletPrivateKey, ...args } = schema.parse(unvalidatedArgs);

  const privateKey = walletPrivateKey ?? (await askForPrivateKey());

  const ethNetwork = getEthNetwork(args);

  const wallet = new Wallet(privateKey).connect(
    process.env.ALCHEMY_KEY
      ? new providers.AlchemyProvider(ethNetwork, process.env.ALCHEMY_KEY)
      : getDefaultProvider(ethNetwork),
  );

  const {
    chainflipNetwork: network,
    vaultContractAddress,
    srcTokenContractAddress,
    ...callParams
  } = args;

  const opts: ExecuteOptions =
    args.chainflipNetwork === 'localnet'
      ? {
          vaultContractAddress: vaultContractAddress as string,
          srcTokenContractAddress: srcTokenContractAddress as string,
          signer: wallet,
          network,
        }
      : { network: args.chainflipNetwork, signer: wallet };

  const receipt = await executeCall(callParams as ExecuteCallParams, opts);

  console.log(`Call executed. Transaction hash: ${receipt.transactionHash}`);
}

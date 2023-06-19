import { getDefaultProvider, providers, Wallet } from 'ethers';
import { z } from 'zod';
import { assetChains, chainflipNetwork } from '@/shared/enums';
import { numericString, hexString, chainflipAsset } from '@/shared/parsers';
import { executeSwap, ExecuteSwapParams } from '@/shared/vault';
import { ExecuteSwapOptions } from '@/shared/vault/executeSwap';
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
      z.object({ chainflipNetwork }),
    ]),
    z.object({
      walletPrivateKey: z.string().optional(),
      srcAsset: chainflipAsset.optional(),
      destAsset: chainflipAsset,
      amount: z.union([numericString, hexString]),
      destAddress: z.string(),
    }),
  )
  .transform(({ destAsset, srcAsset, ...rest }) => ({
    ...rest,
    destChain: assetChains[destAsset],
    destAsset,
    ...(srcAsset && { srcAsset }),
  }));

export default async function cliExecuteSwap(unvalidatedArgs: unknown) {
  const { walletPrivateKey, ...args } = schema.parse(unvalidatedArgs);

  const privateKey = walletPrivateKey ?? (await askForPrivateKey());

  const ethNetwork = getEthNetwork(args);

  const wallet = new Wallet(privateKey).connect(
    process.env.ALCHEMY_KEY
      ? new providers.AlchemyProvider(ethNetwork, process.env.ALCHEMY_KEY)
      : getDefaultProvider(ethNetwork),
  );

  const opts: ExecuteSwapOptions =
    args.chainflipNetwork === 'localnet'
      ? {
          vaultContractAddress: args.vaultContractAddress,
          srcTokenContractAddress: args.srcTokenContractAddress,
          signer: wallet,
          network: 'localnet',
        }
      : { network: args.chainflipNetwork, signer: wallet };

  const txHash = await executeSwap(args as ExecuteSwapParams, opts);

  console.log(`Swap executed. Transaction hash: ${txHash}`);
}

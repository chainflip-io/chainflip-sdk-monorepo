import { getDefaultProvider, providers, Wallet } from 'ethers';
import { z } from 'zod';
import { ChainId } from '@/sdk/swap/consts';
import { SupportedAsset, supportedAsset } from '@/shared/enums';
import { numericString, hexString } from '@/shared/parsers';
import { executeSwap, ExecuteSwapParams } from '@/shared/vault';
import { ExecuteSwapOptions } from '@/shared/vault/executeSwap';
import { askForPrivateKey, signerSchema } from './utils';

const assetToNetworkMap: Record<SupportedAsset, ChainId> = {
  ETH: ChainId.Ethereum,
  FLIP: ChainId.Ethereum,
  USDC: ChainId.Ethereum,
  BTC: ChainId.Bitcoin,
  DOT: ChainId.Polkadot,
};

const argsSchema = z
  .intersection(
    signerSchema,
    z.object({
      srcToken: supportedAsset.optional(),
      destToken: supportedAsset,
      amount: z.union([numericString, hexString]),
      destAddress: z.string(),
      srcTokenContractAddress: z.string().optional(),
      vaultContractAddress: z.string().optional(),
    }),
  )
  .transform(({ destToken, srcToken, ...rest }) => {
    const destChainId = assetToNetworkMap[destToken];

    return {
      ...rest,
      destChainId,
      destTokenSymbol: destToken,
      ...(srcToken && { srcTokenSymbol: srcToken }),
    };
  });

export default async function cliExecuteSwap(args: unknown) {
  const {
    chainflipNetwork,
    walletPrivateKey,
    vaultContractAddress,
    srcTokenContractAddress,
    ...validatedArgs
  } = argsSchema.parse(args);

  const privateKey = walletPrivateKey ?? (await askForPrivateKey());

  const ethNetwork =
    validatedArgs.ethNetwork ?? chainflipNetwork === 'mainnet'
      ? 'mainnet'
      : 'goerli';

  const wallet = new Wallet(privateKey).connect(
    process.env.ALCHEMY_KEY
      ? new providers.AlchemyProvider(ethNetwork, process.env.ALCHEMY_KEY)
      : getDefaultProvider(ethNetwork),
  );

  const txHash = await executeSwap(
    validatedArgs as ExecuteSwapParams,
    {
      cfNetwork: chainflipNetwork,
      signer: wallet,
      vaultContractAddress,
      srcTokenContractAddress,
    } as ExecuteSwapOptions,
  );

  console.log(`Swap executed. Transaction hash: ${txHash}`);
}

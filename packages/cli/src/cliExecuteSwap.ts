import { getDefaultProvider, providers, Wallet } from 'ethers';
import { createInterface } from 'node:readline/promises';
import { z } from 'zod';
import { ChainId } from '@/sdk/swap/consts';
import { executeSwap, ExecuteSwapParams } from '@/sdk/swap/vault';
import { ExecuteSwapOptions } from '@/sdk/swap/vault/executeSwap';
import {
  chainflipNetwork,
  SupportedAsset,
  supportedAsset,
} from '@/shared/enums';
import { numericString, hexString } from '@/shared/parsers';

const assetToNetworkMap: Record<SupportedAsset, ChainId> = {
  ETH: ChainId.Ethereum,
  FLIP: ChainId.Ethereum,
  USDC: ChainId.Ethereum,
  BTC: ChainId.Bitcoin,
  DOT: ChainId.Polkadot,
};

const argsSchema = z
  .object({
    srcToken: supportedAsset.optional(),
    destToken: supportedAsset,
    amount: z.union([numericString, hexString]),
    destAddress: z.string(),
    walletPrivateKey: z.string().optional(),
    srcTokenContractAddress: z.string().optional(),
    vaultContractAddress: z.string().optional(),
    chainflipNetwork: z.union([chainflipNetwork, z.literal('localnet')]),
    _: z.tuple([z.literal('swap')]),
  })
  .transform(({ destToken, srcToken, _, ...rest }) => {
    const destChainId = assetToNetworkMap[destToken];

    return {
      ...rest,
      destChainId,
      destTokenSymbol: destToken,
      ...(srcToken && { srcTokenSymbol: srcToken }),
    };
  });

const askForPrivateKey = async () => {
  const rl = createInterface({ input: process.stdin, output: process.stdout });

  try {
    return await rl.question("Please enter your wallet's private key: ");
  } finally {
    rl.close();
  }
};

export default async function cliExecuteSwap(args: unknown) {
  const {
    chainflipNetwork: cfNetwork,
    walletPrivateKey,
    vaultContractAddress,
    srcTokenContractAddress,
    ...validatedArgs
  } = argsSchema.parse(args);

  const privateKey = walletPrivateKey ?? (await askForPrivateKey());

  const ethNetwork = cfNetwork === 'mainnet' ? 'mainnet' : 'goerli';

  const wallet = new Wallet(privateKey).connect(
    process.env.ALCHEMY_KEY
      ? new providers.AlchemyProvider(ethNetwork, process.env.ALCHEMY_KEY)
      : getDefaultProvider(ethNetwork),
  );

  const txHash = await executeSwap(
    validatedArgs as ExecuteSwapParams,
    {
      cfNetwork,
      signer: wallet,
      vaultContractAddress,
      srcTokenContractAddress,
    } as ExecuteSwapOptions,
  );

  console.log(`Swap executed. Transaction hash: ${txHash}`);
}

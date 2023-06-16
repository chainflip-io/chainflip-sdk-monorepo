import { getDefaultProvider, providers, Wallet } from 'ethers';
import { z } from 'zod';
import { ChainId } from '@/sdk/swap/consts';
import {
  chainflipNetwork,
  SupportedAsset,
  supportedAsset,
} from '@/shared/enums';
import { numericString, hexString } from '@/shared/parsers';
import { executeSwap, ExecuteSwapParams } from '@/shared/vault';
import { ExecuteSwapOptions } from '@/shared/vault/executeSwap';
import { askForPrivateKey, getEthNetwork } from './utils';

const assetToNetworkMap: Record<SupportedAsset, ChainId> = {
  ETH: ChainId.Ethereum,
  FLIP: ChainId.Ethereum,
  USDC: ChainId.Ethereum,
  BTC: ChainId.Bitcoin,
  DOT: ChainId.Polkadot,
};

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
      srcToken: supportedAsset.optional(),
      destToken: supportedAsset,
      amount: z.union([numericString, hexString]),
      destAddress: z.string(),
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

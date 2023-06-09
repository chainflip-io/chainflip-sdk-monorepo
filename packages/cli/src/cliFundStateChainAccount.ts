import { ContractReceipt, Wallet, getDefaultProvider, providers } from 'ethers';
import { z } from 'zod';
import { FundStateChainAccountOptions } from '@/sdk/funding/stateChainGateway';
import { fundStateChainAccount } from './lib';
import { askForPrivateKey, signerSchema } from './utils';

const schema = z.intersection(
  signerSchema,
  z.object({
    accountId: z
      .string()
      .regex(/^0x[\da-f]+/i)
      .transform((x) => x as `0x${string}`),
    amount: z.string().regex(/^\d+$/),
    ethNetwork: z.string().optional(),
    stateChainManagerContractAddress: z.string().optional(),
  }),
);

export default async function cliFundStateChainAccount(
  args: unknown,
): Promise<ContractReceipt> {
  const {
    accountId,
    walletPrivateKey,
    chainflipNetwork,
    amount,
    ...validatedArgs
  } = schema.parse(args);

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

  return fundStateChainAccount(accountId, amount, {
    signer: wallet,
    network: chainflipNetwork,
    ...validatedArgs,
  } as FundStateChainAccountOptions);
}

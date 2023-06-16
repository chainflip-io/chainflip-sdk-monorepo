import { ContractReceipt, Wallet, getDefaultProvider, providers } from 'ethers';
import { z } from 'zod';
import {
  getStateChainGatewayContractAddress,
  getTokenContractAddress,
} from '@/shared/contracts';
import { chainflipNetwork } from '@/shared/enums';
import { FundStateChainAccountOptions } from '@/shared/stateChainGateway';
import { fundStateChainAccount } from './lib';
import { askForPrivateKey, getEthNetwork } from './utils';

const schema = z.intersection(
  z.union([
    z.object({
      chainflipNetwork: z.literal('localnet'),
      ethNetwork: z.string(),
      stateChainManagerContractAddress: z.string(),
      flipTokenContractAddress: z.string(),
    }),
    z.object({ chainflipNetwork }),
  ]),
  z.object({
    walletPrivateKey: z.string().optional(),
    accountId: z
      .string()
      .regex(/^0x[\da-f]+/i)
      .transform((x) => x as `0x${string}`),
    amount: z.string().regex(/^\d+$/),
  }),
);

export default async function cliFundStateChainAccount(
  unvalidatedArgs: unknown,
): Promise<ContractReceipt> {
  const { accountId, walletPrivateKey, amount, ...args } =
    schema.parse(unvalidatedArgs);

  const privateKey = walletPrivateKey ?? (await askForPrivateKey());

  const ethNetwork = getEthNetwork(args);

  const wallet = new Wallet(privateKey).connect(
    process.env.ALCHEMY_KEY
      ? new providers.AlchemyProvider(ethNetwork, process.env.ALCHEMY_KEY)
      : getDefaultProvider(ethNetwork),
  );

  const flipContractAddress =
    args.chainflipNetwork === 'localnet'
      ? args.flipTokenContractAddress
      : getTokenContractAddress('FLIP', args.chainflipNetwork);

  const stateChainGatewayContractAddress =
    args.chainflipNetwork === 'localnet'
      ? args.stateChainManagerContractAddress
      : getStateChainGatewayContractAddress(args.chainflipNetwork);

  const opts: FundStateChainAccountOptions =
    args.chainflipNetwork === 'localnet'
      ? {
          signer: wallet,
          cfNetwork: 'localnet',
          stateChainGatewayContractAddress,
          flipContractAddress,
        }
      : { cfNetwork: args.chainflipNetwork, signer: wallet };

  return fundStateChainAccount(accountId, amount, opts);
}

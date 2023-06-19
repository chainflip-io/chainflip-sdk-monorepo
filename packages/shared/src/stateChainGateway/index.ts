import type { BigNumber, ContractReceipt, Signer } from 'ethers';
import { StateChainGateway__factory } from '../abis';
import {
  getStateChainGatewayContractAddress,
  getTokenContractAddress,
  requestApproval,
} from '../contracts';
import { Assets, ChainflipNetwork } from '../enums';

type SignerOptions =
  | { network: ChainflipNetwork; signer: Signer }
  | {
      network: 'localnet';
      signer: Signer;
      stateChainGatewayContractAddress: string;
    };

type ExtendLocalnetOptions<T, U> = T extends { network: 'localnet' }
  ? T & U
  : T;

export type FundStateChainAccountOptions = ExtendLocalnetOptions<
  SignerOptions,
  { flipContractAddress: string }
>;

export const getStateChainGateway = (options: SignerOptions) => {
  const stateChainGatewayContractAddress =
    options.network === 'localnet'
      ? options.stateChainGatewayContractAddress
      : getStateChainGatewayContractAddress(options.network);

  return StateChainGateway__factory.connect(
    stateChainGatewayContractAddress,
    options.signer,
  );
};

export const fundStateChainAccount = async (
  accountId: `0x${string}`,
  amount: string,
  options: FundStateChainAccountOptions,
): Promise<ContractReceipt> => {
  const flipContractAddress =
    options.network === 'localnet'
      ? options.flipContractAddress
      : getTokenContractAddress(Assets.FLIP, options.network);

  const stateChainGateway = getStateChainGateway(options);

  await requestApproval(
    flipContractAddress,
    stateChainGateway.address,
    amount,
    options.signer,
  );

  const transaction = await stateChainGateway.fundStateChainAccount(
    accountId,
    amount,
  );

  return transaction.wait(1);
};

export const executeRedemption = async (
  accountId: `0x${string}`,
  options: SignerOptions,
): Promise<ContractReceipt> => {
  const stateChainGateway = getStateChainGateway(options);

  const transaction = await stateChainGateway.executeRedemption(accountId);

  return transaction.wait(1);
};

export const getMinimumFunding = (
  options: SignerOptions,
): Promise<BigNumber> => {
  const stateChainGateway = getStateChainGateway(options);

  return stateChainGateway.getMinimumFunding();
};

export const getRedemptionDelay = (options: SignerOptions): Promise<number> => {
  const stateChainGateway = getStateChainGateway(options);

  return stateChainGateway.REDEMPTION_DELAY();
};

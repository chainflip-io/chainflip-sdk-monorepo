import type { ContractTransactionReceipt, Signer } from 'ethers';
import { getStateChainGateway } from './utils';
import { checkAllowance, getTokenContractAddress } from '../contracts';
import { Assets, ChainflipNetwork } from '../enums';
import { assert } from '../guards';
import { Overrides } from '../vault/schemas';

type WithOverrides<T> = T & Overrides;

export type SignerOptions = WithOverrides<
  | { network: ChainflipNetwork; signer: Signer }
  | {
      network: 'localnet';
      signer: Signer;
      stateChainGatewayContractAddress: string;
    }
>;

type ExtendLocalnetOptions<T, U> = T extends { network: 'localnet' }
  ? T & U
  : T;

export type FundStateChainAccountOptions = ExtendLocalnetOptions<
  SignerOptions,
  { flipContractAddress: string }
>;

export const fundStateChainAccount = async (
  accountId: `0x${string}`,
  amount: string,
  options: FundStateChainAccountOptions,
): Promise<ContractTransactionReceipt> => {
  const flipContractAddress =
    options.network === 'localnet'
      ? options.flipContractAddress
      : getTokenContractAddress(Assets.FLIP, options.network);

  const stateChainGateway = getStateChainGateway(options);

  const { isAllowable } = await checkAllowance(
    amount,
    await stateChainGateway.getAddress(),
    flipContractAddress,
    options.signer,
  );
  assert(isAllowable, 'Insufficient allowance');

  const transaction = await stateChainGateway.fundStateChainAccount(
    accountId,
    amount,
    { nonce: options.nonce },
  );

  return transaction.wait(1) as Promise<ContractTransactionReceipt>;
};

export const executeRedemption = async (
  accountId: `0x${string}`,
  options: WithOverrides<SignerOptions>,
): Promise<ContractTransactionReceipt> => {
  const stateChainGateway = getStateChainGateway(options);

  const transaction = await stateChainGateway.executeRedemption(
    accountId,
    options,
  );

  return transaction.wait(1) as Promise<ContractTransactionReceipt>;
};

export const getMinimumFunding = (options: SignerOptions): Promise<bigint> => {
  const stateChainGateway = getStateChainGateway(options);

  return stateChainGateway.getMinimumFunding();
};

export const getRedemptionDelay = (options: SignerOptions): Promise<bigint> => {
  const stateChainGateway = getStateChainGateway(options);

  return stateChainGateway.REDEMPTION_DELAY();
};

export * from './approval';

import type { BigNumber, ContractReceipt, Signer } from 'ethers';
import { getStateChainGateway } from './utils';
import {
  checkAllowance,
  extractOverrides,
  getTokenContractAddress,
  TransactionOptions,
} from '../contracts';
import { Assets, ChainflipNetwork } from '../enums';
import { assert } from '../guards';

export type FundingNetworkOptions =
  | { network: ChainflipNetwork; signer: Signer }
  | {
      network: 'localnet';
      signer: Signer;
      stateChainGatewayContractAddress: string;
      flipContractAddress: string;
    };

export const fundStateChainAccount = async (
  accountId: `0x${string}`,
  amount: string,
  networkOpts: FundingNetworkOptions,
  txOpts: TransactionOptions,
): Promise<ContractReceipt> => {
  const flipContractAddress =
    networkOpts.network === 'localnet'
      ? networkOpts.flipContractAddress
      : getTokenContractAddress(Assets.FLIP, networkOpts.network);

  const stateChainGateway = getStateChainGateway(networkOpts);

  const { isAllowable } = await checkAllowance(
    amount,
    stateChainGateway.address,
    flipContractAddress,
    networkOpts.signer,
  );
  assert(isAllowable, 'Insufficient allowance');

  const transaction = await stateChainGateway.fundStateChainAccount(
    accountId,
    amount,
    extractOverrides(txOpts),
  );

  return transaction.wait(txOpts.wait);
};

export const executeRedemption = async (
  accountId: `0x${string}`,
  networkOpts: FundingNetworkOptions,
  txOpts: TransactionOptions,
): Promise<ContractReceipt> => {
  const stateChainGateway = getStateChainGateway(networkOpts);

  const transaction = await stateChainGateway.executeRedemption(
    accountId,
    extractOverrides(txOpts),
  );

  return transaction.wait(txOpts.wait);
};

export const getMinimumFunding = (
  networkOpts: FundingNetworkOptions,
): Promise<BigNumber> => {
  const stateChainGateway = getStateChainGateway(networkOpts);

  return stateChainGateway.getMinimumFunding();
};

export const getRedemptionDelay = (
  networkOpts: FundingNetworkOptions,
): Promise<number> => {
  const stateChainGateway = getStateChainGateway(networkOpts);

  return stateChainGateway.REDEMPTION_DELAY();
};

export * from './approval';

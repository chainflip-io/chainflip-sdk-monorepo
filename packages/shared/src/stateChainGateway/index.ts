import { ChainflipNetwork } from '@chainflip/utils/chainflip';
import { ContractTransactionResponse, Signer } from 'ethers';
import { getStateChainGateway } from './utils.js';
import {
  checkAllowance,
  extractOverrides,
  getFlipContractAddress,
  TransactionOptions,
} from '../contracts.js';
import { assert } from '../guards.js';

export type FundingNetworkOptions =
  | { network: ChainflipNetwork; signer: Signer }
  | {
      network: 'localnet';
      signer: Signer;
      stateChainGatewayContractAddress: string;
      flipContractAddress: string;
    };

export type PendingRedemption = {
  amount: bigint;
  redeemAddress: string;
  startTime: bigint;
  expiryTime: bigint;
};

export const fundStateChainAccount = async (
  accountId: `0x${string}`,
  amount: bigint,
  networkOpts: FundingNetworkOptions,
  txOpts: TransactionOptions,
): Promise<ContractTransactionResponse> => {
  const flipContractAddress =
    networkOpts.network === 'localnet'
      ? networkOpts.flipContractAddress
      : getFlipContractAddress(networkOpts.network);

  const stateChainGateway = getStateChainGateway(networkOpts);

  const { hasSufficientAllowance } = await checkAllowance(
    amount,
    await stateChainGateway.getAddress(),
    flipContractAddress,
    networkOpts.signer,
  );
  assert(hasSufficientAllowance, 'Insufficient allowance');

  const transaction = await stateChainGateway.fundStateChainAccount(
    accountId,
    amount,
    extractOverrides(txOpts),
  );
  await transaction.wait(txOpts.wait);

  return transaction;
};

export const executeRedemption = async (
  accountId: `0x${string}`,
  networkOpts: FundingNetworkOptions,
  txOpts: TransactionOptions,
): Promise<ContractTransactionResponse> => {
  const stateChainGateway = getStateChainGateway(networkOpts);

  const transaction = await stateChainGateway.executeRedemption(
    accountId,
    extractOverrides(txOpts),
  );
  await transaction.wait(txOpts.wait);

  return transaction;
};

export const getMinimumFunding = (networkOpts: FundingNetworkOptions): Promise<bigint> => {
  const stateChainGateway = getStateChainGateway(networkOpts);

  return stateChainGateway.getMinimumFunding();
};

export const getRedemptionDelay = (networkOpts: FundingNetworkOptions): Promise<bigint> => {
  const stateChainGateway = getStateChainGateway(networkOpts);

  return stateChainGateway.REDEMPTION_DELAY();
};

export const getPendingRedemption = async (
  accountId: `0x${string}`,
  networkOpts: FundingNetworkOptions,
): Promise<PendingRedemption | undefined> => {
  const stateChainGateway = getStateChainGateway(networkOpts);
  const pendingRedemption = await stateChainGateway.getPendingRedemption(accountId);

  // there is no null in solidity, therefore we compare against the initial value to determine if the value is set:
  // https://www.wtf.academy/en/solidity-start/InitialValue/
  return pendingRedemption.amount !== 0n
    ? stateChainGateway.getPendingRedemption(accountId)
    : undefined;
};

export * from './approval.js';

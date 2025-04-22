import { ContractTransactionResponse } from 'ethers';
import {
  checkAllowance,
  getStateChainGatewayContractAddress,
  approve,
  TransactionOptions,
  getFlipContractAddress,
} from '../contracts.js';
import { FundingNetworkOptions } from './index.js';

export const checkStateChainGatewayAllowance = async (
  amount: bigint,
  networkOpts: FundingNetworkOptions,
): ReturnType<typeof checkAllowance> => {
  const flipContractAddress =
    networkOpts.network === 'localnet'
      ? networkOpts.flipContractAddress
      : getFlipContractAddress(networkOpts.network);

  const stateChainGatewayContractAddress =
    networkOpts.network === 'localnet'
      ? networkOpts.stateChainGatewayContractAddress
      : getStateChainGatewayContractAddress(networkOpts.network);

  return checkAllowance(
    amount,
    stateChainGatewayContractAddress,
    flipContractAddress,
    networkOpts.signer,
  );
};

export const approveStateChainGateway = async (
  amount: bigint,
  networkOpts: FundingNetworkOptions,
  txOpts: TransactionOptions,
): Promise<ContractTransactionResponse | null> => {
  const { allowance, erc20, hasSufficientAllowance } = await checkStateChainGatewayAllowance(
    amount,
    networkOpts,
  );

  if (hasSufficientAllowance) return null;

  const stateChainGatewayContractAddress =
    networkOpts.network === 'localnet'
      ? networkOpts.stateChainGatewayContractAddress
      : getStateChainGatewayContractAddress(networkOpts.network);

  return approve(amount, stateChainGatewayContractAddress, erc20, allowance, txOpts);
};

import { ContractTransactionReceipt } from 'ethers';
import {
  checkAllowance,
  getStateChainGatewayContractAddress,
  getTokenContractAddress,
  approve,
  TransactionOptions,
} from '../contracts';
import { InternalAssets } from '../enums';
import { FundingNetworkOptions } from './index';

export const checkStateChainGatewayAllowance = async (
  amount: bigint,
  networkOpts: FundingNetworkOptions,
): ReturnType<typeof checkAllowance> => {
  const flipContractAddress =
    networkOpts.network === 'localnet'
      ? networkOpts.flipContractAddress
      : getTokenContractAddress(InternalAssets.Flip, networkOpts.network);

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
): Promise<ContractTransactionReceipt | null> => {
  const { allowance, erc20, hasSufficientAllowance } =
    await checkStateChainGatewayAllowance(amount, networkOpts);

  if (hasSufficientAllowance) return null;

  const stateChainGatewayContractAddress =
    networkOpts.network === 'localnet'
      ? networkOpts.stateChainGatewayContractAddress
      : getStateChainGatewayContractAddress(networkOpts.network);

  return approve(
    amount,
    stateChainGatewayContractAddress,
    erc20,
    allowance,
    txOpts,
  );
};

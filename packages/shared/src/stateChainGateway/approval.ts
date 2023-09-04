import { ContractReceipt } from 'ethers';
import {
  checkAllowance,
  getStateChainGatewayContractAddress,
  getTokenContractAddress,
  approve,
  TransactionOptions,
} from '../contracts';
import { Assets } from '../enums';
import { FundingNetworkOptions } from './index';

export const checkStateChainGatewayAllowance = async (
  amount: bigint | string | number,
  options: FundingNetworkOptions,
): ReturnType<typeof checkAllowance> => {
  const flipContractAddress =
    options.network === 'localnet'
      ? options.flipContractAddress
      : getTokenContractAddress(Assets.FLIP, options.network);

  const stateChainGatewayContractAddress =
    options.network === 'localnet'
      ? options.stateChainGatewayContractAddress
      : getStateChainGatewayContractAddress(options.network);

  return checkAllowance(
    amount,
    stateChainGatewayContractAddress,
    flipContractAddress,
    options.signer,
  );
};

export const approveStateChainGateway = async (
  amount: bigint | string | number,
  options: FundingNetworkOptions,
  txOpts: TransactionOptions,
): Promise<ContractReceipt | null> => {
  const { allowance, erc20, isAllowable } =
    await checkStateChainGatewayAllowance(amount, options);

  if (isAllowable) return null;

  const stateChainGatewayContractAddress =
    options.network === 'localnet'
      ? options.stateChainGatewayContractAddress
      : getStateChainGatewayContractAddress(options.network);

  return approve(
    amount,
    stateChainGatewayContractAddress,
    erc20,
    allowance,
    txOpts,
  );
};

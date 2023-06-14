import type { BigNumber, ContractReceipt, Signer } from 'ethers';
import { StateChainGateway__factory } from '../abis';
import {
  getStateChainGatewayContractAddress,
  getTokenContractAddress,
  requestApproval,
} from '../contracts';
import { ChainflipNetwork } from '../enums';
import { assert } from '../guards';

export type FundStateChainAccountOptions =
  | { network: ChainflipNetwork; signer: Signer }
  | {
      network: 'localnet';
      signer: Signer;
      stateChainGatewayContractAddress: string;
      flipContractAddress: string;
    };

export const getStateChainGateway = (options: ExecuteRedpemptionOptions) => {
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
      : getTokenContractAddress('FLIP', options.network);

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

  const receipt = await transaction.wait(1);

  assert(receipt.status !== 0, 'Transaction failed');

  return receipt;
};

type ExecuteRedpemptionOptions =
  | { network: ChainflipNetwork; signer: Signer }
  | {
      network: 'localnet';
      signer: Signer;
      stateChainGatewayContractAddress: string;
    };

export const executeRedemption = async (
  accountId: `0x${string}`,
  options: ExecuteRedpemptionOptions,
): Promise<ContractReceipt> => {
  const stateChainGateway = getStateChainGateway(options);

  const transaction = await stateChainGateway.executeRedemption(accountId);

  const receipt = await transaction.wait(1);

  assert(receipt.status !== 0, 'Redemption failed');

  return receipt;
};

export const getMinimumFunding = (
  options: ExecuteRedpemptionOptions,
): Promise<BigNumber> => {
  const stateChainGateway = getStateChainGateway(options);

  return stateChainGateway.getMinimumFunding();
};

export const getRedemptionDelay = (
  options: ExecuteRedpemptionOptions,
): Promise<number> => {
  const stateChainGateway = getStateChainGateway(options);

  return stateChainGateway.REDEMPTION_DELAY();
};

import type { ContractReceipt, Signer } from 'ethers';
import { StateChainGateway__factory } from '../abis';
import {
  getStateChainManagerContractAddress,
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
      stateChainManagerContractAddress: string;
      flipContractAddress: string;
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

  const stateChainManagerContractAddress =
    options.network === 'localnet'
      ? options.stateChainManagerContractAddress
      : getStateChainManagerContractAddress(options.network);

  await requestApproval(
    flipContractAddress,
    stateChainManagerContractAddress,
    amount,
    options.signer,
  );

  const stateChainManager = StateChainGateway__factory.connect(
    stateChainManagerContractAddress,
    options.signer,
  );

  const transaction = await stateChainManager.fundStateChainAccount(
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
      stateChainManagerContractAddress: string;
    };

export const executeRedemption = async (
  accountId: `0x${string}`,
  options: ExecuteRedpemptionOptions,
) => {
  const stateChainManagerContractAddress =
    options.network === 'localnet'
      ? options.stateChainManagerContractAddress
      : getStateChainManagerContractAddress(options.network);

  const stateChainManager = StateChainGateway__factory.connect(
    stateChainManagerContractAddress,
    options.signer,
  );

  const transaction = await stateChainManager.executeRedemption(accountId);

  const receipt = await transaction.wait(1);

  assert(receipt.status !== 0, 'Redemption failed');

  return receipt;
};

import type { ContractReceipt, Signer } from 'ethers';
import { StateChainGateway__factory } from '@/shared/contracts';
import { ChainflipNetwork } from '@/shared/enums';
import {
  getStateChainManagerContractAddress,
  getTokenContractAddress,
  requestApproval,
} from '@/shared/erc20';
import { assert } from '@/shared/guards';

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

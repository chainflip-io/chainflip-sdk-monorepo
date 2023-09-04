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
  opts: FundingNetworkOptions,
  txOpts: TransactionOptions,
): Promise<ContractReceipt> => {
  const flipContractAddress =
    opts.network === 'localnet'
      ? opts.flipContractAddress
      : getTokenContractAddress(Assets.FLIP, opts.network);

  const stateChainGateway = getStateChainGateway(opts);

  const { isAllowable } = await checkAllowance(
    amount,
    stateChainGateway.address,
    flipContractAddress,
    opts.signer,
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
  opts: FundingNetworkOptions,
  txOpts: TransactionOptions,
): Promise<ContractReceipt> => {
  const stateChainGateway = getStateChainGateway(opts);

  const transaction = await stateChainGateway.executeRedemption(
    accountId,
    extractOverrides(txOpts),
  );

  return transaction.wait(txOpts.wait);
};

export const getMinimumFunding = (
  opts: FundingNetworkOptions,
): Promise<BigNumber> => {
  const stateChainGateway = getStateChainGateway(opts);

  return stateChainGateway.getMinimumFunding();
};

export const getRedemptionDelay = (
  opts: FundingNetworkOptions,
): Promise<number> => {
  const stateChainGateway = getStateChainGateway(opts);

  return stateChainGateway.REDEMPTION_DELAY();
};

export * from './approval';

import { ContractReceipt } from 'ethers';
import { TokenSwapParams } from './schemas';
import {
  checkAllowance,
  getTokenContractAddress,
  getVaultManagerContractAddress,
  approve,
  TransactionOptions,
} from '../contracts';
import { assert } from '../guards';
import { SwapNetworkOptions } from './index';

export const checkVaultAllowance = (
  params: Pick<TokenSwapParams, 'srcAsset' | 'amount'>,
  opts: SwapNetworkOptions,
): ReturnType<typeof checkAllowance> => {
  const erc20Address =
    opts.network === 'localnet'
      ? opts.srcTokenContractAddress
      : getTokenContractAddress(params.srcAsset, opts.network);

  assert(erc20Address !== undefined, 'Missing ERC20 contract address');

  const vaultContractAddress =
    opts.network === 'localnet'
      ? opts.vaultContractAddress
      : getVaultManagerContractAddress(opts.network);

  return checkAllowance(
    params.amount,
    vaultContractAddress,
    erc20Address,
    opts.signer,
  );
};

export const approveVault = async (
  params: Pick<TokenSwapParams, 'srcAsset' | 'amount'>,
  opts: SwapNetworkOptions,
  txOpts: TransactionOptions,
): Promise<ContractReceipt | null> => {
  const { isAllowable, erc20, allowance } = await checkVaultAllowance(
    params,
    opts,
  );

  if (isAllowable) return null;

  const vaultContractAddress =
    opts.network === 'localnet'
      ? opts.vaultContractAddress
      : getVaultManagerContractAddress(opts.network);

  return approve(params.amount, vaultContractAddress, erc20, allowance, txOpts);
};

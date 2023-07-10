import { ContractReceipt } from 'ethers';
import {
  checkAllowance,
  getTokenContractAddress,
  getVaultManagerContractAddress,
  approve,
} from '../contracts';
import { assert } from '../guards';
import { ExecuteSwapOptions } from './executeSwap';
import { TokenSwapParams } from './validators';

export const checkVaultAllowance = (
  params: TokenSwapParams,
  opts: ExecuteSwapOptions,
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
  params: TokenSwapParams,
  opts: ExecuteSwapOptions,
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

  return approve(
    params.amount,
    vaultContractAddress,
    erc20,
    allowance,
    opts.nonce,
  );
};

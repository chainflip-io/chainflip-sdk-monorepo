import { ContractTransactionReceipt } from 'ethers';
import {
  checkAllowance,
  getTokenContractAddress,
  getVaultContractAddress,
  approve,
  TransactionOptions,
} from '../contracts';
import { getInternalAsset } from '../enums';
import { assertSignerIsConnectedToChain } from '../evm';
import { assert } from '../guards';
import { ExecuteSwapParams, SwapNetworkOptions } from './index';

export const checkVaultAllowance = (
  params: Pick<ExecuteSwapParams, 'srcChain' | 'srcAsset' | 'amount'>,
  networkOpts: SwapNetworkOptions,
): ReturnType<typeof checkAllowance> => {
  const erc20Address =
    networkOpts.network === 'localnet'
      ? networkOpts.srcTokenContractAddress
      : getTokenContractAddress(
          getInternalAsset({ chain: params.srcChain, asset: params.srcAsset }),
          networkOpts.network,
        );

  assert(erc20Address !== undefined, 'Missing ERC20 contract address');

  const vaultContractAddress =
    networkOpts.network === 'localnet'
      ? networkOpts.vaultContractAddress
      : getVaultContractAddress(params.srcChain, networkOpts.network);

  return checkAllowance(
    BigInt(params.amount),
    vaultContractAddress,
    erc20Address,
    networkOpts.signer,
  );
};

export const approveVault = async (
  params: Pick<ExecuteSwapParams, 'srcChain' | 'srcAsset' | 'amount'>,
  networkOpts: SwapNetworkOptions,
  txOpts: TransactionOptions,
): Promise<ContractTransactionReceipt | null> => {
  await assertSignerIsConnectedToChain(networkOpts, params.srcChain);

  const { hasSufficientAllowance, erc20, allowance } = await checkVaultAllowance(
    params,
    networkOpts,
  );

  if (hasSufficientAllowance) return null;

  const vaultContractAddress =
    networkOpts.network === 'localnet'
      ? networkOpts.vaultContractAddress
      : getVaultContractAddress(params.srcChain, networkOpts.network);

  return approve(BigInt(params.amount), vaultContractAddress, erc20, allowance, txOpts);
};

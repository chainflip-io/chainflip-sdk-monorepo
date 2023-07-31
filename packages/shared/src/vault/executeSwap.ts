import { ContractReceipt } from 'ethers';
import { Vault__factory } from '../abis';
import {
  checkAllowance,
  getTokenContractAddress,
  getVaultManagerContractAddress,
} from '../contracts';
import { assetContractIds, chainContractIds } from '../enums';
import { assert, isTokenSwap } from '../guards';
import {
  executeOptionsSchema,
  type ExecuteOptions,
  type ExecuteSwapParams,
  executeSwapParamsSchema,
  type NativeSwapParams,
  type TokenSwapParams,
} from './schemas';

const swapNative = async (
  { destChain, destAsset, destAddress, amount }: NativeSwapParams,
  { network, vaultContractAddress: address, signer, ...opts }: ExecuteOptions,
): Promise<ContractReceipt> => {
  const vaultContractAddress =
    network === 'localnet' ? address : getVaultManagerContractAddress(network);

  const vault = Vault__factory.connect(vaultContractAddress, signer);

  const transaction = await vault.xSwapNative(
    chainContractIds[destChain],
    destAddress,
    assetContractIds[destAsset],
    [],
    { value: amount, ...opts },
  );

  return transaction.wait(1);
};

const swapToken = async (
  params: TokenSwapParams,
  {
    network,
    vaultContractAddress: vaultAddress,
    srcTokenContractAddress: tokenAddress,
    signer,
    ...opts
  }: ExecuteOptions,
): Promise<ContractReceipt> => {
  const vaultContractAddress =
    network === 'localnet'
      ? vaultAddress
      : getVaultManagerContractAddress(network);

  const erc20Address =
    network === 'localnet'
      ? tokenAddress
      : getTokenContractAddress(params.srcAsset, network);

  assert(erc20Address !== undefined, 'Missing ERC20 contract address');

  const { isAllowable } = await checkAllowance(
    params.amount,
    vaultContractAddress,
    erc20Address,
    signer,
  );
  assert(isAllowable, 'Swap amount exceeds allowance');

  const vault = Vault__factory.connect(vaultContractAddress, signer);

  const transaction = await vault.xSwapToken(
    chainContractIds[params.destChain],
    params.destAddress,
    assetContractIds[params.destAsset],
    erc20Address,
    params.amount,
    [],
    opts,
  );

  return transaction.wait(1);
};

const executeSwap = async (
  params: ExecuteSwapParams,
  options: ExecuteOptions,
): Promise<ContractReceipt> => {
  const parsedParams = executeSwapParamsSchema.parse(params);
  const opts = executeOptionsSchema.parse(options);

  return isTokenSwap(parsedParams)
    ? swapToken(parsedParams, opts)
    : swapNative(parsedParams, opts);
};

export default executeSwap;

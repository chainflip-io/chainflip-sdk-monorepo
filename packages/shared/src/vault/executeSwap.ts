import { ContractReceipt } from 'ethers';
import { Vault__factory } from '../abis';
import {
  checkAllowance,
  getTokenContractAddress,
  getVaultManagerContractAddress,
} from '../contracts';
import { assetContractIds, chainContractIds } from '../enums';
import { assert, isNotNullish, isTokenCall, isTokenSwap } from '../guards';
import {
  executeOptionsSchema,
  type ExecuteOptions,
  type ExecuteSwapParams,
  executeSwapParamsSchema,
  type NativeSwapParams,
  type TokenSwapParams,
  NativeCallParams,
  TokenCallParams,
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

const callNative = async (
  params: NativeCallParams,
  {
    network,
    vaultContractAddress: vaultAddress,
    signer,
    ...opts
  }: ExecuteOptions,
): Promise<ContractReceipt> => {
  const vaultContractAddress =
    network === 'localnet'
      ? vaultAddress
      : getVaultManagerContractAddress(network);

  const vault = Vault__factory.connect(vaultContractAddress, signer);

  const transaction = await vault.xCallNative(
    chainContractIds[params.destChain],
    params.destAddress,
    assetContractIds[params.destAsset],
    params.ccmMetadata.message,
    params.ccmMetadata.gasBudget,
    [],
    { value: params.amount, ...opts },
  );

  return transaction.wait(1);
};

const callToken = async (
  params: TokenCallParams,
  {
    signer,
    network,
    vaultContractAddress: vaultAddress,
    srcTokenContractAddress: tokenAddress,
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

  const transaction = await vault.xCallToken(
    chainContractIds[params.destChain],
    params.destAddress,
    assetContractIds[params.destAsset],
    params.ccmMetadata.message,
    params.ccmMetadata.gasBudget,
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

  if ('ccmMetadata' in parsedParams && isNotNullish(parsedParams.ccmMetadata)) {
    assert(parsedParams.ccmMetadata.message, 'message cannot be empty');
    assert(parsedParams.ccmMetadata.gasBudget, 'gasBudget cannot be empty');

    return isTokenCall(parsedParams)
      ? callToken(parsedParams, opts)
      : callNative(parsedParams, opts);
  }

  return isTokenSwap(parsedParams)
    ? swapToken(parsedParams, opts)
    : swapNative(parsedParams, opts);
};

export default executeSwap;

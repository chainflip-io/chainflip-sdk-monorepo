import { ContractTransactionReceipt } from 'ethers';
import {
  type ExecuteSwapParams,
  executeSwapParamsSchema,
  type NativeSwapParams,
  type TokenSwapParams,
  NativeCallParams,
  TokenCallParams,
} from './schemas';
import { Vault__factory } from '../abis';
import {
  checkAllowance,
  extractOverrides,
  getTokenContractAddress,
  getVaultManagerContractAddress,
  TransactionOptions,
} from '../contracts';
import { assetConstants, chainConstants, getInternalAsset } from '../enums';
import { assert, isTokenCall, isTokenSwap } from '../guards';
import { SwapNetworkOptions } from './index';

const swapNative = async (
  { destChain, destAsset, destAddress, amount }: NativeSwapParams,
  networkOpts: SwapNetworkOptions,
  txOpts: TransactionOptions,
): Promise<ContractTransactionReceipt> => {
  const internalDestAsset = getInternalAsset({
    chain: destChain,
    asset: destAsset,
  });

  const vaultContractAddress =
    networkOpts.network === 'localnet'
      ? networkOpts.vaultContractAddress
      : getVaultManagerContractAddress(networkOpts.network);

  const vault = Vault__factory.connect(
    vaultContractAddress,
    networkOpts.signer,
  );

  const transaction = await vault.xSwapNative(
    chainConstants[destChain].contractId,
    destAddress,
    assetConstants[internalDestAsset].contractId,
    '0x',
    { value: amount, ...extractOverrides(txOpts) },
  );

  return transaction.wait(txOpts.wait) as Promise<ContractTransactionReceipt>;
};

const swapToken = async (
  params: TokenSwapParams,
  networkOpts: SwapNetworkOptions,
  txOpts: TransactionOptions,
): Promise<ContractTransactionReceipt> => {
  const internalSrcAsset = getInternalAsset({
    chain: params.srcChain,
    asset: params.srcAsset,
  });
  const internalDestAsset = getInternalAsset({
    chain: params.destChain,
    asset: params.destAsset,
  });

  const vaultContractAddress =
    networkOpts.network === 'localnet'
      ? networkOpts.vaultContractAddress
      : getVaultManagerContractAddress(networkOpts.network);

  const erc20Address =
    networkOpts.network === 'localnet'
      ? networkOpts.srcTokenContractAddress
      : getTokenContractAddress(internalSrcAsset, networkOpts.network);

  assert(erc20Address !== undefined, 'Missing ERC20 contract address');

  const { isAllowable } = await checkAllowance(
    BigInt(params.amount),
    vaultContractAddress,
    erc20Address,
    networkOpts.signer,
  );
  assert(isAllowable, 'Swap amount exceeds allowance');

  const vault = Vault__factory.connect(
    vaultContractAddress,
    networkOpts.signer,
  );

  const transaction = await vault.xSwapToken(
    chainConstants[params.destChain].contractId,
    params.destAddress,
    assetConstants[internalDestAsset].contractId,
    erc20Address,
    params.amount,
    '0x',
    extractOverrides(txOpts),
  );

  return transaction.wait(txOpts.wait) as Promise<ContractTransactionReceipt>;
};

const callNative = async (
  params: NativeCallParams,
  networkOpts: SwapNetworkOptions,
  txOpts: TransactionOptions,
): Promise<ContractTransactionReceipt> => {
  const internalDestAsset = getInternalAsset({
    chain: params.destChain,
    asset: params.destAsset,
  });

  const vaultContractAddress =
    networkOpts.network === 'localnet'
      ? networkOpts.vaultContractAddress
      : getVaultManagerContractAddress(networkOpts.network);

  const vault = Vault__factory.connect(
    vaultContractAddress,
    networkOpts.signer,
  );

  const transaction = await vault.xCallNative(
    chainConstants[params.destChain].contractId,
    params.destAddress,
    assetConstants[internalDestAsset].contractId,
    params.ccmMetadata.message,
    params.ccmMetadata.gasBudget,
    '0x',
    { value: params.amount, ...extractOverrides(txOpts) },
  );

  return transaction.wait(txOpts.wait) as Promise<ContractTransactionReceipt>;
};

const callToken = async (
  params: TokenCallParams,
  networkOpts: SwapNetworkOptions,
  txOpts: TransactionOptions,
): Promise<ContractTransactionReceipt> => {
  const internalSrcAsset = getInternalAsset({
    chain: params.srcChain,
    asset: params.srcAsset,
  });
  const internalDestAsset = getInternalAsset({
    chain: params.destChain,
    asset: params.destAsset,
  });

  const vaultContractAddress =
    networkOpts.network === 'localnet'
      ? networkOpts.vaultContractAddress
      : getVaultManagerContractAddress(networkOpts.network);

  const erc20Address =
    networkOpts.network === 'localnet'
      ? networkOpts.srcTokenContractAddress
      : getTokenContractAddress(internalSrcAsset, networkOpts.network);

  assert(erc20Address !== undefined, 'Missing ERC20 contract address');

  const { isAllowable } = await checkAllowance(
    BigInt(params.amount),
    vaultContractAddress,
    erc20Address,
    networkOpts.signer,
  );
  assert(isAllowable, 'Swap amount exceeds allowance');

  const vault = Vault__factory.connect(
    vaultContractAddress,
    networkOpts.signer,
  );

  const transaction = await vault.xCallToken(
    chainConstants[params.destChain].contractId,
    params.destAddress,
    assetConstants[internalDestAsset].contractId,
    params.ccmMetadata.message,
    params.ccmMetadata.gasBudget,
    erc20Address,
    params.amount,
    '0x',
    extractOverrides(txOpts),
  );

  return transaction.wait(txOpts.wait) as Promise<ContractTransactionReceipt>;
};

const executeSwap = async (
  params: ExecuteSwapParams,
  networkOpts: SwapNetworkOptions,
  txOpts: TransactionOptions,
): Promise<ContractTransactionReceipt> => {
  const network =
    networkOpts.network === 'localnet' ? 'backspin' : networkOpts.network;
  const parsedParams = executeSwapParamsSchema(network).parse(params);

  if ('ccmMetadata' in parsedParams) {
    return isTokenCall(parsedParams)
      ? callToken(parsedParams, networkOpts, txOpts)
      : callNative(parsedParams, networkOpts, txOpts);
  }

  return isTokenSwap(parsedParams)
    ? swapToken(parsedParams, networkOpts, txOpts)
    : swapNative(parsedParams, networkOpts, txOpts);
};

export default executeSwap;

import { ContractReceipt } from 'ethers';
import { Vault__factory } from '../abis';
import {
  checkAllowance,
  getTokenContractAddress,
  getVaultManagerContractAddress,
} from '../contracts';
import { assetContractIds, chainContractIds } from '../enums';
import { assert, isTokenCall } from '../guards';
import {
  type ExecuteCallParams,
  executeOptionsSchema,
  type ExecuteOptions,
  executeCallParamsSchema,
  type TokenCallParams,
  type NativeCallParams,
} from './schemas';

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
    params.message,
    params.gasBudget,
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
    params.message,
    params.gasBudget,
    erc20Address,
    params.amount,
    [],
    opts,
  );

  return transaction.wait(1);
};

const executeCall = async (
  params: ExecuteCallParams,
  options: ExecuteOptions,
): Promise<ContractReceipt> => {
  const parsedParams = executeCallParamsSchema.parse(params);
  const opts = executeOptionsSchema.parse(options);

  return isTokenCall(parsedParams)
    ? callToken(parsedParams, opts)
    : callNative(parsedParams, opts);
};

export default executeCall;

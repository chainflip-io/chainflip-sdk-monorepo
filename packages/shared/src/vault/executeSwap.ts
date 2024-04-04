import { u8aToHex } from '@polkadot/util';
import { decodeAddress } from '@polkadot/util-crypto';
import { ContractTransactionReceipt } from 'ethers';
import { Vault__factory } from '../abis';
import {
  checkAllowance,
  extractOverrides,
  getTokenContractAddress,
  getVaultContractAddress,
  TransactionOptions,
} from '../contracts';
import {
  assetConstants,
  Chain,
  chainConstants,
  Chains,
  getInternalAsset,
  InternalAsset,
} from '../enums';
import { assertIsEvmChain, assertSignerIsConnectedToChain } from '../evm';
import { assert } from '../guards';
import { dotAddress } from '../parsers';
import { ccmMetadataSchema } from '../schemas';
import { Required } from '../types';
import { assertValidAddress } from '../validation/addressValidation';
import { ExecuteSwapParams, SwapNetworkOptions } from './index';

const encodeAddress = (chain: Chain, address: string) => {
  if (chain === Chains.Polkadot) return u8aToHex(decodeAddress(dotAddress.parse(address)));
  if (chain === Chains.Bitcoin) return `0x${Buffer.from(address).toString('hex')}`;
  if (chain === Chains.Ethereum || chain === Chains.Arbitrum) return address;

  // no fallback encoding to prevent submitting txs with wrongly encoded addresses for new chains
  throw new Error(`cannot encode address for chain ${chain}`);
};

export const assertIsValidSwap = (params: ExecuteSwapParams) => {
  const internalSrcAsset = getInternalAsset({
    chain: params.srcChain,
    asset: params.srcAsset,
  });
  const internalDestAsset = getInternalAsset({
    chain: params.destChain,
    asset: params.destAsset,
  });

  assert(
    internalSrcAsset !== internalDestAsset,
    `source asset and destination asset cannot be the same`,
  );
};

const getVaultContract = (chain: Chain, networkOpts: SwapNetworkOptions) => {
  const vaultContractAddress =
    networkOpts.network === 'localnet'
      ? networkOpts.vaultContractAddress
      : getVaultContractAddress(chain, networkOpts.network);

  return {
    vaultContract: Vault__factory.connect(vaultContractAddress, networkOpts.signer),
    vaultAddress: vaultContractAddress,
  };
};

const getErc20Address = (asset: InternalAsset, networkOpts: SwapNetworkOptions) => {
  const erc20Address =
    networkOpts.network === 'localnet'
      ? networkOpts.srcTokenContractAddress
      : getTokenContractAddress(asset, networkOpts.network);

  assert(erc20Address !== undefined, `Missing ERC20 contract address for ${asset}`);

  return erc20Address;
};

const swapNative = async (
  params: ExecuteSwapParams & { ccmMetadata?: undefined },
  networkOpts: SwapNetworkOptions,
  txOpts: TransactionOptions,
): Promise<ContractTransactionReceipt> => {
  const internalDestAsset = getInternalAsset({
    chain: params.destChain,
    asset: params.destAsset,
  });
  const { vaultContract: vault } = getVaultContract(params.srcChain, networkOpts);

  const transaction = await vault.xSwapNative(
    chainConstants[params.destChain].contractId,
    encodeAddress(params.destChain, params.destAddress),
    assetConstants[internalDestAsset].contractId,
    '0x',
    { value: params.amount, ...extractOverrides(txOpts) },
  );

  return transaction.wait(txOpts.wait) as Promise<ContractTransactionReceipt>;
};

const swapToken = async (
  params: ExecuteSwapParams & { ccmMetadata?: undefined },
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
  const { vaultContract: vault, vaultAddress } = getVaultContract(params.srcChain, networkOpts);
  const erc20Address = getErc20Address(internalSrcAsset, networkOpts);

  const { hasSufficientAllowance } = await checkAllowance(
    BigInt(params.amount),
    vaultAddress,
    erc20Address,
    networkOpts.signer,
  );
  assert(hasSufficientAllowance, 'Swap amount exceeds allowance');

  const transaction = await vault.xSwapToken(
    chainConstants[params.destChain].contractId,
    encodeAddress(params.destChain, params.destAddress),
    assetConstants[internalDestAsset].contractId,
    erc20Address,
    params.amount,
    '0x',
    extractOverrides(txOpts),
  );

  return transaction.wait(txOpts.wait) as Promise<ContractTransactionReceipt>;
};

const callNative = async (
  params: ExecuteSwapParams & Required<ExecuteSwapParams, 'ccmMetadata'>,
  networkOpts: SwapNetworkOptions,
  txOpts: TransactionOptions,
): Promise<ContractTransactionReceipt> => {
  const internalDestAsset = getInternalAsset({
    chain: params.destChain,
    asset: params.destAsset,
  });
  const { vaultContract: vault } = getVaultContract(params.srcChain, networkOpts);

  const transaction = await vault.xCallNative(
    chainConstants[params.destChain].contractId,
    encodeAddress(params.destChain, params.destAddress),
    assetConstants[internalDestAsset].contractId,
    params.ccmMetadata.message,
    params.ccmMetadata.gasBudget,
    '0x',
    { value: params.amount, ...extractOverrides(txOpts) },
  );

  return transaction.wait(txOpts.wait) as Promise<ContractTransactionReceipt>;
};

const callToken = async (
  params: ExecuteSwapParams & Required<ExecuteSwapParams, 'ccmMetadata'>,
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
  const { vaultContract: vault, vaultAddress } = getVaultContract(params.srcChain, networkOpts);
  const erc20Address = getErc20Address(internalSrcAsset, networkOpts);

  const { hasSufficientAllowance } = await checkAllowance(
    BigInt(params.amount),
    vaultAddress,
    erc20Address,
    networkOpts.signer,
  );
  assert(hasSufficientAllowance, 'Swap amount exceeds allowance');

  const transaction = await vault.xCallToken(
    chainConstants[params.destChain].contractId,
    encodeAddress(params.destChain, params.destAddress),
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
  { ccmMetadata: unvalidatedCcmMetadata, ...params }: ExecuteSwapParams,
  networkOpts: SwapNetworkOptions,
  txOpts: TransactionOptions,
): Promise<ContractTransactionReceipt> => {
  assertIsValidSwap(params);
  assertIsEvmChain(params.srcChain);
  assertValidAddress(params.destChain, params.destAddress, networkOpts.network);
  await assertSignerIsConnectedToChain(networkOpts, params.srcChain);

  if (unvalidatedCcmMetadata) {
    assertIsEvmChain(params.destChain);
    const ccmMetadata = ccmMetadataSchema.parse(unvalidatedCcmMetadata);

    return params.srcAsset === chainConstants[params.srcChain].gasAsset
      ? callNative({ ...params, ccmMetadata }, networkOpts, txOpts)
      : callToken({ ...params, ccmMetadata }, networkOpts, txOpts);
  }

  return params.srcAsset === chainConstants[params.srcChain].gasAsset
    ? swapNative(params, networkOpts, txOpts)
    : swapToken(params, networkOpts, txOpts);
};

export default executeSwap;

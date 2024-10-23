import * as base58 from '@chainflip/utils/base58';
import { bytesToHex } from '@chainflip/utils/bytes';
import * as ss58 from '@chainflip/utils/ss58';
import { isHex } from '@chainflip/utils/string';
import { ContractTransactionResponse } from 'ethers';
import { u8aToHex, hexToU8a } from '@polkadot/util';
import { u32, Struct, Option, u16, u256, Bytes as TsBytes, Enum } from 'scale-ts';
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
  getInternalAssets,
  InternalAsset,
} from '../enums';
import { assertIsEvmChain, assertIsCCMDestination, assertSignerIsConnectedToChain } from '../evm';
import { assert } from '../guards';
import { dotAddress } from '../parsers';
import { AffiliateBroker, ccmParamsSchema, DcaParams, FillOrKillParamsX128 } from '../schemas';
import { Required } from '../types';
import { assertValidAddress } from '../validation/addressValidation';
import { ExecuteSwapParams, SwapNetworkOptions } from './index';

const encodeAddress = (chain: Chain, address: string) => {
  if (chain === Chains.Polkadot) return bytesToHex(ss58.decode(dotAddress.parse(address)).data);
  if (chain === Chains.Bitcoin) return `0x${Buffer.from(address).toString('hex')}`;
  if (chain === Chains.Ethereum || chain === Chains.Arbitrum) return address;
  if (chain === Chains.Solana) {
    if (isHex(address)) return address;
    return bytesToHex(base58.decode(address));
  }

  // no fallback encoding to prevent submitting txs with wrongly encoded addresses for new chains
  throw new Error(`cannot encode address for chain ${chain}`);
};

export const assertIsValidSwap = (params: ExecuteSwapParams) => {
  const { srcAsset, destAsset } = getInternalAssets(params);

  assert(srcAsset !== destAsset, 'source asset and destination asset cannot be the same');
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

const vaultSwapParametersCodec = Struct({
  refundParams: Struct({
    retryDurationBlocks: u32,
    refundAddress: Enum({
      Ethereum: TsBytes(20),
      Polkadot: TsBytes(32),
      Bitcoin: TsBytes(),
      Arbitrum: TsBytes(20),
      Solana: TsBytes(32),
    }),
    minPriceX128: u256,
  }),
  dcaParams: Option(Struct({ numberOfChunks: u32, chunkIntervalBlocks: u32 })),
  boostFee: Option(u16),
  // TODO: Set correct type once decided.
  brokerFees: Option(u16),
});

const vaultCfParametersCodec = Struct({
  ccmAdditionalData: Option(TsBytes()),
  vaultSwapParameters: vaultSwapParametersCodec,
});

export function encodeSwapParameters(
  sourceChain: Chain,
  fillOrKillParams: FillOrKillParamsX128,
  boostFeeBps?: number,
  dcaParams?: DcaParams,
  _beneficiaries?: AffiliateBroker[],
): string | undefined {
  return fillOrKillParams || dcaParams || boostFeeBps
    ? u8aToHex(
        vaultSwapParametersCodec.enc({
          refundParams: {
            retryDurationBlocks: fillOrKillParams.retryDurationBlocks,
            refundAddress: {
              tag: sourceChain,
              value: hexToU8a(fillOrKillParams.refundAddress),
            },
            minPriceX128: BigInt(fillOrKillParams.minPriceX128),
          },
          dcaParams,
          boostFee: boostFeeBps,
          brokerFees: undefined,
        }),
      )
    : undefined;
}

export function encodeCfParameters(
  sourceChain: Chain,
  fillOrKillParams: FillOrKillParamsX128,
  ccmAdditionalData?: string | undefined,
  boostFeeBps?: number,
  dcaParams?: DcaParams,
  _beneficiaries?: AffiliateBroker[],
): string | undefined {
  return ccmAdditionalData || fillOrKillParams || dcaParams || boostFeeBps
    ? u8aToHex(
        vaultCfParametersCodec.enc({
          ccmAdditionalData: ccmAdditionalData ? hexToU8a(ccmAdditionalData) : undefined,
          vaultSwapParameters: {
            refundParams: {
              retryDurationBlocks: fillOrKillParams.retryDurationBlocks,
              refundAddress: {
                tag: sourceChain,
                value: hexToU8a(fillOrKillParams.refundAddress),
              },
              minPriceX128: BigInt(fillOrKillParams.minPriceX128),
            },
            dcaParams,
            boostFee: boostFeeBps,
            // For now just hardcode to undefined as we type is not yet set.
            brokerFees: undefined,
          },
        }),
      )
    : undefined;
}

const swapNative = async (
  params: ExecuteSwapParams,
  networkOpts: SwapNetworkOptions,
  txOpts: TransactionOptions,
): Promise<ContractTransactionResponse> => {
  const destAsset = getInternalAsset({
    chain: params.destChain,
    asset: params.destAsset,
  });
  const { vaultContract: vault } = getVaultContract(params.srcChain, networkOpts);

  const cfParameters = encodeSwapParameters(
    params.srcChain,
    params.fillOrKillParams,
    params.maxBoostFeeBps,
    params.dcaParams,
    params.beneficiaries,
  );

  const transaction = await vault.xSwapNative(
    chainConstants[params.destChain].contractId,
    encodeAddress(params.destChain, params.destAddress),
    assetConstants[destAsset].contractId,
    cfParameters ?? '0x',
    { value: params.amount, ...extractOverrides(txOpts) },
  );
  await transaction.wait(txOpts.wait);

  return transaction;
};

const swapToken = async (
  params: ExecuteSwapParams,
  networkOpts: SwapNetworkOptions,
  txOpts: TransactionOptions,
): Promise<ContractTransactionResponse> => {
  const { srcAsset, destAsset } = getInternalAssets(params);
  const { vaultContract: vault, vaultAddress } = getVaultContract(params.srcChain, networkOpts);
  const erc20Address = getErc20Address(srcAsset, networkOpts);

  const { hasSufficientAllowance } = await checkAllowance(
    BigInt(params.amount),
    vaultAddress,
    erc20Address,
    networkOpts.signer,
  );
  assert(hasSufficientAllowance, 'Swap amount exceeds allowance');

  const cfParameters = encodeSwapParameters(
    params.srcChain,
    params.fillOrKillParams,
    params.maxBoostFeeBps,
    params.dcaParams,
    params.beneficiaries,
  );

  const transaction = await vault.xSwapToken(
    chainConstants[params.destChain].contractId,
    encodeAddress(params.destChain, params.destAddress),
    assetConstants[destAsset].contractId,
    erc20Address,
    params.amount,
    cfParameters ?? '0x',
    extractOverrides(txOpts),
  );
  await transaction.wait(txOpts.wait);

  return transaction;
};

const callNative = async (
  params: Required<Omit<ExecuteSwapParams, 'ccmMetadata'>, 'ccmParams'>,
  networkOpts: SwapNetworkOptions,
  txOpts: TransactionOptions,
): Promise<ContractTransactionResponse> => {
  const destAsset = getInternalAsset({
    chain: params.destChain,
    asset: params.destAsset,
  });
  const { vaultContract: vault } = getVaultContract(params.srcChain, networkOpts);

  const cfParameters = encodeCfParameters(
    params.srcChain,
    params.fillOrKillParams,
    params.ccmParams?.ccmAdditionalData,
    params.maxBoostFeeBps,
    params.dcaParams,
    params.beneficiaries,
  );

  const transaction = await vault.xCallNative(
    chainConstants[params.destChain].contractId,
    encodeAddress(params.destChain, params.destAddress),
    assetConstants[destAsset].contractId,
    params.ccmParams.message,
    params.ccmParams.gasBudget,
    cfParameters ?? '0x',
    { value: params.amount, ...extractOverrides(txOpts) },
  );
  await transaction.wait(txOpts.wait);

  return transaction;
};

const callToken = async (
  params: Required<Omit<ExecuteSwapParams, 'ccmMetadata'>, 'ccmParams'>,
  networkOpts: SwapNetworkOptions,
  txOpts: TransactionOptions,
): Promise<ContractTransactionResponse> => {
  const { srcAsset, destAsset } = getInternalAssets(params);
  const { vaultContract: vault, vaultAddress } = getVaultContract(params.srcChain, networkOpts);
  const erc20Address = getErc20Address(srcAsset, networkOpts);

  const { hasSufficientAllowance } = await checkAllowance(
    BigInt(params.amount),
    vaultAddress,
    erc20Address,
    networkOpts.signer,
  );
  assert(hasSufficientAllowance, 'Swap amount exceeds allowance');

  const cfParameters = encodeCfParameters(
    params.srcChain,
    params.fillOrKillParams,
    params.ccmParams?.ccmAdditionalData,
    params.maxBoostFeeBps,
    params.dcaParams,
    params.beneficiaries,
  );

  const transaction = await vault.xCallToken(
    chainConstants[params.destChain].contractId,
    encodeAddress(params.destChain, params.destAddress),
    assetConstants[destAsset].contractId,
    params.ccmParams.message,
    params.ccmParams.gasBudget,
    erc20Address,
    params.amount,
    cfParameters ?? '0x',
    extractOverrides(txOpts),
  );
  await transaction.wait(txOpts.wait);

  return transaction;
};

const executeSwap = async (
  { ccmParams, ccmMetadata, ...params }: ExecuteSwapParams,
  networkOpts: SwapNetworkOptions,
  txOpts: TransactionOptions,
): Promise<ContractTransactionResponse> => {
  assertIsValidSwap(params);
  assertIsEvmChain(params.srcChain);
  assertValidAddress(params.destChain, params.destAddress, networkOpts.network);
  await assertSignerIsConnectedToChain(networkOpts, params.srcChain);

  const unvalidatedCcmParams = ccmParams || ccmMetadata;

  if (unvalidatedCcmParams) {
    assertIsCCMDestination(params.destChain);
    const validatedCcmParams = ccmParamsSchema.parse(unvalidatedCcmParams);

    return params.srcAsset === chainConstants[params.srcChain].gasAsset
      ? callNative({ ...params, ccmParams: validatedCcmParams }, networkOpts, txOpts)
      : callToken({ ...params, ccmParams: validatedCcmParams }, networkOpts, txOpts);
  }

  return params.srcAsset === chainConstants[params.srcChain].gasAsset
    ? swapNative(params, networkOpts, txOpts)
    : swapToken(params, networkOpts, txOpts);
};

export default executeSwap;

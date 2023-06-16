import { ContractReceipt, Signer } from 'ethers';
import { z } from 'zod';
import { Vault, Vault__factory } from '../abis';
import {
  requestApproval,
  getVaultManagerContractAddress,
  getTokenContractAddress,
} from '../contracts';
import { SupportedAsset, chainflipNetwork, ChainId } from '../enums';
import { assert } from '../guards';
import {
  ExecuteSwapParams,
  NativeSwapParams,
  TokenSwapParams,
  executeSwapParamsSchema,
} from './validators';

// !!!!! IMPORTANT !!!!!
// Do not change these indices.
const chainMap: Record<ChainId, number> = {
  [ChainId.Ethereum]: 1,
  [ChainId.Polkadot]: 2,
  [ChainId.Bitcoin]: 3,
};

// !!!!!! IMPORTANT !!!!!!
// Do not change these indices.
const assetMap: Record<SupportedAsset, number> = {
  // 0 is reservered for particular cross chain messaging scenarios where we want to pass
  // through a message without making a swap.
  ETH: 1,
  FLIP: 2,
  USDC: 3,
  DOT: 4,
  BTC: 5,
};

const swapNative = async (
  vault: Vault,
  { destChainId, destTokenSymbol, destAddress, amount }: NativeSwapParams,
): Promise<ContractReceipt> => {
  const transaction = await vault.xSwapNative(
    chainMap[destChainId],
    destAddress,
    assetMap[destTokenSymbol],
    [],
    { value: amount },
  );

  return transaction.wait(1);
};

const swapToken = async (
  vault: Vault,
  params: TokenSwapParams,
  { signer, ...opts }: ExecuteSwapOptions,
): Promise<ContractReceipt> => {
  const erc20Address =
    opts.cfNetwork === 'localnet'
      ? opts.srcTokenContractAddress
      : getTokenContractAddress(params.srcTokenSymbol, opts.cfNetwork);

  assert(erc20Address !== undefined, 'Missing ERC20 contract address');

  await requestApproval(erc20Address, vault.address, params.amount, signer);

  const transaction = await vault.xSwapToken(
    chainMap[params.destChainId],
    params.destAddress,
    assetMap[params.destTokenSymbol],
    erc20Address,
    params.amount,
    [],
  );

  return transaction.wait(1);
};

const isTokenSwap = (params: ExecuteSwapParams): params is TokenSwapParams =>
  'srcTokenSymbol' in params;

const executeSwapOptionsSchema = z.intersection(
  z.object({ signer: z.instanceof(Signer) }),
  z.union([
    z.object({ cfNetwork: chainflipNetwork }),
    z.object({
      cfNetwork: z.literal('localnet'),
      vaultContractAddress: z.string(),
      srcTokenContractAddress: z.string().optional(),
    }),
  ]),
);

export type ExecuteSwapOptions = z.infer<typeof executeSwapOptionsSchema>;

const executeSwap = async (
  params: ExecuteSwapParams,
  options: ExecuteSwapOptions,
): Promise<ContractReceipt> => {
  const parsedParams = executeSwapParamsSchema.parse(params);
  const opts = executeSwapOptionsSchema.parse(options);

  const vaultContractAddress =
    opts.cfNetwork === 'localnet'
      ? opts.vaultContractAddress
      : getVaultManagerContractAddress(opts.cfNetwork);

  assert(
    vaultContractAddress !== undefined,
    'Missing vault contract address or network unsupported',
  );

  const vault = Vault__factory.connect(vaultContractAddress, opts.signer);

  if (isTokenSwap(parsedParams)) return swapToken(vault, parsedParams, opts);
  return swapNative(vault, parsedParams);
};

export default executeSwap;

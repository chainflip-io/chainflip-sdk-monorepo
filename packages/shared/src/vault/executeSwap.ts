import { ContractReceipt, Signer } from 'ethers';
import { z } from 'zod';
import { Vault__factory } from '../abis';
import { assetMap, chainMap } from '../consts';
import {
  getVaultManagerContractAddress,
  getTokenContractAddress,
  checkAllowance,
} from '../contracts';
import { assert } from '../guards';
import { chainflipNetwork } from '../parsers';
import {
  ExecuteSwapParams,
  NativeSwapParams,
  TokenSwapParams,
  executeSwapParamsSchema,
} from './validators';

const swapNative = async (
  { destChain, destAsset, destAddress, amount }: NativeSwapParams,
  { nonce, ...opts }: ExecuteSwapOptions,
): Promise<ContractReceipt> => {
  const vaultContractAddress =
    opts.network === 'localnet'
      ? opts.vaultContractAddress
      : getVaultManagerContractAddress(opts.network);

  assert(
    vaultContractAddress !== undefined,
    'Missing vault contract address or network unsupported',
  );

  const vault = Vault__factory.connect(vaultContractAddress, opts.signer);

  const transaction = await vault.xSwapNative(
    chainMap[destChain],
    destAddress,
    assetMap[destAsset],
    [],
    { value: amount, nonce },
  );

  return transaction.wait(1);
};

const swapToken = async (
  params: TokenSwapParams,
  opts: ExecuteSwapOptions,
): Promise<ContractReceipt> => {
  const vaultContractAddress =
    opts.network === 'localnet'
      ? opts.vaultContractAddress
      : getVaultManagerContractAddress(opts.network);

  assert(
    vaultContractAddress !== undefined,
    'Missing vault contract address or network unsupported',
  );

  const erc20Address =
    opts.network === 'localnet'
      ? opts.srcTokenContractAddress
      : getTokenContractAddress(params.srcAsset, opts.network);

  assert(erc20Address !== undefined, 'Missing ERC20 contract address');

  const { isAllowable } = await checkAllowance(
    params.amount,
    vaultContractAddress,
    erc20Address,
    opts.signer,
  );
  assert(isAllowable, 'Swap amount exceeds allowance');

  const vault = Vault__factory.connect(vaultContractAddress, opts.signer);

  const transaction = await vault.xSwapToken(
    chainMap[params.destChain],
    params.destAddress,
    assetMap[params.destAsset],
    erc20Address,
    params.amount,
    [],
    { nonce: opts.nonce },
  );

  return transaction.wait(1);
};

const isTokenSwap = (params: ExecuteSwapParams): params is TokenSwapParams =>
  'srcAsset' in params;

const executeSwapOptionsSchema = z.intersection(
  z.object({
    signer: z.instanceof(Signer),
    nonce: z.union([z.number(), z.bigint(), z.string()]).optional(),
  }),
  z.union([
    z.object({ network: chainflipNetwork }),
    z.object({
      network: z.literal('localnet'),
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

  return isTokenSwap(parsedParams)
    ? swapToken(parsedParams, opts)
    : swapNative(parsedParams, opts);
};

export default executeSwap;

import assert from 'assert';
import { ContractReceipt, Signer } from 'ethers';
import { z } from 'zod';
import {
  SISYPHOS_FLIP_CONTRACT_ADDRESS,
  GOERLI_USDC_CONTRACT_ADDRESS,
  SISYPHOS_VAULT_CONTRACT_ADDRESS,
} from '@/shared/addresses';
import {
  ChainflipNetwork,
  SupportedAsset,
  chainflipNetwork,
} from '@/shared/enums';
import {
  Vault,
  Vault__factory,
  ERC20__factory,
} from '../../../types/ethers-contracts';
import { ChainId } from '../sdk';
import { isTestnet } from '../utils';
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

  const receipt = await transaction.wait(1);

  assert(receipt.status !== 0, 'Transaction failed');

  return receipt;
};

const getTokenContractAddress = (
  asset: SupportedAsset,
  cfNetwork: ChainflipNetwork,
): string => {
  assert(isTestnet(cfNetwork), 'Only testnets are supported for now');

  if (asset === 'FLIP' && cfNetwork === 'sisyphos') {
    return SISYPHOS_FLIP_CONTRACT_ADDRESS;
  }

  assert(asset === 'USDC');

  return GOERLI_USDC_CONTRACT_ADDRESS;
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
  const erc20 = ERC20__factory.connect(erc20Address, signer);
  const signerAddress = await signer.getAddress();
  const allowance = await erc20.allowance(signerAddress, vault.address);

  if (allowance.lt(params.amount)) {
    const approval = await erc20.approve(vault.address, params.amount);
    const approvalReceipt = await approval.wait(1);
    assert(approvalReceipt.status !== 0, 'Approval failed');
  }

  const transaction = await vault.xSwapToken(
    chainMap[params.destChainId],
    params.destAddress,
    assetMap[params.destTokenSymbol],
    erc20Address,
    params.amount,
    [],
  );

  const receipt = await transaction.wait(1);

  assert(receipt.status !== 0, 'Transaction failed');

  return receipt;
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
  executeSwapParamsSchema.parse(params);
  const opts = executeSwapOptionsSchema.parse(options);

  let vaultContractAddress: string | undefined;
  if (opts.cfNetwork === 'localnet') {
    vaultContractAddress = opts.vaultContractAddress;
  } else if (opts.cfNetwork === 'sisyphos') {
    vaultContractAddress = SISYPHOS_VAULT_CONTRACT_ADDRESS;
  }

  assert(
    vaultContractAddress !== undefined,
    'Missing vault contract address or network unsupported',
  );

  const vault = Vault__factory.connect(vaultContractAddress, opts.signer);

  if (isTokenSwap(params)) return swapToken(vault, params, opts);
  return swapNative(vault, params);
};

export default executeSwap;

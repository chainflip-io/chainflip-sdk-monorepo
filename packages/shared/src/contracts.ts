import { BigNumberish, ContractTransactionReceipt, Signer } from 'ethers';
import { ERC20, ERC20__factory } from './abis';
import { ADDRESSES, GOERLI_USDC_CONTRACT_ADDRESS } from './consts';
import {
  type ChainflipNetwork,
  type Asset,
  Assets,
  ChainflipNetworks,
} from './enums';
import { assert } from './guards';
import { Overrides } from './vault/schemas';

export const getTokenContractAddress = (
  asset: Asset,
  network: ChainflipNetwork,
): string => {
  assert(network !== ChainflipNetworks.mainnet, 'Mainnet is not yet supported');

  if (asset === Assets.FLIP) return ADDRESSES[network].FLIP_CONTRACT_ADDRESS;

  assert(asset === Assets.USDC, 'Only FLIP and USDC are supported for now');

  return GOERLI_USDC_CONTRACT_ADDRESS;
};

export const getStateChainGatewayContractAddress = (
  network: ChainflipNetwork,
): string => {
  assert(network !== ChainflipNetworks.mainnet, 'Mainnet is not yet supported');
  return ADDRESSES[network].STATE_CHAIN_MANAGER_CONTRACT_ADDRESS;
};

export const checkAllowance = async (
  amount: BigNumberish,
  spenderAddress: string,
  erc20Address: string,
  signer: Signer,
) => {
  const erc20 = ERC20__factory.connect(erc20Address, signer);
  const signerAddress = await signer.getAddress();
  const allowance = await erc20.allowance(signerAddress, spenderAddress);
  return { allowance, isAllowable: allowance >= BigInt(amount), erc20 };
};

export const approve = async (
  amount: BigNumberish,
  spenderAddress: string,
  erc20: ERC20,
  allowance: BigNumberish,
  nonce?: Overrides['nonce'],
): Promise<ContractTransactionReceipt | null> => {
  const amountBigNumber = BigInt(amount);
  const allowanceBigNumber = BigInt(allowance);
  if (allowanceBigNumber >= amountBigNumber) return null;
  const requiredAmount = amountBigNumber - allowanceBigNumber;
  const tx = await erc20.approve(spenderAddress, requiredAmount, { nonce });
  return tx.wait(1);
};

export const getVaultManagerContractAddress = (
  network: ChainflipNetwork,
): string => {
  assert(network !== ChainflipNetworks.mainnet, 'Mainnet is not yet supported');
  return ADDRESSES[network].VAULT_CONTRACT_ADDRESS;
};

export const getFlipBalance = async (
  network: ChainflipNetwork,
  signer: Signer,
): Promise<bigint> => {
  const flipAddress = getTokenContractAddress('FLIP', network);
  const flip = ERC20__factory.connect(flipAddress, signer);
  return flip.balanceOf(await signer.getAddress());
};

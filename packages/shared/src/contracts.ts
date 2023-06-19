import type { Signer } from 'ethers';
import { ERC20__factory } from './abis';
import { type ChainflipNetwork, type Asset, Assets } from './enums';
import { assert } from './guards';

// https://github.com/chainflip-io/chainflip-testnet-tools/actions/runs/5077994260#summary-13750268632
export const SISYPHOS_VAULT_CONTRACT_ADDRESS =
  '0xBFF0d5051bC984ee6fF052b26ADBaFB5F1cDF9d4';
export const SISYPHOS_FLIP_CONTRACT_ADDRESS =
  '0x8e3D3250470314f2e8C1eC6062Df43B5d67B5b7d';

// https://developers.circle.com/developer/docs/usdc-on-testnet#usdc-on-ethereum-goerli
export const GOERLI_USDC_CONTRACT_ADDRESS =
  '0x07865c6E87B9F70255377e024ace6630C1Eaa37F';

export const getTokenContractAddress = (
  asset: Asset,
  network: ChainflipNetwork,
): string => {
  assert(network === 'sisyphos', 'Only sisyphos is supported for now');

  if (asset === Assets.FLIP) return SISYPHOS_FLIP_CONTRACT_ADDRESS;

  assert(asset === Assets.USDC, 'Only FLIP and USDC are supported for now');

  return GOERLI_USDC_CONTRACT_ADDRESS;
};

export const SISYPHOS_STATE_CHAIN_MANAGER_CONTRACT_ADDRESS =
  '0x501E4D376001Dd74ca37f99b744Ab2889f7b4650';

export const getStateChainGatewayContractAddress = (
  network: ChainflipNetwork,
): string => {
  switch (network) {
    case 'sisyphos':
      return SISYPHOS_STATE_CHAIN_MANAGER_CONTRACT_ADDRESS;
    default:
      throw new Error(`Unsupported network: ${network}`);
  }
};

export const requestApproval = async (
  erc20Address: string,
  approvalAddress: string,
  amount: string,
  signer: Signer,
) => {
  const erc20 = ERC20__factory.connect(erc20Address, signer);
  const signerAddress = await signer.getAddress();
  const allowance = await erc20.allowance(signerAddress, approvalAddress);

  if (allowance.lt(amount)) {
    await erc20.approve(approvalAddress, amount);
  }
};

export const getVaultManagerContractAddress = (
  network: ChainflipNetwork,
): string => {
  switch (network) {
    case 'sisyphos':
      return SISYPHOS_VAULT_CONTRACT_ADDRESS;
    default:
      throw new Error(`Unsupported network: ${network}`);
  }
};

import type { BigNumberish, ContractReceipt, Signer } from 'ethers';
import { ERC20__factory } from './abis';
import {
  type ChainflipNetwork,
  type Asset,
  Assets,
  ChainflipNetworks,
} from './enums';
import { assert } from './guards';

export const ADDRESSES = {
  [ChainflipNetworks.sisyphos]: {
    FLIP_CONTRACT_ADDRESS: '0x8e3D3250470314f2e8C1eC6062Df43B5d67B5b7d',
    VAULT_CONTRACT_ADDRESS: '0xBFF0d5051bC984ee6fF052b26ADBaFB5F1cDF9d4',
    STATE_CHAIN_MANAGER_CONTRACT_ADDRESS:
      '0x501E4D376001Dd74ca37f99b744Ab2889f7b4650',
  },
  [ChainflipNetworks.partnernet]: {
    FLIP_CONTRACT_ADDRESS: '0x1A3960317647f7a9420c7eBB8E0FB1bCDfe4Ca24',
    VAULT_CONTRACT_ADDRESS: '0x66f383DB83d8e4D3Ba148782c2954ef7b4E17d77',
    STATE_CHAIN_MANAGER_CONTRACT_ADDRESS:
      '0x842BD1A15c70A77f1c0130070c881ED9898df893',
  },
  [ChainflipNetworks.perseverance]: {
    FLIP_CONTRACT_ADDRESS: '0x1194C91d47Fc1b65bE18db38380B5344682b67db',
    VAULT_CONTRACT_ADDRESS: '0xF1B061aCCDAa4B7c029128b49aBc047F89D5CB8d',
    STATE_CHAIN_MANAGER_CONTRACT_ADDRESS:
      '0xC960C4eEe4ADf40d24374D85094f3219cf2DD8EB',
  },
} as const;

// https://developers.circle.com/developer/docs/usdc-on-testnet#usdc-on-ethereum-goerli
export const GOERLI_USDC_CONTRACT_ADDRESS =
  '0x07865c6E87B9F70255377e024ace6630C1Eaa37F';

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

export const requestApproval = async (
  erc20Address: string,
  approvalAddress: string,
  amount: BigNumberish,
  signer: Signer,
): Promise<ContractReceipt | null> => {
  const erc20 = ERC20__factory.connect(erc20Address, signer);
  const signerAddress = await signer.getAddress();
  const allowance = await erc20.allowance(signerAddress, approvalAddress);

  if (allowance.lt(amount)) {
    const tx = await erc20.approve(approvalAddress, amount);
    return tx.wait(1);
  }

  return null;
};

export const getVaultManagerContractAddress = (
  network: ChainflipNetwork,
): string => {
  assert(network !== ChainflipNetworks.mainnet, 'Mainnet is not yet supported');
  return ADDRESSES[network].VAULT_CONTRACT_ADDRESS;
};

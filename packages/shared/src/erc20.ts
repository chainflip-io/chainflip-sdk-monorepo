import type { Signer } from 'ethers';
import { ERC20__factory } from './contracts';
import { type ChainflipNetwork, type SupportedAsset, isTestnet } from './enums';
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
  asset: SupportedAsset,
  cfNetwork: ChainflipNetwork,
): string => {
  assert(isTestnet(cfNetwork), 'Only testnets are supported for now');

  if (asset === 'FLIP' && cfNetwork === 'sisyphos') {
    return SISYPHOS_FLIP_CONTRACT_ADDRESS;
  }

  assert(asset === 'USDC', 'Only FLIP and USDC are supported for now');

  return GOERLI_USDC_CONTRACT_ADDRESS;
};

const SISYPHOS_STATE_CHAIN_MANAGER_CONTRACT_ADDRESS =
  '0x501E4D376001Dd74ca37f99b744Ab2889f7b4650';

export const getStateChainManagerContractAddress = (
  cfNetwork: ChainflipNetwork,
): string => {
  if (cfNetwork === 'sisyphos') {
    return SISYPHOS_STATE_CHAIN_MANAGER_CONTRACT_ADDRESS;
  }

  throw new Error('Only Sisyphos is supported for now');
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
    const approval = await erc20.approve(approvalAddress, amount);
    const approvalReceipt = await approval.wait(1);
    assert(approvalReceipt.status !== 0, 'Approval failed');
  }
};

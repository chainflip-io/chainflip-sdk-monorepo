import { Asset, Assets, ChainflipNetwork, ChainflipNetworks } from './enums';

// TODO: fetch minimum deposit amounts via rpc from the state chain
const MINIMUM_DEPOSIT_AMOUNTS: Partial<
  Record<ChainflipNetwork, Record<Asset, string>>
> = {
  [ChainflipNetworks.perseverance]: {
    [Assets.ETH]: '0',
    [Assets.FLIP]: '0',
    [Assets.USDC]: '0',
    [Assets.BTC]: '0',
    [Assets.DOT]: '10000000000', // https://support.polkadot.network/support/solutions/articles/65000168651-what-is-the-existential-deposit
  },
};
export const getMinimumDepositAmount = (
  network: ChainflipNetwork,
  asset: Asset,
) => MINIMUM_DEPOSIT_AMOUNTS[network]?.[asset] ?? '0';

// TODO: fetch minimum swap amounts via rpc from the state chain
const MINIMUM_SWAP_AMOUNTS: Partial<
  Record<ChainflipNetwork, Record<Asset, string>>
> = {
  [ChainflipNetworks.perseverance]: {
    [Assets.ETH]: '580000000000000',
    [Assets.FLIP]: '1000000000000000000',
    [Assets.USDC]: '1000000',
    [Assets.BTC]: '5000',
    [Assets.DOT]: '2000000000',
  },
};
export const getMinimumSwapAmount = (network: ChainflipNetwork, asset: Asset) =>
  MINIMUM_SWAP_AMOUNTS[network]?.[asset] ?? '0';

export const ADDRESSES = {
  [ChainflipNetworks.sisyphos]: {
    FLIP_CONTRACT_ADDRESS: '0x2BbB561C6eaB74f358cA9e8a961E3A20CAE3D100',
    VAULT_CONTRACT_ADDRESS: '0xC17CCec5015081EB2DF26d20A9e02c5484C1d641',
    STATE_CHAIN_GATEWAY_ADDRESS: '0xE8bE4B7F8a38C1913387c9C20B94402bc3Db9F70',
  },
  [ChainflipNetworks.perseverance]: {
    FLIP_CONTRACT_ADDRESS: '0x0485D65da68b2A6b48C3fA28D7CCAce196798B94',
    VAULT_CONTRACT_ADDRESS: '0x40caFF3f3B6706Da904a7895e0fC7F7922437e9B',
    STATE_CHAIN_GATEWAY_ADDRESS: '0x38AA40B7b5a70d738baBf6699a45DacdDBBEB3fc',
  },
} as const;

// https://developers.circle.com/developer/docs/usdc-on-testnet#usdc-on-ethereum-goerli
export const GOERLI_USDC_CONTRACT_ADDRESS =
  '0x07865c6E87B9F70255377e024ace6630C1Eaa37F';

import { ChainflipChain, ChainflipNetwork } from '@chainflip/utils/chainflip';

// TODO: read this value via rpc once there is an appropriate rpc method
const POOLS_NETWORK_FEE_HUNDREDTH_PIPS: Record<ChainflipNetwork, number> = {
  backspin: 1000,
  sisyphos: 1000,
  perseverance: 1000,
  mainnet: 1000,
};
export const getPoolsNetworkFeeHundredthPips = (network: ChainflipNetwork) =>
  POOLS_NETWORK_FEE_HUNDREDTH_PIPS[network];

const ETHEREUM_EVM_CHAIN_ID: Record<ChainflipNetwork, number> = {
  backspin: 10997, // backspin ethereum
  sisyphos: 11155111, // sepolia
  perseverance: 11155111, // sepolia
  mainnet: 1, // mainnet
};
const ARBITRUM_EVM_CHAIN_ID: Record<ChainflipNetwork, number> = {
  backspin: 412346, // backspin arbitrum
  sisyphos: 421614, // arb-sepolia
  perseverance: 421614, // arb-sepolia
  mainnet: 42161, // mainnet
};
export const getEvmChainId = (chain: ChainflipChain, network: ChainflipNetwork) => {
  switch (chain) {
    case 'Ethereum':
      return ETHEREUM_EVM_CHAIN_ID[network];
    case 'Arbitrum':
      return ARBITRUM_EVM_CHAIN_ID[network];
    default:
      return undefined;
  }
};

// https://developers.circle.com/stablecoins/docs/usdc-on-test-networks
const SEPOLIA_USDC_CONTRACT_ADDRESS = '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238';
const SEPOLIA_USDT_CONTRACT_ADDRESS = '0x27CEA6Eb8a21Aae05Eb29C91c5CA10592892F584';

type AddressMap = {
  FLIP_CONTRACT_ADDRESS: string;
  USDC_CONTRACT_ADDRESS: string;
  USDT_CONTRACT_ADDRESS: string;
  ARBUSDC_CONTRACT_ADDRESS: string;
  STATE_CHAIN_GATEWAY_ADDRESS: string;
  SOLUSDC_CONTRACT_ADDRESS: string;
};

export const ADDRESSES: Record<ChainflipNetwork, AddressMap> = {
  backspin: {
    FLIP_CONTRACT_ADDRESS: '0x10C6E9530F1C1AF873a391030a1D9E8ed0630D26',
    USDC_CONTRACT_ADDRESS: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
    USDT_CONTRACT_ADDRESS: '0x0DCd1Bf9A1b36cE34237eEaFef220932846BCD82',
    ARBUSDC_CONTRACT_ADDRESS: '0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9',
    STATE_CHAIN_GATEWAY_ADDRESS: '0xeEBe00Ac0756308ac4AaBfD76c05c4F3088B8883',
    SOLUSDC_CONTRACT_ADDRESS: '24PNhTaNtomHhoy3fTRaMhAFCRj4uHqhZEEoWrKDbR5p',
  },
  sisyphos: {
    FLIP_CONTRACT_ADDRESS: '0xcD079EAB6B5443b545788Fd210C8800FEADd87fa',
    USDC_CONTRACT_ADDRESS: SEPOLIA_USDC_CONTRACT_ADDRESS,
    USDT_CONTRACT_ADDRESS: SEPOLIA_USDT_CONTRACT_ADDRESS,
    ARBUSDC_CONTRACT_ADDRESS: '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d',
    STATE_CHAIN_GATEWAY_ADDRESS: '0x1F7fE41C798cc7b1D34BdC8de2dDDA4a4bE744D9',
    SOLUSDC_CONTRACT_ADDRESS: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
  },
  perseverance: {
    FLIP_CONTRACT_ADDRESS: '0xdC27c60956cB065D19F08bb69a707E37b36d8086',
    USDC_CONTRACT_ADDRESS: SEPOLIA_USDC_CONTRACT_ADDRESS,
    USDT_CONTRACT_ADDRESS: SEPOLIA_USDT_CONTRACT_ADDRESS,
    ARBUSDC_CONTRACT_ADDRESS: '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d',
    STATE_CHAIN_GATEWAY_ADDRESS: '0xA34a967197Ee90BB7fb28e928388a573c5CFd099',
    SOLUSDC_CONTRACT_ADDRESS: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
  },
  mainnet: {
    FLIP_CONTRACT_ADDRESS: '0x826180541412D574cf1336d22c0C0a287822678A',
    USDC_CONTRACT_ADDRESS: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    USDT_CONTRACT_ADDRESS: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    ARBUSDC_CONTRACT_ADDRESS: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    STATE_CHAIN_GATEWAY_ADDRESS: '0x6995Ab7c4D7F4B03f467Cf4c8E920427d9621DBd',
    SOLUSDC_CONTRACT_ADDRESS: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  },
};

export const CHAINFLIP_STATECHAIN_BLOCK_TIME_SECONDS = 6;

export const MIN_TICK = -887272;
export const MAX_TICK = -MIN_TICK;

export const FULL_TICK_RANGE = { start: MIN_TICK, end: MAX_TICK };

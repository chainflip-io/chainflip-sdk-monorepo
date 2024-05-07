import { Asset, assetConstants, Chain, InternalAsset, InternalAssets } from '../enums';

export const swappingEnvironment = ({
  maxSwapAmount = null as string | null,
}: {
  maxSwapAmount?: string | null;
} = {}) => ({
  id: 1,
  jsonrpc: '2.0',
  result: {
    maximum_swap_amounts: {
      Polkadot: { DOT: null },
      Bitcoin: { BTC: maxSwapAmount },
      Ethereum: { ETH: null, USDC: maxSwapAmount, FLIP: null },
    },
  },
});

export const fundingEnvironment = () => ({
  id: 1,
  jsonrpc: '2.0',
  result: {
    redemption_tax: '0x4563918244f40000',
    minimum_funding_amount: '0x8ac7230489e80000',
  },
});

export const poolsEnvironment = () => ({
  id: 1,
  jsonrpc: '2.0',
  result: {
    fees: {
      Bitcoin: {
        BTC: {
          limit_order_fee_hundredth_pips: 20,
          range_order_fee_hundredth_pips: 20,
          quote_asset: {
            chain: 'Ethereum',
            asset: 'USDC',
          },
        },
      },
      Ethereum: {
        FLIP: {
          limit_order_fee_hundredth_pips: 20,
          range_order_fee_hundredth_pips: 20,
          quote_asset: {
            chain: 'Ethereum',
            asset: 'USDC',
          },
        },
        ETH: {
          limit_order_fee_hundredth_pips: 20,
          range_order_fee_hundredth_pips: 20,
          quote_asset: {
            chain: 'Ethereum',
            asset: 'USDC',
          },
        },
      },
      Polkadot: {
        DOT: {
          limit_order_fee_hundredth_pips: 20,
          range_order_fee_hundredth_pips: 20,
          quote_asset: {
            chain: 'Ethereum',
            asset: 'USDC',
          },
        },
      },
    },
  },
});

export const ingressEgressEnvironment = ({
  minDepositAmount = '0x0',
  ingressFee = '0x0',
  egressFee = '0x0',
  minEgressAmount = '0x1',
  channelOpeningFee,
}: {
  minDepositAmount?: string;
  ingressFee?: string | null;
  egressFee?: string | null;
  minEgressAmount?: string;
  channelOpeningFee?: string;
} = {}) => ({
  id: 1,
  jsonrpc: '2.0',
  result: {
    minimum_deposit_amounts: {
      Bitcoin: { BTC: minDepositAmount },
      Polkadot: { DOT: minDepositAmount },
      Ethereum: {
        ETH: minDepositAmount,
        FLIP: minDepositAmount,
        USDC: minDepositAmount,
      },
    },
    ingress_fees: {
      Bitcoin: { BTC: ingressFee },
      Polkadot: { DOT: ingressFee },
      Ethereum: { ETH: ingressFee, FLIP: ingressFee, USDC: ingressFee },
    },
    egress_fees: {
      Bitcoin: { BTC: egressFee },
      Polkadot: { DOT: egressFee },
      Ethereum: { ETH: egressFee, FLIP: egressFee, USDC: egressFee },
    },
    witness_safety_margins: {
      Ethereum: 1,
      Polkadot: null,
      Bitcoin: 2,
    },
    egress_dust_limits: {
      Ethereum: {
        ETH: minEgressAmount,
        USDC: minEgressAmount,
        FLIP: minEgressAmount,
      },
      Polkadot: { DOT: minEgressAmount },
      Bitcoin: { BTC: '0x258' },
    },
    channel_opening_fees: {
      Bitcoin: channelOpeningFee ?? '0x0',
      Ethereum: channelOpeningFee ?? '0x10',
      Polkadot: channelOpeningFee ?? '0x0',
    },
  },
});

export const environment = ({
  maxSwapAmount = '0x0',
  minDepositAmount = '0x0',
  ingressFee = '0x0',
  egressFee = '0x0',
  minEgressAmount = '0x1',
}: {
  maxSwapAmount?: string | null;
  minDepositAmount?: string;
  ingressFee?: string | null;
  egressFee?: string | null;
  minEgressAmount?: string;
} = {}) => ({
  id: 1,
  jsonrpc: '2.0',
  result: {
    ingress_egress: ingressEgressEnvironment({
      minDepositAmount,
      ingressFee,
      egressFee,
      minEgressAmount,
    }).result,
    swapping: swappingEnvironment({ maxSwapAmount }).result,
    funding: fundingEnvironment().result,
    pools: poolsEnvironment().result,
  },
});

export const swapRate = ({
  output = '0x7777',
}: {
  output?: string;
} = {}) => ({
  id: 1,
  jsonrpc: '2.0',
  result: {
    output,
  },
});

export const supportedAssets = ({
  assets = Object.values(InternalAssets),
}: {
  assets?: InternalAsset[];
} = {}) => ({
  id: 1,
  jsonrpc: '2.0',
  result: assets.map((asset) => ({
    asset: assetConstants[asset].asset,
    chain: assetConstants[asset].chain,
  })),
});

export type MockedBoostPoolsDepth = [
  {
    chain: Chain;
    asset: Asset;
    tier: number;
    available_amount: string;
  },
];
export const boostPoolsDepth = (mockedBoostPoolsDepth?: MockedBoostPoolsDepth) => ({
  jsonrpc: '2.0',
  result: mockedBoostPoolsDepth ?? [
    {
      chain: 'Ethereum',
      asset: 'FLIP',
      tier: 5,
      available_amount: '0x0',
    },
    {
      chain: 'Ethereum',
      asset: 'FLIP',
      tier: 30,
      available_amount: '0x0',
    },
    {
      chain: 'Ethereum',
      asset: 'FLIP',
      tier: 10,
      available_amount: '0x0',
    },
    {
      chain: 'Ethereum',
      asset: 'ETH',
      tier: 5,
      available_amount: '0x0',
    },
    {
      chain: 'Ethereum',
      asset: 'ETH',
      tier: 30,
      available_amount: '0x0',
    },
    {
      chain: 'Ethereum',
      asset: 'ETH',
      tier: 10,
      available_amount: '0x0',
    },
    {
      chain: 'Ethereum',
      asset: 'USDT',
      tier: 5,
      available_amount: '0x0',
    },
    {
      chain: 'Ethereum',
      asset: 'USDT',
      tier: 30,
      available_amount: '0x0',
    },
    {
      chain: 'Ethereum',
      asset: 'USDT',
      tier: 10,
      available_amount: '0x0',
    },
    {
      chain: 'Ethereum',
      asset: 'USDC',
      tier: 5,
      available_amount: '0x0',
    },
    {
      chain: 'Ethereum',
      asset: 'USDC',
      tier: 30,
      available_amount: '0x0',
    },
    {
      chain: 'Ethereum',
      asset: 'USDC',
      tier: 10,
      available_amount: '0x0',
    },
    {
      chain: 'Polkadot',
      asset: 'DOT',
      tier: 5,
      available_amount: '0x0',
    },
    {
      chain: 'Polkadot',
      asset: 'DOT',
      tier: 30,
      available_amount: '0x0',
    },
    {
      chain: 'Polkadot',
      asset: 'DOT',
      tier: 10,
      available_amount: '0x0',
    },
    {
      chain: 'Bitcoin',
      asset: 'BTC',
      tier: 5,
      available_amount: '0x0',
    },
    {
      chain: 'Bitcoin',
      asset: 'BTC',
      tier: 30,
      available_amount: '0x0',
    },
    {
      chain: 'Bitcoin',
      asset: 'BTC',
      tier: 10,
      available_amount: '0x186aa',
    },
    {
      chain: 'Arbitrum',
      asset: 'USDC',
      tier: 5,
      available_amount: '0x0',
    },
    {
      chain: 'Arbitrum',
      asset: 'USDC',
      tier: 30,
      available_amount: '0x0',
    },
    {
      chain: 'Arbitrum',
      asset: 'USDC',
      tier: 10,
      available_amount: '0x0',
    },
    {
      chain: 'Arbitrum',
      asset: 'ETH',
      tier: 5,
      available_amount: '0x0',
    },
    {
      chain: 'Arbitrum',
      asset: 'ETH',
      tier: 30,
      available_amount: '0x0',
    },
    {
      chain: 'Arbitrum',
      asset: 'ETH',
      tier: 10,
      available_amount: '0x0',
    },
  ],
  id: 1,
});

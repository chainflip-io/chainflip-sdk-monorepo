export const swappingEnvironment = ({
  minSwapAmount = '0x0',
  maxSwapAmount = null as string | null,
}: {
  minSwapAmount?: string;
  maxSwapAmount?: string | null;
} = {}) => ({
  id: 1,
  jsonrpc: '2.0',
  result: {
    minimum_swap_amounts: {
      Polkadot: { DOT: minSwapAmount },
      Bitcoin: { BTC: minSwapAmount },
      Ethereum: {
        ETH: minSwapAmount,
        USDC: minSwapAmount,
        FLIP: minSwapAmount,
      },
    },
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
}: {
  minDepositAmount?: string;
  ingressFee?: string;
  egressFee?: string;
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
  },
});

export const environment = ({
  minSwapAmount = '0x0',
  maxSwapAmount = '0x0',
  minDepositAmount = '0x0',
  ingressFee = '0x0',
  egressFee = '0x0',
}: {
  minSwapAmount?: string;
  maxSwapAmount?: string | null;
  minDepositAmount?: string;
  ingressFee?: string;
  egressFee?: string;
} = {}) => ({
  id: 1,
  jsonrpc: '2.0',
  result: {
    ingress_egress: ingressEgressEnvironment({
      minDepositAmount,
      ingressFee,
      egressFee,
    }).result,
    swapping: swappingEnvironment({ minSwapAmount, maxSwapAmount }).result,
    funding: fundingEnvironment().result,
    pools: poolsEnvironment().result,
  },
});

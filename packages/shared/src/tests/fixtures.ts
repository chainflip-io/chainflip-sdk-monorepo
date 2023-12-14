const ENVIRONMENT = {
  jsonrpc: '2.0',
  result: {
    ingress_egress: {
      minimum_deposit_amounts: {
        Bitcoin: { BTC: '0x0' },
        Polkadot: { DOT: '0x0' },
        Ethereum: { ETH: '0x0', FLIP: '0x0', USDC: '0x0' },
      },
      ingress_fees: {
        Bitcoin: { BTC: '0x0' },
        Polkadot: { DOT: '0x0' },
        Ethereum: { ETH: '0x0', FLIP: '0x0', USDC: '0x0' },
      },
      egress_fees: {
        Bitcoin: { BTC: '0x0' },
        Polkadot: { DOT: '0x0' },
        Ethereum: { ETH: '0x0', FLIP: '0x0', USDC: '0x0' },
      },
    },
    swapping: {
      minimum_swap_amounts: {
        Polkadot: { DOT: '0x0' },
        Bitcoin: { BTC: '0x0' },
        Ethereum: { ETH: '0x0', USDC: '0x0', FLIP: '0x0' },
      },
      maximum_swap_amounts: {
        Polkadot: { DOT: null },
        Bitcoin: { BTC: '0x1000000000000000' },
        Ethereum: {
          ETH: null,
          USDC: '0x1000000000000000',
          FLIP: '0x1000000000000000',
        },
      },
    },
    funding: {
      redemption_tax: '0x4563918244f40000',
      minimum_funding_amount: '0x8ac7230489e80000',
    },
    pools: {
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
  },
  id: 1,
};

const clone = <T extends object>(obj: T): T => JSON.parse(JSON.stringify(obj));

export const environment = () => clone(ENVIRONMENT);

export const swappingEnvironment = (maxSwapAmount = null as string | null) => ({
  id: 1,
  jsonrpc: '2.0',
  result: {
    minimum_swap_amounts: {
      Polkadot: { DOT: '0x0' },
      Bitcoin: { BTC: '0x0' },
      Ethereum: { ETH: '0x0', USDC: '0x0', FLIP: '0x0' },
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
  result: environment().result.funding,
});

export const poolsEnvironment = () => ({
  id: 1,
  jsonrpc: '2.0',
  result: environment().result.pools,
});

export const ingressEgressEnvironment = (
  amt1 = '0x0',
  amt2 = '0x0',
  amt3 = '0x0',
) => ({
  id: 1,
  jsonrpc: '2.0',
  result: {
    minimum_deposit_amounts: {
      Bitcoin: { BTC: amt1 },
      Polkadot: { DOT: amt1 },
      Ethereum: { ETH: amt1, FLIP: amt1, USDC: amt1 },
    },
    ingress_fees: {
      Bitcoin: { BTC: amt2 },
      Polkadot: { DOT: amt2 },
      Ethereum: { ETH: amt2, FLIP: amt2, USDC: amt2 },
    },
    egress_fees: {
      Bitcoin: { BTC: amt3 },
      Polkadot: { DOT: amt3 },
      Ethereum: { ETH: amt3, FLIP: amt3, USDC: amt3 },
    },
  },
});

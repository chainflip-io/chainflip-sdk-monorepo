const ENVIRONMENT = {
  jsonrpc: '2.0',
  result: {
    ingress_egress: {
      minimum_deposit_amounts: {
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

export const swappingEnvironment = (amt = '0x0') => {
  const max = amt === '0x0' ? null : `0x${(BigInt(amt) * 2n).toString(16)}`;

  return {
    id: 1,
    jsonrpc: '2.0',
    result: {
      minimum_swap_amounts: {
        Polkadot: { DOT: amt },
        Bitcoin: { BTC: amt },
        Ethereum: { ETH: amt, USDC: amt, FLIP: amt },
      },
      maximum_swap_amounts: {
        Polkadot: { DOT: null },
        Bitcoin: { BTC: max },
        Ethereum: { ETH: null, USDC: max, FLIP: null },
      },
    },
  };
};

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

export const ingressEgressEnvironment = (amt = '0x0') => ({
  id: 1,
  jsonrpc: '2.0',
  result: {
    minimum_deposit_amounts: {
      Bitcoin: { BTC: amt },
      Polkadot: { DOT: amt },
      Ethereum: { ETH: amt, FLIP: amt, USDC: amt },
    },
  },
});

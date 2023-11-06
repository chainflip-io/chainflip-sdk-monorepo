const ENVIRONMENT = {
  jsonrpc: '2.0',
  result: {
    ingress_egress: {
      minimum_deposit_amounts: {
        Bitcoin: { Btc: '0x0' },
        Polkadot: { Dot: '0x0' },
        Ethereum: { Eth: '0x0', Flip: '0x0', Usdc: '0x0' },
      },
    },
    swapping: {
      minimum_swap_amounts: {
        Polkadot: { Dot: '0x0' },
        Bitcoin: { Btc: '0x0' },
        Ethereum: {
          Eth: '0x0',
          Usdc: '0x0',
          Flip: '0x0',
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
          Btc: {
            limit_order_fee_hundredth_pips: 20,
            range_order_fee_hundredth_pips: 20,
            pair_asset: {
              chain: 'Ethereum',
              asset: 'Usdc',
            },
          },
        },
        Ethereum: {
          Flip: {
            limit_order_fee_hundredth_pips: 20,
            range_order_fee_hundredth_pips: 20,
            pair_asset: {
              chain: 'Ethereum',
              asset: 'Usdc',
            },
          },
          Eth: {
            limit_order_fee_hundredth_pips: 20,
            range_order_fee_hundredth_pips: 20,
            pair_asset: {
              chain: 'Ethereum',
              asset: 'Usdc',
            },
          },
        },
        Polkadot: {
          Dot: {
            limit_order_fee_hundredth_pips: 20,
            range_order_fee_hundredth_pips: 20,
            pair_asset: {
              chain: 'Ethereum',
              asset: 'Usdc',
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

export const swappingEnvironment = (amt = '0x0') => ({
  id: 1,
  jsonrpc: '2.0',
  result: {
    minimum_swap_amounts: {
      Polkadot: { Dot: amt },
      Bitcoin: { Btc: amt },
      Ethereum: { Eth: amt, Usdc: amt, Flip: amt },
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

export const ingressEgressEnvironment = (amt = '0x0') => ({
  id: 1,
  jsonrpc: '2.0',
  result: {
    minimum_deposit_amounts: {
      Bitcoin: { Btc: amt },
      Polkadot: { Dot: amt },
      Ethereum: { Eth: amt, Flip: amt, Usdc: amt },
    },
  },
});

import axios from 'axios';
import {
  getFundingEnvironment,
  getSwappingEnvironment,
  getIngressEgressEnvironment,
  getPoolsEnvironment,
} from '../index';

jest.mock('axios');

const mockResponse = (result: any) =>
  jest.mocked(axios.post).mockResolvedValueOnce({
    data: {
      id: 1,
      jsonrpc: '2.0',
      result,
    },
  });

describe('getFundingEnvironment', () => {
  it('retrieves the funding environment', async () => {
    const spy = mockResponse({
      redemption_tax: '0x4563918244f40000',
      minimum_funding_amount: '0x8ac7230489e80000',
    });

    expect(await getFundingEnvironment('perseverance')).toEqual({
      redemptionTax: BigInt('0x4563918244f40000'),
      minimumFundingAmount: BigInt('0x8ac7230489e80000'),
    });
    expect(spy.mock.calls).toMatchSnapshot();
  });
});

describe('getSwappingEnvironment', () => {
  it('retrieves the swapping environment', async () => {
    const spy = mockResponse({
      minimum_swap_amounts: {
        Bitcoin: { Btc: '0x4563918244f40000' },
        Ethereum: {
          Eth: '0x4563918244f40000',
          Usdc: '0x4563918244f40000',
          Flip: '0x4563918244f40000',
        },
        Polkadot: { Dot: '0x4563918244f40000' },
      },
    });

    expect(await getSwappingEnvironment('perseverance')).toEqual({
      minimumSwapAmounts: {
        Bitcoin: { BTC: BigInt('0x4563918244f40000') },
        Ethereum: {
          ETH: BigInt('0x4563918244f40000'),
          USDC: BigInt('0x4563918244f40000'),
          FLIP: BigInt('0x4563918244f40000'),
        },
        Polkadot: { DOT: BigInt('0x4563918244f40000') },
      },
    });
    expect(spy.mock.calls).toMatchSnapshot();
  });
});

describe('getIngressEgressEnvironment', () => {
  it('retrieves the ingress egress environment', async () => {
    const spy = mockResponse({
      minimum_deposit_amounts: {
        Bitcoin: { Btc: '0x4563918244f40000' },
        Ethereum: {
          Eth: '0x4563918244f40000',
          Usdc: '0x4563918244f40000',
          Flip: '0x4563918244f40000',
        },
        Polkadot: { Dot: '0x4563918244f40000' },
      },
    });

    expect(await getIngressEgressEnvironment('perseverance')).toEqual({
      minimumDepositAmounts: {
        Bitcoin: { BTC: BigInt('0x4563918244f40000') },
        Ethereum: {
          ETH: BigInt('0x4563918244f40000'),
          USDC: BigInt('0x4563918244f40000'),
          FLIP: BigInt('0x4563918244f40000'),
        },
        Polkadot: { DOT: BigInt('0x4563918244f40000') },
      },
    });
    expect(spy.mock.calls).toMatchSnapshot();
  });
});

describe('getPoolsEnvironment', () => {
  it('retrieves the pools environment', async () => {
    const spy = mockResponse({
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
      },
    });

    expect(await getPoolsEnvironment('perseverance')).toMatchSnapshot(
      'pool environment',
    );
    expect(spy.mock.calls).toMatchSnapshot();
  });
});

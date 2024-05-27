import {
  boostPoolsDepth,
  fundingEnvironment,
  ingressEgressEnvironment,
  mockRpcResponse,
  swappingEnvironment,
} from '../../tests/fixtures';
import {
  getFundingEnvironment,
  getSwappingEnvironment,
  getIngressEgressEnvironment,
  getAllBoostPoolsDepth,
} from '../index';

const mockResponse = (data: any) => mockRpcResponse({ data });

describe('getFundingEnvironment', () => {
  it('retrieves the funding environment', async () => {
    const spy = mockResponse(fundingEnvironment());

    expect(await getFundingEnvironment({ network: 'perseverance' })).toEqual({
      redemptionTax: 0x4563918244f40000n,
      minimumFundingAmount: 0x8ac7230489e80000n,
    });
    expect(spy.mock.calls).toMatchSnapshot();
  });
});

describe('getSwappingEnvironment', () => {
  it('retrieves the swapping environment', async () => {
    const spy = mockResponse(
      swappingEnvironment({
        maxSwapAmount: '0x4563918244f40000',
      }),
    );

    expect(await getSwappingEnvironment({ network: 'perseverance' })).toEqual({
      maximumSwapAmounts: {
        Arbitrum: {
          ETH: null,
          USDC: null,
        },
        Bitcoin: {
          BTC: 0x4563918244f40000n,
        },
        Ethereum: {
          ETH: null,
          FLIP: null,
          USDC: 0x4563918244f40000n,
          USDT: null,
        },
        Polkadot: {
          DOT: null,
        },
      },
      networkFeeHundredthPips: 1000,
    });
    expect(spy.mock.calls).toMatchSnapshot();
  });
});

describe('getIngressEgressEnvironment', () => {
  it('retrieves the ingress egress environment', async () => {
    const spy = mockResponse(
      ingressEgressEnvironment({
        minDepositAmount: '0x4563918244f40000',
        ingressFee: '0x4563918244f40000',
      }),
    );

    expect(await getIngressEgressEnvironment({ network: 'perseverance' })).toEqual({
      minimumDepositAmounts: {
        Arbitrum: {
          ETH: 0x4563918244f40000n,
          USDC: 0x4563918244f40000n,
        },
        Bitcoin: { BTC: 0x4563918244f40000n },
        Ethereum: {
          ETH: 0x4563918244f40000n,
          USDC: 0x4563918244f40000n,
          FLIP: 0x4563918244f40000n,
          USDT: 0x4563918244f40000n,
        },
        Polkadot: { DOT: 0x4563918244f40000n },
      },
      ingressFees: {
        Arbitrum: {
          ETH: 0x4563918244f40000n,
          USDC: 0x4563918244f40000n,
        },
        Bitcoin: { BTC: 0x4563918244f40000n },
        Ethereum: {
          ETH: 0x4563918244f40000n,
          USDC: 0x4563918244f40000n,
          FLIP: 0x4563918244f40000n,
          USDT: 0x4563918244f40000n,
        },
        Polkadot: { DOT: 0x4563918244f40000n },
      },
      egressFees: {
        Arbitrum: {
          ETH: 0n,
          USDC: 0n,
        },
        Bitcoin: {
          BTC: 0n,
        },
        Ethereum: {
          ETH: 0n,
          FLIP: 0n,
          USDC: 0n,
          USDT: 0n,
        },
        Polkadot: {
          DOT: 0n,
        },
      },
      minimumEgressAmounts: {
        Arbitrum: {
          ETH: 1n,
          USDC: 1n,
        },
        Bitcoin: {
          BTC: 0x258n,
        },
        Ethereum: {
          ETH: 1n,
          USDC: 1n,
          FLIP: 1n,
          USDT: 1n,
        },
        Polkadot: {
          DOT: 1n,
        },
      },
      witnessSafetyMargins: {
        Arbitrum: 1,
        Bitcoin: 2,
        Ethereum: 1,
        Polkadot: null,
      },
      channelOpeningFees: {
        Arbitrum: 0n,
        Bitcoin: 0n,
        Ethereum: 16n,
        Polkadot: 0n,
      },
    });
    expect(spy.mock.calls).toMatchSnapshot();
  });
});

describe('getAllBoostPoolsDepth', () => {
  it('retrieves the boost pools depth balance', async () => {
    const spy = mockResponse(boostPoolsDepth());

    expect(await getAllBoostPoolsDepth({ network: 'perseverance' })).toMatchSnapshot(
      'boost pools depth',
    );
    expect(spy.mock.calls).toMatchSnapshot();
  });
});

import { describe, it, expect } from 'vitest';
import {
  boostPoolsDepth,
  fundingEnvironment,
  ingressEgressEnvironment,
  mockRpcResponse,
  swappingEnvironment,
} from '../../tests/fixtures.js';
import {
  getFundingEnvironment,
  getSwappingEnvironment,
  getIngressEgressEnvironment,
  getAllBoostPoolsDepth,
} from '../index.js';

const mockResponse = (data: any) => mockRpcResponse({ data });

describe('getFundingEnvironment', () => {
  it('retrieves the funding environment', async () => {
    const spy = mockResponse(fundingEnvironment());

    expect(await getFundingEnvironment({ network: 'perseverance' })).toEqual({
      redemptionTax: 0x4563918244f40000n,
      minimumFundingAmount: 0x8ac7230489e80000n,
    });
    spy.mock.calls[0][1][0].id = '1';
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

    expect(await getSwappingEnvironment({ network: 'perseverance' })).toMatchInlineSnapshot(`
      {
        "maxSwapRequestDurationBlocks": 10,
        "maxSwapRetryDurationBlocks": 10,
        "maximumSwapAmounts": {
          "Arbitrum": {
            "ETH": null,
            "USDC": null,
            "USDT": null,
          },
          "Assethub": {
            "DOT": null,
            "USDC": null,
            "USDT": null,
          },
          "Bitcoin": {
            "BTC": 5000000000000000000n,
          },
          "Ethereum": {
            "ETH": null,
            "FLIP": null,
            "USDC": 5000000000000000000n,
            "USDT": null,
            "WBTC": null,
          },
          "Solana": {
            "SOL": null,
            "USDC": null,
          },
        },
        "minimumChunkSize": {
          "Arbitrum": {
            "ETH": 0n,
            "USDC": 0n,
            "USDT": 0n,
          },
          "Assethub": {
            "DOT": 0n,
            "USDC": 0n,
            "USDT": 0n,
          },
          "Bitcoin": {
            "BTC": 0n,
          },
          "Ethereum": {
            "ETH": 0n,
            "FLIP": 0n,
            "USDC": 0n,
            "USDT": 0n,
            "WBTC": 0n,
          },
          "Solana": {
            "SOL": 0n,
            "USDC": 0n,
          },
        },
        "networkFeeHundredthPips": 1000,
        "networkFees": {
          "internalSwapNetworkFee": {
            "rates": {
              "Arbitrum": {
                "ETH": 100n,
                "USDC": 100n,
                "USDT": 100n,
              },
              "Assethub": {
                "DOT": 100n,
                "USDC": 100n,
                "USDT": 100n,
              },
              "Bitcoin": {
                "BTC": 100n,
              },
              "Ethereum": {
                "ETH": 100n,
                "FLIP": 100n,
                "USDC": 100n,
                "USDT": 100n,
                "WBTC": 100n,
              },
              "Solana": {
                "SOL": 100n,
                "USDC": 100n,
              },
            },
            "standardRateAndMinimum": {
              "minimum": 500000n,
              "rate": 1000n,
            },
          },
          "regularNetworkFee": {
            "rates": {
              "Arbitrum": {
                "ETH": 1000n,
                "USDC": 1000n,
                "USDT": 1000n,
              },
              "Assethub": {
                "DOT": 1000n,
                "USDC": 1000n,
                "USDT": 1000n,
              },
              "Bitcoin": {
                "BTC": 1000n,
              },
              "Ethereum": {
                "ETH": 1000n,
                "FLIP": 1000n,
                "USDC": 1000n,
                "USDT": 1000n,
                "WBTC": 1000n,
              },
              "Solana": {
                "SOL": 1000n,
                "USDC": 1000n,
              },
            },
            "standardRateAndMinimum": {
              "minimum": 500000n,
              "rate": 1000n,
            },
          },
        },
        "swapRetryDelayBlocks": 5,
      }
    `);
    spy.mock.calls[0][1][0].id = '1';
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

    expect(await getIngressEgressEnvironment({ network: 'perseverance' })).toMatchInlineSnapshot(`
      {
        "boostDelays": {
          "Arbitrum": 0,
          "Assethub": 0,
          "Bitcoin": 0,
          "Ethereum": 0,
          "Solana": 0,
        },
        "channelOpeningFees": {
          "Arbitrum": 0n,
          "Assethub": 0n,
          "Bitcoin": 0n,
          "Ethereum": 16n,
          "Solana": 0n,
        },
        "egressFees": {
          "Arbitrum": {
            "ETH": 0n,
            "USDC": 0n,
            "USDT": 0n,
          },
          "Assethub": {
            "DOT": 0n,
            "USDC": 0n,
            "USDT": 0n,
          },
          "Bitcoin": {
            "BTC": 0n,
          },
          "Ethereum": {
            "ETH": 0n,
            "FLIP": 0n,
            "USDC": 0n,
            "USDT": 0n,
            "WBTC": 0n,
          },
          "Solana": {
            "SOL": 0n,
            "USDC": 0n,
          },
        },
        "ingressDelays": {
          "Arbitrum": 0,
          "Assethub": 0,
          "Bitcoin": 0,
          "Ethereum": 0,
          "Solana": 10,
        },
        "ingressFees": {
          "Arbitrum": {
            "ETH": 5000000000000000000n,
            "USDC": 5000000000000000000n,
            "USDT": 5000000000000000000n,
          },
          "Assethub": {
            "DOT": 5000000000000000000n,
            "USDC": 5000000000000000000n,
            "USDT": 5000000000000000000n,
          },
          "Bitcoin": {
            "BTC": 5000000000000000000n,
          },
          "Ethereum": {
            "ETH": 5000000000000000000n,
            "FLIP": 5000000000000000000n,
            "USDC": 5000000000000000000n,
            "USDT": 5000000000000000000n,
            "WBTC": 5000000000000000000n,
          },
          "Solana": {
            "SOL": 5000000000000000000n,
            "USDC": 5000000000000000000n,
          },
        },
        "minimumDepositAmounts": {
          "Arbitrum": {
            "ETH": 5000000000000000000n,
            "USDC": 5000000000000000000n,
            "USDT": 5000000000000000000n,
          },
          "Assethub": {
            "DOT": 5000000000000000000n,
            "USDC": 5000000000000000000n,
            "USDT": 5000000000000000000n,
          },
          "Bitcoin": {
            "BTC": 5000000000000000000n,
          },
          "Ethereum": {
            "ETH": 5000000000000000000n,
            "FLIP": 5000000000000000000n,
            "USDC": 5000000000000000000n,
            "USDT": 5000000000000000000n,
            "WBTC": 5000000000000000000n,
          },
          "Solana": {
            "SOL": 5000000000000000000n,
            "USDC": 5000000000000000000n,
          },
        },
        "minimumEgressAmounts": {
          "Arbitrum": {
            "ETH": 1n,
            "USDC": 1n,
            "USDT": 1n,
          },
          "Assethub": {
            "DOT": 1n,
            "USDC": 1n,
            "USDT": 1n,
          },
          "Bitcoin": {
            "BTC": 600n,
          },
          "Ethereum": {
            "ETH": 1n,
            "FLIP": 1n,
            "USDC": 1n,
            "USDT": 1n,
            "WBTC": 1n,
          },
          "Solana": {
            "SOL": 1n,
            "USDC": 1n,
          },
        },
        "witnessSafetyMargins": {
          "Arbitrum": 1,
          "Assethub": null,
          "Bitcoin": 2,
          "Ethereum": 1,
          "Solana": 1,
        },
      }
    `);
    spy.mock.calls[0][1][0].id = '1';
    expect(spy.mock.calls).toMatchSnapshot();
  });
});

describe('getAllBoostPoolsDepth', () => {
  it('retrieves the boost pools depth balance', async () => {
    const spy = mockResponse(boostPoolsDepth());

    expect(await getAllBoostPoolsDepth({ network: 'perseverance' })).toMatchSnapshot(
      'boost pools depth',
    );
    spy.mock.calls[0][1][0].id = '1';
    expect(spy.mock.calls).toMatchSnapshot();
  });
});

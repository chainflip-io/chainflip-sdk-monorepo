import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getLendingPools, getLendingConfig, getLendingPoolSupplyBalances } from '../rpc.js';

const mockSendRequest = vi.fn();

vi.mock('@chainflip/rpc', () => ({
  HttpClient: vi.fn().mockImplementation(() => ({ sendRequest: mockSendRequest })),
  constants: {
    PUBLIC_RPC_ENDPOINTS: {
      mainnet: 'https://mainnet-rpc.chainflip.io',
      perseverance: 'https://perseverance.rpc.chainflip.io',
      backspin: 'https://rpc.backspin.chainflip.io'
    },
  },
}));

beforeEach(() => {
  mockSendRequest.mockReset();
});

describe('getLendingPools', () => {
  const mockRpcResponse = [
    {
      asset: 'Usdc',
      total_amount: '0x1000',
      available_amount: '0x800',
      borrowed_amount: '0x800',
      supply_apy: '4.25',
      borrow_apy: '7.80',
      fees: { origination_fee_bps: 100, liquidation_fee_bps: 500 },
      interest_curve: {
        rate_at_zero_utilisation: '0.01',
        junction_utilisation: '0.80',
        rate_at_junction: '0.05',
        rate_at_max_utilisation: '0.20',
      },
    },
  ];

  it('calls cf_lending_pools with no extra params', async () => {
    mockSendRequest.mockResolvedValueOnce(mockRpcResponse);

    await getLendingPools({ network: 'mainnet' });

    expect(mockSendRequest).toHaveBeenCalledWith('cf_lending_pools');
  });

  it('uses the correct URL for a named network', async () => {
    const { HttpClient } = await import('@chainflip/rpc');
    mockSendRequest.mockResolvedValueOnce(mockRpcResponse);

    await getLendingPools({ network: 'perseverance' });

    expect(HttpClient).toHaveBeenCalledWith('https://perseverance.rpc.chainflip.io');
  });

  it('uses a custom rpcUrl when provided', async () => {
    const { HttpClient } = await import('@chainflip/rpc');
    mockSendRequest.mockResolvedValueOnce(mockRpcResponse);

    await getLendingPools({ rpcUrl: 'https://my-custom-rpc.example.com' });

    expect(HttpClient).toHaveBeenCalledWith('https://my-custom-rpc.example.com');
  });

  it('transforms snake_case response keys to camelCase', async () => {
    mockSendRequest.mockResolvedValueOnce(mockRpcResponse);

    const result = await getLendingPools({ network: 'mainnet' });

    expect(result).toEqual([
      {
        asset: 'Usdc',
        totalAmount: '0x1000',
        availableAmount: '0x800',
        borrowedAmount: '0x800',
        supplyApy: '4.25',
        borrowApy: '7.80',
        fees: { originationFeeBps: 100, liquidationFeeBps: 500 },
        interestCurve: {
          rateAtZeroUtilisation: '0.01',
          junctionUtilisation: '0.80',
          rateAtJunction: '0.05',
          rateAtMaxUtilisation: '0.20',
        },
      },
    ]);
  });
})


describe('getLendingConfig', () => {
  const mockRpcResponse = {
    ltv_thresholds: {
      target: '0.50',
      topup: '0.65',
      soft_liquidation: '0.75',
      hard_liquidation: '0.80',
      low_ltv: '0.20',
    },
    fee_contributions: {
      network_bps: 20,
      lender_bps: 70,
      broker_bps: 10,
    },
    intervals: {
      interest_interval_blocks: 100,
      liquidation_interval_blocks: 10,
    },
    max_slippage_bps: 50,
  };

  it('calls cf_lending_config with no extra params', async () => {
    mockSendRequest.mockResolvedValueOnce(mockRpcResponse);

    await getLendingConfig({ network: 'mainnet' });

    expect(mockSendRequest).toHaveBeenCalledWith('cf_lending_config');
  });

  it('transforms snake_case response keys to camelCase', async () => {
    mockSendRequest.mockResolvedValueOnce(mockRpcResponse);

    const result = await getLendingConfig({ network: 'mainnet' });

    expect(result).toEqual({
      ltvThresholds: {
        target: '0.50',
        topup: '0.65',
        softLiquidation: '0.75',
        hardLiquidation: '0.80',
        lowLtv: '0.20',
      },
      feeContributions: {
        networkBps: 20,
        lenderBps: 70,
        brokerBps: 10,
      },
      intervals: {
        interestIntervalBlocks: 100,
        liquidationIntervalBlocks: 10,
      },
      maxSlippageBps: 50,
    });
  });
});

describe('getLendingPoolSupplyBalances', () => {
  const mockRpcResponse = [
    {
      asset: 'Usdc',
      positions: [
        { lp_id: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY', amount: '0x2000' },
      ],
    },
  ];

  it('calls cf_lending_pool_supply_balances with no params when lpAccount is omitted', async () => {
    mockSendRequest.mockResolvedValueOnce(mockRpcResponse);

    await getLendingPoolSupplyBalances({ network: 'mainnet' });

    expect(mockSendRequest).toHaveBeenCalledWith('cf_lending_pool_supply_balances');
  });

  it('passes lpAccount as a param when provided', async () => {
    mockSendRequest.mockResolvedValueOnce(mockRpcResponse);
    const lpAccount = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY';

    await getLendingPoolSupplyBalances({ network: 'mainnet' }, lpAccount);

    expect(mockSendRequest).toHaveBeenCalledWith('cf_lending_pool_supply_balances', lpAccount);
  });

  it('transforms snake_case response keys to camelCase', async () => {
    mockSendRequest.mockResolvedValueOnce(mockRpcResponse);

    const result = await getLendingPoolSupplyBalances({ network: 'mainnet' });

    expect(result).toEqual([
      {
        asset: 'Usdc',
        positions: [
          { lpId: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY', amount: '0x2000' },
        ],
      },
    ]);
  });
});

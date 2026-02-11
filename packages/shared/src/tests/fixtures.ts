import {
  CfBoostPoolsDepthResponse,
  CfEnvironmentResponse,
  CfFundingEnvironmentResponse,
  CfIngressEgressEnvironmentResponse,
  CfPoolsEnvironmentResponse,
  CfSupportedAssetsResponse,
  CfSwapRateResponse,
  CfSwappingEnvironmentResponse,
} from '@chainflip/rpc/types';
import {
  ChainflipAsset,
  chainflipAssets,
  ChainflipChain,
  InternalAssetMap,
  ChainAssetMap,
  ChainMap,
  internalAssetToRpcAsset,
} from '@chainflip/utils/chainflip';
import { vi } from 'vitest';

type RpcResponse<T> = { id: number; jsonrpc: '2.0'; result: T };

export const createChainAssetMap = <T>(
  defaultValue: T,
  overrides?: Partial<InternalAssetMap<T>>,
): ChainAssetMap<T> => ({
  Bitcoin: { BTC: overrides?.Btc ?? defaultValue },
  Ethereum: {
    ETH: overrides?.Eth ?? defaultValue,
    FLIP: overrides?.Flip ?? defaultValue,
    USDC: overrides?.Usdc ?? defaultValue,
    USDT: overrides?.Usdt ?? defaultValue,
    WBTC: overrides?.Wbtc ?? defaultValue,
  },
  Arbitrum: {
    ETH: overrides?.ArbEth ?? defaultValue,
    USDC: overrides?.ArbUsdc ?? defaultValue,
    USDT: overrides?.ArbUsdt ?? defaultValue,
  },
  Solana: {
    SOL: overrides?.Sol ?? defaultValue,
    USDC: overrides?.SolUsdc ?? defaultValue,
    USDT: overrides?.SolUsdt ?? defaultValue,
  },
  Assethub: {
    DOT: overrides?.HubDot ?? defaultValue,
    USDC: overrides?.HubUsdc ?? defaultValue,
    USDT: overrides?.HubUsdt ?? defaultValue,
  },
});

const createChainMap = <T>(defaultValue: T, overrides?: Partial<ChainMap<T>>): ChainMap<T> => ({
  Bitcoin: overrides?.Bitcoin ?? defaultValue,
  Ethereum: overrides?.Ethereum ?? defaultValue,
  Arbitrum: overrides?.Arbitrum ?? defaultValue,
  Solana: overrides?.Solana ?? defaultValue,
  Assethub: overrides?.Assethub ?? defaultValue,
});

export const swappingEnvironment = ({
  maxSwapAmount = null as string | null,
}: {
  maxSwapAmount?: string | null;
} = {}): RpcResponse<CfSwappingEnvironmentResponse> => ({
  id: 1,
  jsonrpc: '2.0',
  result: {
    maximum_swap_amounts: createChainAssetMap(null, {
      Btc: maxSwapAmount,
      Usdc: maxSwapAmount,
    }),
    network_fee_hundredth_pips: 1000,
    max_swap_retry_duration_blocks: 10,
    max_swap_request_duration_blocks: 10,
    minimum_chunk_size: createChainAssetMap(0),
    swap_retry_delay_blocks: 5,
    network_fees: {
      internal_swap_network_fee: {
        rates: createChainAssetMap(100),
        standard_rate_and_minimum: {
          rate: 1000,
          minimum: 500_000,
        },
      },
      regular_network_fee: {
        rates: createChainAssetMap(1000),
        standard_rate_and_minimum: {
          rate: 1000,
          minimum: 500_000,
        },
      },
    },
  },
});

export const fundingEnvironment = (): RpcResponse<CfFundingEnvironmentResponse> => ({
  id: 1,
  jsonrpc: '2.0',
  result: {
    redemption_tax: '0x4563918244f40000',
    minimum_funding_amount: '0x8ac7230489e80000',
  },
});

export const ingressEgressEnvironment = ({
  minDepositAmount = '0x0',
  ingressFee = '0x0',
  egressFee = '0x0',
  minEgressAmount = '0x1',
  channelOpeningFee,
  boostDelay,
}: {
  minDepositAmount?: string;
  ingressFee?: string | null;
  egressFee?: string | null;
  minEgressAmount?: string;
  channelOpeningFee?: string;
  boostDelay?: Partial<Record<ChainflipChain, number>>;
} = {}): RpcResponse<CfIngressEgressEnvironmentResponse> => ({
  id: 1,
  jsonrpc: '2.0',
  result: {
    minimum_deposit_amounts: createChainAssetMap(minDepositAmount),
    ingress_fees: createChainAssetMap(ingressFee),
    egress_fees: createChainAssetMap(egressFee),
    witness_safety_margins: createChainMap(null, {
      Ethereum: 1,
      Bitcoin: 2,
      Arbitrum: 1,
      Solana: 1,
    }),
    egress_dust_limits: createChainAssetMap(minEgressAmount, { Btc: '0x258' }),
    channel_opening_fees: createChainMap(channelOpeningFee ?? '0x0', {
      Ethereum: '0x10',
    }),
    ingress_delays: createChainMap(0, {
      Solana: 10,
    }),
    boost_delays: createChainMap(
      0,
      boostDelay ?? {
        Bitcoin: 0,
      },
    ),
  },
});

const poolsEnvironment = (): RpcResponse<CfPoolsEnvironmentResponse> => {
  const fees = {
    limit_order_fee_hundredth_pips: 1000,
    limit_order_total_fees_earned: {
      base: '0x0',
      quote: '0x0',
    },
    range_order_fee_hundredth_pips: 1000,
    range_order_total_fees_earned: {
      base: '0x0',
      quote: '0x0',
    },
    range_total_swap_inputs: {
      base: '0x0',
      quote: '0x0',
    },
    limit_total_swap_inputs: {
      base: '0x0',
      quote: '0x0',
    },
    quote_asset: {
      asset: 'USDC',
      chain: 'Ethereum',
    },
  } as const;

  return {
    id: 1,
    jsonrpc: '2.0',
    result: {
      fees: createChainAssetMap(fees),
    },
  };
};

export const environment = ({
  maxSwapAmount = '0x0',
  minDepositAmount = '0x0',
  ingressFee = '0x0',
  egressFee = '0x0',
  minEgressAmount = '0x1',
  boostDelay,
}: {
  maxSwapAmount?: string | null;
  minDepositAmount?: string;
  ingressFee?: string | null;
  egressFee?: string | null;
  minEgressAmount?: string;
  boostDelay?: Partial<Record<ChainflipChain, number>>;
} = {}): RpcResponse<CfEnvironmentResponse> => ({
  id: 1,
  jsonrpc: '2.0',
  result: {
    ingress_egress: ingressEgressEnvironment({
      minDepositAmount,
      ingressFee,
      egressFee,
      minEgressAmount,
      boostDelay,
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
} = {}): RpcResponse<CfSwapRateResponse> => ({
  id: 1,
  jsonrpc: '2.0',
  result: {
    intermediary: null,
    output,
  },
});

export const supportedAssets = ({
  assets = chainflipAssets,
}: {
  assets?: readonly ChainflipAsset[] | ChainflipAsset[];
} = {}): RpcResponse<CfSupportedAssetsResponse> => ({
  id: 1,
  jsonrpc: '2.0',
  result: assets.map((asset) => internalAssetToRpcAsset[asset]),
});

export type MockedBoostPoolsDepth = CfBoostPoolsDepthResponse;

export const boostPoolsDepth = (
  mockedBoostPoolsDepth?: CfBoostPoolsDepthResponse,
): RpcResponse<CfBoostPoolsDepthResponse> => ({
  jsonrpc: '2.0',
  result: mockedBoostPoolsDepth ?? [
    { chain: 'Bitcoin', asset: 'BTC', tier: 5, available_amount: '0x0' },
    { chain: 'Bitcoin', asset: 'BTC', tier: 10, available_amount: '0x186aa' },
    { chain: 'Bitcoin', asset: 'BTC', tier: 30, available_amount: '0x0' },
  ],
  id: 1,
});

export const cfPoolDepth = () => ({
  jsonrpc: '2.0',
  result: {
    asks: {
      limit_orders: {
        price: null,
        depth: '0x0',
      },
      range_orders: {
        price: '0x44f2368f13d5f10e34b74a922',
        depth: '0x361d9235abbc10e2fd',
      },
    },
    bids: {
      limit_orders: {
        price: null,
        depth: '0x0',
      },
      range_orders: {
        price: '0x44f2368f13d5f10e34b74a922',
        depth: '0xe930e52f3e',
      },
    },
  },
  id: 'some-id',
});

export const cfAccountInfo = () => ({
  jsonrpc: '2.0',
  result: {
    role: 'liquidity_provider',
    asset_balances: createChainAssetMap('0x0', {
      Eth: '0x3c32edbbd8c4c54',
      Flip: '0xa2ac1bc07ee724bc6',
      Usdc: '0x79db7c',
      Usdt: '0x7c0a99',
      ArbUsdc: '0x14db3632',
    }),
    bond: 0,
    estimated_redeemable_balance: 0,
    refund_addresses: createChainMap(null, {
      Arbitrum: '0x7a9fc530cbeef967d212337cc5d47edf701550cc',
      Ethereum: '0x7a9fc530cbeef967d212337cc5d47edf701550cc',
      Bitcoin: 'bc1qstvpcgprgdh38q9xggwx4y04a537cr0p7qdz3g',
    }),
    flip_balance: '0x8ac2b439ff488240',
    earned_fees: createChainAssetMap('0x0', {
      Eth: '0x2703bfd2fe559',
      Flip: '0xe14bbc24d86251c',
      Usdc: '0x21082cc',
      Usdt: '0x14ed1f3',
      Btc: '0x9ed',
      ArbUsdc: '0x561984',
    }),
    boost_balances: createChainAssetMap([], {
      Btc: [
        {
          fee_tier: 5,
          total_balance: '0xf731c',
          available_balance: '0xf731c',
          in_use_balance: '0x0',
          is_withdrawing: false,
        },
        {
          fee_tier: 10,
          total_balance: '0x2f371',
          available_balance: '0x2f371',
          in_use_balance: '0x0',
          is_withdrawing: false,
        },
      ],
    }),
  },
  id: 'some-id',
});

export const mockRpcResponse = (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  cb: ((url: string, data: any) => Promise<{ data: any }>) | Promise<{ data: any }> | { data: any },
) => {
  const spy = vi.fn();

  vi.mocked(fetch).mockImplementation(async (url, init) => {
    const body = JSON.parse((init?.body as string | undefined) ?? '{}');

    let res;
    try {
      res = await (typeof cb === 'function' ? cb(url.toString(), body[0]) : cb);
    } catch (error) {
      return {
        ok: false,
        json: () => Promise.resolve({ error: (error as Error).message }),
      } as Response;
    }

    spy(url, body);

    return {
      ok: true,
      json: () => Promise.resolve([{ ...res.data, id: body[0].id }]),
    } as Response;
  });

  return spy;
};

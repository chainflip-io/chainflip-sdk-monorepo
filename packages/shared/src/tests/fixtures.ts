import { AssetAndChain } from '@chainflip/rpc/parsers';
import {
  CfBoostPoolsDepthResponse,
  CfEnvironmentResponse,
  CfFundingEnvironmentResponse,
  CfIngressEgressEnvironmentResponse,
  CfSupportedAssetsResponse,
  CfSwapRateResponse,
  CfSwappingEnvironmentResponse,
} from '@chainflip/rpc/types';
import {
  Asset,
  assetConstants,
  AssetOfChain,
  Chain,
  chainConstants,
  InternalAsset,
  InternalAssets,
} from '../enums';

type RpcResponse<T> = { id: number; jsonrpc: '2.0'; result: T };

export const swappingEnvironment = ({
  maxSwapAmount = null as string | null,
}: {
  maxSwapAmount?: string | null;
} = {}): RpcResponse<CfSwappingEnvironmentResponse> => ({
  id: 1,
  jsonrpc: '2.0',
  result: {
    maximum_swap_amounts: {
      Polkadot: { DOT: null },
      Bitcoin: { BTC: maxSwapAmount },
      Ethereum: { ETH: null, USDC: maxSwapAmount, FLIP: null, USDT: null },
      Arbitrum: { ETH: null, USDC: null },
    },
    network_fee_hundredth_pips: 1000,
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
}: {
  minDepositAmount?: string;
  ingressFee?: string | null;
  egressFee?: string | null;
  minEgressAmount?: string;
  channelOpeningFee?: string;
} = {}): RpcResponse<CfIngressEgressEnvironmentResponse> => ({
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
        USDT: minDepositAmount,
      },
      Arbitrum: {
        ETH: minDepositAmount,
        USDC: minDepositAmount,
      },
    },
    ingress_fees: {
      Bitcoin: { BTC: ingressFee },
      Polkadot: { DOT: ingressFee },
      Ethereum: { ETH: ingressFee, FLIP: ingressFee, USDC: ingressFee, USDT: ingressFee },
      Arbitrum: { ETH: ingressFee, USDC: ingressFee },
    },
    egress_fees: {
      Bitcoin: { BTC: egressFee },
      Polkadot: { DOT: egressFee },
      Ethereum: { ETH: egressFee, FLIP: egressFee, USDC: egressFee, USDT: egressFee },
      Arbitrum: { ETH: egressFee, USDC: egressFee },
    },
    witness_safety_margins: {
      Ethereum: 1,
      Polkadot: null,
      Bitcoin: 2,
      Arbitrum: 1,
    },
    egress_dust_limits: {
      Ethereum: {
        ETH: minEgressAmount,
        USDC: minEgressAmount,
        FLIP: minEgressAmount,
        USDT: minEgressAmount,
      },
      Arbitrum: {
        ETH: minEgressAmount,
        USDC: minEgressAmount,
      },
      Polkadot: { DOT: minEgressAmount },
      Bitcoin: { BTC: '0x258' },
    },
    channel_opening_fees: {
      Bitcoin: channelOpeningFee ?? '0x0',
      Ethereum: channelOpeningFee ?? '0x10',
      Polkadot: channelOpeningFee ?? '0x0',
      Arbitrum: channelOpeningFee ?? '0x0',
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
} = {}): RpcResponse<CfEnvironmentResponse> => ({
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
  assets = Object.values(InternalAssets),
}: {
  assets?: InternalAsset[];
} = {}): RpcResponse<CfSupportedAssetsResponse> => ({
  id: 1,
  jsonrpc: '2.0',
  result: assets.map((asset) => ({
    asset: assetConstants[asset].asset,
    chain: assetConstants[asset].chain,
  })) as AssetAndChain[],
});

type BoostPool = {
  chain: Chain;
  asset: Asset;
  tier: number;
  available_amount: string;
};

export type MockedBoostPoolsDepth = CfBoostPoolsDepthResponse;

export const boostPoolsDepth = (
  mockedBoostPoolsDepth?: CfBoostPoolsDepthResponse,
): RpcResponse<CfBoostPoolsDepthResponse> => ({
  jsonrpc: '2.0',
  result:
    mockedBoostPoolsDepth ??
    (Object.entries({
      ...(Object.fromEntries(
        Object.entries(chainConstants).flatMap(([chain, { assets }]) =>
          assets.flatMap((asset) =>
            [5, 10, 30].map((tier) => [
              `${chain}-${asset}-${tier.toString().padStart(2, '0')}`,
              { chain, asset, tier, available_amount: '0x0' },
            ]),
          ),
        ),
      ) as {
        [C in Chain as `${C}-${AssetOfChain<C>}-${number}`]: BoostPool;
      }),
      'Bitcoin-BTC-10': {
        chain: 'Bitcoin',
        asset: 'BTC',
        tier: 10,
        available_amount: '0x186aa',
      },
    })
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, pool]) => pool) as CfBoostPoolsDepthResponse),
  id: 1,
});

export const mockRpcResponse = (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  cb: ((url: string, data: any) => Promise<{ data: any }>) | Promise<{ data: any }> | { data: any },
) => {
  const spy = jest.fn();

  jest.mocked(fetch).mockImplementation(async (url, init) => {
    const body = JSON.parse((init?.body as string | undefined) ?? '{}');

    const res = await (typeof cb === 'function' ? cb(url.toString(), body) : cb);

    spy(url, body);

    return {
      ok: true,
      json: () => Promise.resolve(res.data),
    } as Response;
  });

  return spy;
};

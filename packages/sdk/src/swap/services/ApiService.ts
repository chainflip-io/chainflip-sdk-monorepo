import axios from 'axios';
import type { ChainflipNetwork } from '@/shared/enums';
import type {
  QuoteQueryParams,
  QuoteResponse,
  SwapRequestBody,
} from '@/shared/schemas';
import { ChainId } from '../consts';
import {
  bitcoin,
  polkadot,
  dot$,
  ethereum,
  btc$,
  ethereumTokens,
  testnetChains,
  testnetTokens,
} from '../mocks';
import {
  Chain,
  RouteRequest,
  RouteResponse,
  SwapRequest,
  SwapResponse,
  SwapStatusRequest,
  SwapStatusResponse,
  Token,
} from '../types';
import { isTestnet } from '../utils';

const getChains = async (network: ChainflipNetwork): Promise<Chain[]> => {
  if (isTestnet(network)) {
    return testnetChains([ethereum, polkadot, bitcoin]);
  }
  return [ethereum, polkadot, bitcoin];
};

const getPossibleDestinationChains = async (
  chainId: ChainId,
  network: ChainflipNetwork,
): Promise<Chain[]> => {
  if (isTestnet(network)) {
    if (chainId === ChainId.Ethereum) return testnetChains([polkadot, bitcoin]);
    if (chainId === ChainId.Polkadot) return testnetChains([ethereum, bitcoin]);
    if (chainId === ChainId.Bitcoin) return testnetChains([ethereum, polkadot]);
    throw new Error('received testnet flag but mainnet chainId');
  }

  if (chainId === ChainId.Ethereum) return [bitcoin, polkadot];
  if (chainId === ChainId.Polkadot) return [ethereum, bitcoin];
  if (chainId === ChainId.Bitcoin) return [ethereum, polkadot];
  throw new Error('received unknown chainId');
};

const getTokens = async (
  chainId: ChainId,
  network: ChainflipNetwork,
): Promise<Token[]> => {
  if (isTestnet(network)) {
    if (chainId === ChainId.Ethereum) return testnetTokens(ethereumTokens);
    if (chainId === ChainId.Polkadot) return testnetTokens([dot$]);
    if (chainId === ChainId.Bitcoin) return testnetTokens([btc$]);
    throw new Error('received testnet flag but mainnet chainId');
  }

  if (chainId === ChainId.Ethereum) return ethereumTokens;
  if (chainId === ChainId.Polkadot) return [dot$];
  if (chainId === ChainId.Bitcoin) return [btc$];
  throw new Error('received unknown chainId');
};

export type RequestOptions = {
  signal?: AbortSignal;
};

type BackendQuery<T, U> = (
  baseUrl: string,
  args: T,
  options: RequestOptions,
) => Promise<U>;

const getRoute: BackendQuery<RouteRequest, RouteResponse> = async (
  baseUrl,
  { amount, ...routeRequest },
  { signal },
) => {
  const params: QuoteQueryParams = {
    amount,
    srcAsset: routeRequest.srcTokenSymbol,
    destAsset: routeRequest.destTokenSymbol,
  };

  const queryParams = new URLSearchParams(params);

  const url = new URL(`/quote?${queryParams.toString()}`, baseUrl).toString();

  const { data } = await axios.get<QuoteResponse>(url, { signal });

  return { quote: data, ...routeRequest };
};

const requestDepositAddress: BackendQuery<SwapRequest, SwapResponse> = async (
  baseUrl,
  route,
  { signal },
) => {
  const body: SwapRequestBody = {
    destAddress: route.destAddress,
    srcAsset: route.srcTokenSymbol,
    destAsset: route.destTokenSymbol,
    expectedDepositAmount: route.expectedDepositAmount,
  };

  const url = new URL('/swaps', baseUrl).toString();

  const { data } = await axios.post<SwapResponse>(url, body, { signal });

  return data;
};

const getStatus: BackendQuery<SwapStatusRequest, SwapStatusResponse> = async (
  baseUrl,
  { swapDepositChannelId },
  { signal },
): Promise<SwapStatusResponse> => {
  const url = new URL(`/swaps/${swapDepositChannelId}`, baseUrl).toString();
  const { data } = await axios.get<SwapStatusResponse>(url, {
    signal,
  });
  return data;
};

export default {
  getChains,
  getPossibleDestinationChains,
  getRoute,
  getTokens,
  getStatus,
  requestDepositAddress,
};

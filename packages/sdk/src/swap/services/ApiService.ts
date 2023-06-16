import axios from 'axios';
import {
  type ChainflipNetwork,
  isTestnet,
  SupportedChain,
} from '@/shared/enums';
import type {
  QuoteQueryParams,
  QuoteResponse,
  SwapRequestBody,
} from '@/shared/schemas';
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

const getChains = async (network: ChainflipNetwork): Promise<Chain[]> => {
  if (isTestnet(network)) {
    return testnetChains([ethereum, polkadot, bitcoin]);
  }
  return [ethereum, polkadot, bitcoin];
};

const getPossibleDestinationChains = async (
  sourceChain: SupportedChain,
  network: ChainflipNetwork,
): Promise<Chain[]> => {
  if (isTestnet(network)) {
    if (sourceChain === 'Ethereum') return testnetChains([polkadot, bitcoin]);
    if (sourceChain === 'Polkadot') return testnetChains([ethereum, bitcoin]);
    if (sourceChain === 'Bitcoin') return testnetChains([ethereum, polkadot]);
    throw new Error('received testnet flag but mainnet chain');
  }

  if (sourceChain === 'Ethereum') return [bitcoin, polkadot];
  if (sourceChain === 'Polkadot') return [ethereum, bitcoin];
  if (sourceChain === 'Bitcoin') return [ethereum, polkadot];
  throw new Error('received unknown chain');
};

const getTokens = async (
  chain: SupportedChain,
  network: ChainflipNetwork,
): Promise<Token[]> => {
  if (isTestnet(network)) {
    if (chain === 'Ethereum') return testnetTokens(ethereumTokens);
    if (chain === 'Polkadot') return testnetTokens([dot$]);
    if (chain === 'Bitcoin') return testnetTokens([btc$]);
    throw new Error('received testnet flag but mainnet chain');
  }

  if (chain === 'Ethereum') return ethereumTokens;
  if (chain === 'Polkadot') return [dot$];
  if (chain === 'Bitcoin') return [btc$];
  throw new Error('received unknown chain');
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

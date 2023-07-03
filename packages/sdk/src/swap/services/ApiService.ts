import axios from 'axios';
import {
  type ChainflipNetwork,
  isTestnet,
  Chain,
  Chains,
} from '@/shared/enums';
import type {
  QuoteQueryParams,
  QuoteQueryResponse,
  SwapRequestBody,
} from '@/shared/schemas';
import { PostSwapResponse } from '@/shared/schemas';
import {
  bitcoin,
  polkadot,
  dot$,
  ethereum,
  btc$,
  ethereumAssets,
  testnetChains,
  testnetAssets,
} from '../mocks';
import {
  ChainData,
  QuoteRequest,
  QuoteResponse,
  DepositAddressRequest,
  DepositAddressResponse,
  SwapStatusRequest,
  SwapStatusResponse,
  AssetData,
} from '../types';

const getChains = async (network: ChainflipNetwork): Promise<ChainData[]> => {
  if (isTestnet(network)) {
    return testnetChains([ethereum, polkadot, bitcoin]);
  }
  return [ethereum, polkadot, bitcoin];
};

const getPossibleDestinationChains = async (
  sourceChain: Chain,
  network: ChainflipNetwork,
): Promise<ChainData[]> => {
  if (isTestnet(network)) {
    if (sourceChain === Chains.Ethereum)
      return testnetChains([polkadot, bitcoin]);
    if (sourceChain === Chains.Polkadot)
      return testnetChains([ethereum, bitcoin]);
    if (sourceChain === Chains.Bitcoin)
      return testnetChains([ethereum, polkadot]);
    throw new Error('received testnet flag but mainnet chain');
  }

  if (sourceChain === Chains.Ethereum) return [bitcoin, polkadot];
  if (sourceChain === Chains.Polkadot) return [ethereum, bitcoin];
  if (sourceChain === Chains.Bitcoin) return [ethereum, polkadot];
  throw new Error('received unknown chain');
};

const getAssets = async (
  chain: Chain,
  network: ChainflipNetwork,
): Promise<AssetData[]> => {
  if (isTestnet(network)) {
    if (chain === Chains.Ethereum) return testnetAssets(ethereumAssets);
    if (chain === Chains.Polkadot) return testnetAssets([dot$]);
    if (chain === Chains.Bitcoin) return testnetAssets([btc$]);
    throw new Error('received testnet flag but mainnet chain');
  }

  if (chain === Chains.Ethereum) return ethereumAssets;
  if (chain === Chains.Polkadot) return [dot$];
  if (chain === Chains.Bitcoin) return [btc$];
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

const getQuote: BackendQuery<QuoteRequest, QuoteResponse> = async (
  baseUrl,
  quoteRequest,
  { signal },
) => {
  const params: QuoteQueryParams = {
    amount: quoteRequest.amount,
    srcAsset: quoteRequest.srcAsset,
    destAsset: quoteRequest.destAsset,
  };

  const queryParams = new URLSearchParams(params);

  const url = new URL(`/quote?${queryParams.toString()}`, baseUrl).toString();

  const { data } = await axios.get<QuoteQueryResponse>(url, { signal });

  return { ...quoteRequest, quote: data };
};

const requestDepositAddress: BackendQuery<
  DepositAddressRequest,
  DepositAddressResponse
> = async (baseUrl, swapRequest, { signal }) => {
  const body: SwapRequestBody = {
    destAddress: swapRequest.destAddress,
    srcAsset: swapRequest.srcAsset,
    destAsset: swapRequest.destAsset,
    amount: swapRequest.amount,
  };

  const url = new URL('/swaps', baseUrl).toString();

  const { data } = await axios.post<PostSwapResponse>(url, body, { signal });

  return {
    ...swapRequest,
    depositChannelId: data.id,
    depositAddress: data.depositAddress,
  };
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
  getQuote,
  getAssets,
  getStatus,
  requestDepositAddress,
};

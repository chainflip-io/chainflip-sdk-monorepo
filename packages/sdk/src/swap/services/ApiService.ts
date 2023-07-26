import axios from 'axios';
import { type ChainflipNetwork, Chain, Chains } from '@/shared/enums';
import type {
  QuoteQueryParams,
  QuoteQueryResponse,
  SwapRequestBody,
} from '@/shared/schemas';
import { PostSwapResponse } from '@/shared/schemas';
import { dot$, btc$, eth$, usdc$, flip$ } from '../assets';
import { bitcoin, ethereum, polkadot } from '../chains';
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

const getChains = async (network: ChainflipNetwork): Promise<ChainData[]> => [
  ethereum(network),
  polkadot(network),
  bitcoin(network),
];

const getPossibleDestinationChains = async (
  sourceChain: Chain,
  network: ChainflipNetwork,
): Promise<ChainData[]> => {
  if (sourceChain === Chains.Ethereum)
    return [ethereum(network), bitcoin(network), polkadot(network)];
  if (sourceChain === Chains.Polkadot)
    return [ethereum(network), bitcoin(network)];
  if (sourceChain === Chains.Bitcoin)
    return [ethereum(network), polkadot(network)];
  throw new Error('received unknown chain');
};

const getAssets = async (
  chain: Chain,
  network: ChainflipNetwork,
): Promise<AssetData[]> => {
  if (chain === Chains.Ethereum)
    return [eth$(network), usdc$(network), flip$(network)];
  if (chain === Chains.Polkadot) return [dot$(network)];
  if (chain === Chains.Bitcoin) return [btc$(network)];
  throw new Error('received unexpected chain');
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
> = async (baseUrl, depositAddressRequest, { signal }) => {
  const body: SwapRequestBody = {
    destAddress: depositAddressRequest.destAddress,
    srcAsset: depositAddressRequest.srcAsset,
    destAsset: depositAddressRequest.destAsset,
    srcChain: depositAddressRequest.srcChain,
    destChain: depositAddressRequest.destChain,
    amount: depositAddressRequest.amount,
    ccmMetadata: depositAddressRequest.ccmMetadata,
  };

  const url = new URL('/swaps', baseUrl).toString();

  const { data } = await axios.post<PostSwapResponse>(url, body, { signal });

  return {
    ...depositAddressRequest,
    depositChannelId: data.id,
    depositAddress: data.depositAddress,
  };
};

const getStatus: BackendQuery<SwapStatusRequest, SwapStatusResponse> = async (
  baseUrl,
  { id },
  { signal },
): Promise<SwapStatusResponse> => {
  const url = new URL(`/swaps/${id}`, baseUrl).toString();
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

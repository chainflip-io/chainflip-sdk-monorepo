import axios from 'axios';
import { type ChainflipNetwork, Chain, Chains, ChainflipNetworks } from '@/shared/enums';
import type { Environment } from '@/shared/rpc';
import type { QuoteQueryParams, QuoteQueryResponse } from '@/shared/schemas';
import { dot$, btc$, eth$, usdc$, flip$, usdt$, arbeth$, arbusdc$ } from '../assets';
import { arbitrum, bitcoin, ethereum, polkadot } from '../chains';
import {
  ChainData,
  QuoteRequest,
  QuoteResponse,
  SwapStatusRequest,
  SwapStatusResponse,
  AssetData,
} from '../types';

const getChains = async (
  network: ChainflipNetwork,
  env: Pick<Environment, 'ingressEgress'>,
): Promise<ChainData[]> => {
  const chains = [ethereum(network, env), polkadot(network, env), bitcoin(network, env)];
  return network === 'backspin' ? [...chains, arbitrum(network, env)] : chains; // TODO: remove condition once arbitrum is available on all networks
};

const getPossibleDestinationChains = async (
  sourceChain: Chain,
  network: ChainflipNetwork,
  env: Pick<Environment, 'ingressEgress'>,
): Promise<ChainData[]> => {
  let chains: ChainData[] = [];
  if (sourceChain === Chains.Ethereum) {
    chains = [ethereum(network, env), bitcoin(network, env), polkadot(network, env)];
  }
  if (sourceChain === Chains.Polkadot) {
    chains = [ethereum(network, env), bitcoin(network, env)];
  }
  if (sourceChain === Chains.Bitcoin) {
    chains = [ethereum(network, env), polkadot(network, env)];
  }
  if (sourceChain === Chains.Arbitrum && network === 'backspin') {
    // TODO: remove condition once arbitrum is available on all networks
    chains = [ethereum(network, env), bitcoin(network, env), polkadot(network, env)];
  }
  if (chains.length > 0) {
    return network === 'backspin' ? [...chains, arbitrum(network, env)] : chains; // TODO: remove condition once arbitrum is available on all networks
  }

  throw new Error('received unknown chain');
};

const getAssets = async (
  chain: Chain,
  network: ChainflipNetwork,
  env: Pick<Environment, 'swapping' | 'ingressEgress'>,
): Promise<AssetData[]> => {
  if (chain === Chains.Ethereum) {
    return network === ChainflipNetworks.backspin || network === ChainflipNetworks.sisyphos
      ? [eth$(network, env), usdc$(network, env), flip$(network, env), usdt$(network, env)]
      : [eth$(network, env), usdc$(network, env), flip$(network, env)];
  }
  if (chain === Chains.Polkadot) {
    return [dot$(network, env)];
  }
  if (chain === Chains.Bitcoin) {
    return [btc$(network, env)];
  }
  if (chain === Chains.Arbitrum) {
    return network === ChainflipNetworks.backspin
      ? [arbeth$(network, env), arbusdc$(network, env)]
      : [];
  }

  throw new Error('received unexpected chain');
};

export type RequestOptions = {
  signal?: AbortSignal;
};

type BackendQuery<T, U> = (baseUrl: string, args: T, options: RequestOptions) => Promise<U>;

const getQuote: BackendQuery<
  QuoteRequest & { brokerCommissionBps?: number },
  QuoteResponse
> = async (baseUrl, quoteRequest, { signal }) => {
  const { brokerCommissionBps, boostFeeBps, ...returnedRequestData } = quoteRequest;
  const params: QuoteQueryParams = {
    amount: returnedRequestData.amount,
    srcChain: returnedRequestData.srcChain,
    srcAsset: returnedRequestData.srcAsset,
    destChain: returnedRequestData.destChain,
    destAsset: returnedRequestData.destAsset,
    ...(brokerCommissionBps && {
      brokerCommissionBps: String(brokerCommissionBps),
    }),
    ...(boostFeeBps && {
      boostFeeBps: String(boostFeeBps),
    }),
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const queryParams = new URLSearchParams(params as Record<string, any>);

  const url = new URL(`/quote?${queryParams.toString()}`, baseUrl).toString();

  const { data } = await axios.get<QuoteQueryResponse>(url, { signal });

  return { ...returnedRequestData, quote: data };
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
};

import type { QuoteQueryResponse } from '@/shared/schemas';
import { CF_SDK_VERSION_HEADERS } from '../consts';
import { QuoteRequest, QuoteResponse, SwapStatusRequest, SwapStatusResponse } from '../types';

export type RequestOptions = {
  signal?: AbortSignal;
};

type BackendQuery<T, U> = (baseUrl: string, args: T, options: RequestOptions) => Promise<U>;

export const getQuote: BackendQuery<
  QuoteRequest & { brokerCommissionBps?: number },
  QuoteResponse
> = async (baseUrl, quoteRequest, { signal }) => {
  const { brokerCommissionBps, ...returnedRequestData } = quoteRequest;

  const url = new URL('/quote', baseUrl);
  url.searchParams.set('amount', returnedRequestData.amount);
  url.searchParams.set('srcChain', returnedRequestData.srcChain);
  url.searchParams.set('srcAsset', returnedRequestData.srcAsset);
  url.searchParams.set('destChain', returnedRequestData.destChain);
  url.searchParams.set('destAsset', returnedRequestData.destAsset);
  if (brokerCommissionBps) {
    url.searchParams.set('brokerCommissionBps', String(brokerCommissionBps));
  }

  const res = await fetch(url, { signal, headers: CF_SDK_VERSION_HEADERS });

  if (!res.ok) throw new Error(`Failed to get quote: ${res.statusText}`);

  return { ...returnedRequestData, quote: (await res.json()) as QuoteQueryResponse };
};

export const getStatus: BackendQuery<SwapStatusRequest, SwapStatusResponse> = async (
  baseUrl,
  { id },
  { signal },
): Promise<SwapStatusResponse> => {
  const res = await fetch(new URL(`/swaps/${id}`, baseUrl), {
    signal,
    headers: CF_SDK_VERSION_HEADERS,
  });

  if (!res.ok) throw new Error(`Failed to get quote: ${res.statusText}`);

  return res.json();
};

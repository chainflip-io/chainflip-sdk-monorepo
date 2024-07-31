import axios from 'axios';
import type { QuoteQueryParams, QuoteQueryResponse } from '@/shared/schemas';
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
  const params: QuoteQueryParams = {
    amount: returnedRequestData.amount,
    srcChain: returnedRequestData.srcChain,
    srcAsset: returnedRequestData.srcAsset,
    destChain: returnedRequestData.destChain,
    destAsset: returnedRequestData.destAsset,
    ...(brokerCommissionBps && {
      brokerCommissionBps: String(brokerCommissionBps),
    }),
  };

  const { data } = await axios.get<QuoteQueryResponse>('/quote', {
    baseURL: baseUrl,
    params,
    signal,
    headers: CF_SDK_VERSION_HEADERS,
  });

  return { ...returnedRequestData, quote: data };
};

export const getStatus: BackendQuery<SwapStatusRequest, SwapStatusResponse> = async (
  baseUrl,
  { id },
  { signal },
): Promise<SwapStatusResponse> => {
  const { data } = await axios.get<SwapStatusResponse>(`/swaps/${id}`, {
    baseURL: baseUrl,
    signal,
    headers: CF_SDK_VERSION_HEADERS,
  });
  return data;
};

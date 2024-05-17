import axios from 'axios';
import type { QuoteQueryParams, QuoteQueryResponse } from '@/shared/schemas';
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const queryParams = new URLSearchParams(params as Record<string, any>);

  const url = new URL(`/quote?${queryParams.toString()}`, baseUrl).toString();

  const { data } = await axios.get<QuoteQueryResponse>(url, { signal });

  return { ...returnedRequestData, quote: data };
};

export const getStatus: BackendQuery<SwapStatusRequest, SwapStatusResponse> = async (
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

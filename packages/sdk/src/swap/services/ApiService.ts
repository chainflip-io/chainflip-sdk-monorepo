import axios from 'axios';
import type { QuoteQueryParams, Quote } from '@/shared/schemas';
import { CF_SDK_VERSION_HEADERS } from '../consts';
import {
  QuoteRequest,
  QuoteResponse,
  QuoteResponseV2,
  SwapStatusRequest,
  SwapStatusResponse,
} from '../types';
import { SwapStatusResponseV2 } from '../v2/types';

export type RequestOptions = {
  signal?: AbortSignal;
};

type BackendQuery<T, U> = (baseUrl: string, args: T, options: RequestOptions) => Promise<U>;

export const getQuote: BackendQuery<
  Omit<QuoteRequest, 'affiliateBrokers' | 'ccmParams'> & {
    ccmGasBudget?: string;
    ccmMessageLengthBytes?: number;
  },
  QuoteResponse
> = async (baseUrl, quoteRequest, { signal }) => {
  const { brokerCommissionBps, ccmGasBudget, ccmMessageLengthBytes, ...returnedRequestData } =
    quoteRequest;
  const params: QuoteQueryParams = {
    amount: returnedRequestData.amount,
    srcChain: returnedRequestData.srcChain,
    srcAsset: returnedRequestData.srcAsset,
    destChain: returnedRequestData.destChain,
    destAsset: returnedRequestData.destAsset,
    isVaultSwap: String(Boolean(quoteRequest.isVaultSwap)),
    ccmGasBudget: String(ccmGasBudget),
    ccmMessageLengthBytes: String(ccmMessageLengthBytes),
    ...(brokerCommissionBps && {
      brokerCommissionBps: String(brokerCommissionBps),
    }),
    dcaEnabled: 'false',
  };

  const { data } = await axios.get<Quote>('/quote', {
    baseURL: baseUrl,
    params,
    signal,
    headers: CF_SDK_VERSION_HEADERS,
  });

  return { ...returnedRequestData, quote: data };
};

export const getQuoteV2: BackendQuery<
  Omit<QuoteRequest, 'affiliateBrokers' | 'ccmParams'> & {
    ccmGasBudget?: string;
    ccmMessageLengthBytes?: number;
    dcaEnabled: boolean;
  },
  QuoteResponseV2
> = async (baseUrl, quoteRequest, { signal }) => {
  const { brokerCommissionBps, ccmGasBudget, ccmMessageLengthBytes, ...returnedRequestData } =
    quoteRequest;
  const params: QuoteQueryParams = {
    amount: returnedRequestData.amount,
    srcChain: returnedRequestData.srcChain,
    srcAsset: returnedRequestData.srcAsset,
    destChain: returnedRequestData.destChain,
    destAsset: returnedRequestData.destAsset,
    isVaultSwap: String(Boolean(quoteRequest.isVaultSwap)),
    ccmGasBudget: String(ccmGasBudget),
    ccmMessageLengthBytes: String(ccmMessageLengthBytes),
    ...(brokerCommissionBps && {
      brokerCommissionBps: String(brokerCommissionBps),
    }),
    dcaEnabled: String(Boolean(quoteRequest.dcaEnabled)),
  };

  const { data } = await axios.get<Quote[]>('/v2/quote', {
    baseURL: baseUrl,
    params,
    signal,
    headers: CF_SDK_VERSION_HEADERS,
  });

  return { ...returnedRequestData, quotes: data };
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

export const getStatusV2: BackendQuery<SwapStatusRequest, SwapStatusResponseV2> = async (
  baseUrl,
  { id },
  { signal },
): Promise<SwapStatusResponseV2> => {
  const { data } = await axios.get<SwapStatusResponseV2>(`/v2/swaps/${id}`, {
    baseURL: baseUrl,
    signal,
    headers: CF_SDK_VERSION_HEADERS,
  });
  return data;
};

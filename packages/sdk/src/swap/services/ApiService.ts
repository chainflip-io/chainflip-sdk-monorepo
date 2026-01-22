import axios from 'axios';
import type { QuoteQueryParams, Quote } from '@/shared/schemas.js';
import { CF_SDK_VERSION_HEADERS } from '../consts.js';
import { QuoteRequest, QuoteResponseV2, SwapStatusRequest } from '../types.js';
import { SwapStatusResponseV2 } from '../v2/types.js';

export type RequestOptions = {
  signal?: AbortSignal;
};

type BackendQuery<T, U> = (baseUrl: string, args: T, options: RequestOptions) => Promise<U>;

export const getQuoteV2: BackendQuery<
  QuoteRequest & {
    dcaEnabled: boolean;
    dcaV2Enabled: boolean;
  },
  QuoteResponseV2
> = async (baseUrl, quoteRequest, { signal }) => {
  const affiliateCommissionBps =
    quoteRequest.affiliateBrokers?.reduce((acc, affiliate) => acc + affiliate.commissionBps, 0) ??
    0;
  const totalBrokerCommissionBps = (quoteRequest.brokerCommissionBps ?? 0) + affiliateCommissionBps;

  const params: QuoteQueryParams = {
    amount: quoteRequest.amount,
    srcChain: quoteRequest.srcChain,
    srcAsset: quoteRequest.srcAsset,
    destChain: quoteRequest.destChain,
    destAsset: quoteRequest.destAsset,
    isVaultSwap: String(Boolean(quoteRequest.isVaultSwap)),
    isOnChain: String(Boolean(quoteRequest.isOnChain)),
    ...(totalBrokerCommissionBps && {
      brokerCommissionBps: String(totalBrokerCommissionBps),
    }),
    ...(quoteRequest.ccmParams && {
      ccmGasBudget: quoteRequest.ccmParams.gasBudget,
      ccmMessageLengthBytes: String(quoteRequest.ccmParams.messageLengthBytes),
    }),
    dcaEnabled: String(Boolean(quoteRequest.dcaEnabled)),
    dcaV2Enabled: String(Boolean(quoteRequest.dcaV2Enabled)),
  };

  const { data } = await axios.get<Quote[]>('/v2/quote', {
    baseURL: baseUrl,
    params,
    signal,
    headers: CF_SDK_VERSION_HEADERS,
  });

  return { ...quoteRequest, quotes: data };
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

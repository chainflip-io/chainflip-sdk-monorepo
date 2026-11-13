import axios from 'axios';
import type { z } from 'zod';
import type { EncodedVaultSwapData } from '@/shared/api/encodeVaultSwapData.js';
import type { NetworkInfo } from '@/shared/api/networkInfo.js';
import type { getAccountCreationDepositChannelSchema } from '@/shared/api/openAccountCreationDepositChannel.js';
import type {
  DepositChannelInfo,
  getOpenSwapDepositChannelSchema,
} from '@/shared/api/openSwapDepositChannel.js';
import type {
  getParameterEncodingRequestSchema,
  getVaultSwapParameterEncodingRequestSchema,
} from '@/shared/broker.js';
import { assert } from '@/shared/guards.js';
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
    dcaV2Enabled: String(Boolean(quoteRequest.dcaV2Enabled)),
    ...(quoteRequest.brokerAccount && { brokerIdSs58: quoteRequest.brokerAccount }),
  };

  const { data, headers } = await axios.get<Quote[]>('/v2/quote', {
    baseURL: baseUrl,
    params,
    signal,
    headers: CF_SDK_VERSION_HEADERS,
  });

  const requestId = headers?.['x-request-id'] as string | undefined;

  return { ...quoteRequest, quotes: data, ...(requestId && { requestId }) };
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

type RequestBody<T extends (...args: never[]) => z.ZodType> = z.input<ReturnType<T>>;

type BackendResponse = { status: number; body: unknown; headers: Headers };

const lowercaseKeys = (headers: Record<string, string>) =>
  Object.fromEntries(Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value]));

const backendRequest = async (
  baseUrl: string,
  method: 'GET' | 'POST',
  path: `/api/${string}`,
  body?: unknown,
): Promise<BackendResponse> => {
  const headers = lowercaseKeys(CF_SDK_VERSION_HEADERS);
  let serializedBody: string | undefined;

  if (method !== 'GET' && body != null) {
    headers['content-type'] = 'application/json';
    serializedBody = JSON.stringify(body);
  }

  const res = await fetch(`${baseUrl.replace(/\/+$/, '')}${path}`, {
    method,
    headers,
    body: serializedBody,
  });
  const contentType = res.headers.get('content-type') ?? '';

  if (contentType.includes('application/') && contentType.includes('json')) {
    return { status: res.status, body: await res.json(), headers: res.headers };
  }

  if (contentType.includes('text/')) {
    return { status: res.status, body: await res.text(), headers: res.headers };
  }

  return { status: res.status, body: await res.blob(), headers: res.headers };
};

export const getNetworkInfo = async (baseUrl: string): Promise<z.output<typeof NetworkInfo>> => {
  const res = await backendRequest(baseUrl, 'GET', '/api/networkInfo');
  assert(res.status === 200, 'Failed to fetch network info');
  return res.body as z.output<typeof NetworkInfo>;
};

export const openSwapDepositChannel = async (
  baseUrl: string,
  body: RequestBody<typeof getOpenSwapDepositChannelSchema>,
): Promise<z.output<typeof DepositChannelInfo>> => {
  const res = await backendRequest(baseUrl, 'POST', '/api/openSwapDepositChannel', body);
  assert(res.status === 201, 'Failed to open swap deposit channel');
  return res.body as z.output<typeof DepositChannelInfo>;
};

export const encodeVaultSwapData = async (
  baseUrl: string,
  body: RequestBody<typeof getVaultSwapParameterEncodingRequestSchema>,
): Promise<z.output<typeof EncodedVaultSwapData>> => {
  const res = await backendRequest(baseUrl, 'POST', '/api/encodeVaultSwapData', body);
  if (res.status !== 200) {
    throw new Error('Failed to encode vault swap data', { cause: res });
  }
  return res.body as z.output<typeof EncodedVaultSwapData>;
};

export const encodeCfParameters = async (
  baseUrl: string,
  body: RequestBody<typeof getParameterEncodingRequestSchema>,
): Promise<`0x${string}`> => {
  const res = await backendRequest(baseUrl, 'POST', '/api/encodeCfParameters', body);
  if (res.status !== 200) {
    throw new Error('Failed to encode cf parameters', { cause: res });
  }
  return res.body as `0x${string}`;
};

export const openAccountCreationDepositChannel = async (
  baseUrl: string,
  body: RequestBody<typeof getAccountCreationDepositChannelSchema>,
): Promise<z.output<typeof DepositChannelInfo>> => {
  const res = await backendRequest(baseUrl, 'POST', '/api/openAccountCreationDepositChannel', body);
  if (res.status !== 201) {
    throw new Error('Failed to request account creation deposit channel', { cause: res });
  }
  return res.body as z.output<typeof DepositChannelInfo>;
};

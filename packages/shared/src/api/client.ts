import type { ApiContract, ApiRequestBody, ApiResponse, ApiRoute } from './contract.js';

export type ApiFetcherArgs = {
  method: ApiRoute['method'];
  path: string;
  url: string;
  headers: Record<string, string>;
  body: string | undefined;
};

export type ApiFetcher = (
  args: ApiFetcherArgs,
) => Promise<{ status: number; body: unknown; headers: Headers }>;

type ApiClientMethod<R extends ApiRoute> = R extends { body: unknown }
  ? (args: { body: ApiRequestBody<R> }) => Promise<ApiResponse<R> & { headers: Headers }>
  : () => Promise<ApiResponse<R> & { headers: Headers }>;

export type ApiClient = { [K in keyof ApiContract]: ApiClientMethod<ApiContract[K]> };

export const fetchApi: ApiFetcher = async ({ url, method, headers, body }) => {
  const res = await fetch(url, { method, headers, body });
  const contentType = res.headers.get('content-type') ?? '';

  if (contentType.includes('application/') && contentType.includes('json')) {
    return { status: res.status, body: await res.json(), headers: res.headers };
  }

  if (contentType.includes('text/')) {
    return { status: res.status, body: await res.text(), headers: res.headers };
  }

  return { status: res.status, body: await res.blob(), headers: res.headers };
};

export const createApiClient = (
  contract: ApiContract,
  {
    baseUrl,
    headers: baseHeaders = {},
    fetcher = fetchApi,
  }: { baseUrl: string; headers?: Record<string, string>; fetcher?: ApiFetcher },
): ApiClient => {
  const normalizedBaseUrl = baseUrl.replace(/\/+$/, '');

  return Object.fromEntries(
    Object.entries(contract).map(([name, route]: [string, ApiRoute]) => [
      name,
      (args?: { body: unknown }) => {
        const headers = Object.fromEntries(
          Object.entries(baseHeaders).map(([key, value]) => [key.toLowerCase(), value]),
        );
        let body: string | undefined;

        if (route.method !== 'GET' && args?.body != null) {
          headers['content-type'] = 'application/json';
          body = JSON.stringify(args.body);
        }

        return fetcher({
          method: route.method,
          path: route.path,
          url: `${normalizedBaseUrl}${route.path}`,
          headers,
          body,
        });
      },
    ]),
  ) as ApiClient;
};

import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApiClient } from '../client.js';
import { createApiContract } from '../contract.js';

const mockFetch = (
  status: number,
  raw: string | null,
  contentType: string | null = 'application/json; charset=utf-8',
) => {
  const fetchMock = vi.fn(
    async (_url: string, _init: RequestInit) =>
      new Response(raw, {
        status,
        headers: contentType ? { 'content-type': contentType } : {},
      }),
  );
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
};

const createClient = (baseUrl = 'https://backend.test') =>
  createApiClient(createApiContract('mainnet'), {
    baseUrl,
    headers: { 'X-Chainflip-Sdk-Version': '1.2.3' },
  });

describe(createApiClient, () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it.each(['https://backend.test', 'https://backend.test/', 'https://backend.test///'])(
    'removes trailing slashes from the base url (%s)',
    async (baseUrl) => {
      const fetchMock = mockFetch(200, '{}');

      await createClient(baseUrl).networkInfo();

      expect(fetchMock.mock.calls[0][0]).toBe('https://backend.test/api/networkInfo');
    },
  );

  it('sends GET requests without a body or content type', async () => {
    const fetchMock = mockFetch(200, '{}');

    await createClient().networkInfo();

    expect(fetchMock).toHaveBeenCalledWith('https://backend.test/api/networkInfo', {
      method: 'GET',
      headers: { 'x-chainflip-sdk-version': '1.2.3' },
      body: undefined,
    });
  });

  it('sends POST requests with a JSON body and lowercased headers', async () => {
    const fetchMock = mockFetch(201, '{}');

    await createClient().openSwapDepositChannel({
      body: {
        srcAsset: { asset: 'BTC', chain: 'Bitcoin' },
        destAsset: { asset: 'ETH', chain: 'Ethereum' },
        destAddress: '0xabc',
        amount: '1',
        ccmParams: undefined,
        fillOrKillParams: {
          refundAddress: 'bc1q',
          retryDurationBlocks: 1,
          minPriceX128: '1',
          refundCcmMetadata: null,
          maxOraclePriceSlippage: null,
        },
      },
    });

    expect(fetchMock).toHaveBeenCalledWith('https://backend.test/api/openSwapDepositChannel', {
      method: 'POST',
      headers: { 'x-chainflip-sdk-version': '1.2.3', 'content-type': 'application/json' },
      body: '{"srcAsset":{"asset":"BTC","chain":"Bitcoin"},"destAsset":{"asset":"ETH","chain":"Ethereum"},"destAddress":"0xabc","amount":"1","fillOrKillParams":{"refundAddress":"bc1q","retryDurationBlocks":1,"minPriceX128":"1","refundCcmMetadata":null,"maxOraclePriceSlippage":null}}',
    });
  });

  it.each([
    ['networkInfo', 'GET'],
    ['encodeCfParameters', 'POST'],
    ['encodeVaultSwapData', 'POST'],
    ['openSwapDepositChannel', 'POST'],
    ['openAccountCreationDepositChannel', 'POST'],
  ] as const)('calls %s with %s', async (name, method) => {
    const fetchMock = mockFetch(200, '{}');

    await (createClient()[name] as (args: { body: object }) => Promise<unknown>)({ body: {} });

    expect(fetchMock.mock.calls[0][0]).toBe(`https://backend.test/api/${name}`);
    expect(fetchMock.mock.calls[0][1].method).toBe(method);
  });

  it('returns the status, parsed JSON body and headers', async () => {
    mockFetch(201, '{"id":"123-Ethereum-1"}');

    const res = await createClient().openSwapDepositChannel({ body: {} as never });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ id: '123-Ethereum-1' });
    expect(res.headers.get('content-type')).toBe('application/json; charset=utf-8');
  });

  it('parses JSON-like content types', async () => {
    mockFetch(400, '{"issues":[],"name":"ZodError"}', 'application/problem+json');

    const res = await createClient().encodeCfParameters({ body: {} as never });

    expect(res).toMatchObject({ status: 400, body: { issues: [], name: 'ZodError' } });
  });

  it('does not throw for unexpected statuses', async () => {
    mockFetch(400, '{"message":"too many channels"}');

    const res = await createClient().openSwapDepositChannel({ body: {} as never });

    expect(res).toMatchObject({ status: 400, body: { message: 'too many channels' } });
  });

  it('returns text bodies for text content types', async () => {
    mockFetch(502, '<html>bad gateway</html>', 'text/html');

    const res = await createClient().networkInfo();

    expect(res).toMatchObject({ status: 502, body: '<html>bad gateway</html>' });
  });

  it('returns blob bodies for other content types', async () => {
    mockFetch(204, null, null);

    const res = await createClient().networkInfo();

    expect(res.status).toBe(204);
    expect(res.body).toBeInstanceOf(Blob);
  });

  it('rejects if a JSON body cannot be parsed', async () => {
    mockFetch(502, '<html>bad gateway</html>', 'application/json');

    await expect(createClient().networkInfo()).rejects.toThrow(SyntaxError);
  });

  it('rejects if the request fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new TypeError('fetch failed'))),
    );

    await expect(createClient().networkInfo()).rejects.toThrow('fetch failed');
  });

  it('uses a custom fetcher', async () => {
    const fetcher = vi.fn(async () => ({ status: 200, body: '0x1234', headers: new Headers() }));
    const client = createApiClient(createApiContract('mainnet'), {
      baseUrl: 'https://backend.test/',
      fetcher,
    });

    await expect(client.encodeCfParameters({ body: { amount: '1' } as never })).resolves.toEqual({
      status: 200,
      body: '0x1234',
      headers: new Headers(),
    });
    expect(fetcher).toHaveBeenCalledWith({
      method: 'POST',
      path: '/api/encodeCfParameters',
      url: 'https://backend.test/api/encodeCfParameters',
      headers: { 'content-type': 'application/json' },
      body: '{"amount":"1"}',
    });
  });
});

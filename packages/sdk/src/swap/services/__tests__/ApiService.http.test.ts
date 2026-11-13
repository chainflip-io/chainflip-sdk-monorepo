import { createServer, type IncomingMessage, type Server } from 'http';
import type { AddressInfo } from 'net';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  encodeCfParameters,
  encodeVaultSwapData,
  getNetworkInfo,
  openAccountCreationDepositChannel,
  openSwapDepositChannel,
} from '../ApiService.js';

// uses a real http server (and fetch) to check the requests and how responses are handled

type Received = {
  method?: string;
  url?: string;
  headers: IncomingMessage['headers'];
  body: string;
};
type Reply = { status: number; body: string; contentType?: string | null };

describe('ApiService backend endpoints', () => {
  let server: Server;
  let baseUrl: string;
  let received: Received[];
  let reply: Reply;

  beforeAll(async () => {
    server = createServer((req, res) => {
      let body = '';
      req.on('data', (chunk) => {
        body += chunk;
      });
      req.on('end', () => {
        received.push({ method: req.method, url: req.url, headers: req.headers, body });
        res.writeHead(reply.status, {
          ...(reply.contentType !== null && {
            'content-type': reply.contentType ?? 'application/json; charset=utf-8',
          }),
          'x-request-id': 'request-id',
        });
        res.end(reply.body);
      });
    });
    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', resolve);
    });
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  afterAll(async () => {
    await new Promise((resolve) => {
      server.close(resolve);
    });
  });

  beforeEach(() => {
    received = [];
    reply = { status: 200, body: '{}' };
  });

  it.each([0, 1, 3])('removes trailing slashes from the base url (%i slashes)', async (count) => {
    await getNetworkInfo(`${baseUrl}${'/'.repeat(count)}`);

    expect(received[0].url).toBe('/api/networkInfo');
  });

  it('sends GET requests with the sdk version header and no body', async () => {
    reply = { status: 200, body: '{"assets":[],"cfBrokerCommissionBps":0}' };

    await expect(getNetworkInfo(baseUrl)).resolves.toEqual({
      assets: [],
      cfBrokerCommissionBps: 0,
    });

    expect(received).toMatchObject([{ method: 'GET', url: '/api/networkInfo', body: '' }]);
    expect(received[0].headers['x-chainflip-sdk-version']).toEqual(expect.any(String));
  });

  it.each([
    ['encodeCfParameters', encodeCfParameters, 200],
    ['encodeVaultSwapData', encodeVaultSwapData, 200],
    ['openSwapDepositChannel', openSwapDepositChannel, 201],
    ['openAccountCreationDepositChannel', openAccountCreationDepositChannel, 201],
  ] as const)('sends %s as a JSON POST request', async (name, fn, status) => {
    reply = { status, body: '{"ok":true}' };

    await expect(fn(baseUrl, { amount: '1', unset: undefined } as never)).resolves.toEqual({
      ok: true,
    });

    expect(received).toMatchObject([
      { method: 'POST', url: `/api/${name}`, body: '{"amount":"1"}' },
    ]);
    expect(received[0].headers['content-type']).toBe('application/json');
    expect(received[0].headers['x-chainflip-sdk-version']).toEqual(expect.any(String));
  });

  it.each([
    ['getNetworkInfo', () => getNetworkInfo(baseUrl), 'Failed to fetch network info'],
    [
      'openSwapDepositChannel',
      () => openSwapDepositChannel(baseUrl, {} as never),
      'Failed to open swap deposit channel',
    ],
  ])('%s rejects with the same error for unexpected statuses', async (_name, call, message) => {
    reply = { status: 400, body: '{"message":"too many channels"}' };

    const error = await call().catch((e: unknown) => e);

    expect(error).toBeInstanceOf(Error);
    expect(error).toHaveProperty('message', message);
    expect(error).not.toHaveProperty('cause');
  });

  it.each([
    [
      'encodeVaultSwapData',
      () => encodeVaultSwapData(baseUrl, {} as never),
      'Failed to encode vault swap data',
    ],
    [
      'encodeCfParameters',
      () => encodeCfParameters(baseUrl, {} as never),
      'Failed to encode cf parameters',
    ],
    [
      'openAccountCreationDepositChannel',
      () => openAccountCreationDepositChannel(baseUrl, {} as never),
      'Failed to request account creation deposit channel',
    ],
  ])(
    '%s rejects with the response as the cause for unexpected statuses',
    async (_name, call, message) => {
      reply = { status: 400, body: '{"issues":[],"name":"ZodError"}' };

      const error = await call().catch((e: unknown) => e);

      expect(error).toBeInstanceOf(Error);
      expect(error).toHaveProperty('message', message);
      expect((error as Error).cause).toMatchObject({
        status: 400,
        body: { issues: [], name: 'ZodError' },
      });
      const { headers } = (error as Error).cause as { headers: Headers };
      expect(headers).toBeInstanceOf(Headers);
      expect(headers.get('x-request-id')).toBe('request-id');
    },
  );

  it('includes text bodies in the cause', async () => {
    reply = { status: 502, body: '<html>bad gateway</html>', contentType: 'text/html' };

    const error = await encodeCfParameters(baseUrl, {} as never).catch((e: unknown) => e);

    expect((error as Error).cause).toMatchObject({ status: 502, body: '<html>bad gateway</html>' });
  });

  it('includes other bodies in the cause as a blob', async () => {
    reply = { status: 500, body: 'binary', contentType: null };

    const error = await encodeCfParameters(baseUrl, {} as never).catch((e: unknown) => e);

    const { body } = (error as Error).cause as { body: Blob };
    expect(body).toBeInstanceOf(Blob);
    expect(await body.text()).toBe('binary');
  });

  it('uses the response as the cause', async () => {
    reply = { status: 400, body: '{}' };

    const error = await encodeCfParameters(baseUrl, {} as never).catch((e: unknown) => e);

    expect(Object.keys((error as Error).cause as object)).toEqual(['status', 'body', 'headers']);
  });

  it('only sends the fetch default accept header', async () => {
    await getNetworkInfo(baseUrl);

    expect(received[0].headers.accept).toBe('*/*');
  });

  it('rejects with a SyntaxError if a JSON body cannot be parsed', async () => {
    reply = { status: 201, body: '<html>bad gateway</html>' };

    await expect(openSwapDepositChannel(baseUrl, {} as never)).rejects.toThrow(SyntaxError);
  });

  it('rejects with the fetch error if the request fails', async () => {
    await expect(getNetworkInfo('http://127.0.0.1:1')).rejects.toThrow(
      new TypeError('fetch failed'),
    );
  });
});

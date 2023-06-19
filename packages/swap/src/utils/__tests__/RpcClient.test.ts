import { once } from 'events';
import { AddressInfo, WebSocket, WebSocketServer } from 'ws';
import { z } from 'zod';
import RpcClient from '../RpcClient';

const requestMap = {
  echo: z.tuple([z.string()]),
};

const responseMap = {
  echo: z.string(),
};

describe(RpcClient, () => {
  let server: WebSocketServer;
  let client: RpcClient<typeof requestMap, typeof responseMap>;
  const clients: WebSocket[] = [];
  const killConnections = () => {
    for (let c = clients.pop(); c; c = clients.pop()) {
      c.close();
    }
  };

  beforeEach(async () => {
    server = new WebSocketServer({ port: 0, host: '127.0.0.1' });

    server.on('connection', (ws) => {
      ws.on('message', (data) => {
        const rpcRequest = JSON.parse(data.toString());

        ws.send(
          JSON.stringify({
            id: rpcRequest.id,
            jsonrpc: '2.0',
            result: rpcRequest.params[0],
          }),
        );
      });

      clients.push(ws);
    });

    await once(server, 'listening');
  });

  afterEach(() => {
    server.close();
    client.close();
  });

  it('resends messages if a disconnection happens while awaiting a response', async () => {
    const address = server.address() as AddressInfo;

    client = await new RpcClient(
      `ws://127.0.0.1:${address.port}`,
      requestMap,
      responseMap,
      'test',
    ).connect();

    const response = await client.sendRequest('echo', 'hello');

    expect(response).toEqual('hello');

    killConnections();

    const response2 = await client.sendRequest('echo', 'hello');
    expect(response2).toEqual('hello');
  });

  it("doesn't spam the reconnect", async () => {
    jest.useFakeTimers();
    const timeoutSpy = jest.spyOn(global, 'setTimeout');
    const address = server.address() as AddressInfo;
    client = await new RpcClient(
      `ws://127.0.0.1:${address.port}`,
      requestMap,
      responseMap,
      'test',
    ).connect();

    const response = await client.sendRequest('echo', 'hello');
    expect(response).toEqual('hello');

    killConnections();
    server.close();
    await once(client, 'DISCONNECT');
    timeoutSpy.mockReset();
    const connectSpy = jest.spyOn(client, 'connect');

    for (let i = 0; i < 10; i += 1) {
      jest.runAllTimers();
      await once(client, 'DISCONNECT');
      expect(timeoutSpy).toHaveBeenLastCalledWith(
        expect.any(Function),
        Math.min(250 * 2 ** i, 30000),
      );
    }

    expect(connectSpy).toHaveBeenCalledTimes(10);
  });
});

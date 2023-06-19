import assert from 'assert';
import EventEmitter, { once } from 'events';
import { filter, firstValueFrom, Subject, timeout } from 'rxjs';
import { setTimeout as sleep } from 'timers/promises';
import WebSocket from 'ws';
import { z } from 'zod';
import { SupportedAsset } from '@/shared/enums';
import { handleExit } from './function';
import logger from './logger';

const READY = 'READY';
const DISCONNECT = 'DISCONNECT';

export type RpcAsset = {
  [K in SupportedAsset]: Capitalize<Lowercase<K>>;
}[SupportedAsset];

type RpcResponse =
  | { id: number; result: unknown }
  | { id: number; error: { code: number; message: string } };

export default class RpcClient<
  Req extends Record<string, z.ZodTypeAny>,
  Res extends Record<string, z.ZodTypeAny>,
> extends EventEmitter {
  private socket!: WebSocket;

  private requestId = 0;

  private messages = new Subject<RpcResponse>();

  private expectClose = false;

  private connectionFailures = 0;

  constructor(
    private readonly url: string,
    private readonly requestMap: Req,
    private readonly responseMap: Res,
    private readonly namespace: string,
  ) {
    super();
    handleExit(() => this.handleClose());
  }

  close() {
    this.handleClose();
  }

  private handleClose() {
    this.expectClose = true;
    this.socket.close();
  }

  private async connectionReady() {
    if (this.socket.readyState === WebSocket.OPEN) return;
    await Promise.race([
      once(this, READY),
      sleep(30000).then(() => {
        throw new Error('timeout waiting for socket to open');
      }),
    ]);
  }

  async connect(): Promise<this> {
    if (this.expectClose) return this;

    this.socket = new WebSocket(this.url);
    this.socket.on('message', (data) => {
      this.messages.next(JSON.parse(data.toString()));
    });

    // this event is also emitted if a socket fails to open, so all reconnection
    // logic will be funnelled through here
    this.socket.once('close', async () => {
      if (this.expectClose) return;
      this.emit(DISCONNECT);

      const backoff = Math.min(250 * 2 ** this.connectionFailures, 30000);

      logger.info(`websocket closed, reconnecting in ${backoff}ms`);

      setTimeout(() => {
        this.connect().catch(() => {
          this.connectionFailures += 1;
        });
      }, backoff);
    });

    this.socket.on('error', (error) => {
      logger.customError('received websocket error', {}, { error });
      this.socket.close();
    });

    if (this.socket.readyState !== WebSocket.OPEN) {
      await Promise.race([
        once(this.socket, 'open'),
        sleep(30000).then(() => {
          throw new Error('timeout waiting for socket to open');
        }),
      ]);
    }

    this.emit(READY);
    this.connectionFailures = 0;

    return this;
  }

  async sendRequest<R extends keyof Req & keyof Res>(
    method: R,
    ...params: z.input<Req[R]>
  ): Promise<z.infer<Res[R]>> {
    let response: RpcResponse | undefined;

    for (let i = 0; i < 5; i += 1) {
      try {
        const id = this.requestId;
        this.requestId += 1;

        await this.connectionReady();

        this.socket.send(
          JSON.stringify({
            id,
            jsonrpc: '2.0',
            method: `${this.namespace}_${method as string}`,
            params: this.requestMap[method].parse(params),
          }),
        );

        response = await Promise.race([
          firstValueFrom(
            this.messages.pipe(
              filter((msg) => msg.id === id),
              timeout(30000),
            ),
          ),
          // if the socket closes after sending a request but before getting a
          // response, we need to retry the request
          once(this, DISCONNECT).then(() => {
            throw new Error('disconnected');
          }),
        ]);

        break;
      } catch {
        // retry
      }
    }

    assert(response, 'no response received');

    if ('error' in response) throw new Error(response.error.message);

    return this.responseMap[method].parse(response.result) as z.infer<Res[R]>;
  }
}

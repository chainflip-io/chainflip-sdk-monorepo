import assert from 'assert';
import EventEmitter, { once } from 'events';
import { filter, firstValueFrom, Subject, timeout } from 'rxjs';
import WebSocket from 'ws';
import { z } from 'zod';
import { Asset } from '@/shared/enums';
import { handleExit, onceWithTimeout } from './function';
import logger from './logger';

const READY = 'READY';
const DISCONNECT = 'DISCONNECT';

export type RpcAsset = {
  [K in Asset]: Capitalize<Lowercase<K>>;
}[Asset];

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

  async close() {
    await this.handleClose();
  }

  private async handleClose() {
    this.socket.removeListener('close', this.handleClose);
    this.socket.close();
    if (this.socket.readyState !== WebSocket.CLOSED) {
      await once(this.socket, 'close');
    }
  }

  private async connectionReady() {
    if (this.socket.readyState === WebSocket.OPEN) return;
    await onceWithTimeout(this, READY, 30000);
  }

  private handleDisconnect = async () => {
    this.emit(DISCONNECT);

    const backoff = Math.min(250 * 2 ** this.connectionFailures, 30000);

    logger.info(`websocket closed, reconnecting in ${backoff}ms`);

    setTimeout(() => {
      this.connect().catch(() => {
        this.connectionFailures += 1;
      });
    }, backoff);
  };

  async connect(): Promise<this> {
    this.socket = new WebSocket(this.url);
    this.socket.on('message', (data) => {
      this.messages.next(JSON.parse(data.toString()));
    });

    // this event is also emitted if a socket fails to open, so all reconnection
    // logic will be funnelled through here
    this.socket.once('close', this.handleDisconnect);

    this.socket.on('error', (error) => {
      logger.customError('received websocket error', {}, { error });
      this.socket.close();
    });

    if (this.socket.readyState !== WebSocket.OPEN) {
      await onceWithTimeout(this.socket, 'open', 30000);
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

        const controller = new AbortController();
        response = await Promise.race([
          firstValueFrom(
            this.messages.pipe(
              filter((msg) => msg.id === id),
              timeout(30000),
            ),
          ),
          // if the socket closes after sending a request but before getting a
          // response, we need to retry the request
          once(this, DISCONNECT, { signal: controller.signal }).then(() => {
            throw new Error('disconnected');
          }),
        ]);
        controller.abort();

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

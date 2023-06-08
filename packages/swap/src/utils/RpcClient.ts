import { once } from 'events';
import { filter, firstValueFrom, Subject, timeout } from 'rxjs';
import { setTimeout as sleep } from 'timers/promises';
import WebSocket from 'ws';
import { z } from 'zod';
import { SupportedAsset } from '@/shared/enums';
import { handleExit } from './function';
import logger from './logger';

export type RpcAsset = {
  [K in SupportedAsset]: Capitalize<Lowercase<K>>;
}[SupportedAsset];

type RpcResponse =
  | { id: number; result: unknown }
  | { id: number; error: { code: number; message: string } };

export default class RpcClient<
  Req extends Record<string, z.ZodTypeAny>,
  Res extends Record<string, z.ZodTypeAny>,
> {
  private socket!: WebSocket;

  private requestId = 0;

  private messages = new Subject<RpcResponse>();

  private expectClose = false;

  constructor(
    private readonly url: string,
    private readonly requestMap: Req,
    private readonly responseMap: Res,
    private readonly namespace: string,
  ) {
    handleExit(() => this.handleClose());
  }

  private handleClose() {
    this.expectClose = true;
    this.socket.close();
  }

  private async connectionReady() {
    if (this.socket.readyState !== this.socket.OPEN) {
      await Promise.race([
        once(this.socket, 'open'),
        sleep(30000).then(() => {
          throw new Error('timeout waiting for socket to open');
        }),
      ]);
    }
  }

  async connect(): Promise<this> {
    if (this.expectClose) return this;
    this.socket = new WebSocket(this.url);
    this.socket.on('message', (data) => {
      this.messages.next(JSON.parse(data.toString()));
    });
    this.socket.once('close', () => {
      this.connect();
    });
    this.socket.on('error', (error) => {
      logger.customError('received websocket error', {}, { error });
      this.socket.close();
      this.connect();
    });

    await this.connectionReady();
    return this;
  }

  async sendRequest<R extends keyof Req & keyof Res>(
    method: R,
    ...params: z.input<Req[R]>
  ): Promise<z.infer<Res[R]>> {
    await this.connectionReady();
    const id = this.requestId;
    this.requestId += 1;

    this.socket.send(
      JSON.stringify({
        id,
        jsonrpc: '2.0',
        method: `${this.namespace}_${method as string}`,
        params: this.requestMap[method].parse(params),
      }),
    );

    const response = await firstValueFrom(
      this.messages.pipe(
        filter((msg) => msg.id === id),
        timeout(30000),
      ),
    );

    if ('error' in response) throw new Error(response.error.message);

    return this.responseMap[method].parse(response.result) as z.infer<Res[R]>;
  }
}

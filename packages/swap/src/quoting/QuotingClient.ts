import * as crypto from 'crypto';
import { EventEmitter } from 'events';
import { io, Socket } from 'socket.io-client';
import { promisify } from 'util';
import { AssetAndChain } from '@/shared/enums';
import { LegJson, MarketMakerQuoteRequest, MarketMakerRawQuote } from './schemas';
import logger from '../utils/logger';

const signAsync = promisify(crypto.sign);

export type QuoteHandler = (
  quote: MarketMakerQuoteRequest<LegJson>,
) => Promise<MarketMakerRawQuote>;

/**
 * A reference implementation of a client that connects to the quoting service
 * and handles quote requests
 */
export default class QuotingClient extends EventEmitter {
  private socket!: Socket;

  private quoteHandler!: QuoteHandler;

  private privateKey: crypto.KeyObject;

  constructor(
    private readonly url: string,
    private readonly accountId: string,
    privateKey: string,
    private readonly quotedAssets?: AssetAndChain[],
  ) {
    super();
    this.privateKey = crypto.createPrivateKey({
      key: Buffer.from(privateKey),
      format: 'pem',
      type: 'pkcs8',
    });
  }

  private async getAuth() {
    const timestamp = Date.now();
    return {
      timestamp,
      client_version: this.quotedAssets !== undefined ? '2' : '1',
      account_id: this.accountId,
      signature: await this.getSignature(timestamp),
      quoted_assets: this.quotedAssets,
    };
  }

  async connect() {
    this.socket = io(this.url, {
      transports: ['websocket'],
      auth: await this.getAuth(),
    });

    this.socket.on('connect', () => {
      if (this.socket.connected) {
        logger.info('connected to quoting service');
      }
      this.emit('connected');
    });

    this.socket.on('quote_request', async (quote: MarketMakerQuoteRequest<LegJson>) => {
      const response = await this.quoteHandler(quote);
      this.socket.emit('quote_response', {
        ...response,
        request_id: quote.request_id,
      } as MarketMakerRawQuote);
    });

    this.socket.on('connect_error', async (err) => {
      // the reason of the error, for example "xhr poll error"
      logger.error('connect_error', err.message);
      // retry with a new signature
      const updatedTimestamp = Date.now();
      this.socket.auth = {
        timestamp: updatedTimestamp,
        client_version: '1',
        account_id: this.accountId,
        signature: await this.getSignature(updatedTimestamp),
      };
    });

    this.socket.on('disconnect', () => {
      this.emit('disconnect');
    });
  }

  private async getSignature(timestamp: number): Promise<string> {
    const buffer = await signAsync(
      null,
      Buffer.from(`${this.accountId}${timestamp}`, 'utf8'),
      this.privateKey,
    );

    return buffer.toString('base64');
  }

  setQuoteRequestHandler(handler: QuoteHandler) {
    this.quoteHandler = handler;
  }

  close() {
    this.socket.close();
  }
}

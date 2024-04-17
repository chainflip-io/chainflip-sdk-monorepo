import * as crypto from 'crypto';
import { EventEmitter } from 'events';
import { io, Socket } from 'socket.io-client';
import { promisify } from 'util';
import { MarketMakerQuoteRequest, MarketMakerRawQuote } from './schemas';
import logger from '../utils/logger';

const signAsync = promisify(crypto.sign);

export type QuoteHandler = (quote: MarketMakerQuoteRequest) => Promise<MarketMakerRawQuote>;

/**
 * A reference implementation of a client that connects to the quoting service
 * and handles quote requests
 */
export default class QuotingClient extends EventEmitter {
  private socket!: Socket;

  private quoteHandler!: QuoteHandler;

  private privateKey: crypto.KeyObject;

  constructor(
    url: string,
    private readonly marketMakerId: string,
    privateKey: string,
  ) {
    super();
    this.privateKey = crypto.createPrivateKey({
      key: Buffer.from(privateKey),
      format: 'pem',
      type: 'pkcs8',
    });
    this.connect(url);
  }

  private async connect(url: string) {
    const timestamp = Date.now();
    this.socket = io(url, {
      auth: {
        timestamp,
        client_version: '1',
        market_maker_id: this.marketMakerId,
        signature: await this.getSignature(timestamp),
      },
    });

    this.socket.on('connect', () => {
      if (this.socket.connected) {
        logger.info('connected to quoting service');
      }
      this.emit('connected');
    });

    this.socket.on('quote_request', async (quote: MarketMakerQuoteRequest) => {
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
        market_maker_id: this.marketMakerId,
        signature: await this.getSignature(updatedTimestamp),
      };
    });
  }

  private async getSignature(timestamp: number): Promise<string> {
    const buffer = await signAsync(
      null,
      Buffer.from(`${this.marketMakerId}${timestamp}`, 'utf8'),
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

import { Observable, Subject } from 'rxjs';
import { Socket } from 'socket.io';
import { MarketMakerQuote, marketMakerResponseSchema } from './schemas';
import logger from '../utils/logger';

type Quote = { client: string; quote: MarketMakerQuote };

type ConnectionHandler = {
  quotes$: Observable<Quote>;
  handler(socket: Socket): void;
};

const getConnectionHandler = (): ConnectionHandler => {
  const quotes$ = new Subject<Quote>();

  return {
    quotes$,
    handler(socket: Socket) {
      logger.info(`socket connected with id "${socket.id}"`);

      socket.on('disconnect', () => {
        logger.info(`socket disconnected with id "${socket.id}"`);
      });

      socket.on('quote_response', (message) => {
        const result = marketMakerResponseSchema.safeParse(message);

        if (!result.success) {
          logger.warn('received invalid quote response', {}, { message });
          return;
        }

        quotes$.next({ client: socket.id, quote: result.data });
      });
    },
  };
};

export default getConnectionHandler;

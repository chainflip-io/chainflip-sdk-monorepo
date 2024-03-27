import { Observable, Subject } from 'rxjs';
import type { QuotingSocket } from './authenticate';
import { MarketMakerQuote, marketMakerResponseSchema } from './schemas';
import logger from '../utils/logger';

type Quote = { marketMaker: string; quote: MarketMakerQuote };

type ConnectionHandler = {
  quotes$: Observable<Quote>;
  handler(socket: QuotingSocket): void;
};

const getConnectionHandler = (): ConnectionHandler => {
  const quotes$ = new Subject<Quote>();

  return {
    quotes$,
    handler(socket: QuotingSocket) {
      logger.info(`market maker "${socket.data.marketMaker}" connected`);

      socket.on('disconnect', () => {
        logger.info(`market maker "${socket.data.marketMaker}" disconnected`);
      });

      socket.on('quote_response', (message) => {
        const result = marketMakerResponseSchema.safeParse(message);

        if (!result.success) {
          logger.warn(
            `received invalid quote response from "${socket.data.marketMaker}"`,
            {},
            { message },
          );
          return;
        }

        quotes$.next({ marketMaker: socket.data.marketMaker, quote: result.data });
      });
    },
  };
};

export default getConnectionHandler;

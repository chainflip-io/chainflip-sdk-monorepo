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
      const { marketMaker } = socket.data;
      logger.info(`market maker "${marketMaker}" connected`);

      socket.on('disconnect', () => {
        logger.info(`market maker "${marketMaker}" disconnected`);
      });

      socket.on('quote_response', (message) => {
        const result = marketMakerResponseSchema.safeParse(message);

        if (!result.success) {
          logger.warn(`received invalid quote response from "${marketMaker}"`, {}, { message });
          return;
        }

        quotes$.next({ marketMaker, quote: result.data });
      });
    },
  };
};

export default getConnectionHandler;

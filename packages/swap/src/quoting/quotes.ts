import { filter, Observable, Subscription } from 'rxjs';
import { MarketMakerQuote } from './schemas';
import env from '../config/env';

export type QuoteType = 'pool' | 'market_maker';

export const collectMakerQuotes = (
  requestId: string,
  expectedQuotes: number,
  quotes$: Observable<{ marketMaker: string; quote: MarketMakerQuote }>,
): Promise<MarketMakerQuote[]> => {
  if (expectedQuotes === 0) return Promise.resolve([]);

  const clientsReceivedQuotes = new Map<string, MarketMakerQuote>();

  return new Promise((resolve) => {
    let sub: Subscription;

    const complete = () => {
      sub.unsubscribe();
      resolve([...clientsReceivedQuotes.values()]);
    };

    sub = quotes$
      .pipe(filter(({ quote }) => quote.request_id === requestId))
      .subscribe(({ marketMaker, quote }) => {
        clientsReceivedQuotes.set(marketMaker, quote);
        if (clientsReceivedQuotes.size === expectedQuotes) complete();
      });

    setTimeout(complete, env.QUOTE_TIMEOUT);
  });
};

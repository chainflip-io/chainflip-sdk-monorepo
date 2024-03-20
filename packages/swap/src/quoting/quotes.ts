import assert from 'assert';
import * as crypto from 'crypto';
import { filter, Observable, Subscription } from 'rxjs';
import { getPoolsNetworkFeeHundredthPips } from '@/shared/consts';
import { getInternalAsset, InternalAssets } from '@/shared/enums';
import {
  calculateHundredthPipAmountFromAmount,
  ONE_IN_HUNDREDTH_PIPS,
} from '@/shared/functions';
import { ParsedQuoteParams, InternalQuoteRequest } from '@/shared/schemas';
import { BrokerQuote, MarketMakerQuote } from './schemas';
import { Pool } from '../client';
import env from '../config/env';
import { compareNumericStrings, Comparison } from '../utils/string';

export type QuoteType = 'broker' | 'market_maker';

export const collectMakerQuotes = (
  requestId: string,
  expectedQuotes: number,
  quotes$: Observable<{ client: string; quote: MarketMakerQuote }>,
): Promise<MarketMakerQuote[]> => {
  if (expectedQuotes === 0) return Promise.resolve([]);

  const clientsReceivedQuotes = new Set<string>();
  const quotes: MarketMakerQuote[] = [];

  return new Promise((resolve) => {
    let sub: Subscription;

    const complete = () => {
      sub.unsubscribe();
      resolve(quotes);
    };

    sub = quotes$
      .pipe(filter(({ quote }) => quote.id === requestId))
      .subscribe(({ client, quote }) => {
        if (clientsReceivedQuotes.has(client)) return;
        clientsReceivedQuotes.add(client);
        quotes.push(quote);
        if (quotes.length === expectedQuotes) complete();
      });

    setTimeout(complete, env.QUOTE_TIMEOUT);
  });
};

export const subtractFeesFromMakerQuote = (
  quote: MarketMakerQuote,
  quotePools: Pool[],
): MarketMakerQuote => {
  const networkFeeHundredthPips = getPoolsNetworkFeeHundredthPips(
    env.CHAINFLIP_NETWORK,
  );
  const { quoteType } = quote;

  if ('intermediateAmount' in quote) {
    assert(quotePools.length === 2, 'wrong number of pools given');

    const intermediateAmount = calculateHundredthPipAmountFromAmount(
      quote.intermediateAmount,
      ONE_IN_HUNDREDTH_PIPS -
        networkFeeHundredthPips -
        quotePools[0].liquidityFeeHundredthPips,
    ).toString();

    const outputAmount = calculateHundredthPipAmountFromAmount(
      quote.outputAmount,
      ONE_IN_HUNDREDTH_PIPS -
        networkFeeHundredthPips -
        quotePools[0].liquidityFeeHundredthPips -
        quotePools[1].liquidityFeeHundredthPips,
    ).toString();

    return {
      id: quote.id,
      intermediateAmount,
      outputAmount,
      quoteType,
    };
  }

  assert(quotePools.length === 1, 'wrong number of pools given');

  const outputAmount = calculateHundredthPipAmountFromAmount(
    quote.outputAmount,
    ONE_IN_HUNDREDTH_PIPS -
      networkFeeHundredthPips -
      quotePools[0].liquidityFeeHundredthPips,
  ).toString();

  return { id: quote.id, outputAmount, quoteType };
};

export const findBestQuote = (
  quotes: MarketMakerQuote[],
  brokerQuote: BrokerQuote,
) =>
  quotes.reduce(
    (a, b) => {
      const cmpResult = compareNumericStrings(a.outputAmount, b.outputAmount);
      return cmpResult === Comparison.Less ? b : a;
    },
    brokerQuote as MarketMakerQuote | BrokerQuote,
  );

export const buildQuoteRequest = (
  query: ParsedQuoteParams,
): InternalQuoteRequest => {
  const srcAsset = getInternalAsset({
    asset: query.srcAsset,
    chain: query.srcChain,
  });
  const destAsset = getInternalAsset({
    asset: query.destAsset,
    chain: query.destChain,
  });

  if (srcAsset === InternalAssets.Usdc) {
    assert(destAsset !== InternalAssets.Usdc);
    return {
      id: crypto.randomUUID(),
      source_asset: srcAsset,
      intermediate_asset: null,
      destination_asset: destAsset,
      deposit_amount: query.amount,
    };
  }

  if (destAsset === InternalAssets.Usdc) {
    return {
      id: crypto.randomUUID(),
      source_asset: srcAsset,
      intermediate_asset: null,
      destination_asset: destAsset,
      deposit_amount: query.amount,
    };
  }

  return {
    id: crypto.randomUUID(),
    source_asset: srcAsset,
    intermediate_asset: InternalAssets.Usdc,
    destination_asset: destAsset,
    deposit_amount: query.amount,
  };
};

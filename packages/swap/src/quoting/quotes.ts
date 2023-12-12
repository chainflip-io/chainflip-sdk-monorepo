import assert from 'assert';
import * as crypto from 'crypto';
import { filter, Observable, Subscription } from 'rxjs';
import { getPoolsNetworkFeeHundredthPips } from '@/shared/consts';
import { Assets, ChainflipNetwork } from '@/shared/enums';
import { ParsedQuoteParams, QuoteRequest } from '@/shared/schemas';
import { getPips, ONE_IN_HUNDREDTH_PIPS } from '@/swap/fees';
import { BrokerQuote, MarketMakerQuote } from './schemas';
import prisma, { Pool } from '../client';
import { compareNumericStrings, Comparison } from '../utils/string';

const QUOTE_TIMEOUT = Number.parseInt(process.env.QUOTE_TIMEOUT ?? '1000', 10);

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

    setTimeout(complete, QUOTE_TIMEOUT);
  });
};

export const subtractFeesFromMakerQuote = (
  quote: MarketMakerQuote,
  quotePools: Pool[],
): MarketMakerQuote => {
  const networkFeeHundredthPips = getPoolsNetworkFeeHundredthPips(
    process.env.CHAINFLIP_NETWORK as ChainflipNetwork,
  );

  if ('intermediateAmount' in quote) {
    assert(quotePools.length === 2, 'wrong number of pools given');

    const intermediateAmount = getPips(
      quote.intermediateAmount,
      ONE_IN_HUNDREDTH_PIPS -
        networkFeeHundredthPips -
        quotePools[0].liquidityFeeHundredthPips,
    ).toString();

    const egressAmount = getPips(
      quote.egressAmount,
      ONE_IN_HUNDREDTH_PIPS -
        networkFeeHundredthPips -
        quotePools[0].liquidityFeeHundredthPips -
        quotePools[1].liquidityFeeHundredthPips,
    ).toString();

    return { id: quote.id, intermediateAmount, egressAmount };
  }

  assert(quotePools.length === 1, 'wrong number of pools given');

  const egressAmount = getPips(
    quote.egressAmount,
    ONE_IN_HUNDREDTH_PIPS -
      networkFeeHundredthPips -
      quotePools[0].liquidityFeeHundredthPips,
  ).toString();

  return { id: quote.id, egressAmount };
};

export const findBestQuote = (
  quotes: MarketMakerQuote[],
  brokerQuote: BrokerQuote,
) =>
  quotes.reduce(
    (a, b) => {
      const cmpResult = compareNumericStrings(a.egressAmount, b.egressAmount);
      return cmpResult === Comparison.Less ? b : a;
    },
    brokerQuote as MarketMakerQuote | BrokerQuote,
  );

export const buildQuoteRequest = (query: ParsedQuoteParams): QuoteRequest => {
  const {
    srcAsset: srcAssetAndChain,
    destAsset: destAssetAndChain,
    amount,
  } = query;
  const srcAsset = srcAssetAndChain.asset;
  const destAsset = destAssetAndChain.asset;

  if (srcAsset === Assets.USDC) {
    assert(destAsset !== Assets.USDC);
    return {
      id: crypto.randomUUID(),
      source_asset: srcAsset,
      intermediate_asset: null,
      destination_asset: destAsset,
      deposit_amount: amount,
    };
  }

  if (destAsset === Assets.USDC) {
    return {
      id: crypto.randomUUID(),
      source_asset: srcAsset,
      intermediate_asset: null,
      destination_asset: destAsset,
      deposit_amount: amount,
    };
  }

  return {
    id: crypto.randomUUID(),
    source_asset: srcAsset,
    intermediate_asset: Assets.USDC,
    destination_asset: destAsset,
    deposit_amount: amount,
  };
};

export const getQuotePools = async (
  query: ParsedQuoteParams,
): Promise<Pool[]> => {
  const { srcAsset: srcAssetAndChain, destAsset: destAssetAndChain } = query;
  const srcAsset = srcAssetAndChain.asset;
  const destAsset = destAssetAndChain.asset;

  if (srcAsset === Assets.USDC || destAsset === Assets.USDC) {
    return [
      await prisma.pool.findUniqueOrThrow({
        where: {
          baseAsset_quoteAsset: {
            baseAsset: srcAsset === Assets.USDC ? destAsset : srcAsset,
            quoteAsset: srcAsset === Assets.USDC ? srcAsset : destAsset,
          },
        },
      }),
    ];
  }

  return Promise.all([
    prisma.pool.findUniqueOrThrow({
      where: {
        baseAsset_quoteAsset: {
          baseAsset: srcAsset,
          quoteAsset: Assets.USDC,
        },
      },
    }),
    prisma.pool.findUniqueOrThrow({
      where: {
        baseAsset_quoteAsset: {
          baseAsset: destAsset,
          quoteAsset: Assets.USDC,
        },
      },
    }),
  ]);
};

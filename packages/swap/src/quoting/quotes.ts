import assert from 'assert';
import * as crypto from 'crypto';
import { Observable, Subscription, filter } from 'rxjs';
import { getPoolsNetworkFeeHundredthPips } from '@/shared/consts';
import { Assets, ChainflipNetwork } from '@/shared/enums';
import { QuoteRequest, QuoteQueryParams, QuoteFee } from '@/shared/schemas';
import { BrokerQuote, MarketMakerQuote } from './schemas';
import prisma, { Pool } from '../client';
import { Comparison, compareNumericStrings } from '../utils/string';

const QUOTE_TIMEOUT = Number.parseInt(process.env.QUOTE_TIMEOUT ?? '1000', 10);

const ONE_IN_HUNDREDTH_PIPS = 1000000;

const getPips = (value: string, hundrethPips: number) =>
  (BigInt(value) * BigInt(hundrethPips)) / BigInt(ONE_IN_HUNDREDTH_PIPS);

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

export const buildQuoteRequest = (query: QuoteQueryParams): QuoteRequest => {
  const { srcAsset, destAsset, amount } = query;

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

export const calculateIncludedFees = (
  request: QuoteRequest,
  quote: MarketMakerQuote | BrokerQuote,
  quotePools: Pool[],
): QuoteFee[] => {
  const networkFeeHundredthPips = getPoolsNetworkFeeHundredthPips(
    process.env.CHAINFLIP_NETWORK as ChainflipNetwork,
  );

  if (request.source_asset === Assets.USDC) {
    return [
      {
        type: 'network',
        asset: Assets.USDC,
        amount: getPips(
          request.deposit_amount,
          networkFeeHundredthPips,
        ).toString(),
      },
      {
        type: 'liquidity',
        asset: request.source_asset,
        amount: getPips(
          request.deposit_amount,
          quotePools[0].liquidityFeeHundredthPips,
        ).toString(),
      },
    ];
  }

  if (request.destination_asset === Assets.USDC) {
    const stableAmountBeforeNetworkFee =
      (BigInt(quote.egressAmount) * BigInt(ONE_IN_HUNDREDTH_PIPS)) /
      BigInt(ONE_IN_HUNDREDTH_PIPS - networkFeeHundredthPips);

    return [
      {
        type: 'network',
        asset: Assets.USDC,
        amount: getPips(
          String(stableAmountBeforeNetworkFee),
          networkFeeHundredthPips,
        ).toString(),
      },
      {
        type: 'liquidity',
        asset: request.source_asset,
        amount: getPips(
          request.deposit_amount,
          quotePools[0].liquidityFeeHundredthPips,
        ).toString(),
      },
    ];
  }

  assert(
    'intermediateAmount' in quote && quote.intermediateAmount,
    'no intermediate amount on quote',
  );

  return [
    {
      type: 'network',
      asset: Assets.USDC,
      amount: getPips(
        quote.intermediateAmount,
        networkFeeHundredthPips,
      ).toString(),
    },
    {
      type: 'liquidity',
      asset: request.source_asset,
      amount: getPips(
        request.deposit_amount,
        quotePools[0].liquidityFeeHundredthPips,
      ).toString(),
    },
    {
      type: 'liquidity',
      asset: request.intermediate_asset,
      amount: getPips(
        quote.intermediateAmount,
        quotePools[1].liquidityFeeHundredthPips,
      ).toString(),
    },
  ];
};

export const getQuotePools = async (
  query: QuoteQueryParams,
): Promise<Pool[]> => {
  const { srcAsset, destAsset } = query;

  if (srcAsset === Assets.USDC || destAsset === Assets.USDC) {
    return [
      await prisma.pool.findUniqueOrThrow({
        where: {
          baseAsset_pairAsset: {
            baseAsset: srcAsset === Assets.USDC ? srcAsset : destAsset,
            pairAsset: srcAsset === Assets.USDC ? destAsset : srcAsset,
          },
        },
      }),
    ];
  }

  return Promise.all([
    prisma.pool.findUniqueOrThrow({
      where: {
        baseAsset_pairAsset: {
          baseAsset: Assets.USDC,
          pairAsset: srcAsset,
        },
      },
    }),
    prisma.pool.findUniqueOrThrow({
      where: {
        baseAsset_pairAsset: {
          baseAsset: Assets.USDC,
          pairAsset: destAsset,
        },
      },
    }),
  ]);
};

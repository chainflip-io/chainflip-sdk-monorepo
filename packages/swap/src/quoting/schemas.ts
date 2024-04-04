import { z } from 'zod';
import { BaseAssetAndChain } from '@/shared/enums';
import { numericString, unsignedInteger } from '@/shared/parsers';
import { QuoteType } from './Quoter';

const limitOrder = z.tuple([z.number(), numericString.transform((n) => BigInt(n))]);

export const marketMakerResponseSchema = z.object({
  request_id: z.string(),
  legs: z.union([
    z.tuple([z.array(limitOrder), z.array(limitOrder)]),
    z.tuple([z.array(limitOrder)]),
  ]),
});

export type MarketMakerRawQuote = z.input<typeof marketMakerResponseSchema>;
export type MarketMakerQuote = z.output<typeof marketMakerResponseSchema>;

export type Leg = {
  amount: string;
  base_asset: BaseAssetAndChain;
  quote_asset: { chain: 'Ethereum'; asset: 'USDC' };
  side: 'BUY' | 'SELL';
};

export type MarketMakerQuoteRequest = {
  request_id: string;
  legs: [Leg] | [Leg, Leg];
};

export const swapRateResponseSchema = z
  .object({
    intermediary: unsignedInteger.nullable(),
    output: unsignedInteger,
  })
  .transform((rate) => ({
    intermediateAmount: rate.intermediary ?? null,
    outputAmount: rate.output,
    quoteType: 'broker' as QuoteType,
  }));

export type BrokerQuote = z.infer<typeof swapRateResponseSchema>;

import { z } from 'zod';
import { AssetAndChain } from '@/shared/enums';
import { numericString, unsignedInteger } from '@/shared/parsers';
import { QuoteType } from './quotes';

export const marketMakerResponseSchema = z.object({
  request_id: z.string(),
  limit_orders: z.array(z.tuple([z.number(), numericString.transform((n) => BigInt(n))])),
});

export type MarketMakerRawQuote = z.input<typeof marketMakerResponseSchema>;
export type MarketMakerQuote = z.output<typeof marketMakerResponseSchema>;

export type MarketMakerQuoteRequest = {
  request_id: string;
  amount: string;
  base_asset: AssetAndChain;
  quote_asset: AssetAndChain;
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

import { z } from 'zod';
import { numericString, unsignedInteger } from '@/shared/parsers';
import { QuoteType } from './quotes';

export const marketMakerResponseSchema = z.object({
  id: z.string(),
  limitOrders: z.array(z.tuple([z.number(), numericString.transform((n) => BigInt(n))])),
});

export type MarketMakerQuote = z.infer<typeof marketMakerResponseSchema>;

export const swapRateResponseSchema = z
  .object({
    // TODO: simplify when we know how Rust `Option` is encoded
    intermediary: unsignedInteger.optional().nullable(),
    output: unsignedInteger,
  })
  .transform((rate) => ({
    intermediateAmount: rate.intermediary ?? null,
    outputAmount: rate.output,
    quoteType: 'broker' as QuoteType,
  }));

export type BrokerQuote = z.infer<typeof swapRateResponseSchema>;

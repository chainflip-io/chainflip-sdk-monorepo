import { z } from 'zod';
import { numericString, unsignedInteger } from '@/shared/parsers';
import { QuoteType } from './quotes';

export const marketMakerResponseSchema = z
  .union([
    z
      .object({
        id: z.string(),
        intermediate_amount: numericString,
        output_amount: numericString,
      })
      .transform(({ id, ...rest }) => ({
        id,
        intermediateAmount: rest.intermediate_amount,
        outputAmount: rest.output_amount,
      })),
    z
      .object({
        id: z.string(),
        output_amount: numericString,
      })
      .transform(({ id, ...rest }) => ({
        id,
        outputAmount: rest.output_amount,
      })),
  ])
  .transform((quote) => ({
    ...quote,
    quoteType: 'market_maker' as QuoteType,
  }));
export type MarketMakerQuote = z.infer<typeof marketMakerResponseSchema>;

export const swapRateResponseSchema = z
  .object({
    // TODO: simplify when we know how Rust `Option` is encoded
    intermediary: unsignedInteger.optional().nullable(),
    output: unsignedInteger,
  })
  .transform((rate) => ({
    intermediateAmount: rate.intermediary?.toString(),
    outputAmount: rate.output.toString(),
    quoteType: 'broker' as QuoteType,
  }));
export type BrokerQuote = z.infer<typeof swapRateResponseSchema>;

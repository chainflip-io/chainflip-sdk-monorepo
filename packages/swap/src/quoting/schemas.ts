import { z } from 'zod';
import { MAX_TICK, MIN_TICK } from '@/shared/consts';
import { BaseAssetAndChain } from '@/shared/enums';
import { numericString } from '@/shared/parsers';

const limitOrder = z.tuple([
  z
    .number()
    .gte(MIN_TICK, { message: 'tick provided is too small' })
    .lte(MAX_TICK, { message: 'tick provided is too big' }),
  numericString
    .transform((n) => BigInt(n))
    .refine((n) => n > 0n, { message: 'sell amount must be positive' }),
]);

export const marketMakerResponseSchema = z.object({
  request_id: z.string(),
  legs: z.union([
    z.tuple([z.array(limitOrder), z.array(limitOrder)]),
    z.tuple([z.array(limitOrder)]),
  ]),
});

export const requestIdObj = z.object({ request_id: z.string() });

export type MarketMakerRawQuote = z.input<typeof marketMakerResponseSchema>;
export type MarketMakerQuote = z.output<typeof marketMakerResponseSchema>;

export type LegJson = {
  amount: string;
  base_asset: BaseAssetAndChain;
  quote_asset: { chain: 'Ethereum'; asset: 'USDC' };
  side: 'BUY' | 'SELL';
};

export type MarketMakerQuoteRequest<T> = {
  request_id: string;
  legs: readonly [T] | readonly [T, T];
};

import type { Server } from 'socket.io';
import { z } from 'zod';
import { getQuoteRequestSchema, quoteQuerySchema } from '@/shared/schemas';
import getConnectionHandler from '../quoting/getConnectionHandler';
import {
  buildQuoteRequest,
  calculateIncludedFees,
  collectMakerQuotes,
  findBestQuote,
  getQuotePools,
  subtractFeesFromMakerQuote,
} from '../quoting/quotes';
import logger from '../utils/logger';
import { getMinimumSwapAmount } from '../utils/rpc';
import ServiceError from '../utils/ServiceError';
import { getBrokerQuote } from '../utils/statechain';

export default async function getQuote(
  io: Server,
  input: z.output<typeof getQuoteRequestSchema>,
) {
  const { handler, quotes$ } = getConnectionHandler();
  io.on('connection', handler);

  const result = quoteQuerySchema.safeParse(input);

  if (!result.success) {
    logger.info('received invalid quote request', { query: input });
    throw ServiceError.badRequest('invalid request');
  }

  const minimumAmount = await getMinimumSwapAmount(
    process.env.RPC_NODE_HTTP_URL as string,
    result.data.srcAsset,
  );
  if (BigInt(result.data.amount) < minimumAmount) {
    throw ServiceError.badRequest(
      'expected amount is below minimum swap amount',
    );
  }

  const quoteRequest = buildQuoteRequest(result.data);
  const quotePools = await getQuotePools(result.data);

  io.emit('quote_request', quoteRequest);

  try {
    const [rawMarketMakerQuotes, brokerQuote] = await Promise.all([
      collectMakerQuotes(quoteRequest.id, io.sockets.sockets.size, quotes$),
      getBrokerQuote(result.data, quoteRequest.id),
    ]);

    // market maker quotes do not include liquidity pool fee and network fee
    const marketMakerQuotes = rawMarketMakerQuotes.map((makerQuote) =>
      subtractFeesFromMakerQuote(makerQuote, quotePools),
    );

    const bestQuote = findBestQuote(marketMakerQuotes, brokerQuote);
    const includedFees = calculateIncludedFees(
      quoteRequest,
      bestQuote,
      quotePools,
    );

    return {
      ...input,
      quote: {
        ...bestQuote,
        includedFees,
      },
    };
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : 'unknown error (possibly no liquidity)';

    logger.error('error while collecting quotes:', err);

    throw ServiceError.internalError(message);
  }
}

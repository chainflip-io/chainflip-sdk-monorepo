import express from 'express';
import type { Server } from 'socket.io';
import { quoteQuerySchema } from '@/shared/schemas';
import { asyncHandler } from './common';
import getConnectionHandler from '../quoting/getConnectionHandler';
import {
  findBestQuote,
  buildQuoteRequest,
  collectMakerQuotes,
  getQuotePools,
  subtractFeesFromMakerQuote,
  calculateIncludedFees,
} from '../quoting/quotes';
import logger from '../utils/logger';
import { validateSwapAmount } from '../utils/rpc';
import ServiceError from '../utils/ServiceError';
import { getBrokerQuote } from '../utils/statechain';

const quote = (io: Server) => {
  const router = express.Router();

  const { handler, quotes$ } = getConnectionHandler();

  io.on('connection', handler);

  router.get(
    '/',
    asyncHandler(async (req, res) => {
      const queryResult = quoteQuerySchema.safeParse(req.query);

      if (!queryResult.success) {
        logger.info('received invalid quote request', { query: req.query });
        throw ServiceError.badRequest('invalid request');
      }

      const query = queryResult.data;

      const amountResult = await validateSwapAmount(
        query.srcAsset,
        BigInt(query.amount),
      );

      if (!amountResult.success) {
        throw ServiceError.badRequest(amountResult.reason);
      }

      const quoteRequest = buildQuoteRequest(query);
      const quotePools = await getQuotePools(query);

      io.emit('quote_request', quoteRequest);

      try {
        const [rawMarketMakerQuotes, brokerQuote] = await Promise.all([
          collectMakerQuotes(quoteRequest.id, io.sockets.sockets.size, quotes$),
          getBrokerQuote(query, quoteRequest.id),
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

        res.json({ ...bestQuote, includedFees });
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : 'unknown error (possibly no liquidity)';

        logger.error('error while collecting quotes:', err);

        res.status(500).json({ error: message });
      }
    }),
  );

  return router;
};

export default quote;

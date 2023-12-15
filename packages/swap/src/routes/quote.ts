import express from 'express';
import type { Server } from 'socket.io';
import { quoteQuerySchema, SwapFee } from '@/shared/schemas';
import {
  calculateIncludedSwapFees,
  estimateIngressEgressFeeAssetAmount,
} from '@/swap/utils/fees';
import { getPools } from '@/swap/utils/pools';
import { asyncHandler } from './common';
import getConnectionHandler from '../quoting/getConnectionHandler';
import {
  findBestQuote,
  buildQuoteRequest,
  collectMakerQuotes,
  subtractFeesFromMakerQuote,
} from '../quoting/quotes';
import logger from '../utils/logger';
import {
  getNativeEgressFee,
  getNativeIngressFee,
  validateSwapAmount,
} from '../utils/rpc';
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

      const includedFees: SwapFee[] = [];
      const ingressFee = await estimateIngressEgressFeeAssetAmount(
        await getNativeIngressFee(query.srcAsset),
        query.srcAsset.asset,
      );
      includedFees.push({
        type: 'INGRESS',
        chain: query.srcAsset.chain,
        asset: query.srcAsset.asset,
        amount: ingressFee.toString(),
      });

      const quoteRequest = buildQuoteRequest({
        ...query,
        amount: String(BigInt(query.amount) - ingressFee),
      });
      const quotePools = await getPools(
        query.srcAsset.asset,
        query.destAsset.asset,
      );

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
        const quoteSwapFees = await calculateIncludedSwapFees(
          quoteRequest.source_asset,
          quoteRequest.destination_asset,
          quoteRequest.deposit_amount,
          'intermediateAmount' in bestQuote
            ? bestQuote.intermediateAmount
            : undefined,
          bestQuote.egressAmount,
        );
        includedFees.push(...quoteSwapFees);

        const egressFee = await estimateIngressEgressFeeAssetAmount(
          await getNativeEgressFee(query.destAsset),
          query.destAsset.asset,
        );

        if (egressFee > 0n) {
          includedFees.push({
            type: 'EGRESS',
            chain: query.destAsset.chain,
            asset: query.destAsset.asset,
            amount: egressFee.toString(),
          });
        }

        res.json({
          ...bestQuote,
          egressAmount: String(BigInt(bestQuote.egressAmount) - egressFee),
          includedFees,
        });
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

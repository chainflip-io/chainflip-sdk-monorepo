import express from 'express';
import {
  publishQuoteRequestFailed,
  publishQuoteRequestReceived,
  publishQuoteResponseSent,
} from '../../messageQueues/quoteEvents.js';
import Quoter from '../../quoting/Quoter.js';
import QuoteRequest from '../../quoting/QuoteRequest.js';
import logger from '../../utils/logger.js';
import { asyncHandler, handleQuotingError } from '../common.js';

const router = express.Router();

const quoteRouter = (quoter: Quoter) => {
  router.get(
    '/',
    asyncHandler(async (req, res) => {
      const request = await QuoteRequest.create(quoter, req.query);
      publishQuoteRequestReceived(request.toLogInfo());

      try {
        const result = await request.tryGenerateQuotes();

        if (result.status === 'fulfilled') {
          res.json(result.value);
        } else {
          throw result.reason;
        }
      } catch (err) {
        publishQuoteRequestFailed(request.toLogInfo(), err);
        handleQuotingError(res, err);
      } finally {
        publishQuoteResponseSent(request.toLogInfo());
        logger.info('quote request completed', request.toLogInfo());
      }
    }),
  );
  return router;
};

export default quoteRouter;

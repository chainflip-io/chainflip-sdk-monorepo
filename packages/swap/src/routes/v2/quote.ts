import express from 'express';
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

      try {
        const result = await request.generateQuotes().then(
          (qs) => ({ status: 'fulfilled' as const, value: qs }),
          (err) => ({ status: 'rejected' as const, reason: err as Error }),
        );

        if (result.status === 'fulfilled') {
          res.json(result.value);
        } else {
          throw result.reason;
        }
      } catch (err) {
        handleQuotingError(res, err);
      } finally {
        logger.info('quote request completed', request.toLogInfo());
      }
    }),
  );
  return router;
};

export default quoteRouter;

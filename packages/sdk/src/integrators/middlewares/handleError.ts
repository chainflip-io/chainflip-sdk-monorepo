import { ErrorRequestHandler } from 'express';
import logger, { inspectError } from '../logger.js';
import ServiceError from '../utils/ServiceError.js';

export const handleError: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof ServiceError) {
    logger.info('received error', { error: inspectError(error) });
    res.status(error.code).json(error.toJSON());
    return;
  }

  logger.error('unknown error occurred', { error: inspectError(error) });
  res.status(500).json({ message: 'unknown error' });
};

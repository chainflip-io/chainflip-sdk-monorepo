import { ErrorRequestHandler } from 'express';
import logger, { inspectError } from '../logger.js';
import ServiceError from '../utils/ServiceError.js';

// express.json() errors (malformed JSON, payload too large, ...) carry a 4xx `status`
const getClientErrorStatus = (error: unknown): number | null => {
  if (typeof error !== 'object' || error === null || !('status' in error)) return null;
  const { status } = error;
  return typeof status === 'number' && status >= 400 && status < 500 ? status : null;
};

export const handleError: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof ServiceError) {
    logger.info('received error', { error: inspectError(error) });
    res.status(error.code).json(error.toJSON());
    return;
  }

  const clientErrorStatus = getClientErrorStatus(error);
  if (clientErrorStatus) {
    res
      .status(clientErrorStatus)
      .json({ error: 'invalidRequest', message: 'invalid request body' });
    return;
  }

  logger.error('unknown error occurred', { error: inspectError(error) });
  res.status(500).json({ message: 'unknown error' });
};

import { RequestHandler, ErrorRequestHandler } from 'express';
import * as express from 'express';
import type { RouteParameters } from 'express-serve-static-core';
import env from '../../config/env.js';
import logger, { inspectError } from '../../utils/logger.js';
import ServiceError from '../../utils/ServiceError.js';

export const handleError: ErrorRequestHandler = (error, req, res, _next) => {
  if (error instanceof ServiceError) {
    logger.info('received error', { error: inspectError(error) });
    res.status(error.code).json(error.toJSON());
  } else {
    logger.error('unknown error occurred', { error: inspectError(error) });
    res.status(500).json({ message: 'unknown error' });
  }
};

export const maintenanceMode: RequestHandler = (req, res, next) => {
  if (env.MAINTENANCE_MODE) {
    next(ServiceError.unavailable('The swap service is currently unavailable due to maintenance'));
    return;
  }

  next();
};

export const quoteMiddleware: RequestHandler = (req, res, next) => {
  if (env.DISABLE_QUOTING) {
    if (
      env.QUOTING_ALLOWED_ORIGINS.size &&
      req.headers.origin &&
      env.QUOTING_ALLOWED_ORIGINS.has(req.headers.origin.toLowerCase())
    ) {
      next();
      return;
    }
    next(ServiceError.unavailable('Quoting is currently unavailable due to maintenance'));
    return;
  }

  next();
};

/* eslint-disable @typescript-eslint/no-explicit-any */
export const asyncHandler = <
  Route extends string,
  P = RouteParameters<Route>,
  ResBody = any,
  ReqBody = any,
  ReqQuery = Record<string, string | string[] | undefined>,
  Locals extends Record<string, any> = Record<string, any>,
>(
  handler: RequestHandler<P, ResBody, ReqBody, ReqQuery, Locals>,
): typeof handler =>
  (async (req, res, next) => {
    try {
      await handler(req, res, next);
    } catch (error) {
      // console.error(error);
      next(error);
    }
  }) as RequestHandler<P, ResBody, ReqBody, ReqQuery, Locals>;
/* eslint-enable @typescript-eslint/no-explicit-any */

export const handleQuotingError = (res: express.Response, err: unknown) => {
  if (err instanceof ServiceError) throw err;

  const message = err instanceof Error ? err.message : 'unknown error (possibly no liquidity)';

  if (
    message.includes('InsufficientLiquidity') ||
    message.includes('Swap leg failed') ||
    message.includes('Failed to calculate network fee') ||
    message.includes('-32603') ||
    message.includes('-32021')
  ) {
    throw ServiceError.badRequest('insufficient liquidity for requested amount');
  }

  logger.error('error while collecting quotes:', { error: inspectError(err) });

  res.status(500).json({ message });
};

import { RequestHandler, ErrorRequestHandler } from 'express';
import * as express from 'express';
import type { RouteParameters } from 'express-serve-static-core';
import { inspect } from 'util';
import { InternalAsset } from '@/shared/enums';
import env from '../config/env';
import type Quoter from '../quoting/Quoter';
import logger from '../utils/logger';
import ServiceError from '../utils/ServiceError';

export const handleError: ErrorRequestHandler = (error, req, res, _next) => {
  logger.customInfo('received error', {}, { error: inspect(error) });

  if (error instanceof ServiceError) {
    res.status(error.code).json(error.toJSON());
  } else {
    logger.customError(
      'unknown error occurred',
      { alertCode: 'UnknownError' },
      { error: inspect(error) },
    );
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

type AdditionalInfo = {
  srcAsset: InternalAsset;
  destAsset: InternalAsset;
  amount: string;
  usdValue: string | undefined;
  limitOrdersReceived: Awaited<ReturnType<Quoter['getLimitOrders']>> | undefined;
};

export const handleQuotingError = (res: express.Response, err: unknown, info: AdditionalInfo) => {
  if (err instanceof ServiceError) throw err;

  const message = err instanceof Error ? err.message : 'unknown error (possibly no liquidity)';

  if (message.includes('InsufficientLiquidity') || message.includes('-32603')) {
    logger.info('insufficient liquidity received', info);
    throw ServiceError.badRequest('insufficient liquidity for requested amount');
  }

  logger.error('error while collecting quotes:', { error: err, info });

  res.status(500).json({ message });
};

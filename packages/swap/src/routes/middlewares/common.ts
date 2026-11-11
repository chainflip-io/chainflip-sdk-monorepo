import { RequestHandler, ErrorRequestHandler } from 'express';
import * as express from 'express';
import type { RouteParameters } from 'express-serve-static-core';
import env from '../../config/env.js';
import logger, { inspectError } from '../../utils/logger.js';
import ServiceError from '../../utils/ServiceError.js';

const getClientErrorStatus = (error: unknown): number | null => {
  if (typeof error !== 'object' || error === null || !('status' in error)) return null;
  const { status } = error;
  return typeof status === 'number' && status >= 400 && status < 500 ? status : null;
};

// wraps `express.json()` so that errors caused by the request body (malformed JSON, unsupported
// content encodings, oversized payloads, ...) are returned as client errors.
export const jsonBodyParser = (
  options?: Parameters<typeof express.json>[0],
): ReturnType<typeof express.json> => {
  const parser = express.json(options);

  return (req, res, next) => {
    parser(req, res, (error?: unknown) => {
      if (error === undefined) {
        next();
        return;
      }

      const status = getClientErrorStatus(error);
      if (status === null) {
        next(error);
        return;
      }

      const message = error instanceof Error ? error.message : 'invalid request body';
      next(new ServiceError(message, status));
    });
  };
};

const swappingModuleErrorRegex =
  /^RPC error \[-32024\]: KnownModuleError \{ pallet: "Swapping", name: "(\w+)", error: "([^"]*)" \}/;

// swapping pallet errors caused by invalid user-supplied parameters of the extrinsics submitted by
// this service (opening deposit channels, encoding vault swaps, opening account creation channels).
// other errors of the pallet (e.g. safe mode, missing oracle prices) are server-side problems
const clientSwappingModuleErrors = new Set([
  'IncompatibleAssetAndAddress',
  'InvalidEgressAddress',
  'InvalidDestinationAddress',
  'InvalidRefundAddress',
  'CcmUnsupportedForTargetChain',
  'CcmUnsupportedForRefundChain',
  'InvalidCcm',
  'BrokerCommissionBpsTooHigh',
  'BrokerFeeTooHigh',
  'BoostFeeTooHigh',
  'AffiliateFeeTooHigh',
  'AffiliateNotRegisteredForBroker',
  'RetryDurationTooHigh',
  'ZeroNumberOfChunksNotAllowed',
  'ChunkIntervalTooLow',
  'SwapRequestDurationTooLong',
  'InvalidDcaParameters',
  'InvalidUserSignatureData',
  'InvalidTransactionMetadata',
  'AccountAlreadyExists',
]);

const toServiceError = (error: unknown): ServiceError | null => {
  if (error instanceof ServiceError) return error;

  if (error instanceof Error) {
    const match = swappingModuleErrorRegex.exec(error.message);
    if (match && clientSwappingModuleErrors.has(match[1])) {
      return ServiceError.badRequest(`${match[1]}: ${match[2]}`);
    }
  }

  return null;
};

export const handleError: ErrorRequestHandler = (error, req, res, _next) => {
  const serviceError = toServiceError(error);

  if (serviceError) {
    logger.info('received error', { error: inspectError(error) });
    res.status(serviceError.code).json(serviceError.toJSON());
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

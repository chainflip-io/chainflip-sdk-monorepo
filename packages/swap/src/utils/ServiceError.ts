type IgnoredField =
  | 'prototype'
  | 'assert'
  | 'captureStackTrace'
  | 'prepareStackTrace'
  | 'stackTraceLimit';

type ErrorCode = 'not-found' | 'bad-request' | 'internal-error' | 'rpc-error' | 'invalid-amount';

export default class ServiceError extends Error {
  static badRequest(
    code: ErrorCode = 'bad-request',
    message = 'the request payload is not valid',
  ): ServiceError {
    return new ServiceError(code, message, 400);
  }

  static notFound(
    code: ErrorCode = 'not-found',
    message = 'the requested resource was not found',
  ): ServiceError {
    return new ServiceError(code, message, 404);
  }

  static internalError(
    code: ErrorCode = 'internal-error',
    message = 'an unexpected internal error occurred',
  ): ServiceError {
    return new ServiceError(code, message, 500);
  }

  static assert(
    condition: unknown,
    type: Exclude<keyof typeof ServiceError, IgnoredField>,
    code: ErrorCode,
    message: string,
  ): asserts condition {
    if (!condition) throw ServiceError[type](code, message);
  }

  constructor(
    readonly code: ErrorCode,
    message: string,
    readonly httpCode: number,
  ) {
    super(message);

    Error.captureStackTrace(this, ServiceError);
  }
}

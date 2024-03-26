type IgnoredField =
  | 'prototype'
  | 'assert'
  | 'captureStackTrace'
  | 'prepareStackTrace'
  | 'stackTraceLimit';

export default class ServiceError extends Error {
  static badRequest(code: string, message: string): ServiceError {
    return new ServiceError(code, message, 400);
  }

  static notFound(code: string, message = 'resource not found'): ServiceError {
    return new ServiceError(code, message, 404);
  }

  static internalError(code: string, message = 'internal error'): ServiceError {
    return new ServiceError(code, message, 500);
  }

  static assert(
    condition: unknown,
    type: Exclude<keyof typeof ServiceError, IgnoredField>,
    code: string,
    message: string,
  ): asserts condition {
    if (!condition) throw ServiceError[type](code, message);
  }

  constructor(
    readonly code: string,
    message: string,
    readonly httpCode: number,
  ) {
    super(message);

    Error.captureStackTrace(this, ServiceError);
  }
}

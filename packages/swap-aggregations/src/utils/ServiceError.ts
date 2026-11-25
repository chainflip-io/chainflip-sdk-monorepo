// mirrors packages/swap/src/utils/ServiceError.ts so both services return errors in the same shape
export default class ServiceError extends Error {
  static badRequest(message: string): ServiceError {
    return new ServiceError(message, 400);
  }

  static notFound(message = 'resource not found'): ServiceError {
    return new ServiceError(message, 404);
  }

  static internalError(message = 'internal error'): ServiceError {
    return new ServiceError(message, 500);
  }

  static notImplemented(message = 'not implemented'): ServiceError {
    return new ServiceError(message, 501);
  }

  static unavailable(message = 'service unavailable'): ServiceError {
    return new ServiceError(message, 503);
  }

  static tooManyRequests(message = 'Too many requests, please try again later'): ServiceError {
    return new ServiceError(message, 429);
  }

  constructor(
    message: string,
    readonly code: number,
  ) {
    super(message);

    Error.captureStackTrace(this, ServiceError);
  }

  toJSON() {
    return { message: this.message };
  }
}

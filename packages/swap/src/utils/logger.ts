import 'dotenv/config';
import { AsyncLocalStorage } from 'async_hooks';
import type { UUID } from 'crypto';
import stringify from 'safe-stable-stringify';
import { createLogger, format, LeveledLogMethod, transports, type Logger } from 'winston';
import env from '../config/env.js';

type CommonAlertCode = 'DbReadError' | 'DbWriteError';

type SwapAlertCode = CommonAlertCode | 'EventHandlerError' | 'UnknownError';

interface CustomMetadata {
  alertCode: SwapAlertCode;
  heapUsed: number | string;
  performance: string;
}

interface CustomLoggerMethod {
  (message: string): Logger;
  (message: string, customMeta?: Partial<CustomMetadata>): Logger;
  (message: string, customMeta: Partial<CustomMetadata>, meta?: unknown): Logger;
}

interface CustomLogger extends Logger {
  customError: CustomLoggerMethod;
  customInfo: CustomLoggerMethod;
  customWarn: CustomLoggerMethod;
}

const transformedLogger = (
  loggerFn: LeveledLogMethod,
  message: string,
  customMeta?: Partial<CustomMetadata>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  meta?: any,
) => {
  if (meta instanceof Error) {
    const error = {
      name: meta.name,
      message: meta.message,
      stack: meta.stack,
    };
    return loggerFn(message, { error, metadata: customMeta });
  }
  if (meta !== null && typeof meta === 'object' && 'error' in meta && meta.error instanceof Error) {
    const error = {
      name: meta.error.name,
      message: meta.error.message,
      stack: meta.error.stack,
    };
    return loggerFn(message, { metadata: customMeta, ...meta, error });
  }
  return loggerFn(message, { metadata: customMeta, ...meta });
};

const customMessageFormat = format.printf(
  (info) =>
    // TODO: check and improve the format for dev environments - old format broken by unexpected breaking change
    `[${info.timestamp}] ${info.level}: ${info.message}  ${stringify(info.metadata)}`,
);

export const logStorage = new AsyncLocalStorage<UUID>();

const addReqId = format((info) => ({ ...info, reqId: logStorage.getStore() }));

const createLoggerFunc = (label: string) => {
  const logger = createLogger({
    format: format.combine(
      addReqId(),
      format.errors({ stack: true }),
      format.timestamp({
        format: 'YY-MM-DD HH:mm:ss',
      }),
      env.NODE_ENV === 'production'
        ? format.json()
        : format.combine(customMessageFormat, format.colorize({ all: true })),
    ),
    silent: env.NODE_ENV === 'test',
    defaultMeta: { component: label.toUpperCase() },
    transports: [new transports.Console()],
  }) as CustomLogger;

  logger.customInfo = (message: string, customMeta?: Partial<CustomMetadata>, meta?: unknown) =>
    transformedLogger(logger.info, message, customMeta, meta);
  logger.customWarn = (message: string, customMeta?: Partial<CustomMetadata>, meta?: unknown) =>
    transformedLogger(logger.warn, message, customMeta, meta);
  logger.customError = (message: string, customMeta?: Partial<CustomMetadata>, meta?: unknown) =>
    transformedLogger(logger.error, message, customMeta, meta);

  return logger;
};

const logger = createLoggerFunc('swap');

export default logger;

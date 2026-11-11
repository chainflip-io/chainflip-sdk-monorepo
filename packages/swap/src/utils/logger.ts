import 'dotenv/config';
import { AsyncLocalStorage } from 'async_hooks';
import type { UUID } from 'crypto';
import stringify from 'safe-stable-stringify';
import winston, { createLogger, format, transports } from 'winston';
import { ZodError } from 'zod';
import env from '../config/env.js';

const customMessageFormat = format.printf(
  (info) =>
    // TODO: check and improve the format for dev environments - old format broken by unexpected breaking change
    `[${info.timestamp}] ${info.level}: ${info.message}  ${info.metadata ? stringify(info.metadata) : ''}`,
);

// npm levels shifted down to make room for three custom levels more severe than 'error'
const levels = {
  alert: 0,
  crit: 1,
  severe: 2,
  ...Object.fromEntries(
    Object.entries(winston.config.npm.levels).map(([level, n]) => [level, n + 3]),
  ),
};

// winston only ships colors for its built-in level names, and colorize throws on a level without one
winston.addColors({ severe: 'red' });

type Logger = winston.Logger & Record<keyof typeof levels, winston.LeveledLogMethod>;

export const logStorage = new AsyncLocalStorage<UUID>();

const addReqId = format((info) => ({ ...info, reqId: info.reqId ?? logStorage.getStore() }));

const logger = createLogger({
  format: format.combine(
    addReqId(),
    format.errors({ stack: true }),
    format.timestamp({ format: 'YY-MM-DD HH:mm:ss' }),
    env.NODE_ENV === 'production'
      ? format.json()
      : format.combine(customMessageFormat, format.colorize({ all: true })),
  ),
  silent: env.NODE_ENV === 'test',
  defaultMeta: { component: 'SWAP' },
  transports: [new transports.Console()],
  levels,
}) as Logger;

export default logger;

type PrismaError = Error & { clientVersion: string; code?: string; meta?: unknown };

const isPrismaError = (err: Error): err is PrismaError => 'clientVersion' in err;

const safeSerialize = (value: unknown): unknown => {
  const s = stringify(value);
  return s !== undefined ? JSON.parse(s) : null;
};

export const inspectError = (err: unknown) => {
  if (err instanceof ZodError) {
    return { name: err.name, message: err.message, issues: safeSerialize(err.issues) };
  }
  if (err instanceof Error) {
    if (isPrismaError(err)) {
      return {
        name: err.name,
        message: err.message,
        stack: err.stack,
        ...(err.code !== undefined && { code: err.code }),
        ...(err.meta !== undefined && { meta: safeSerialize(err.meta) }),
      };
    }
    return { name: err.name, message: err.message, stack: err.stack };
  }
  return safeSerialize(err);
};

const MAX_LOGGED_BODY_LENGTH = 10_000;
// legitimate request bodies are nested a few levels deep at most. without a bound, a crafted body of
// deeply nested arrays that fits within the body size limit overflows the stack when serialized
const MAX_LOGGED_BODY_DEPTH = 10;

const stringifyBody = stringify.configure({ maximumDepth: MAX_LOGGED_BODY_DEPTH });

export const serializeRequestBody = (body: unknown): unknown => {
  if (body === undefined || body === null) return undefined;
  if (typeof body === 'object' && Object.keys(body).length === 0) return undefined;

  let serialized;
  try {
    serialized = stringifyBody(body);
  } catch (err) {
    logger.warn('failed to serialize request body', { error: inspectError(err) });
    return '(failed to serialize request body)';
  }
  if (serialized === undefined) return undefined;
  if (serialized.length <= MAX_LOGGED_BODY_LENGTH) return JSON.parse(serialized);

  return `${serialized.slice(0, MAX_LOGGED_BODY_LENGTH)}...(truncated, ${serialized.length} chars)`;
};

import 'dotenv/config';
import { AsyncLocalStorage } from 'async_hooks';
import type { UUID } from 'crypto';
import stringify from 'safe-stable-stringify';
import { createLogger, format, transports } from 'winston';
import { ZodError } from 'zod';
import env from '../config/env.js';

const customMessageFormat = format.printf(
  (info) =>
    // TODO: check and improve the format for dev environments - old format broken by unexpected breaking change
    `[${info.timestamp}] ${info.level}: ${info.message}  ${info.metadata ? stringify(info.metadata) : ''}`,
);

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
});

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

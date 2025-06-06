import 'dotenv/config';
import { AsyncLocalStorage } from 'async_hooks';
import type { UUID } from 'crypto';
import stringify from 'safe-stable-stringify';
import { createLogger, format, transports } from 'winston';
import env from '../config/env.js';

const customMessageFormat = format.printf(
  (info) =>
    // TODO: check and improve the format for dev environments - old format broken by unexpected breaking change
    `[${info.timestamp}] ${info.level}: ${info.message}  ${info.metadata ? stringify(info.metadata) : ''}`,
);

export const logStorage = new AsyncLocalStorage<UUID>();

const addReqId = format((info) => ({ ...info, reqId: logStorage.getStore() }));

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

import winston, { createLogger, format, transports } from 'winston';
import env from './env.js';

const logger = createLogger({
  level: env.LOG_LEVEL,
  format: format.combine(format.timestamp(), format.errors({ stack: true }), format.json()),
  defaultMeta: { service: 'integrators' },
  transports: [new transports.Console()],
  silent: env.NODE_ENV === 'test',
});

export const inspectError = (error: unknown) =>
  error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : error;

export type Logger = winston.Logger;

export default logger;

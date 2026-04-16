import { createLogger, format, transports } from 'winston';
import { env } from './env.js';

export const logger = createLogger({
  level: env.LOG_LEVEL,
  format:
    env.NODE_ENV === 'production'
      ? format.combine(format.timestamp(), format.json())
      : format.combine(
          format.colorize(),
          format.timestamp({ format: 'HH:mm:ss' }),
          format.printf(({ timestamp, level, message, ...meta }) => {
            const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
            return `${timestamp} ${level}: ${message}${metaStr}`;
          }),
        ),
  transports: [new transports.Console()],
});
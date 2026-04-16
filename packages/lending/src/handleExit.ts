import { logger } from './logger.js';

const cleanupCallbacks: (() => void | Promise<void>)[] = [];

export const handleExit = (callback: () => void | Promise<void>) => {
  cleanupCallbacks.push(callback);
};

let shutdownInProgress = false;

const shutdown = async (signal: string) => {
  if (shutdownInProgress) return;
  shutdownInProgress = true;

  logger.info(`received ${signal}, shutting down...`);

  for (const callback of cleanupCallbacks) {
    try {
      await callback();
    } catch (error) {
      logger.error('error during shutdown cleanup', { error });
    }
  }

  process.exit(0);
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
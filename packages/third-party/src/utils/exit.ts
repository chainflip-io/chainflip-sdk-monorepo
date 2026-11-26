import logger from '../logger.js';

type ExitHandler = () => unknown;

const exitHandlers = new Set<ExitHandler>();

['SIGINT', 'SIGTERM'].forEach((signal) => {
  process.on(signal, async () => {
    logger.info(`handling "${signal}" signal`);
    setTimeout(() => process.exit(1), 10_000).unref();
    await Promise.allSettled([...exitHandlers].map((handler) => handler()));
    process.exit(0);
  });
});

export const handleExit = (cb: ExitHandler) => {
  exitHandlers.add(cb);

  return () => {
    exitHandlers.delete(cb);
  };
};

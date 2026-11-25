import logger from '../logger.js';

type ExitHandler = () => unknown;

const exitHandlers = new Set<ExitHandler>();

['SIGINT', 'SIGTERM'].forEach((signal) => {
  process.on(signal, () => {
    logger.info(`handling "${signal}" signal`);
    Promise.allSettled([...exitHandlers].map((handler) => handler()));
  });
});

export const handleExit = (cb: ExitHandler) => {
  exitHandlers.add(cb);

  return () => {
    exitHandlers.delete(cb);
  };
};

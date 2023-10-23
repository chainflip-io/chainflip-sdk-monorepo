import { Chain } from '@/shared/enums';
import logger from './logger';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyFunction = (...args: any[]) => any;

export const memoize = <T extends AnyFunction>(fn: T): T => {
  let initialized = false;
  let value: ReturnType<T> | undefined;

  return ((...args) => {
    if (initialized) return value as ReturnType<T>;
    initialized = true;
    value = fn(...args);
    return value;
  }) as T;
};

const exitHandlers = new Set<AnyFunction>();

['SIGINT', 'SIGTERM'].forEach((signal) => {
  process.on(signal, () => {
    logger.info(`handling "${signal}" signal`);
    Promise.allSettled([...exitHandlers].map((handler) => handler()));
  });
});

export const handleExit = (cb: AnyFunction) => {
  exitHandlers.add(cb);

  return () => {
    exitHandlers.delete(cb);
  };
};

export function unreachable(value: never, message: string): never {
  throw new Error(message);
}

// It has always a return value or a rejection, however the linter does not recognize this properly
// eslint-disable-next-line consistent-return
export function calculateTTL(args: {
  chain: Chain;
  startBlock?: bigint;
  expiryBlock?: bigint | null;
}) {
  const { chain, startBlock, expiryBlock } = args;

  if (startBlock == null || expiryBlock == null) {
    return -1;
  }

  const diff = Number(expiryBlock - startBlock);
  switch (chain) {
    case 'Bitcoin':
      return diff * 6;
    case 'Ethereum':
      return diff * 6;
    case 'Polkadot':
      return diff * 6;
    default:
      unreachable(chain, 'Unsupported chain');
  }
}

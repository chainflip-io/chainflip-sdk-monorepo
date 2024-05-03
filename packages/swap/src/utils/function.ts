import { Chain, chainConstants } from '@/shared/enums';
import * as rpc from '@/shared/rpc';
import logger from './logger';
import ServiceError from './ServiceError';
import env from '../config/env';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyFunction = (...args: any[]) => any;

export const memoize = <T extends AnyFunction>(fn: T, ttl?: number): T => {
  let initialized = false;
  let value: ReturnType<T> | undefined;
  let setAt = 0;

  return ((...args) => {
    if (
      !initialized ||
      (ttl && Date.now() - setAt > ttl) ||
      env.NODE_ENV === 'test' // TODO: remove this when we have a better solution for testing
    ) {
      initialized = true;
      value = fn(...args);
      setAt = Date.now();
    }
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

export function calculateExpiryTime(args: {
  chainInfo?: {
    chain: Chain;
    height: bigint;
    blockTrackedAt: Date;
  } | null;
  expiryBlock?: bigint | null;
}) {
  const { chainInfo, expiryBlock } = args;

  if (chainInfo == null || expiryBlock == null) {
    return null;
  }

  const remainingBlocks = Number(expiryBlock - chainInfo.height); // If it is negative, it means the channel has already expired and will return the time from the past
  const { blockTimeSeconds } = chainConstants[chainInfo.chain];

  return new Date(chainInfo.blockTrackedAt.getTime() + remainingBlocks * blockTimeSeconds * 1000);
}

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/ban-types */
export function readField<A extends {}, B extends {}, K extends keyof A & keyof B>(
  a: A | null | undefined,
  b: B | null | undefined,
  key: K,
): A[K] | B[K] | undefined;
export function readField<
  A extends {},
  B extends {},
  C extends {},
  K extends keyof A & keyof B & keyof C,
>(
  a: A | null | undefined,
  b: B | null | undefined,
  c: C | null | undefined,
  key: K,
): A[K] | B[K] | C[K] | undefined;
export function readField(...args: any[]) {
  const key = args.pop();
  return args.reduce((acc, obj) => acc ?? obj?.[key], undefined) ?? undefined;
}
/* eslint-enable @typescript-eslint/no-explicit-any */
/* eslint-enable @typescript-eslint/ban-types */

const cachedGetSpecVersion = memoize(
  () => rpc.getRuntimeVersion({ network: env.CHAINFLIP_NETWORK }).catch(() => ({ specVersion: 0 })),
  6_000,
);

export const isAfterSpecVersion = async (specVersion: number) => {
  const { specVersion: currentSpecVersion } = await cachedGetSpecVersion();

  return currentSpecVersion >= specVersion;
};

export const assertUnreachable = (message: string): never => {
  throw ServiceError.internalError(message);
};

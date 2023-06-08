import type { ChainflipNetwork } from '@/shared/enums';

export function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

export const unreachable = (x: never, message: string): never => {
  throw new Error(`${message}: ${x}`);
};

export const isTestnet = (network: ChainflipNetwork): boolean =>
  network === 'perseverance' || network === 'sisyphos';

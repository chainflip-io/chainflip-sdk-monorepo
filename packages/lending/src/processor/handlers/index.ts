import type { PrismaClient } from '@prisma/client';
import { handleCollateralAdded, handleCollateralRemoved } from './collateral.js';
import { handleOriginationFeeTaken, handleInterestTaken, handleLiquidationFeeTaken } from './fee.js';
import { handleLiquidationInitiated, handleLiquidationCompleted } from './liquidation.js';
import { handleLoanCreated, handleLoanUpdated, handleLoanRepaid, handleLoanSettled } from './loan.js';
import { handlePoolStateUpdated } from './pool.js';
import { handleLenderFundsAdded, handleLenderFundsRemoved } from './supply.js';
import type { Block, Event } from '../../processor/index.js';

export interface EventHandlerContext {
  prisma: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>;
  event: Event;
  block: Block;
}

export type EventHandler = (ctx: EventHandlerContext) => Promise<void>;

type Semver = `${number}.${number}.${number}`;

function compareSemver(a: string, b: string): number {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i += 1) {
    if (pa[i] > pb[i]) return 1;
    if (pa[i] < pb[i]) return -1;
  }
  return 0;
}

class HandlerMap {
  private handlers: Map<string, { spec: Semver; handler: EventHandler }[]>;

  private constructor(handlers: Map<string, { spec: Semver; handler: EventHandler }[]>) {
    this.handlers = handlers;
  }

  static fromGroupedHandlers(
    groups: { spec: Semver; handlers: { name: string; handler: EventHandler }[] }[],
  ): HandlerMap {
    const map = new Map<string, { spec: Semver; handler: EventHandler }[]>();
    for (const group of groups) {
      for (const { name, handler } of group.handlers) {
        if (!map.has(name)) {
          map.set(name, []);
        }
        map.get(name)!.push({ spec: group.spec, handler });
      }
    }
    for (const entries of map.values()) {
      entries.sort((a, b) => compareSemver(a.spec, b.spec));
    }
    return new HandlerMap(map);
  }

  getHandler(eventName: string, specId: string): EventHandler | undefined {
    const entries = this.handlers.get(eventName);
    if (!entries) return undefined;

    let result: EventHandler | undefined;
    for (const h of entries) {
      if (compareSemver(h.spec, specId) <= 0) {
        result = h.handler;
      } else {
        break;
      }
    }
    return result;
  }

  getAllEventNames(): string[] {
    return [...this.handlers.keys()];
  }
}

const palletEvents = <const P extends string, const E extends string>(
  pallet: P,
  eventNames: E[],
) =>
  Object.fromEntries(eventNames.map((e) => [e, `${pallet}.${e}`])) as {
    [K in E]: `${P}.${K}`;
  };

export const events = {
  LendingPools: palletEvents('LendingPools', [
    'LoanCreated',
    'LoanUpdated',
    'LoanRepaid',
    'LoanSettled',
    'CollateralAdded',
    'CollateralRemoved',
    'LenderFundsAdded',
    'LenderFundsRemoved',
    'OriginationFeeTaken',
    'InterestTaken',
    'LiquidationFeeTaken',
    'LiquidationInitiated',
    'LiquidationCompleted',
    'PoolStateUpdated',
  ]),
} as const;

export const lendingEventNames = Object.values(events).flatMap((pallet) => Object.values(pallet));

const handlers = [
  {
    spec: '1.0.0' as Semver,
    handlers: [
      { name: events.LendingPools.LoanCreated, handler: handleLoanCreated },
      { name: events.LendingPools.LoanUpdated, handler: handleLoanUpdated },
      { name: events.LendingPools.LoanRepaid, handler: handleLoanRepaid },
      { name: events.LendingPools.LoanSettled, handler: handleLoanSettled },
      { name: events.LendingPools.CollateralAdded, handler: handleCollateralAdded },
      { name: events.LendingPools.CollateralRemoved, handler: handleCollateralRemoved },
      { name: events.LendingPools.LenderFundsAdded, handler: handleLenderFundsAdded },
      { name: events.LendingPools.LenderFundsRemoved, handler: handleLenderFundsRemoved },
      { name: events.LendingPools.OriginationFeeTaken, handler: handleOriginationFeeTaken },
      { name: events.LendingPools.InterestTaken, handler: handleInterestTaken },
      { name: events.LendingPools.LiquidationFeeTaken, handler: handleLiquidationFeeTaken },
      { name: events.LendingPools.LiquidationInitiated, handler: handleLiquidationInitiated },
      { name: events.LendingPools.LiquidationCompleted, handler: handleLiquidationCompleted },
      { name: events.LendingPools.PoolStateUpdated, handler: handlePoolStateUpdated },
    ],
  },
];

export const handlerMap = HandlerMap.fromGroupedHandlers(handlers);
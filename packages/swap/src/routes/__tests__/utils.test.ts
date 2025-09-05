import { describe, it, expect } from 'vitest';
import { Prisma } from '../../client.js';
import { getSwapFields } from '../v2/utils.js';

describe(getSwapFields, () => {
  it('uses toFixed on decimals', () => {
    expect(
      getSwapFields({
        id: 1n,
        nativeId: 1n,
        type: 'SWAP',
        createdAt: new Date(),
        destAsset: 'Flip',
        srcAsset: 'Eth',
        swapRequestId: 1n,
        updatedAt: new Date(),
        fees: [],
        swapInputAmount: new Prisma.Decimal('1234567890123456789012345678901234567890'),
        intermediateAmount: new Prisma.Decimal('1234567890123456789012345678901234567890'),
        swapOutputAmount: new Prisma.Decimal('1234567890123456789012345678901234567890'),
        swapScheduledAt: new Date('2024-12-06T00:00:00Z'),
        swapScheduledBlockIndex: '123-4',
        swapExecutedAt: new Date('2024-12-06T00:00:12Z'),
        swapExecutedBlockIndex: '125-4',
        retryCount: 0,
        latestSwapRescheduledAt: null,
        latestSwapRescheduledBlockIndex: null,
        latestSwapRescheduledReason: null,
        swapAbortedAt: null,
        swapAbortedBlockIndex: null,
        swapAbortedReason: null,
        oraclePriceDeltaBps: new Prisma.Decimal('10000'),
      }),
    ).toStrictEqual({
      inputAmount: '1234567890123456789012345678901234567890',
      intermediateAmount: '1234567890123456789012345678901234567890',
      outputAmount: '1234567890123456789012345678901234567890',
      scheduledAt: 1733443200000,
      scheduledBlockIndex: '123-4',
      executedAt: 1733443212000,
      executedBlockIndex: '125-4',
      retryCount: 0,
      latestSwapRescheduledAt: undefined,
      latestSwapRescheduledBlockIndex: undefined,
      latestSwapRescheduledReason: undefined,
      abortedAt: undefined,
      abortedBlockIndex: undefined,
      abortedReason: undefined,
    });
  });
});

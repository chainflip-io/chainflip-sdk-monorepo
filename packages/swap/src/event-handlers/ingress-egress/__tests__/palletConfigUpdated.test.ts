import { beforeEach, describe, expect, it } from 'vitest';
import prisma from '../../../client.js';
import { check } from '../../__tests__/utils.js';
import { palletConfigUpdated, PalletConfigUpdatedArgsMap } from '../palletConfigUpdated.js';

const setBoostDelayMock = {
  block: {
    height: 120,
    timestamp: 1670337105000,
  },
  event: {
    args: check<PalletConfigUpdatedArgsMap['Bitcoin']>({
      update: {
        __kind: `SetBoostDelayBitcoin`,
        delayBlocks: 10,
      },
    }),
    name: 'BitcoinIngressEgress.PalletConfigUpdated',
    indexInBlock: 7,
  },
} as const;

describe('palletConfigUpdated', () => {
  beforeEach(async () => {
    await prisma.$queryRaw`TRUNCATE "BoostDelayChainflipBlocks" CASCADE;`;
  });
  describe('SetBoostDelay', () => {
    it('should store and update the boost delay blocks', async () => {
      const chain = 'Bitcoin';

      await palletConfigUpdated(chain)({
        prisma,
        event: setBoostDelayMock.event,
        block: setBoostDelayMock.block as any,
      });

      let boostDelay = await prisma.boostDelayChainflipBlocks.findFirst({
        where: {
          chain,
        },
      });

      expect(boostDelay).toBeDefined();
      expect(boostDelay?.numBlocks).toBe(10);

      await palletConfigUpdated(chain)({
        prisma,
        event: {
          ...setBoostDelayMock.event,
          args: {
            ...setBoostDelayMock.event.args,
            update: {
              ...setBoostDelayMock.event.args.update,
              delayBlocks: 0,
            },
          },
        },
        block: setBoostDelayMock.block as any,
      });

      boostDelay = await prisma.boostDelayChainflipBlocks.findFirst({
        where: {
          chain,
        },
      });

      expect(boostDelay).toBeDefined();
      expect(boostDelay?.numBlocks).toBe(0);
    });
  });
});

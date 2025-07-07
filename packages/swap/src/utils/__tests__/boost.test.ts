import { CfBoostPoolsDepthResponse } from '@chainflip/rpc/types';
import { hexEncodeNumber } from '@chainflip/utils/number';
import { describe, it, beforeEach, expect, vi } from 'vitest';
import { mockRpcResponse } from '@/shared/tests/fixtures.js';
import prisma from '../../client.js';
import {
  boostPoolsCache,
  getBoostChainflipBlocksDelayForChain,
  getBoostFeeBpsForAmount,
} from '../boost.js';

vi.mock('axios');

describe(getBoostFeeBpsForAmount, () => {
  beforeEach(() => {
    // eslint-disable-next-line dot-notation
    boostPoolsCache['store'].clear();
  });

  it.each([
    [
      BigInt(1e8),
      [
        { asset: 'BTC', chain: 'Bitcoin', tier: 10, available_amount: hexEncodeNumber(0) },
        { asset: 'BTC', chain: 'Bitcoin', tier: 100, available_amount: hexEncodeNumber(1e8) },
      ] as CfBoostPoolsDepthResponse,
      { estimatedBoostFeeBps: 100, maxBoostFeeBps: 100 },
    ],
    [
      BigInt(1e8),
      [
        { asset: 'BTC', chain: 'Bitcoin', tier: 10, available_amount: hexEncodeNumber(1e8) },
        { asset: 'BTC', chain: 'Bitcoin', tier: 100, available_amount: hexEncodeNumber(0) },
      ] as CfBoostPoolsDepthResponse,
      { estimatedBoostFeeBps: 10, maxBoostFeeBps: 100 },
    ],
    [
      BigInt(1e8),
      [
        { asset: 'BTC', chain: 'Bitcoin', tier: 5, available_amount: hexEncodeNumber(0.5e8) },
        { asset: 'BTC', chain: 'Bitcoin', tier: 10, available_amount: hexEncodeNumber(0.5e8) },
      ] as CfBoostPoolsDepthResponse,
      { estimatedBoostFeeBps: 7, maxBoostFeeBps: 10 },
    ],
    [
      BigInt(1e8),
      [
        { asset: 'BTC', chain: 'Bitcoin', tier: 10, available_amount: hexEncodeNumber(0.1e8) },
        { asset: 'BTC', chain: 'Bitcoin', tier: 100, available_amount: hexEncodeNumber(0.9e8) },
      ] as CfBoostPoolsDepthResponse,
      { estimatedBoostFeeBps: 91, maxBoostFeeBps: 100 },
    ],
  ])('calculates boost fee for %s', async (ingressAmount, assetBoostPoolsDepth, boostBps) => {
    mockRpcResponse({ data: { id: '1', jsonrpc: '2.0', result: assetBoostPoolsDepth } });
    expect(await getBoostFeeBpsForAmount({ amount: ingressAmount, asset: 'Btc' })).toStrictEqual(
      boostBps,
    );
  });
});

describe(getBoostChainflipBlocksDelayForChain, () => {
  beforeEach(async () => {
    await prisma.$queryRaw`TRUNCATE "BoostDelayBlocks" CASCADE;`;
  });
  it('returns the boost delay blocks for a specific chain', async () => {
    const chain = 'Bitcoin';
    const numBlocks = 10;

    await prisma.boostDelayChainflipBlocks.create({
      data: {
        chain,
        numBlocks,
      },
    });

    expect(await getBoostChainflipBlocksDelayForChain(chain)).toBe(numBlocks);

    await prisma.boostDelayChainflipBlocks.update({
      data: {
        numBlocks: 0,
      },
      where: {
        chain,
      },
    });

    expect(await getBoostChainflipBlocksDelayForChain(chain)).toBe(0);
    expect(await getBoostChainflipBlocksDelayForChain('Ethereum')).toBe(0);
  });
});

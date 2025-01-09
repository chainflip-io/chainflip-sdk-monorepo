import { CfBoostPoolsDepthResponse } from '@chainflip/rpc/types';
import { hexEncodeNumber } from '@chainflip/utils/number';
import { describe, it, beforeEach, expect, vi } from 'vitest';
import { mockRpcResponse } from '@/shared/tests/fixtures';
import { boostPoolsCache, getBoostFeeBpsForAmount } from '../boost';

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

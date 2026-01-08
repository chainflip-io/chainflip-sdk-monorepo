/* eslint-disable dot-notation */
import { InternalAssetMap } from '@chainflip/utils/chainflip';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getLpBalances } from '../../utils/rpc.js';
import BalanceTracker from '../BalanceTracker.js';
import type { AccountId } from '../Quoter.js';

vi.mock('../../utils/rpc.js');

const mockInternalAssetMap = (
  values?: InternalAssetMap<bigint>,
): InternalAssetMap<bigint> & { Dot: bigint } => ({
  ArbEth: 0n,
  ArbUsdc: 0n,
  ArbUsdt: 0n,
  Btc: 0n,
  Dot: 0n,
  Eth: 0n,
  Flip: 0n,
  Sol: 0n,
  SolUsdc: 0n,
  SolUsdt: 0n,
  Usdc: 0n,
  Usdt: 0n,
  Wbtc: 0n,
  HubDot: 0n,
  HubUsdc: 0n,
  HubUsdt: 0n,
  ...values,
});

describe(BalanceTracker, () => {
  let tracker: BalanceTracker;

  const lp1 = 'lp1' as AccountId;
  const lp2 = 'lp2' as AccountId;

  beforeEach(() => {
    tracker = new BalanceTracker();
    vi.resetAllMocks();
  });

  it('does nothing if no accounts are monitored', async () => {
    expect(await tracker.getBalances()).toEqual(new Map());
    expect(getLpBalances).not.toHaveBeenCalled();
  });

  it('makes requests for all monitored accounts', async () => {
    tracker['monitoredAccounts'].add(lp1);
    tracker['monitoredAccounts'].add(lp2);
    const mockResults = [
      [lp1, mockInternalAssetMap()],
      [lp2, mockInternalAssetMap()],
    ] as [string, InternalAssetMap<bigint>][];
    vi.mocked(getLpBalances).mockResolvedValue(mockResults);

    const balances = await tracker.getBalances();

    expect(getLpBalances).toHaveBeenLastCalledWith(new Set([lp1, lp2]));
    expect(balances).toEqual(new Map(mockResults));
  });

  it('debounces the request', async () => {
    const { promise, resolve } = Promise.withResolvers<[string, InternalAssetMap<bigint>][]>();
    vi.mocked(getLpBalances).mockReturnValue(promise);

    tracker['monitoredAccounts'].add(lp1);

    const calls = Promise.all([
      tracker.getBalances(),
      tracker.getBalances(),
      tracker.getBalances(),
      tracker.getBalances(),
      tracker.getBalances(),
    ]);

    resolve([[lp1, mockInternalAssetMap()]]);
    await calls;
    expect(getLpBalances).toHaveBeenCalledTimes(1);
  });

  it('returns relatively fresh data', async () => {
    tracker['lastUpdate'] = Date.now() - 5_000;
    tracker['monitoredAccounts'].add(lp1);

    expect(await tracker.getBalances()).toEqual(new Map());
    expect(getLpBalances).not.toHaveBeenCalled();
  });

  it('removes accounts', async () => {
    tracker['monitoredAccounts'].add(lp1);
    tracker.remove(lp1);
    expect(await tracker.getBalances()).toEqual(new Map());
  });

  it('eagerly refreshes when an account is added', async () => {
    const { promise, resolve } = Promise.withResolvers<[string, InternalAssetMap<bigint>][]>();
    vi.mocked(getLpBalances).mockReturnValue(promise);
    expect(await tracker.getBalances()).toEqual(new Map());
    tracker.add(lp1);
    expect(getLpBalances).toHaveBeenCalledTimes(1);
    resolve([[lp1, mockInternalAssetMap()]]);
    expect(await tracker.getBalances()).toEqual(new Map([[lp1, mockInternalAssetMap()]]));
  });

  it('retries the RPC request', async () => {
    vi.mocked(getLpBalances)
      .mockRejectedValueOnce(new Error())
      .mockRejectedValueOnce(new Error())
      .mockRejectedValueOnce(new Error())
      .mockResolvedValueOnce([[lp1, mockInternalAssetMap()]]);
    tracker['monitoredAccounts'].add(lp1);
    expect(await tracker.getBalances()).toEqual(new Map([[lp1, mockInternalAssetMap()]]));
    expect(getLpBalances).toHaveBeenCalledTimes(4);
  });

  it('returns an empty map if it fails 5 times', async () => {
    vi.mocked(getLpBalances)
      .mockRejectedValueOnce(new Error())
      .mockRejectedValueOnce(new Error())
      .mockRejectedValueOnce(new Error())
      .mockRejectedValueOnce(new Error())
      .mockRejectedValueOnce(new Error())
      .mockResolvedValueOnce([[lp1, mockInternalAssetMap()]]);
    tracker['monitoredAccounts'].add(lp1);
    expect(await tracker.getBalances()).toEqual(new Map());
    expect(getLpBalances).toHaveBeenCalledTimes(5);
  });

  it('refetches if two lps are added around the same time', async () => {
    const { promise, resolve } = Promise.withResolvers<[string, InternalAssetMap<bigint>][]>();
    vi.mocked(getLpBalances)
      .mockReturnValueOnce(promise)
      .mockResolvedValueOnce([
        [lp1, mockInternalAssetMap()],
        [lp2, mockInternalAssetMap()],
      ]);
    tracker.add(lp1);
    tracker.add(lp2);

    resolve([[lp1, mockInternalAssetMap()]]);

    expect(await tracker.getBalances()).toEqual(
      new Map([
        [lp1, mockInternalAssetMap()],
        [lp2, mockInternalAssetMap()],
      ]),
    );
    expect(getLpBalances).toHaveBeenCalledTimes(2);
  });
});

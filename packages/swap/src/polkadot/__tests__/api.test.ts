import { vi, describe, it, expect } from 'vitest';
import { getBoostSafeMode } from '../api.js';

vi.mock('@polkadot/api', () => ({
  WsProvider: vi.fn(),
  ApiPromise: {
    create: vi.fn().mockResolvedValue({
      isReady: Promise.resolve({
        query: {
          environment: {
            runtimeSafeMode: vi.fn().mockResolvedValue({
              toJSON: vi.fn().mockReturnValue({
                ingressEgressEthereum: { boostDepositsEnabled: false },
                ingressEgressBitcoin: { boostDepositsEnabled: true },
                ingressEgressPolkadot: { boostDepositsEnabled: false },
                ingressEgressArbitrum: { boostDepositsEnabled: false },
                ingressEgressSolana: { boostDepositsEnabled: false },
                ingressEgressAssethub: { boostDepositsEnabled: false },
              }),
            }),
          },
        },
      }),
    }),
  },
}));

describe(getBoostSafeMode, () => {
  it('should return the boostDepositsEnabled flag for the given asset', async () => {
    expect(await getBoostSafeMode('Eth')).toBe(false);
    expect(await getBoostSafeMode('Btc')).toBe(true);
  });
});

import { getBoostSafeMode } from '../api';

jest.mock('@polkadot/api', () => ({
  WsProvider: jest.fn(),
  ApiPromise: {
    create: jest.fn().mockResolvedValue({
      isReady: Promise.resolve({
        query: {
          environment: {
            runtimeSafeMode: jest.fn().mockResolvedValue({
              toJSON: jest.fn().mockReturnValue({
                ingressEgressEthereum: { boostDepositsEnabled: false },
                ingressEgressBitcoin: { boostDepositsEnabled: true },
                ingressEgressPolkadot: { boostDepositsEnabled: false },
                ingressEgressArbitrum: { boostDepositsEnabled: false },
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

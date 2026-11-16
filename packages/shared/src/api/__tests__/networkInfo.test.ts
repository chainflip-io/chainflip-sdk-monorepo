import { describe, it, expect } from 'vitest';
import { NetworkInfo } from '../networkInfo.js';

describe('NetworkInfo', () => {
  const networkInfo = {
    assets: [
      {
        asset: 'Btc',
        vaultSwapDepositsEnabled: true,
        depositChannelDepositsEnabled: true,
        depositChannelCreationEnabled: true,
        egressEnabled: true,
        boostDepositsEnabled: true,
        livePriceProtectionEnabled: true,
      },
    ],
    cfBrokerCommissionBps: 30,
  };

  it('parses network info without chain tracking', () => {
    expect(NetworkInfo.parse(networkInfo)).toStrictEqual(networkInfo);
  });

  it('parses network info with chain tracking', () => {
    const withChainTracking = {
      ...networkInfo,
      chainTracking: [{ chain: 'Bitcoin', height: 1000, blockTrackedAt: 1794564000000 }],
    };

    expect(NetworkInfo.parse(withChainTracking)).toStrictEqual(withChainTracking);
  });

  it('rejects chain tracking of an unknown chain', () => {
    expect(
      NetworkInfo.safeParse({
        ...networkInfo,
        chainTracking: [{ chain: 'Dogecoin', height: 1000, blockTrackedAt: 1794564000000 }],
      }).success,
    ).toBe(false);
  });
});

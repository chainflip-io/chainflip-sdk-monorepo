import { getSwapRate } from '../statechain';

jest.mock('@/shared/node-apis/RpcClient');

describe(getSwapRate, () => {
  it('rejects values above u128 max', async () => {
    await expect(
      getSwapRate({ srcAsset: 'Btc', destAsset: 'Flip', amount: 2n ** 128n }),
    ).rejects.toThrow('amount exceeds maximum allowed value');
  });
});

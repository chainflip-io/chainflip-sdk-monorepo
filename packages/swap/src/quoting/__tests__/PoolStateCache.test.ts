import axios from 'axios';
import {
  InternalAsset,
  InternalAssets,
  assetConstants,
  getAssetAndChain,
  getInternalAsset,
} from '@/shared/enums';
import { deferredPromise } from '@/swap/utils/promise';
import PoolStateCache from '../PoolStateCache';

jest.mock('axios', () => ({
  create() {
    return this;
  },
  post: jest.fn(),
}));

const mockRpcResult = () => {
  const { resolve, promise } = deferredPromise<unknown>();
  jest.mocked(axios.post).mockImplementationOnce(async () => ({ data: { result: await promise } }));
  return resolve;
};

const mockPoolStates = Object.fromEntries(
  Object.keys(InternalAssets).map(
    (asset, index) =>
      [asset, [`${asset} state`, `0x${index.toString(16)}`]] as [InternalAsset, [string, string]],
  ),
);

describe(PoolStateCache, () => {
  let cache: PoolStateCache;

  beforeEach(() => {
    jest.useFakeTimers();
    cache = new PoolStateCache();
  });

  afterEach(() => {
    jest.useRealTimers();
    cache.stop();
  });

  it('fetches the pool state in a loop', async () => {
    const postSpy = jest.mocked(axios.post);
    const resolveHashRequest = mockRpcResult();

    cache.start();

    const btcState = cache.getPoolState('Btc');

    expect(postSpy).toHaveBeenCalledTimes(1);

    const hash = '0x1234';
    resolveHashRequest(hash);

    postSpy.mockImplementation(async (url, body: any) => {
      const { method } = body;
      if (method === 'cf_supported_assets') {
        return {
          data: {
            result: (Object.keys(InternalAssets) as InternalAsset[]).map((a) =>
              getAssetAndChain(a),
            ),
          },
        };
      }

      const asset = getInternalAsset(body.params[0]);
      expect(body.params.at(-1)).toEqual(hash);
      const mock = mockPoolStates[asset];

      if (method === 'cf_pool_orders') {
        return { data: JSON.stringify({ result: mock[0] }) };
      }

      return { data: { result: { range_order: mock[1] } } };
    });

    await expect(btcState).resolves.toEqual({
      poolState: '{"result":"Btc state"}',
      rangeOrderPrice: 4n,
    });
  });
});

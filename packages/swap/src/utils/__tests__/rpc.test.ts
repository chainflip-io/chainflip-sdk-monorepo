import { describe, it, expect } from 'vitest';
import { boostPoolsDepth, mockRpcResponse } from '@/shared/tests/fixtures';
import { getBoostPoolsDepth } from '../rpc';

describe(getBoostPoolsDepth, () => {
  it('allows filtering by asset through all the boost pools and sorts the result', async () => {
    mockRpcResponse(async () => ({ data: boostPoolsDepth() }));

    const assetBoostPoolsDepth = await getBoostPoolsDepth({ asset: 'Btc' });

    expect(assetBoostPoolsDepth).toMatchSnapshot();
  });
});

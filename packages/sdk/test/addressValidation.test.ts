import { validateAddress } from '../src/swap/validation/addressValidation';

describe(validateAddress, () => {
  it.each([
    ['DOT', '13NZffZRSQFdg5gYLJBdj5jVtkeDPqF3czLdJ9m6fyHcMjki'],
    ['ETH', '0x02679b10f7b94fc4f273569cc2e5c49eefa5c0f1'],
    ['USDC', '0x02679b10f7b94fc4f273569cc2e5c49eefa5c0f1'],
    ['FLIP', '0x02679b10f7b94fc4f273569cc2e5c49eefa5c0f1'],
  ])('returns true for valid supportedAssets %s', (asset, address) => {
    expect(validateAddress(asset, address)).toBeTruthy();
  });

  it.each([
    [2, '13NZffZRSQFdg5gYLJBdj5jVtkeDPqF3czLdJ9m6fyHcMjki'],
    [1, '0x02679b10f7b94fc4f273569cc2e5c49eefa5c0f1'],
    [1, '0x02679b10f7b94fc4f273569cc2e5c49eefa5c0f1'],
    [1, '0x02679b10f7b94fc4f273569cc2e5c49eefa5c0f1'],
  ])('returns true for valid supportedAssets %s', (asset, address) => {
    expect(validateAddress(asset, address)).toBeTruthy();
  });

  it.each([
    [3, '13NZffZRSQFdg5gYLJBdj5jVtkeDPqF3czLdJ9m6fyHcMjki'],
    ['BTC', '0x02679b10f7b94fc4f273569cc2e5c49eefa5c0f1'],
  ])('returns false for invalid bitcoin addresses %s', (asset, address) => {
    expect(validateAddress(asset, address)).toBeFalsy();
  });

  it.each([
    [3, 'mkPuLFihuytSjmdqLztCXXESD7vrjnTiTP'],
    ['BTC', 'miEfvT7iYiEJxS69uq9MMeBfcLpKjDMpWS'],
  ])(
    'returns true for valid testnet bitcoin addresses %s',
    (asset, address) => {
      expect(validateAddress(asset, address, false)).toBeTruthy();
    },
  );

  it.each([
    ['DOT', '0x02679b10f7b94fc4f273569cc2e5c49eefa5c0f1'],
    ['ETH', '13NZffZRSQFdg5gYLJBdj5jVtkeDPqF3czLdJ9m6fyHcMjki'],
    ['USDC', '13NZffZRSQFdg5gYLJBdj5jVtkeDPqF3czLdJ9m6fyHcMjki'],
    ['FLIP', '13NZffZRSQFdg5gYLJBdj5jVtkeDPqF3czLdJ9m6fyHcMjki'],
  ])('returns false for invalid address %s', (asset, address) => {
    expect(validateAddress(asset, address)).toBeFalsy();
  });
});

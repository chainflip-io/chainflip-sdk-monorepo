import { describe, it, expect } from 'vitest';
import { bitcoinAddresses } from './bitcoinAddresses.js';
import {
  validateBitcoinMainnetAddress,
  validateBitcoinTestnetAddress,
  validateBitcoinRegtestAddress,
  validatePolkadotAddress,
  validateAddress,
} from '../addressValidation.js';

describe(validatePolkadotAddress, () => {
  it('validates valid addresses', () => {
    expect(validatePolkadotAddress('1exaAg2VJRQbyUBAeXcktChCAqjVP9TUxF3zo23R2T6EGdE')).toBe(true);
  });

  it('validates valid pubkey', () => {
    expect(
      validatePolkadotAddress('0x2afba9278e30ccf6a6ceb3a8b6e336b70068f045c666f2e7f4f9cc5f47db8972'),
    ).toBe(true);
  });

  it('rejects invalid addresses', () => {
    expect(validatePolkadotAddress('1exaAg2VJRQbyUBAeXcktChCAqjVP9TUxF3zo23R2T6EGde')).toBe(false);
  });

  it('rejects invalid pubkey', () => {
    expect(
      validatePolkadotAddress('0x2afba9278e30ccf6a6ceb3a8b6e336b70068f045c666f2e7f4f9cc5f47db8'),
    ).toBe(false);
  });
});

describe(validateBitcoinMainnetAddress, () => {
  it.each(
    Object.entries(bitcoinAddresses).flatMap(([network, addressMap]) =>
      Object.values(addressMap).flatMap((addresses) =>
        addresses.map((address) => [address, network === 'mainnet'] as const),
      ),
    ),
  )('validates valid addresses %s', (address, expected) => {
    expect(validateBitcoinMainnetAddress(address)).toBe(expected);
  });
});

describe(validateBitcoinTestnetAddress, () => {
  it.each(
    Object.entries(bitcoinAddresses).flatMap(([network, addressMap]) =>
      Object.values(addressMap).flatMap((addresses) =>
        addresses.map((address) => [address, network === 'testnet'] as const),
      ),
    ),
  )('validates valid addresses %s', (address, expected) => {
    expect(validateBitcoinTestnetAddress(address)).toBe(expected);
  });
});

describe(validateBitcoinRegtestAddress, () => {
  it.each(
    Object.entries(bitcoinAddresses).flatMap(([network, addressMap]) =>
      Object.entries(addressMap).flatMap(([type, addresses]) =>
        addresses.map(
          (address) =>
            [
              address,
              network === 'regtest' || (network === 'testnet' && type !== 'SEGWIT'),
            ] as const,
        ),
      ),
    ),
  )('validates valid addresses %s', (address, expected) => {
    expect(validateBitcoinRegtestAddress(address)).toBe(expected);
  });
});

describe(validateAddress, () => {
  it.each([
    ['Assethub', '13NZffZRSQFdg5gYLJBdj5jVtkeDPqF3czLdJ9m6fyHcMjki'],
    ['Assethub', '13NZffZRSQFdg5gYLJBdj5jVtkeDPqF3czLdJ9m6fyHcMjki'],
    ['Ethereum', '0x02679b10f7b94fc4f273569cc2e5c49eefa5c0f1'],
  ] as const)('returns true for valid supportedAssets %s', (chain, address) => {
    expect(validateAddress(chain, address, 'mainnet')).toBeTruthy();
    expect(validateAddress(chain, address, 'perseverance')).toBeTruthy();
    expect(validateAddress(chain, address, 'backspin')).toBeTruthy();
  });

  it.each([
    ['Bitcoin', '13NZffZRSQFdg5gYLJBdj5jVtkeDPqF3czLdJ9m6fyHcMjki'],
    ['Bitcoin', '13NZffZRSQFdg5gYLJBdj5jVtkeDPqF3czLdJ9m6fyHcMjki'],
    ['Bitcoin', '0x02679b10f7b94fc4f273569cc2e5c49eefa5c0f1'],
    ['Bitcoin', '0x02679b10f7b94fc4f273569cc2e5c49eefa5c0f1'],
  ] as const)('returns false for invalid bitcoin addresses %s', (chain, address) => {
    expect(validateAddress(chain, address, 'mainnet')).toBeFalsy();
    expect(validateAddress(chain, address, 'perseverance')).toBeFalsy();
    expect(validateAddress(chain, address, 'backspin')).toBeFalsy();
  });

  it.each([
    ['Bitcoin', 'mkPuLFihuytSjmdqLztCXXESD7vrjnTiTP', 'perseverance'],
    ['Bitcoin', 'miEfvT7iYiEJxS69uq9MMeBfcLpKjDMpWS', 'perseverance'],
    ['Bitcoin', 'tb1pk5vhse48d90a5pdpgwpm9aegqv5h2p79hxjtknlqusjnc08yklas8xtf35', 'perseverance'],
    ['Bitcoin', '2NBtZHa1TSuX7xXej8Z63npiHji3y43znRu', 'sisyphos'],
    ['Bitcoin', 'tb1pk5vhse48d90a5pdpgwpm9aegqv5h2p79hxjtknlqusjnc08yklas8xtf35', 'sisyphos'],
    ['Bitcoin', 'mx7Kg1cDpiWUm1Ru3ogECsFvzrTWjAWMyE', 'backspin'],
    ['Bitcoin', 'bcrt1p785mga8djc3r5f7afaechlth4laxaty2rt08ncgydw4j7zv8np5suf7etv', 'backspin'],
    ['Bitcoin', 'bc1qvwmuc3pjhwju287sjs5vg7467t2jlymnmjyatp', 'mainnet'],
    ['Bitcoin', 'bc1p7jc7jx0z32gcm5k3dewpqra2vv303jnnhurhrwl384kgnnhsp73qf9a9c3', 'mainnet'],
  ] as const)('returns true for valid %s addresses %s on %s', (chain, address, network) => {
    expect(validateAddress(chain, address, network)).toBeTruthy();
  });

  it.each([
    ['Assethub', '0x02679b10f7b94fc4f273569cc2e5c49eefa5c0f1'],
    ['Ethereum', '13NZffZRSQFdg5gYLJBdj5jVtkeDPqF3czLdJ9m6fyHcMjki'],
  ] as const)('returns false for invalid address %s', (chain, address) => {
    expect(validateAddress(chain, address, 'mainnet')).toBeFalsy();
  });
});

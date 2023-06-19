import { VoidSigner } from 'ethers';
import { Chain, Chains } from '@/shared/enums';
import { executeSwap } from '@/shared/vault';
import {
  bitcoin,
  polkadot,
  dot$,
  btc$,
  ethereum,
  ethereumTokens,
  testnetChains,
  testnetTokens,
} from '../swap/mocks';
import { SwapSDK } from '../swap/sdk';

jest.mock('@/shared/vault', () => ({ executeSwap: jest.fn() }));

describe(SwapSDK, () => {
  const sdk = new SwapSDK({ network: 'mainnet' });

  describe(SwapSDK.prototype.getChains, () => {
    it('returns the available chains', async () => {
      expect(await sdk.getChains()).toStrictEqual([
        ethereum,
        polkadot,
        bitcoin,
      ]);
    });

    it.each([
      [Chains.Ethereum, [bitcoin, polkadot]],
      ['Ethereum' as const, [bitcoin, polkadot]],
      [Chains.Polkadot, [ethereum, bitcoin]],
      [Chains.Bitcoin, [ethereum, polkadot]],
    ])(
      `returns the possible destination chains for %s`,
      async (chain, chains) => {
        expect(await sdk.getChains(chain)).toStrictEqual(chains);
      },
    );

    it('throws when requesting an unsupported chain', async () => {
      await expect(sdk.getChains('Dogecoin' as Chain)).rejects.toThrow();
    });
  });

  describe(SwapSDK.prototype.getTokens, () => {
    it.each([
      [Chains.Ethereum, ethereumTokens],
      ['Ethereum' as const, ethereumTokens],
      [Chains.Polkadot, [dot$]],
      [Chains.Bitcoin, [btc$]],
    ])('returns the available tokens for %s', async (chain, tokens) => {
      expect(await sdk.getTokens(chain)).toStrictEqual(tokens);
    });

    it('throws when requesting an unsupported chain', async () => {
      await expect(sdk.getChains('Dogecoin' as Chain)).rejects.toThrow();
    });
  });
});

describe(SwapSDK, () => {
  const signer = new VoidSigner('0x0');
  const sdk = new SwapSDK({ network: 'sisyphos', signer });

  describe(SwapSDK.prototype.getChains, () => {
    it('returns the available chains', async () => {
      expect(await sdk.getChains()).toEqual(
        testnetChains([ethereum, polkadot, bitcoin]),
      );
    });

    it.each([
      [Chains.Ethereum, testnetChains([polkadot, bitcoin])],
      ['Ethereum' as const, testnetChains([polkadot, bitcoin])],
      [Chains.Polkadot, testnetChains([ethereum, bitcoin])],
      [Chains.Bitcoin, testnetChains([ethereum, polkadot])],
    ])(
      `returns the possible destination chains for %s`,
      async (chain, chains) => {
        expect(await sdk.getChains(chain)).toEqual(chains);
      },
    );

    it('throws when requesting an unsupported chain', async () => {
      await expect(sdk.getChains('Dogecoin' as Chain)).rejects.toThrow();
    });
  });

  describe(SwapSDK.prototype.getTokens, () => {
    it.each([
      [Chains.Ethereum, testnetTokens(ethereumTokens)],
      ['Ethereum' as const, testnetTokens(ethereumTokens)],
      [Chains.Polkadot, testnetTokens([dot$])],
      [Chains.Bitcoin, testnetTokens([btc$])],
    ])('returns the available tokens for %s', async (chain, tokens) => {
      expect(await sdk.getTokens(chain)).toStrictEqual(tokens);
    });

    it('throws when requesting an unsupported chain', async () => {
      await expect(sdk.getTokens('Dogecoin' as Chain)).rejects.toThrow();
    });
  });

  describe(SwapSDK.prototype.executeSwap, () => {
    it('calls executeSwap', () => {
      const swap = {};
      sdk.executeSwap(swap as any);
      expect(executeSwap).toHaveBeenCalledWith(swap, {
        network: 'sisyphos',
        signer,
      });
    });
  });
});

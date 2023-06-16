import { VoidSigner } from 'ethers';
import { SupportedChain } from '@/shared/enums';
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
      ['Ethereum' as const, [bitcoin, polkadot]],
      ['Polkadot' as const, [ethereum, bitcoin]],
      ['Bitcoin' as const, [ethereum, polkadot]],
    ])(
      `returns the possible destination chains for %s`,
      async (chain, chains) => {
        expect(await sdk.getChains(chain)).toStrictEqual(chains);
      },
    );

    it('throws when requesting an unsupported chain', async () => {
      await expect(
        sdk.getChains('Dogecoin' as SupportedChain),
      ).rejects.toThrow();
    });
  });

  describe(SwapSDK.prototype.getTokens, () => {
    it.each([
      ['Ethereum' as const, ethereumTokens],
      ['Polkadot' as const, [dot$]],
      ['Bitcoin' as const, [btc$]],
    ])('returns the available tokens for %s', async (chain, tokens) => {
      expect(await sdk.getTokens(chain)).toStrictEqual(tokens);
    });

    it('throws when requesting an unsupported chain', async () => {
      await expect(
        sdk.getChains('Dogecoin' as SupportedChain),
      ).rejects.toThrow();
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
      ['Ethereum' as const, testnetChains([polkadot, bitcoin])],
      ['Polkadot' as const, testnetChains([ethereum, bitcoin])],
      ['Bitcoin' as const, testnetChains([ethereum, polkadot])],
    ])(
      `returns the possible destination chains for %s`,
      async (chain, chains) => {
        expect(await sdk.getChains(chain)).toEqual(chains);
      },
    );

    it('throws when requesting an unsupported chain', async () => {
      await expect(
        sdk.getChains('Dogecoin' as SupportedChain),
      ).rejects.toThrow();
    });
  });

  describe(SwapSDK.prototype.getTokens, () => {
    it.each([
      ['Ethereum' as const, testnetTokens(ethereumTokens)],
      ['Polkadot' as const, testnetTokens([dot$])],
      ['Bitcoin' as const, testnetTokens([btc$])],
    ])('returns the available tokens for %s', async (chain, tokens) => {
      expect(await sdk.getTokens(chain)).toStrictEqual(tokens);
    });

    it('throws when requesting an unsupported chain', async () => {
      await expect(
        sdk.getTokens('Dogecoin' as SupportedChain),
      ).rejects.toThrow();
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

import { VoidSigner } from 'ethers';
import { Chain, ChainflipNetworks, Chains } from '@/shared/enums';
import { executeSwap } from '@/shared/vault';
import {
  bitcoin,
  polkadot,
  dot$,
  btc$,
  ethereum,
  ethereumAssets,
  testnetChains,
  testnetAssets,
} from '../swap/mocks';
import { SwapSDK } from '../swap/sdk';

jest.mock('@/shared/vault', () => ({ executeSwap: jest.fn() }));

describe(SwapSDK, () => {
  const sdk = new SwapSDK({ network: ChainflipNetworks.mainnet as any });

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

  describe(SwapSDK.prototype.getAssets, () => {
    it.each([
      [Chains.Ethereum, ethereumAssets],
      ['Ethereum' as const, ethereumAssets],
      [Chains.Polkadot, [dot$]],
      [Chains.Bitcoin, [btc$]],
    ])('returns the available assets for %s', async (chain, assets) => {
      expect(await sdk.getAssets(chain)).toStrictEqual(assets);
    });

    it('throws when requesting an unsupported chain', async () => {
      await expect(sdk.getChains('Dogecoin' as Chain)).rejects.toThrow();
    });
  });
});

describe(SwapSDK, () => {
  const signer = new VoidSigner('0x0');
  const sdk = new SwapSDK({ network: ChainflipNetworks.sisyphos, signer });

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

  describe(SwapSDK.prototype.getAssets, () => {
    it.each([
      [Chains.Ethereum, testnetAssets(ethereumAssets)],
      ['Ethereum' as const, testnetAssets(ethereumAssets)],
      [Chains.Polkadot, testnetAssets([dot$])],
      [Chains.Bitcoin, testnetAssets([btc$])],
    ])('returns the available assets for %s', async (chain, assets) => {
      expect(await sdk.getAssets(chain)).toStrictEqual(assets);
    });

    it('throws when requesting an unsupported chain', async () => {
      await expect(sdk.getAssets('Dogecoin' as Chain)).rejects.toThrow();
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

import { VoidSigner } from 'ethers';
import { executeSwap } from '@/shared/vault';
import { ChainId } from '../swap/consts';
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
      [ChainId.Ethereum, [bitcoin, polkadot]],
      [ChainId.Polkadot, [ethereum, bitcoin]],
      [ChainId.Bitcoin, [ethereum, polkadot]],
    ])(
      `returns the possible destination chains for %s`,
      async (chainId, chains) => {
        expect(await sdk.getChains(chainId)).toStrictEqual(chains);
      },
    );

    it('throws when requesting an unsupported chain', async () => {
      await expect(sdk.getChains(1000 as ChainId)).rejects.toThrow();
    });

    it('throws when an unknown chain is requested', async () => {
      await expect(sdk.getChains(NaN)).rejects.toThrow();
    });
  });

  describe(SwapSDK.prototype.getTokens, () => {
    it.each([
      [ChainId.Ethereum, ethereumTokens],
      [ChainId.Polkadot, [dot$]],
      [ChainId.Bitcoin, [btc$]],
    ])('returns the available tokens for %s', async (chainId, tokens) => {
      expect(await sdk.getTokens(chainId)).toStrictEqual(tokens);
    });

    it('throws when requesting an unsupported chain', async () => {
      await expect(sdk.getChains(1000 as ChainId)).rejects.toThrow();
    });

    it('throws when an unknown chain is requested', async () => {
      await expect(sdk.getChains(NaN)).rejects.toThrow();
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
      [ChainId.Ethereum, testnetChains([polkadot, bitcoin])],
      [ChainId.Polkadot, testnetChains([ethereum, bitcoin])],
      [ChainId.Bitcoin, testnetChains([ethereum, polkadot])],
    ])(
      `returns the possible destination chains for %s`,
      async (chainId, chains) => {
        expect(await sdk.getChains(chainId)).toEqual(chains);
      },
    );

    it('throws when requesting an unsupported chain', async () => {
      await expect(sdk.getChains(1000 as ChainId)).rejects.toThrow();
    });

    it('throws when an unknown chain is requested', async () => {
      await expect(sdk.getChains(NaN)).rejects.toThrow();
    });
  });

  describe(SwapSDK.prototype.getTokens, () => {
    it.each([
      [ChainId.Ethereum, testnetTokens(ethereumTokens)],
      [ChainId.Polkadot, testnetTokens([dot$])],
      [ChainId.Bitcoin, testnetTokens([btc$])],
    ])('returns the available tokens for %s', async (chainId, tokens) => {
      expect(await sdk.getTokens(chainId)).toStrictEqual(tokens);
    });

    it('throws when requesting an unsupported chain', async () => {
      await expect(sdk.getTokens(1000 as ChainId)).rejects.toThrow();
    });

    it('throws when an unknown chain is requested', async () => {
      await expect(sdk.getChains(NaN)).rejects.toThrow();
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

import { VoidSigner } from 'ethers';
import { Chain, ChainflipNetworks, Chains } from '@/shared/enums';
import { executeSwap } from '@/shared/vault';
import { dot$, btc$, eth$, usdc$, flip$ } from '../swap/assets';
import { bitcoin, ethereum, polkadot } from '../swap/chains';
import { SwapSDK } from '../swap/sdk';

jest.mock('@/shared/vault', () => ({
  executeSwap: jest.fn(),
}));

describe(SwapSDK, () => {
  const sdk = new SwapSDK({ network: ChainflipNetworks.perseverance });

  describe(SwapSDK.prototype.getChains, () => {
    it('returns the available chains', async () => {
      expect(await sdk.getChains()).toStrictEqual([
        ethereum(ChainflipNetworks.perseverance),
        polkadot(ChainflipNetworks.perseverance),
        bitcoin(ChainflipNetworks.perseverance),
      ]);
    });

    it.each([
      [
        Chains.Ethereum,
        [
          ethereum(ChainflipNetworks.perseverance),
          bitcoin(ChainflipNetworks.perseverance),
          polkadot(ChainflipNetworks.perseverance),
        ],
      ],
      [
        'Ethereum' as const,
        [
          ethereum(ChainflipNetworks.perseverance),
          bitcoin(ChainflipNetworks.perseverance),
          polkadot(ChainflipNetworks.perseverance),
        ],
      ],
      [
        Chains.Polkadot,
        [
          ethereum(ChainflipNetworks.perseverance),
          bitcoin(ChainflipNetworks.perseverance),
        ],
      ],
      [
        Chains.Bitcoin,
        [
          ethereum(ChainflipNetworks.perseverance),
          polkadot(ChainflipNetworks.perseverance),
        ],
      ],
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
      [
        Chains.Ethereum,
        [
          eth$(ChainflipNetworks.perseverance),
          usdc$(ChainflipNetworks.perseverance),
          flip$(ChainflipNetworks.perseverance),
        ],
      ],
      [
        'Ethereum' as const,
        [
          eth$(ChainflipNetworks.perseverance),
          usdc$(ChainflipNetworks.perseverance),
          flip$(ChainflipNetworks.perseverance),
        ],
      ],
      [Chains.Polkadot, [dot$(ChainflipNetworks.perseverance)]],
      [Chains.Bitcoin, [btc$(ChainflipNetworks.perseverance)]],
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
      expect(await sdk.getChains()).toStrictEqual([
        ethereum(ChainflipNetworks.sisyphos),
        polkadot(ChainflipNetworks.sisyphos),
        bitcoin(ChainflipNetworks.sisyphos),
      ]);
    });

    it.each([
      [
        Chains.Ethereum,
        [
          ethereum(ChainflipNetworks.sisyphos),
          bitcoin(ChainflipNetworks.sisyphos),
          polkadot(ChainflipNetworks.sisyphos),
        ],
      ],
      [
        'Ethereum' as const,
        [
          ethereum(ChainflipNetworks.sisyphos),
          bitcoin(ChainflipNetworks.sisyphos),
          polkadot(ChainflipNetworks.sisyphos),
        ],
      ],
      [
        Chains.Polkadot,
        [
          ethereum(ChainflipNetworks.sisyphos),
          bitcoin(ChainflipNetworks.sisyphos),
        ],
      ],
      [
        Chains.Bitcoin,
        [
          ethereum(ChainflipNetworks.sisyphos),
          polkadot(ChainflipNetworks.sisyphos),
        ],
      ],
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
      [
        Chains.Ethereum,
        [
          eth$(ChainflipNetworks.sisyphos),
          usdc$(ChainflipNetworks.sisyphos),
          flip$(ChainflipNetworks.sisyphos),
        ],
      ],
      [
        'Ethereum' as const,
        [
          eth$(ChainflipNetworks.sisyphos),
          usdc$(ChainflipNetworks.sisyphos),
          flip$(ChainflipNetworks.sisyphos),
        ],
      ],
      [Chains.Polkadot, [dot$(ChainflipNetworks.sisyphos)]],
      [Chains.Bitcoin, [btc$(ChainflipNetworks.sisyphos)]],
    ])('returns the available assets for %s', async (chain, assets) => {
      expect(await sdk.getAssets(chain)).toStrictEqual(assets);
    });

    it('throws when requesting an unsupported chain', async () => {
      await expect(sdk.getAssets('Dogecoin' as Chain)).rejects.toThrow();
    });
  });

  describe(SwapSDK.prototype.executeSwap, () => {
    it('calls executeSwap', async () => {
      const params = {};
      jest
        .mocked(executeSwap)
        .mockResolvedValueOnce({ hash: 'hello world' } as any);
      const result = await sdk.executeSwap(params as any);
      expect(executeSwap).toHaveBeenCalledWith(params, {
        network: 'sisyphos',
        signer,
      });
      expect(result).toEqual('hello world');
    });
  });
});

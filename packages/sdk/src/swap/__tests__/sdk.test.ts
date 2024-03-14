import axios from 'axios';
import { VoidSigner } from 'ethers';
import { Assets, Chain, ChainflipNetworks, Chains } from '@/shared/enums';
import { environment } from '@/shared/tests/fixtures';
import { approveVault, executeSwap } from '@/shared/vault';
import { dot$, btc$, eth$, usdc$, flip$, usdt$ } from '../assets';
import { bitcoin, ethereum, polkadot } from '../chains';
import { SwapSDK } from '../sdk';

jest.mock('axios');

jest.mock('@/shared/vault', () => ({
  executeSwap: jest.fn(),
  approveVault: jest.fn(),
}));

jest.mock('@trpc/client', () => ({
  ...jest.requireActual('@trpc/client'),
  createTRPCProxyClient: () => ({
    openSwapDepositChannel: {
      mutate: jest.fn(),
    },
  }),
}));

const env = {
  ingressEgress: {
    minimumDepositAmounts: {
      Ethereum: { ETH: 0n, FLIP: 0n, USDC: 0n, USDT: 0n },
      Polkadot: { DOT: 0n },
      Bitcoin: { BTC: 0n },
    },
    ingressFees: {
      Ethereum: { ETH: 0n, FLIP: 0n, USDC: 0n, USDT: 0n },
      Polkadot: { DOT: 0n },
      Bitcoin: { BTC: 0n },
    },
    egressFees: {
      Ethereum: { ETH: 0n, FLIP: 0n, USDC: 0n, USDT: 0n },
      Polkadot: { DOT: 0n },
      Bitcoin: { BTC: 0n },
    },
    minimumEgressAmounts: {
      Ethereum: { ETH: 1n, FLIP: 1n, USDC: 1n, USDT: 1n },
      Polkadot: { DOT: 1n },
      Bitcoin: { BTC: 0x258n },
    },
    witnessSafetyMargins: {
      Ethereum: 1n,
      Polkadot: null,
      Bitcoin: 2n,
    },
  },
  swapping: {
    maximumSwapAmounts: {
      Ethereum: {
        USDC: 0x1000000000000000n,
        ETH: null,
        FLIP: null,
        USDT: null,
      },
      Polkadot: { DOT: null },
      Bitcoin: { BTC: 0x1000000000000000n },
    },
  },
};

describe(SwapSDK, () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(axios.post).mockResolvedValueOnce({
      data: environment({ maxSwapAmount: '0x1000000000000000' }),
    });
  });

  const sdk = new SwapSDK({ network: ChainflipNetworks.perseverance });

  describe(SwapSDK.prototype.getChains, () => {
    it('returns the available chains', async () => {
      expect(await sdk.getChains()).toStrictEqual([
        ethereum(ChainflipNetworks.perseverance, env),
        polkadot(ChainflipNetworks.perseverance, env),
        bitcoin(ChainflipNetworks.perseverance, env),
      ]);
    });

    it.each([
      [
        Chains.Ethereum,
        [
          ethereum(ChainflipNetworks.perseverance, env),
          bitcoin(ChainflipNetworks.perseverance, env),
          polkadot(ChainflipNetworks.perseverance, env),
        ],
      ],
      [
        'Ethereum' as const,
        [
          ethereum(ChainflipNetworks.perseverance, env),
          bitcoin(ChainflipNetworks.perseverance, env),
          polkadot(ChainflipNetworks.perseverance, env),
        ],
      ],
      [
        Chains.Polkadot,
        [
          ethereum(ChainflipNetworks.perseverance, env),
          bitcoin(ChainflipNetworks.perseverance, env),
        ],
      ],
      [
        Chains.Bitcoin,
        [
          ethereum(ChainflipNetworks.perseverance, env),
          polkadot(ChainflipNetworks.perseverance, env),
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
    beforeEach(() => {
      jest.clearAllMocks();
      jest.mocked(axios.post).mockResolvedValueOnce({
        data: environment({ maxSwapAmount: '0x1000000000000000' }),
      });
    });

    it.each([
      [
        Chains.Ethereum,
        [
          eth$(ChainflipNetworks.perseverance, env),
          usdc$(ChainflipNetworks.perseverance, env),
          flip$(ChainflipNetworks.perseverance, env),
        ],
      ],
      [
        'Ethereum' as const,
        [
          eth$(ChainflipNetworks.perseverance, env),
          usdc$(ChainflipNetworks.perseverance, env),
          flip$(ChainflipNetworks.perseverance, env),
        ],
      ],
      [Chains.Polkadot, [dot$(ChainflipNetworks.perseverance, env)]],
      [Chains.Bitcoin, [btc$(ChainflipNetworks.perseverance, env)]],
    ])('returns the available assets for %s', async (chain, assets) => {
      expect(await sdk.getAssets(chain)).toStrictEqual(assets);
    });

    it('throws when requesting an unsupported chain', async () => {
      await expect(sdk.getChains('Dogecoin' as Chain)).rejects.toThrow();
    });
  });
});

describe(SwapSDK, () => {
  const signer = new VoidSigner('0x0').connect({
    getNetwork: () => Promise.resolve({ chainId: 11155111n }),
  } as any);
  const sdk = new SwapSDK({ network: ChainflipNetworks.sisyphos, signer });
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(axios.post).mockResolvedValueOnce({
      data: environment({ maxSwapAmount: '0x1000000000000000' }),
    });
  });

  describe(SwapSDK.prototype.getChains, () => {
    it('returns the available chains', async () => {
      expect(await sdk.getChains()).toStrictEqual([
        ethereum(ChainflipNetworks.sisyphos, env),
        polkadot(ChainflipNetworks.sisyphos, env),
        bitcoin(ChainflipNetworks.sisyphos, env),
      ]);
    });

    it.each([
      [
        Chains.Ethereum,
        [
          ethereum(ChainflipNetworks.sisyphos, env),
          bitcoin(ChainflipNetworks.sisyphos, env),
          polkadot(ChainflipNetworks.sisyphos, env),
        ],
      ],
      [
        'Ethereum' as const,
        [
          ethereum(ChainflipNetworks.sisyphos, env),
          bitcoin(ChainflipNetworks.sisyphos, env),
          polkadot(ChainflipNetworks.sisyphos, env),
        ],
      ],
      [
        Chains.Polkadot,
        [
          ethereum(ChainflipNetworks.sisyphos, env),
          bitcoin(ChainflipNetworks.sisyphos, env),
        ],
      ],
      [
        Chains.Bitcoin,
        [
          ethereum(ChainflipNetworks.sisyphos, env),
          polkadot(ChainflipNetworks.sisyphos, env),
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
    beforeEach(() => {
      jest.mocked(axios.post).mockResolvedValueOnce({
        data: environment({ maxSwapAmount: '0x1000000000000000' }),
      });
    });

    it.each([
      [
        Chains.Ethereum,
        [
          eth$(ChainflipNetworks.sisyphos, env),
          usdc$(ChainflipNetworks.sisyphos, env),
          flip$(ChainflipNetworks.sisyphos, env),
          usdt$(ChainflipNetworks.sisyphos, env),
        ],
      ],
      [
        'Ethereum' as const,
        [
          eth$(ChainflipNetworks.sisyphos, env),
          usdc$(ChainflipNetworks.sisyphos, env),
          flip$(ChainflipNetworks.sisyphos, env),
          usdt$(ChainflipNetworks.sisyphos, env),
        ],
      ],
      [Chains.Polkadot, [dot$(ChainflipNetworks.sisyphos, env)]],
      [Chains.Bitcoin, [btc$(ChainflipNetworks.sisyphos, env)]],
    ])('returns the available assets for %s', async (chain, assets) => {
      expect(await sdk.getAssets(chain)).toStrictEqual(assets);
    });

    it('throws when requesting an unsupported chain', async () => {
      await expect(sdk.getAssets('Dogecoin' as Chain)).rejects.toThrow();
    });
  });

  describe(SwapSDK.prototype.executeSwap, () => {
    it('calls executeSwap', async () => {
      const params = { amount: '1', srcAsset: 'ETH', srcChain: 'Ethereum' };
      jest
        .mocked(executeSwap)
        .mockResolvedValueOnce({ hash: 'hello world' } as any);

      const result = await sdk.executeSwap(params as any);
      expect(executeSwap).toHaveBeenCalledWith(
        params,
        { network: 'sisyphos', signer },
        {},
      );
      expect(result).toEqual('hello world');
    });

    it('calls executeSwap with the given signer', async () => {
      const params = { amount: '1', srcAsset: 'ETH', srcChain: 'Ethereum' };
      const otherSigner = new VoidSigner('0x1').connect({
        getNetwork: () => Promise.resolve({ chainId: 11155111n }),
      } as any);
      jest
        .mocked(executeSwap)
        .mockResolvedValueOnce({ hash: 'hello world' } as any);

      const result = await sdk.executeSwap(params as any, {
        signer: otherSigner,
      });
      expect(executeSwap).toHaveBeenCalledWith(
        params,
        { network: 'sisyphos', signer: otherSigner },
        {},
      );
      expect(result).toEqual('hello world');
    });
  });

  describe(SwapSDK.prototype.approveVault, () => {
    it('calls approveVault', async () => {
      const params = { amount: '1', srcAsset: 'ETH', srcChain: 'Ethereum' };
      jest
        .mocked(approveVault)
        .mockResolvedValueOnce({ hash: 'hello world' } as any);

      const result = await sdk.approveVault(params as any);
      expect(approveVault).toHaveBeenCalledWith(
        params,
        { network: 'sisyphos', signer },
        {},
      );
      expect(result).toEqual('hello world');
    });

    it('calls approveVault with given signer', async () => {
      const params = { amount: '1', srcAsset: 'ETH', srcChain: 'Ethereum' };
      const otherSigner = new VoidSigner('0x1').connect({
        getNetwork: () => Promise.resolve({ chainId: 11155111n }),
      } as any);
      jest
        .mocked(approveVault)
        .mockResolvedValueOnce({ hash: 'hello world' } as any);

      const result = await sdk.approveVault(params as any, {
        signer: otherSigner,
      });
      expect(approveVault).toHaveBeenCalledWith(
        params,
        { network: 'sisyphos', signer: otherSigner },
        {},
      );
      expect(result).toEqual('hello world');
    });
  });

  describe(SwapSDK.prototype.requestDepositAddress, () => {
    it('calls openSwapDepositChannel', async () => {
      const rpcSpy = jest
        // @ts-expect-error - testing private method
        .spyOn(sdk.trpc.openSwapDepositChannel, 'mutate')
        .mockResolvedValueOnce({
          id: 'channel id',
          depositAddress: 'deposit address',
          brokerCommissionBps: 0,
          srcChainExpiryBlock: 123n,
          estimatedExpiryTime: 1698334470000,
        } as any);

      const response = await sdk.requestDepositAddress({
        srcChain: Chains.Bitcoin,
        srcAsset: Assets.BTC,
        destChain: Chains.Ethereum,
        destAsset: Assets.FLIP,
        destAddress: '0xcafebabe',
        amount: BigInt(1e18).toString(),
      });
      expect(rpcSpy).toHaveBeenLastCalledWith({
        srcChain: Chains.Bitcoin,
        srcAsset: Assets.BTC,
        destChain: Chains.Ethereum,
        destAsset: Assets.FLIP,
        destAddress: '0xcafebabe',
        amount: BigInt(1e18).toString(),
      });
      expect(response).toStrictEqual({
        depositChannelId: 'channel id',
        depositAddress: 'deposit address',
        brokerCommissionBps: 0,
        depositChannelExpiryBlock: 123n,
        estimatedDepositChannelExpiryTime: 1698334470000,
        amount: '1000000000000000000',
        destAddress: '0xcafebabe',
        destAsset: 'FLIP',
        destChain: 'Ethereum',
        srcAsset: 'BTC',
        srcChain: 'Bitcoin',
        boostFeeBps: 0,
      });
    });

    it('goes right to the broker', async () => {
      const postSpy = jest
        .mocked(axios.post)
        .mockRejectedValue(Error('unhandled mock'))
        .mockResolvedValueOnce({
          data: {
            ...environment({ maxSwapAmount: '0x1000000000000000' }),
            result: {
              address: '0x717e15853fd5f2ac6123e844c3a7c75976eaec9a',
              issued_block: 123,
              channel_id: 15,
              source_chain_expiry_block: '1234',
            },
          },
        });

      const result = await new SwapSDK({
        broker: { url: 'https://chainflap.org/broker', commissionBps: 15 },
      }).requestDepositAddress({
        srcChain: 'Bitcoin',
        srcAsset: 'BTC',
        destChain: 'Ethereum',
        destAsset: 'FLIP',
        destAddress: '0x717e15853fd5f2ac6123e844c3a7c75976eaec9b',
        amount: BigInt(1e18).toString(),
      });

      expect(postSpy).toHaveBeenCalledWith('https://chainflap.org/broker', {
        id: 1,
        jsonrpc: '2.0',
        method: 'broker_requestSwapDepositAddress',
        params: [
          { asset: 'BTC', chain: 'Bitcoin' },
          { asset: 'FLIP', chain: 'Ethereum' },
          '0x717e15853fd5f2ac6123e844c3a7c75976eaec9b',
          15,
          undefined,
          undefined,
        ],
      });
      expect(result).toStrictEqual({
        srcChain: 'Bitcoin',
        srcAsset: 'BTC',
        destChain: 'Ethereum',
        destAsset: 'FLIP',
        destAddress: '0x717e15853fd5f2ac6123e844c3a7c75976eaec9b',
        brokerCommissionBps: 15,
        amount: '1000000000000000000',
        depositChannelId: '123-Bitcoin-15',
        depositAddress: '0x717e15853fd5f2ac6123e844c3a7c75976eaec9a',
        depositChannelExpiryBlock: 1234n,
        estimatedDepositChannelExpiryTime: undefined,
        boostFeeBps: 0,
      });
    });
  });

  it('allows defining boost fee when opening a deposit channel', async () => {
    const BOOST_FEE_BPS = 100;

    const postSpy = jest.mocked(axios.post).mockResolvedValueOnce({
      data: {
        ...environment({ maxSwapAmount: '0x1000000000000000' }),
        result: {
          address: '0x717e15853fd5f2ac6123e844c3a7c75976eaec9a',
          issued_block: 123,
          channel_id: 15,
          source_chain_expiry_block: '1234',
        },
      },
    });

    const result = await new SwapSDK({
      broker: { url: 'https://chainflap.org/broker', commissionBps: 15 },
    }).requestDepositAddress({
      srcChain: 'Bitcoin',
      srcAsset: 'BTC',
      destChain: 'Ethereum',
      destAsset: 'FLIP',
      destAddress: '0x717e15853fd5f2ac6123e844c3a7c75976eaec9b',
      amount: BigInt(1e18).toString(),
      boostFeeBps: BOOST_FEE_BPS,
    });

    expect(postSpy).toHaveBeenCalledWith('https://chainflap.org/broker', {
      id: 1,
      jsonrpc: '2.0',
      method: 'broker_requestSwapDepositAddress',
      params: [
        { asset: 'BTC', chain: 'Bitcoin' },
        { asset: 'FLIP', chain: 'Ethereum' },
        '0x717e15853fd5f2ac6123e844c3a7c75976eaec9b',
        15,
        undefined,
        BOOST_FEE_BPS,
      ],
    });
    expect(result).toStrictEqual({
      srcChain: 'Bitcoin',
      srcAsset: 'BTC',
      destChain: 'Ethereum',
      destAsset: 'FLIP',
      destAddress: '0x717e15853fd5f2ac6123e844c3a7c75976eaec9b',
      brokerCommissionBps: 15,
      amount: '1000000000000000000',
      depositChannelId: '123-Bitcoin-15',
      depositAddress: '0x717e15853fd5f2ac6123e844c3a7c75976eaec9a',
      depositChannelExpiryBlock: 1234n,
      estimatedDepositChannelExpiryTime: undefined,
      boostFeeBps: BOOST_FEE_BPS,
    });
  });

  describe(SwapSDK.prototype.getRequiredBlockConfirmations, () => {
    it('should return correct value for each chain', async () => {
      expect(
        (await sdk.getRequiredBlockConfirmations()).Ethereum,
      ).toStrictEqual(2);
      expect(
        (await sdk.getRequiredBlockConfirmations()).Polkadot,
      ).toStrictEqual(undefined);
      expect((await sdk.getRequiredBlockConfirmations()).Bitcoin).toStrictEqual(
        3,
      );
    });
  });
});

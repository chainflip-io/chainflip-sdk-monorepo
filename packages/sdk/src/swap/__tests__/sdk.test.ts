import axios from 'axios';
import { VoidSigner } from 'ethers';
import { Assets, Chain, ChainflipNetworks, Chains } from '@/shared/enums';
import { executeSwap } from '@/shared/vault';
import { dot$, btc$, eth$, usdc$, flip$ } from '../assets';
import { bitcoin, ethereum, polkadot } from '../chains';
import { SwapSDK } from '../sdk';

jest.mock('axios');

jest.mock('@/shared/vault', () => ({
  executeSwap: jest.fn(),
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
      Ethereum: {
        ETH: BigInt('0x0'),
        FLIP: BigInt('0x0'),
        USDC: BigInt('0x0'),
      },
      Polkadot: {
        DOT: BigInt('0x0'),
      },
      Bitcoin: {
        BTC: BigInt('0x0'),
      },
    },
  },
  swapping: {
    minimumSwapAmounts: {
      Ethereum: {
        USDC: BigInt('0xf4240'),
        ETH: BigInt('0x20f81c5f84000'),
        FLIP: BigInt('0xde0b6b3a7640000'),
      },
      Polkadot: {
        DOT: BigInt('0x77359400'),
      },
      Bitcoin: {
        BTC: BigInt('0x5f370'),
      },
    },
  },
};

describe(SwapSDK, () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

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
    beforeEach(() => {
      jest.mocked(axios.post).mockResolvedValueOnce({
        data: {
          jsonrpc: '2.0',
          result: {
            ingress_egress: {
              minimum_deposit_amounts: {
                Ethereum: {
                  Flip: '0x0',
                  Usdc: '0x0',
                  Eth: '0x0',
                },
                Polkadot: {
                  Dot: '0x0',
                },
                Bitcoin: {
                  Btc: '0x0',
                },
              },
            },
            swapping: {
              minimum_swap_amounts: {
                Bitcoin: {
                  Btc: '0x5f370',
                },
                Ethereum: {
                  Eth: '0x20f81c5f84000',
                  Usdc: '0xf4240',
                  Flip: '0xde0b6b3a7640000',
                },
                Polkadot: {
                  Dot: '0x77359400',
                },
              },
            },
            funding: {
              redemption_tax: '0x4563918244f40000',
              minimum_funding_amount: '0x8ac7230489e80000',
            },
            pools: {
              fees: {
                Bitcoin: {
                  Btc: {
                    limit_order_fee_hundredth_pips: 20,
                    range_order_fee_hundredth_pips: 20,
                    pair_asset: {
                      chain: 'Ethereum',
                      asset: 'Usdc',
                    },
                  },
                },
                Polkadot: {
                  Dot: {
                    limit_order_fee_hundredth_pips: 20,
                    range_order_fee_hundredth_pips: 20,
                    pair_asset: {
                      chain: 'Ethereum',
                      asset: 'Usdc',
                    },
                  },
                },
                Ethereum: {
                  Flip: {
                    limit_order_fee_hundredth_pips: 20,
                    range_order_fee_hundredth_pips: 20,
                    pair_asset: {
                      chain: 'Ethereum',
                      asset: 'Usdc',
                    },
                  },
                  Eth: {
                    limit_order_fee_hundredth_pips: 20,
                    range_order_fee_hundredth_pips: 20,
                    pair_asset: {
                      chain: 'Ethereum',
                      asset: 'Usdc',
                    },
                  },
                },
              },
            },
          },
          id: 1,
        },
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
    beforeEach(() => {
      jest.mocked(axios.post).mockResolvedValueOnce({
        data: {
          jsonrpc: '2.0',
          result: {
            ingress_egress: {
              minimum_deposit_amounts: {
                Ethereum: {
                  Flip: '0x0',
                  Usdc: '0x0',
                  Eth: '0x0',
                },
                Polkadot: {
                  Dot: '0x0',
                },
                Bitcoin: {
                  Btc: '0x0',
                },
              },
            },
            swapping: {
              minimum_swap_amounts: {
                Bitcoin: {
                  Btc: '0x5f370',
                },
                Ethereum: {
                  Eth: '0x20f81c5f84000',
                  Usdc: '0xf4240',
                  Flip: '0xde0b6b3a7640000',
                },
                Polkadot: {
                  Dot: '0x77359400',
                },
              },
            },
            funding: {
              redemption_tax: '0x4563918244f40000',
              minimum_funding_amount: '0x8ac7230489e80000',
            },
            pools: {
              fees: {
                Bitcoin: {
                  Btc: {
                    limit_order_fee_hundredth_pips: 20,
                    range_order_fee_hundredth_pips: 20,
                    pair_asset: {
                      chain: 'Ethereum',
                      asset: 'Usdc',
                    },
                  },
                },
                Polkadot: {
                  Dot: {
                    limit_order_fee_hundredth_pips: 20,
                    range_order_fee_hundredth_pips: 20,
                    pair_asset: {
                      chain: 'Ethereum',
                      asset: 'Usdc',
                    },
                  },
                },
                Ethereum: {
                  Flip: {
                    limit_order_fee_hundredth_pips: 20,
                    range_order_fee_hundredth_pips: 20,
                    pair_asset: {
                      chain: 'Ethereum',
                      asset: 'Usdc',
                    },
                  },
                  Eth: {
                    limit_order_fee_hundredth_pips: 20,
                    range_order_fee_hundredth_pips: 20,
                    pair_asset: {
                      chain: 'Ethereum',
                      asset: 'Usdc',
                    },
                  },
                },
              },
            },
          },
          id: 1,
        },
      });
    });

    it.each([
      [
        Chains.Ethereum,
        [
          eth$(ChainflipNetworks.sisyphos, env),
          usdc$(ChainflipNetworks.sisyphos, env),
          flip$(ChainflipNetworks.sisyphos, env),
        ],
      ],
      [
        'Ethereum' as const,
        [
          eth$(ChainflipNetworks.sisyphos, env),
          usdc$(ChainflipNetworks.sisyphos, env),
          flip$(ChainflipNetworks.sisyphos, env),
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
      const params = {};
      jest
        .mocked(executeSwap)
        .mockResolvedValueOnce({ hash: 'hello world' } as any);
      const result = await sdk.executeSwap(params as any);
      expect(executeSwap).toHaveBeenCalledWith(
        params,
        {
          network: 'sisyphos',
          signer,
        },
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
        srcAsset: { chain: Chains.Bitcoin, asset: Assets.BTC },
        destAsset: { chain: Chains.Ethereum, asset: Assets.FLIP },
        destAddress: '0xcafebabe',
        amount: BigInt(1e18).toString(),
      });
      expect(response).toStrictEqual({
        depositChannelId: 'channel id',
        depositAddress: 'deposit address',
        depositChannelExpiryBlock: 123n,
        estimatedDepositChannelExpiryTime: 1698334470000,
        sourceChainExpiryBlock: 123n,
        amount: '1000000000000000000',
        destAddress: '0xcafebabe',
        destAsset: 'FLIP',
        destChain: 'Ethereum',
        srcAsset: 'BTC',
        srcChain: 'Bitcoin',
      });
    });

    it('goes right to the broker', async () => {
      const postSpy = jest
        .mocked(axios.post)
        .mockRejectedValue(Error('unhandled mock'))
        .mockResolvedValueOnce({
          data: {
            result: {
              address: '0x717e15853fd5f2ac6123e844c3a7c75976eaec9a',
              issued_block: 123,
              channel_id: 15,
              source_chain_expiry_block: '1234',
            },
          },
        });

      const result = await new SwapSDK({
        broker: { url: 'https://chainflap.org/broker', commissionBps: 5000 },
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
          5000,
        ],
      });
      expect(result).toStrictEqual({
        srcChain: 'Bitcoin',
        srcAsset: 'BTC',
        destChain: 'Ethereum',
        destAsset: 'FLIP',
        destAddress: '0x717e15853fd5f2ac6123e844c3a7c75976eaec9b',
        amount: '1000000000000000000',
        depositChannelId: '123-Bitcoin-15',
        depositAddress: '0x717e15853fd5f2ac6123e844c3a7c75976eaec9a',
        depositChannelExpiryBlock: 1234n,
        estimatedDepositChannelExpiryTime: undefined,
      });
    });
  });
});

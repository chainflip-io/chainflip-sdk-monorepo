/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable @typescript-eslint/lines-between-class-members */
/* eslint-disable max-classes-per-file */
import { VoidSigner } from 'ethers';
import { Assets, ChainflipNetworks, Chains } from '../../enums';
import executeSwap from '../executeSwap';
import { ExecuteSwapParams } from '../index';

const ETH_ADDRESS = '0x6Aa69332B63bB5b1d7Ca5355387EDd5624e181F2';
const DOT_ADDRESS = '5F3sa2TJAWMqDhXG6jhV4N8ko9SxwGy8TpaNS1repo5EYjQX';
const REGTEST_BTC_ADDRESS =
  'bcrt1p7mnll6qup4l3lcggvh7t26m4gryawjy0d0cganzh6e4zjm2d3rtqt9usqx';
const TESTNET_BTC_ADDRESS = 'tb1qge9vvd2mmjxfhuxuq204h4fxxphr0vfnsnx205';
const MAINNET_BTC_ADDRESS =
  'bc1pv7lmxr8vvf220cumd4pft77l4pds85pt4l6rw6yrr3cghyf5kl7sq76puk';

class MockVault {
  constructor(readonly address: string) {}
  async xSwapNative(): Promise<any> {}
  async xSwapToken(): Promise<any> {}
  async xCallNative(): Promise<any> {}
  async xCallToken(): Promise<any> {}
}

class MockERC20 {
  async approve(): Promise<any> {}
  async allowance(): Promise<any> {
    return BigInt(Number.MAX_SAFE_INTEGER - 1);
  }
}

jest.mock('../../abis/factories/Vault__factory', () => ({
  Vault__factory: class {
    static connect(address: string) {
      return new MockVault(address);
    }
  },
}));

jest.mock('../../abis/factories/ERC20__factory', () => ({
  ERC20__factory: class {
    static connect() {
      return new MockERC20();
    }
  },
}));

describe(executeSwap, () => {
  it.each([
    {
      destAsset: Assets.BTC,
      destChain: Chains.Bitcoin,
      destAddress: TESTNET_BTC_ADDRESS,
      srcAsset: Assets.ETH,
      srcChain: Chains.Ethereum,
    },
    {
      destAsset: 'BTC',
      destChain: 'Bitcoin',
      destAddress: TESTNET_BTC_ADDRESS,
      srcAsset: Assets.ETH,
      srcChain: Chains.Ethereum,
    },
    {
      destAsset: Assets.FLIP,
      destChain: Chains.Ethereum,
      destAddress: ETH_ADDRESS,
      srcAsset: Assets.ETH,
      srcChain: Chains.Ethereum,
    },
    {
      destAsset: Assets.USDC,
      destChain: Chains.Ethereum,
      destAddress: ETH_ADDRESS,
      srcAsset: Assets.ETH,
      srcChain: Chains.Ethereum,
    },
    {
      destAsset: Assets.DOT,
      destChain: Chains.Polkadot,
      destAddress: DOT_ADDRESS,
      srcAsset: Assets.ETH,
      srcChain: Chains.Ethereum,
    },
  ] as Omit<ExecuteSwapParams, 'amount'>[])(
    'submits a native swap (%p)',
    async (params) => {
      const wait = jest
        .fn()
        .mockResolvedValue({ status: 1, hash: 'hello world' });
      const swapSpy = jest
        .spyOn(MockVault.prototype, 'xSwapNative')
        .mockResolvedValue({ wait });

      expect(
        await executeSwap(
          { amount: '1', ...params } as ExecuteSwapParams,
          {
            network: ChainflipNetworks.sisyphos,
            signer: new VoidSigner('MY ADDRESS').connect({
              getNetwork: () => Promise.resolve({ chainId: 11155111n }),
            } as any),
          },
          {},
        ),
      ).toStrictEqual({ status: 1, hash: 'hello world' });
      expect(wait).toHaveBeenCalledWith(undefined);
      expect(swapSpy.mock.calls).toMatchSnapshot();
    },
  );

  it.each([
    ...[
      { srcAsset: Assets.FLIP, srcChain: Chains.Ethereum },
      { srcAsset: Assets.USDC, srcChain: Chains.Ethereum },
    ].flatMap((src) => [
      {
        destAsset: Assets.BTC,
        destChain: Chains.Bitcoin,
        destAddress: MAINNET_BTC_ADDRESS,
        ...src,
      },
      {
        destAsset: 'BTC',
        destChain: 'Bitcoin',
        destAddress: MAINNET_BTC_ADDRESS,
        ...src,
      },
      {
        destAsset: Assets.ETH,
        destChain: Chains.Ethereum,
        destAddress: ETH_ADDRESS,
        ...src,
      },
      {
        destAsset: Assets.DOT,
        destChain: Chains.Polkadot,
        destAddress: DOT_ADDRESS,
        ...src,
      },
    ]),
  ] as Omit<ExecuteSwapParams, 'amount'>[])(
    'submits a token swap (%p)',
    async (params) => {
      const wait = jest
        .fn()
        .mockResolvedValue({ status: 1, hash: 'hello world' });
      const approveSpy = jest
        .spyOn(MockERC20.prototype, 'approve')
        .mockResolvedValue({ wait });
      const swapSpy = jest
        .spyOn(MockVault.prototype, 'xSwapToken')
        .mockResolvedValue({ wait });
      const allowanceSpy = jest
        .spyOn(MockERC20.prototype, 'allowance')
        .mockResolvedValueOnce(BigInt(Number.MAX_SAFE_INTEGER - 1));

      expect(
        await executeSwap(
          { amount: '1', ...params } as ExecuteSwapParams,
          {
            network: 'mainnet',
            signer: new VoidSigner('MY ADDRESS').connect({
              getNetwork: () => Promise.resolve({ chainId: 1n }),
            } as any),
          },
          {},
        ),
      ).toStrictEqual({ status: 1, hash: 'hello world' });
      expect(wait).toHaveBeenCalledWith(undefined);
      expect(swapSpy.mock.calls).toMatchSnapshot();
      expect(allowanceSpy.mock.calls).toMatchSnapshot();
      expect(approveSpy).not.toHaveBeenCalled();
    },
  );

  it('submits a token swap with sufficient approval', async () => {
    const wait = jest
      .fn()
      .mockResolvedValue({ status: 1, hash: 'hello world' });
    const approveSpy = jest
      .spyOn(MockERC20.prototype, 'approve')
      .mockRejectedValue(Error('unmocked call'));
    const swapSpy = jest
      .spyOn(MockVault.prototype, 'xSwapToken')
      .mockResolvedValue({ wait });
    const allowanceSpy = jest
      .spyOn(MockERC20.prototype, 'allowance')
      .mockResolvedValueOnce(BigInt(Number.MAX_SAFE_INTEGER - 1));

    expect(
      await executeSwap(
        {
          destAsset: Assets.BTC,
          destChain: Chains.Bitcoin,
          destAddress: TESTNET_BTC_ADDRESS,
          srcAsset: Assets.FLIP,
          srcChain: Chains.Ethereum,
          amount: '1',
        },
        {
          network: 'sisyphos',
          signer: new VoidSigner('MY ADDRESS').connect({
            getNetwork: () => Promise.resolve({ chainId: 11155111n }),
          } as any),
        },
        {},
      ),
    ).toStrictEqual({ status: 1, hash: 'hello world' });
    expect(wait).toHaveBeenCalledWith(undefined);
    expect(swapSpy.mock.calls).toMatchSnapshot();
    expect(allowanceSpy.mock.calls).toMatchSnapshot();
    expect(approveSpy).not.toHaveBeenCalled();
  });

  it('can be invoked with localnet options', async () => {
    const wait = jest
      .fn()
      .mockResolvedValue({ status: 1, hash: 'hello world' });
    const approveSpy = jest
      .spyOn(MockERC20.prototype, 'approve')
      .mockResolvedValue({ wait });
    const swapSpy = jest
      .spyOn(MockVault.prototype, 'xSwapToken')
      .mockResolvedValue({ wait });
    const allowanceSpy = jest
      .spyOn(MockERC20.prototype, 'allowance')
      .mockResolvedValueOnce(BigInt(Number.MAX_SAFE_INTEGER - 1));

    expect(
      await executeSwap(
        {
          destAsset: Assets.BTC,
          destChain: Chains.Bitcoin,
          destAddress: REGTEST_BTC_ADDRESS,
          srcAsset: Assets.FLIP,
          amount: '1',
          srcChain: Chains.Ethereum,
        },
        {
          network: 'localnet',
          signer: new VoidSigner('MY ADDRESS'),
          vaultContractAddress: '0x123',
          srcTokenContractAddress: '0x456',
        },
        {},
      ),
    ).toStrictEqual({ status: 1, hash: 'hello world' });
    expect(wait).toHaveBeenCalledWith(undefined);
    expect(swapSpy.mock.calls).toMatchSnapshot();
    expect(allowanceSpy.mock.calls).toMatchSnapshot();
    expect(approveSpy).not.toHaveBeenCalled();
  });

  it('accepts a nonce', async () => {
    const wait = jest
      .fn()
      .mockResolvedValue({ status: 1, hash: 'hello world' });
    const swapSpy = jest
      .spyOn(MockVault.prototype, 'xSwapNative')
      .mockResolvedValue({ wait });

    expect(
      await executeSwap(
        {
          amount: '1',
          destAsset: Assets.BTC,
          destChain: Chains.Bitcoin,
          destAddress: TESTNET_BTC_ADDRESS,
          srcAsset: Assets.ETH,
          srcChain: Chains.Ethereum,
        },
        {
          network: ChainflipNetworks.sisyphos,
          signer: new VoidSigner('MY ADDRESS').connect({
            getNetwork: () => Promise.resolve({ chainId: 11155111n }),
          } as any),
        },
        { nonce: 1 },
      ),
    ).toStrictEqual({ status: 1, hash: 'hello world' });
    expect(wait).toHaveBeenCalledWith(undefined);
    expect(swapSpy.mock.calls).toMatchSnapshot();
  });

  it('rejects if source asset and chain are not valid', async () => {
    await expect(
      executeSwap(
        {
          amount: '1',
          destAsset: Assets.BTC,
          destChain: Chains.Bitcoin,
          destAddress: TESTNET_BTC_ADDRESS,
          srcAsset: Assets.BTC,
          srcChain: Chains.Ethereum,
        },
        {
          network: ChainflipNetworks.sisyphos,
          signer: new VoidSigner('MY ADDRESS').connect({
            getNetwork: () => Promise.resolve({ chainId: 11155111n }),
          } as any),
        },
        { nonce: 1 },
      ),
    ).rejects.toThrow(
      'invalid asset and chain combination: {"chain":"Ethereum","asset":"BTC"}',
    );
  });

  it('rejects if destination asset and chain are not valid', async () => {
    await expect(
      executeSwap(
        {
          amount: '1',
          destAsset: Assets.DOT,
          destChain: Chains.Bitcoin,
          destAddress: TESTNET_BTC_ADDRESS,
          srcAsset: Assets.ETH,
          srcChain: Chains.Ethereum,
        },
        {
          network: ChainflipNetworks.sisyphos,
          signer: new VoidSigner('MY ADDRESS').connect({
            getNetwork: () => Promise.resolve({ chainId: 11155111n }),
          } as any),
        },
        { nonce: 1 },
      ),
    ).rejects.toThrow(
      'invalid asset and chain combination: {"chain":"Bitcoin","asset":"DOT"}',
    );
  });

  it('rejects an invalid destination address', async () => {
    await expect(
      executeSwap(
        {
          amount: '1',
          destAsset: Assets.BTC,
          destChain: Chains.Bitcoin,
          destAddress: 'invalid-btc-address',
          srcAsset: Assets.ETH,
          srcChain: Chains.Ethereum,
        },
        {
          network: ChainflipNetworks.sisyphos,
          signer: new VoidSigner('MY ADDRESS').connect({
            getNetwork: () => Promise.resolve({ chainId: 11155111n }),
          } as any),
        },
        { nonce: 1 },
      ),
    ).rejects.toThrow(
      'Address "invalid-btc-address" is not a valid "Bitcoin" address',
    );
  });

  it('rejects if the source chain is not an evm chain', async () => {
    await expect(
      executeSwap(
        {
          amount: '1',
          destAsset: Assets.BTC,
          destChain: Chains.Bitcoin,
          destAddress: TESTNET_BTC_ADDRESS,
          srcAsset: Assets.DOT,
          srcChain: Chains.Polkadot,
        },
        {
          network: ChainflipNetworks.sisyphos,
          signer: new VoidSigner('MY ADDRESS').connect({
            getNetwork: () => Promise.resolve({ chainId: 11155111n }),
          } as any),
        },
        { nonce: 1 },
      ),
    ).rejects.toThrow('Chain Polkadot is not an evm chain');
  });

  it('rejects if the signer is connected to the wrong evm chain', async () => {
    await expect(
      executeSwap(
        {
          amount: '1',
          destAsset: Assets.BTC,
          destChain: Chains.Bitcoin,
          destAddress: TESTNET_BTC_ADDRESS,
          srcAsset: Assets.ETH,
          srcChain: Chains.Ethereum,
        },
        {
          network: ChainflipNetworks.sisyphos,
          signer: new VoidSigner('MY ADDRESS').connect({
            getNetwork: () => Promise.resolve({ chainId: 404n }),
          } as any),
        },
        { nonce: 1 },
      ),
    ).rejects.toThrow(
      'Signer is connected to unexpected evm chain (expected: 11155111, got: 404)',
    );
  });

  it('rejects if the destination chain is not an evm chain for a call', async () => {
    await expect(
      executeSwap(
        {
          amount: '1',
          destAsset: Assets.BTC,
          destChain: Chains.Bitcoin,
          destAddress: TESTNET_BTC_ADDRESS,
          srcAsset: Assets.ETH,
          srcChain: Chains.Ethereum,
          ccmMetadata: { message: '0xdeadc0de', gasBudget: '101' },
        },
        {
          network: ChainflipNetworks.sisyphos,
          signer: new VoidSigner('MY ADDRESS').connect({
            getNetwork: () => Promise.resolve({ chainId: 11155111n }),
          } as any),
        },
        { nonce: 1 },
      ),
    ).rejects.toThrow('Chain Bitcoin is not an evm chain');
  });

  it.each([
    {
      srcAsset: Assets.ETH,
      srcChain: Chains.Ethereum,
      destAsset: Assets.FLIP,
      destChain: Chains.Ethereum,
      destAddress: ETH_ADDRESS,
      ccmMetadata: { message: '0xdeadc0de', gasBudget: '101' },
    },
    {
      srcAsset: Assets.ETH,
      srcChain: Chains.Ethereum,
      destAsset: Assets.USDC,
      destChain: Chains.Ethereum,
      destAddress: ETH_ADDRESS,
      ccmMetadata: { message: '0xdeadc0de', gasBudget: '101' },
    },
  ])('submits a native call (%p)', async (params) => {
    const wait = jest
      .fn()
      .mockResolvedValue({ status: 1, hash: 'hello world' });
    const callSpy = jest
      .spyOn(MockVault.prototype, 'xCallNative')
      .mockResolvedValue({ wait });

    expect(
      await executeSwap(
        {
          amount: '1',
          ...params,
        } as ExecuteSwapParams,
        {
          network: ChainflipNetworks.sisyphos,
          signer: new VoidSigner('MY ADDRESS').connect({
            getNetwork: () => Promise.resolve({ chainId: 11155111n }),
          } as any),
        },
        {},
      ),
    ).toStrictEqual({ status: 1, hash: 'hello world' });
    expect(wait).toHaveBeenCalledWith(undefined);
    expect(callSpy.mock.calls).toMatchSnapshot();
  });

  it.each([
    ...(
      [
        {
          srcAsset: Assets.FLIP,
          srcChain: Chains.Ethereum,
          ccmMetadata: { message: '0xdeadc0de', gasBudget: '101' },
        },
        {
          srcAsset: Assets.USDC,
          srcChain: Chains.Ethereum,
          ccmMetadata: { message: '0xdeadc0de', gasBudget: '101' },
        },
      ] as const
    ).flatMap(
      (src) =>
        [
          {
            destAsset: Assets.ETH,
            destChain: Chains.Ethereum,
            destAddress: ETH_ADDRESS,
            ...src,
          },
        ] as const,
    ),
  ])('submits a token call (%p)', async (params) => {
    const wait = jest
      .fn()
      .mockResolvedValue({ status: 1, hash: 'hello world' });
    const approveSpy = jest
      .spyOn(MockERC20.prototype, 'approve')
      .mockResolvedValue({ wait });
    const callSpy = jest
      .spyOn(MockVault.prototype, 'xCallToken')
      .mockResolvedValue({ wait });
    const allowanceSpy = jest
      .spyOn(MockERC20.prototype, 'allowance')
      .mockResolvedValueOnce(BigInt(Number.MAX_SAFE_INTEGER - 1));

    expect(
      await executeSwap(
        {
          amount: '1',
          ...params,
        },
        {
          network: 'sisyphos',
          signer: new VoidSigner('MY ADDRESS').connect({
            getNetwork: () => Promise.resolve({ chainId: 11155111n }),
          } as any),
        },
        {},
      ),
    ).toStrictEqual({ status: 1, hash: 'hello world' });
    expect(wait).toHaveBeenCalledWith(undefined);
    expect(callSpy).toHaveBeenCalled();
    expect(callSpy.mock.calls).toMatchSnapshot();
    expect(allowanceSpy.mock.calls).toMatchSnapshot();
    expect(approveSpy).not.toHaveBeenCalled();
  });
});

/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable @typescript-eslint/lines-between-class-members */
/* eslint-disable max-classes-per-file */
import { BigNumber, VoidSigner } from 'ethers';
import { ChainId } from '../../enums';
import executeSwap from '../executeSwap';
import { ExecuteSwapParams } from '../validators';

const ETH_ADDRESS = '0x6Aa69332B63bB5b1d7Ca5355387EDd5624e181F2';
const DOT_ADDRESS = '5F3sa2TJAWMqDhXG6jhV4N8ko9SxwGy8TpaNS1repo5EYjQX';
const BTC_ADDRESS = 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq';

class MockVault {
  constructor(readonly address: string) {}
  async xSwapNative(): Promise<any> {}
  async xSwapToken(): Promise<any> {}
}

class MockERC20 {
  async approve(): Promise<any> {}
  async allowance(): Promise<any> {
    return BigNumber.from(Number.MAX_SAFE_INTEGER - 1);
  }
}

jest.mock('../../abis/factories/Vault__factory', () => ({
  Vault__factory: class {
    static connect: (address: string) => MockVault = jest.fn(
      (address: string) => new MockVault(address),
    );
  },
}));

jest.mock('../../abis/factories/ERC20__factory', () => ({
  ERC20__factory: class {
    static connect: () => MockERC20 = jest.fn(() => new MockERC20());
  },
}));

describe(executeSwap, () => {
  it.each(['perseverance', 'mainnet'] as const)(
    'only works on sisyphos for now',
    async (cfNetwork) => {
      await expect(
        executeSwap({} as any, {
          cfNetwork,
          signer: new VoidSigner('MY ADDRESS'),
        }),
      ).rejects.toThrowError();
    },
  );

  it.each([
    {
      destTokenSymbol: 'BTC',
      destChainId: ChainId.Bitcoin,
      destAddress: BTC_ADDRESS,
    },
    {
      destTokenSymbol: 'FLIP',
      destChainId: ChainId.Ethereum,
      destAddress: ETH_ADDRESS,
    },
    {
      destTokenSymbol: 'USDC',
      destChainId: ChainId.Ethereum,
      destAddress: ETH_ADDRESS,
    },
    {
      destTokenSymbol: 'DOT',
      destChainId: ChainId.Polkadot,
      destAddress: DOT_ADDRESS,
    },
  ] as Omit<ExecuteSwapParams, 'amount'>[])(
    'submits a native swap (%p)',
    async (params) => {
      const wait = jest
        .fn()
        .mockResolvedValue({ status: 1, transactionHash: 'hello world' });
      const swapSpy = jest
        .spyOn(MockVault.prototype, 'xSwapNative')
        .mockResolvedValue({ wait });

      expect(
        await executeSwap({ amount: '1', ...params } as ExecuteSwapParams, {
          cfNetwork: 'sisyphos',
          signer: new VoidSigner('MY ADDRESS'),
        }),
      ).toStrictEqual({ status: 1, transactionHash: 'hello world' });
      expect(wait).toHaveBeenCalledWith(1);
      expect(swapSpy.mock.calls).toMatchSnapshot();
    },
  );

  it('throws an error if the transaction errors', async () => {
    const wait = jest.fn().mockResolvedValue({ status: 0 });
    jest.spyOn(MockVault.prototype, 'xSwapNative').mockResolvedValue({ wait });

    await expect(
      executeSwap(
        {
          destTokenSymbol: 'DOT',
          destChainId: ChainId.Polkadot,
          destAddress: DOT_ADDRESS,
          amount: '1',
        },
        { cfNetwork: 'sisyphos', signer: new VoidSigner('MY ADDRESS') },
      ),
    ).rejects.toThrowError();
  });

  it.each([
    ...['FLIP', 'USDC'].flatMap((srcTokenSymbol) => [
      {
        destTokenSymbol: 'BTC',
        destChainId: ChainId.Bitcoin,
        destAddress: BTC_ADDRESS,
        srcTokenSymbol,
      },
      {
        destTokenSymbol: 'ETH',
        destChainId: ChainId.Ethereum,
        destAddress: ETH_ADDRESS,
        srcTokenSymbol,
      },
      {
        destTokenSymbol: 'DOT',
        destChainId: ChainId.Polkadot,
        destAddress: DOT_ADDRESS,
        srcTokenSymbol,
      },
    ]),
  ] as Omit<ExecuteSwapParams, 'amount'>[])(
    'submits a token swap (%p)',
    async (params) => {
      const wait = jest
        .fn()
        .mockResolvedValue({ status: 1, transactionHash: 'hello world' });
      const approveSpy = jest
        .spyOn(MockERC20.prototype, 'approve')
        .mockResolvedValue({ wait });
      const swapSpy = jest
        .spyOn(MockVault.prototype, 'xSwapToken')
        .mockResolvedValue({ wait });
      const allowanceSpy = jest.spyOn(MockERC20.prototype, 'allowance');

      expect(
        await executeSwap({ amount: '1', ...params } as ExecuteSwapParams, {
          cfNetwork: 'sisyphos',
          signer: new VoidSigner('MY ADDRESS'),
        }),
      ).toStrictEqual({ status: 1, transactionHash: 'hello world' });
      expect(wait).toHaveBeenCalledWith(1);
      expect(swapSpy.mock.calls).toMatchSnapshot();
      expect(allowanceSpy.mock.calls).toMatchSnapshot();
      expect(approveSpy).not.toHaveBeenCalled();
    },
  );

  it('submits a token swap with approval', async () => {
    const wait = jest
      .fn()
      .mockResolvedValue({ status: 1, transactionHash: 'hello world' });
    const approveSpy = jest
      .spyOn(MockERC20.prototype, 'approve')
      .mockResolvedValue({ wait });
    const swapSpy = jest
      .spyOn(MockVault.prototype, 'xSwapToken')
      .mockResolvedValue({ wait });
    const allowanceSpy = jest
      .spyOn(MockERC20.prototype, 'allowance')
      .mockResolvedValueOnce(BigNumber.from(0));

    expect(
      await executeSwap(
        {
          destTokenSymbol: 'BTC',
          destChainId: ChainId.Bitcoin,
          destAddress: BTC_ADDRESS,
          srcTokenSymbol: 'FLIP',
          amount: '1',
        } as ExecuteSwapParams,
        { cfNetwork: 'sisyphos', signer: new VoidSigner('MY ADDRESS') },
      ),
    ).toStrictEqual({ status: 1, transactionHash: 'hello world' });
    expect(wait).toHaveBeenCalledWith(1);
    expect(swapSpy.mock.calls).toMatchSnapshot();
    expect(allowanceSpy.mock.calls).toMatchSnapshot();
    expect(approveSpy.mock.calls).toMatchSnapshot();
  });

  it('throws if the approve transaction errors', async () => {
    const wait = jest.fn().mockResolvedValue({ status: 0 });
    jest.spyOn(MockERC20.prototype, 'approve').mockResolvedValue({ wait });
    jest
      .spyOn(MockERC20.prototype, 'allowance')
      .mockResolvedValueOnce(BigNumber.from(0));

    await expect(
      executeSwap(
        {
          destTokenSymbol: 'BTC',
          destChainId: ChainId.Bitcoin,
          destAddress: BTC_ADDRESS,
          srcTokenSymbol: 'FLIP',
          amount: '1',
        },
        { cfNetwork: 'sisyphos', signer: new VoidSigner('MY ADDRESS') },
      ),
    ).rejects.toThrowError();
  });

  it('throws if the swap transaction errors', async () => {
    const wait = jest.fn().mockResolvedValueOnce({ status: 0 });
    jest.spyOn(MockERC20.prototype, 'approve').mockResolvedValue({ wait });
    jest.spyOn(MockVault.prototype, 'xSwapToken').mockResolvedValue({ wait });

    await expect(
      executeSwap(
        {
          destTokenSymbol: 'BTC',
          destChainId: ChainId.Bitcoin,
          destAddress: BTC_ADDRESS,
          srcTokenSymbol: 'FLIP',
          amount: '1',
        },
        { cfNetwork: 'sisyphos', signer: new VoidSigner('MY ADDRESS') },
      ),
    ).rejects.toThrowError();
  });

  it('can be invoked with localnet options', async () => {
    const wait = jest
      .fn()
      .mockResolvedValue({ status: 1, transactionHash: 'hello world' });
    const approveSpy = jest
      .spyOn(MockERC20.prototype, 'approve')
      .mockResolvedValue({ wait });
    const swapSpy = jest
      .spyOn(MockVault.prototype, 'xSwapToken')
      .mockResolvedValue({ wait });
    const allowanceSpy = jest
      .spyOn(MockERC20.prototype, 'allowance')
      .mockResolvedValueOnce(BigNumber.from(0));

    expect(
      await executeSwap(
        {
          destTokenSymbol: 'BTC',
          destChainId: ChainId.Bitcoin,
          destAddress: BTC_ADDRESS,
          srcTokenSymbol: 'FLIP',
          amount: '1',
        } as ExecuteSwapParams,
        {
          cfNetwork: 'localnet',
          signer: new VoidSigner('MY ADDRESS'),
          vaultContractAddress: '0x123',
          srcTokenContractAddress: '0x456',
        },
      ),
    ).toStrictEqual({ status: 1, transactionHash: 'hello world' });
    expect(wait).toHaveBeenCalledWith(1);
    expect(swapSpy.mock.calls).toMatchSnapshot();
    expect(allowanceSpy.mock.calls).toMatchSnapshot();
    expect(approveSpy.mock.calls).toMatchSnapshot();
  });
});

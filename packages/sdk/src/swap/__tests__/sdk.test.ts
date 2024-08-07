import { VoidSigner } from 'ethers';
import { Assets, Chain, ChainflipNetworks, Chains, InternalAssets } from '@/shared/enums';
import {
  boostPoolsDepth,
  environment,
  mockRpcResponse,
  supportedAssets,
} from '@/shared/tests/fixtures';
import { approveVault, executeSwap } from '@/shared/vault';
import { SwapSDK } from '../sdk';
import { getQuote, getStatus } from '../services/ApiService';
import { QuoteRequest } from '../types';

jest.mock('@/shared/vault', () => ({
  executeSwap: jest.fn(),
  approveVault: jest.fn(),
}));

jest.mock('../services/ApiService', () => ({
  getQuote: jest.fn(),
  getStatus: jest.fn(),
}));

jest.mock('@trpc/client', () => ({
  ...jest.requireActual('@trpc/client'),
  createTRPCProxyClient: () => ({
    openSwapDepositChannel: {
      mutate: jest.fn(),
    },
  }),
}));

describe(SwapSDK, () => {
  const signer = new VoidSigner('0x0');
  const sdk = new SwapSDK({ network: ChainflipNetworks.sisyphos, signer });

  const defaultRpcMocks = (url: string, data: any) => {
    if (data.method === 'cf_environment') {
      return Promise.resolve({
        data: environment({ maxSwapAmount: '0x1000000000000000' }),
      });
    }

    if (data.method === 'cf_supported_assets') {
      return Promise.resolve({
        data: supportedAssets({ assets: Object.values(InternalAssets) }),
      });
    }

    if (data.method === 'cf_environment') {
      return Promise.resolve({
        data: environment(),
      });
    }

    throw new Error(`unexpected axios call to ${url}: ${JSON.stringify(data)}`);
  };

  beforeEach(() => {
    mockRpcResponse(defaultRpcMocks);
  });

  describe(SwapSDK.prototype.getChains, () => {
    it('returns the chains based on the cf_supported_assets rpc', async () => {
      mockRpcResponse((url, data: any) => {
        if (data.method === 'cf_supported_assets') {
          return Promise.resolve({
            data: supportedAssets({ assets: ['Btc', 'ArbUsdc'] }),
          });
        }

        return defaultRpcMocks(url, data);
      });

      const freshSdk = new SwapSDK({ network: ChainflipNetworks.sisyphos, signer });
      expect(await freshSdk.getAssets()).toMatchSnapshot();
    });

    it('returns the filtered destination chains for the chain', async () => {
      expect(await sdk.getChains('Ethereum'));
    });

    it('returns maxRetryDurationBlocks for the chain', async () => {
      const chain = await sdk.getChains('Ethereum');
      expect(chain[0]).toMatchObject({
        maxRetryDurationBlocks: expect.any(Number),
      });
    });

    it('throws when requesting an unsupported chain', async () => {
      await expect(sdk.getChains('Dogecoin' as Chain)).rejects.toMatchSnapshot();
    });

    it.each(Object.values(ChainflipNetworks))(
      'returns the correct values for %s',
      async (network) => {
        const networkSdk = new SwapSDK({ network });
        expect(await networkSdk.getChains()).toMatchSnapshot();
      },
    );
  });

  describe(SwapSDK.prototype.getAssets, () => {
    it('returns the assets based on the cf_supported_assets rpc', async () => {
      mockRpcResponse((url, data: any) => {
        if (data.method === 'cf_supported_assets') {
          return Promise.resolve({
            data: supportedAssets({ assets: ['Btc', 'ArbUsdc'] }),
          });
        }

        return defaultRpcMocks(url, data);
      });

      const freshSdk = new SwapSDK({ network: ChainflipNetworks.sisyphos, signer });
      expect(await freshSdk.getAssets()).toMatchSnapshot();
    });

    it('returns the filtered assets for the chain', async () => {
      expect(await sdk.getAssets('Bitcoin')).toMatchSnapshot();
    });

    it('throws when requesting an unsupported chain', async () => {
      await expect(sdk.getChains('Dogecoin' as Chain)).rejects.toMatchSnapshot();
    });

    it.each(Object.values(ChainflipNetworks))(
      'returns the correct values for %s',
      async (network) => {
        const networkSdk = new SwapSDK({ network });
        await expect(await networkSdk.getAssets()).toMatchSnapshot();
      },
    );
  });

  describe(SwapSDK.prototype.getQuote, () => {
    it('calls api', async () => {
      const params: QuoteRequest = {
        srcChain: 'Ethereum',
        srcAsset: 'ETH',
        destChain: 'Ethereum',
        destAsset: 'USDC',
        amount: '1',
      };
      jest.mocked(getQuote).mockResolvedValueOnce({ quote: 1234 } as any);

      const result = await sdk.getQuote(params);
      expect(getQuote).toHaveBeenCalledWith(
        'https://chainflip-swap.staging/',
        { ...params, brokerCommissionBps: 0 },
        {},
      );
      expect(result).toEqual({ quote: 1234 });
    });

    it('calls api with broker commission ', async () => {
      const params: QuoteRequest = {
        srcChain: 'Ethereum',
        srcAsset: 'ETH',
        destChain: 'Ethereum',
        destAsset: 'USDC',
        amount: '1',
        brokerCommissionBps: 100,
        affiliateBrokers: [
          { account: 'cFLdocJo3bjT7JbT7R46cA89QfvoitrKr9P3TsMcdkVWeeVLa', commissionBps: 10 },
          { account: 'cFLdopvNB7LaiBbJoNdNC26e9Gc1FNJKFtvNZjAmXAAVnzCk4', commissionBps: 20 },
        ],
      };
      jest.mocked(getQuote).mockResolvedValueOnce({ quote: 1234 } as any);

      const result = await sdk.getQuote(params);
      expect(getQuote).toHaveBeenCalledWith(
        'https://chainflip-swap.staging/',
        {
          srcChain: 'Ethereum',
          srcAsset: 'ETH',
          destChain: 'Ethereum',
          destAsset: 'USDC',
          amount: '1',
          brokerCommissionBps: 130,
        },
        {},
      );
      expect(result).toEqual({ quote: 1234 });
    });
  });

  describe(SwapSDK.prototype.getStatus, () => {
    it('calls api', async () => {
      jest.mocked(getStatus).mockResolvedValueOnce({ status: 1234 } as any);

      const result = await sdk.getStatus({ id: '1234' });
      expect(getStatus).toHaveBeenCalledWith('https://chainflip-swap.staging/', { id: '1234' }, {});
      expect(result).toEqual({ status: 1234 });
    });
  });

  describe(SwapSDK.prototype.executeSwap, () => {
    it('calls executeSwap', async () => {
      const params = { amount: '1', srcAsset: 'ETH', srcChain: 'Ethereum' };
      jest.mocked(executeSwap).mockResolvedValueOnce({ hash: 'hello world' } as any);

      const result = await sdk.executeSwap(params as any);
      expect(executeSwap).toHaveBeenCalledWith(params, { network: 'sisyphos', signer }, {});
      expect(result).toEqual('hello world');
    });

    it('calls executeSwap with the given signer', async () => {
      const params = { amount: '1', srcAsset: 'ETH', srcChain: 'Ethereum' };
      const otherSigner = new VoidSigner('0x1');
      jest.mocked(executeSwap).mockResolvedValueOnce({ hash: 'hello world' } as any);

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
      jest.mocked(approveVault).mockResolvedValueOnce({ hash: 'hello world' } as any);

      const result = await sdk.approveVault(params as any);
      expect(approveVault).toHaveBeenCalledWith(params, { network: 'sisyphos', signer }, {});
      expect(result).toEqual('hello world');
    });

    it('calls approveVault with given signer', async () => {
      const params = { amount: '1', srcAsset: 'ETH', srcChain: 'Ethereum' };
      const otherSigner = new VoidSigner('0x1');
      jest.mocked(approveVault).mockResolvedValueOnce({ hash: 'hello world' } as any);

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
          channelOpeningFee: 0n,
          issuedBlock: 1,
          maxBoostFeeBps: 0,
        });

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
        maxBoostFeeBps: 0,
        ccmParams: undefined,
        channelOpeningFee: 0n,
        affiliateBrokers: [],
      });
    });

    it('calls openSwapDepositChannel with refund parameters', async () => {
      const rpcSpy = jest
        // @ts-expect-error - testing private method
        .spyOn(sdk.trpc.openSwapDepositChannel, 'mutate')
        .mockResolvedValueOnce({
          id: 'channel id',
          depositAddress: 'deposit address',
          brokerCommissionBps: 0,
          srcChainExpiryBlock: 123n,
          estimatedExpiryTime: 1698334470000,
          channelOpeningFee: 0n,
          issuedBlock: 1,
          maxBoostFeeBps: 0,
        });

      const response = await sdk.requestDepositAddress({
        srcChain: Chains.Bitcoin,
        srcAsset: Assets.BTC,
        destChain: Chains.Ethereum,
        destAsset: Assets.FLIP,
        destAddress: '0xcafebabe',
        amount: BigInt(1e18).toString(),
        fillOrKillParams: {
          retryDurationBlocks: 500,
          refundAddress: '0xa56A6be23b6Cf39D9448FF6e897C29c41c8fbDFF',
          minPrice: '10000000000000',
        },
      });
      expect(rpcSpy).toHaveBeenLastCalledWith({
        srcChain: Chains.Bitcoin,
        srcAsset: Assets.BTC,
        destChain: Chains.Ethereum,
        destAsset: Assets.FLIP,
        destAddress: '0xcafebabe',
        amount: BigInt(1e18).toString(),
        fillOrKillParams: {
          retryDurationBlocks: 500,
          refundAddress: '0xa56A6be23b6Cf39D9448FF6e897C29c41c8fbDFF',
          minPrice: '10000000000000',
          minPriceX128: '34028236692093846346337460743176821145600000000000000000000000',
        },
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
        maxBoostFeeBps: 0,
        channelOpeningFee: 0n,
        ccmParams: undefined,
        affiliateBrokers: [],
        fillOrKillParams: {
          retryDurationBlocks: 500,
          refundAddress: '0xa56A6be23b6Cf39D9448FF6e897C29c41c8fbDFF',
          minPrice: '10000000000000',
        },
      });
    });

    it('calls the configured broker api', async () => {
      const postSpy = mockRpcResponse((url, data: any) => {
        if (data.method === 'broker_requestSwapDepositAddress') {
          return Promise.resolve({
            data: {
              id: '1',
              jsonrpc: '2.0',
              result: {
                address: '0x717e15853fd5f2ac6123e844c3a7c75976eaec9a',
                issued_block: 123,
                channel_id: 15,
                source_chain_expiry_block: '0x04d2',
                channel_opening_fee: '0x0',
              },
            },
          });
        }

        return defaultRpcMocks(url, data);
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
        id: '1',
        jsonrpc: '2.0',
        method: 'broker_requestSwapDepositAddress',
        params: [
          { asset: 'BTC', chain: 'Bitcoin' },
          { asset: 'FLIP', chain: 'Ethereum' },
          '0x717e15853fd5f2ac6123e844c3a7c75976eaec9b',
          15,
          null,
          null,
          null,
          null,
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
        maxBoostFeeBps: 0,
        channelOpeningFee: 0n,
        ccmParams: undefined,
        affiliateBrokers: [],
      });
    });

    it('calls the configured broker api with the given broker commission', async () => {
      const postSpy = mockRpcResponse((url, data: any) => {
        if (data.method === 'broker_requestSwapDepositAddress') {
          return Promise.resolve({
            data: {
              id: '1',
              jsonrpc: '2.0',
              result: {
                address: '0x717e15853fd5f2ac6123e844c3a7c75976eaec9a',
                issued_block: 123,
                channel_id: 15,
                source_chain_expiry_block: '0x04d2',
                channel_opening_fee: '0x0',
              },
            },
          });
        }

        return defaultRpcMocks(url, data);
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
        brokerCommissionBps: 125,
      });

      expect(postSpy).toHaveBeenCalledWith('https://chainflap.org/broker', {
        id: '1',
        jsonrpc: '2.0',
        method: 'broker_requestSwapDepositAddress',
        params: [
          { asset: 'BTC', chain: 'Bitcoin' },
          { asset: 'FLIP', chain: 'Ethereum' },
          '0x717e15853fd5f2ac6123e844c3a7c75976eaec9b',
          125,
          null,
          null,
          null,
          null,
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
        maxBoostFeeBps: 0,
        channelOpeningFee: 0n,
        ccmParams: undefined,
        affiliateBrokers: [],
      });
    });

    it('calls the configured broker api with the given affiliate brokers', async () => {
      const postSpy = mockRpcResponse((url, data: any) => {
        if (data.method === 'broker_requestSwapDepositAddress') {
          return Promise.resolve({
            data: {
              id: '1',
              jsonrpc: '2.0',
              result: {
                address: '0x717e15853fd5f2ac6123e844c3a7c75976eaec9a',
                issued_block: 123,
                channel_id: 15,
                source_chain_expiry_block: '0x04d2',
                channel_opening_fee: '0x0',
              },
            },
          });
        }

        return defaultRpcMocks(url, data);
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
        affiliateBrokers: [
          { account: 'cFHyJEHEQ1YkT9xuFnxnPWVkihpYEGjBg4WbF6vCPtSPQoE8n', commissionBps: 10 },
        ],
      });

      expect(postSpy).toHaveBeenCalledWith('https://chainflap.org/broker', {
        id: '1',
        jsonrpc: '2.0',
        method: 'broker_requestSwapDepositAddress',
        params: [
          { asset: 'BTC', chain: 'Bitcoin' },
          { asset: 'FLIP', chain: 'Ethereum' },
          '0x717e15853fd5f2ac6123e844c3a7c75976eaec9b',
          15,
          null,
          null,
          [{ account: 'cFHyJEHEQ1YkT9xuFnxnPWVkihpYEGjBg4WbF6vCPtSPQoE8n', bps: 10 }],
          null,
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
        maxBoostFeeBps: 0,
        channelOpeningFee: 0n,
        ccmParams: undefined,
        affiliateBrokers: [
          { account: 'cFHyJEHEQ1YkT9xuFnxnPWVkihpYEGjBg4WbF6vCPtSPQoE8n', commissionBps: 10 },
        ],
      });
    });
  });

  it('calls the configured broker api with the given refund parameters', async () => {
    const postSpy = mockRpcResponse((url, data: any) => {
      if (data.method === 'broker_requestSwapDepositAddress') {
        return Promise.resolve({
          data: {
            id: '1',
            jsonrpc: '2.0',
            result: {
              address: '0x717e15853fd5f2ac6123e844c3a7c75976eaec9a',
              issued_block: 123,
              channel_id: 15,
              source_chain_expiry_block: '0x04d2',
              channel_opening_fee: '0x0',
            },
          },
        });
      }

      return defaultRpcMocks(url, data);
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
      fillOrKillParams: {
        retryDurationBlocks: 500,
        refundAddress: '0xa56A6be23b6Cf39D9448FF6e897C29c41c8fbDFF',
        minPrice: '2458.206',
      },
    });

    expect(postSpy).toHaveBeenCalledWith('https://chainflap.org/broker', {
      id: '1',
      jsonrpc: '2.0',
      method: 'broker_requestSwapDepositAddress',
      params: [
        { asset: 'BTC', chain: 'Bitcoin' },
        { asset: 'FLIP', chain: 'Ethereum' },
        '0x717e15853fd5f2ac6123e844c3a7c75976eaec9b',
        15,
        null,
        null,
        null,
        {
          retry_duration: 500,
          refund_address: '0xa56A6be23b6Cf39D9448FF6e897C29c41c8fbDFF',
          min_price: '0x165b74f4430000000000000000000000000000000000',
        },
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
      maxBoostFeeBps: 0,
      channelOpeningFee: 0n,
      ccmParams: undefined,
      affiliateBrokers: [],
      fillOrKillParams: {
        retryDurationBlocks: 500,
        refundAddress: '0xa56A6be23b6Cf39D9448FF6e897C29c41c8fbDFF',
        minPrice: '2458.206',
      },
    });
  });

  it('allows defining boost fee when opening a deposit channel', async () => {
    const postSpy = mockRpcResponse((url, data: any) => {
      if (data.method === 'broker_requestSwapDepositAddress') {
        return Promise.resolve({
          data: {
            id: '1',
            jsonrpc: '2.0',
            result: {
              address: '0x717e15853fd5f2ac6123e844c3a7c75976eaec9a',
              issued_block: 123,
              channel_id: 15,
              source_chain_expiry_block: '0x04d2',
              channel_opening_fee: '0x0',
            },
          },
        });
      }

      return defaultRpcMocks(url, data);
    });
    const MAX_BOOST_FEE_BPS = 100;

    const result = await new SwapSDK({
      broker: { url: 'https://chainflap.org/broker', commissionBps: 15 },
    }).requestDepositAddress({
      srcChain: 'Bitcoin',
      srcAsset: 'BTC',
      destChain: 'Ethereum',
      destAsset: 'FLIP',
      destAddress: '0x717e15853fd5f2ac6123e844c3a7c75976eaec9b',
      amount: BigInt(1e18).toString(),
      maxBoostFeeBps: MAX_BOOST_FEE_BPS,
    });

    expect(postSpy).toHaveBeenCalledWith('https://chainflap.org/broker', {
      id: '1',
      jsonrpc: '2.0',
      method: 'broker_requestSwapDepositAddress',
      params: [
        { asset: 'BTC', chain: 'Bitcoin' },
        { asset: 'FLIP', chain: 'Ethereum' },
        '0x717e15853fd5f2ac6123e844c3a7c75976eaec9b',
        15,
        null,
        MAX_BOOST_FEE_BPS,
        null,
        null,
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
      maxBoostFeeBps: MAX_BOOST_FEE_BPS,
      channelOpeningFee: 0n,
      ccmParams: undefined,
      affiliateBrokers: [],
    });
  });

  describe(SwapSDK.prototype.getRequiredBlockConfirmations, () => {
    it('should return correct value for each chain', async () => {
      expect((await sdk.getRequiredBlockConfirmations()).Ethereum).toStrictEqual(2);
      expect((await sdk.getRequiredBlockConfirmations()).Polkadot).toStrictEqual(null);
      expect((await sdk.getRequiredBlockConfirmations()).Bitcoin).toStrictEqual(3);
    });
  });

  describe(SwapSDK.prototype.getChannelOpeningFees, () => {
    it('should return correct fees', async () => {
      expect(await sdk.getChannelOpeningFees()).toEqual({
        Arbitrum: 0x0n,
        Bitcoin: 0x0n,
        Ethereum: 0x10n,
        Polkadot: 0x0n,
      });
    });
  });

  describe(SwapSDK.prototype.getBoostLiquidity, () => {
    it('returns the boost pools liquidity depth based on the cf_boost_pools_depth rpc', async () => {
      mockRpcResponse((url, data: any) => {
        if (data.method === 'cf_boost_pools_depth') {
          return Promise.resolve({
            data: boostPoolsDepth([
              {
                chain: 'Bitcoin',
                asset: 'BTC',
                tier: 10,
                available_amount: '0x186a0',
              },
            ]),
          });
        }

        return defaultRpcMocks(url, data);
      });

      const freshSdk = new SwapSDK({ network: ChainflipNetworks.sisyphos, signer });
      expect(await freshSdk.getBoostLiquidity()).toMatchSnapshot();
    });

    it('returns the boost pools liquidity depth based on the cf_boost_pools_depth rpc filtered by asset and sorted descending', async () => {
      mockRpcResponse((url, data: any) => {
        if (data.method === 'cf_boost_pools_depth') {
          return Promise.resolve({
            data: boostPoolsDepth([
              {
                chain: 'Bitcoin',
                asset: 'BTC',
                tier: 10,
                available_amount: '0x186a0',
              },
              {
                chain: 'Bitcoin',
                asset: 'BTC',
                tier: 20,
                available_amount: '0x186a0',
              },
              {
                chain: 'Ethereum',
                asset: 'ETH',
                tier: 10,
                available_amount: '0x186a0',
              },
            ]),
          });
        }

        return defaultRpcMocks(url, data);
      });

      const freshSdk = new SwapSDK({ network: ChainflipNetworks.sisyphos, signer });
      expect(
        await freshSdk.getBoostLiquidity({
          asset: 'BTC',
          chain: 'Bitcoin',
        }),
      ).toMatchSnapshot();
    });
  });
  it('returns the boost pools liquidity depth based on the cf_boost_pools_depth rpc filtered by tier', async () => {
    mockRpcResponse((url, data: any) => {
      if (data.method === 'cf_boost_pools_depth') {
        return Promise.resolve({
          data: boostPoolsDepth([
            {
              chain: 'Bitcoin',
              asset: 'BTC',
              tier: 10,
              available_amount: '0x186a0',
            },
            {
              chain: 'Ethereum',
              asset: 'ETH',
              tier: 10,
              available_amount: '0x186a0',
            },
            {
              chain: 'Ethereum',
              asset: 'ETH',
              tier: 30,
              available_amount: '0x186a0',
            },
          ]),
        });
      }

      return defaultRpcMocks(url, data);
    });

    const freshSdk = new SwapSDK({ network: ChainflipNetworks.sisyphos, signer });
    expect(
      await freshSdk.getBoostLiquidity({
        feeTierBps: 10,
      }),
    ).toMatchSnapshot();
  });
  it('returns the boost pools liquidity depth based on the cf_boost_pools_depth rpc filtered by tier & asset', async () => {
    mockRpcResponse((url, data: any) => {
      if (data.method === 'cf_boost_pools_depth') {
        return Promise.resolve({
          data: boostPoolsDepth([
            {
              chain: 'Bitcoin',
              asset: 'BTC',
              tier: 10,
              available_amount: '0x186a0',
            },
            {
              chain: 'Ethereum',
              asset: 'ETH',
              tier: 10,
              available_amount: '0x186a0',
            },
            {
              chain: 'Ethereum',
              asset: 'ETH',
              tier: 30,
              available_amount: '0x186a0',
            },
          ]),
        });
      }

      return defaultRpcMocks(url, data);
    });

    const freshSdk = new SwapSDK({ network: ChainflipNetworks.sisyphos, signer });
    expect(
      await freshSdk.getBoostLiquidity({
        feeTierBps: 10,
        asset: 'ETH',
        chain: 'Ethereum',
      }),
    ).toMatchSnapshot();
  });
});

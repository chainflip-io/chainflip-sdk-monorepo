import { VoidSigner } from 'ethers';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { Assets, Chain, ChainflipNetworks, Chains, InternalAssets } from '@/shared/enums';
import { BoostQuote, Quote } from '@/shared/schemas';
import {
  boostPoolsDepth,
  environment,
  mockRpcResponse,
  supportedAssets,
} from '@/shared/tests/fixtures';
import { approveVault, executeSwap } from '@/shared/vault';
import { SwapSDK } from '../sdk';
import { getQuote, getQuoteV2, getStatus, getStatusV2 } from '../services/ApiService';
import { QuoteRequest } from '../types';

vi.mock('@/shared/vault', () => ({
  executeSwap: vi.fn(),
  approveVault: vi.fn(),
}));

vi.mock('../services/ApiService', () => ({
  getQuote: vi.fn(),
  getQuoteV2: vi.fn(),
  getStatus: vi.fn(),
  getStatusV2: vi.fn(),
}));

vi.mock('@trpc/client', async (importOriginal) => {
  const original = (await importOriginal()) as object;
  return {
    ...original,
    createTRPCProxyClient: () => ({
      openSwapDepositChannel: {
        mutate: vi.fn(),
      },
    }),
  };
});

global.fetch = vi.fn();

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
    // @ts-expect-error - global mock
    global.fetch.mockReset();
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
      expect(await sdk.getChains('Ethereum')).toMatchSnapshot();
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
      vi.mocked(getQuote).mockResolvedValueOnce({ quote: 1234 } as any);

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
      vi.mocked(getQuote).mockResolvedValueOnce({ quote: 1234 } as any);

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

  describe(SwapSDK.prototype.getQuoteV2, () => {
    it('calls api', async () => {
      const params: QuoteRequest = {
        srcChain: 'Ethereum',
        srcAsset: 'ETH',
        destChain: 'Ethereum',
        destAsset: 'USDC',
        amount: '1',
      };
      vi.mocked(getQuoteV2).mockResolvedValueOnce({ quote: 1234 } as any);

      const result = await sdk.getQuoteV2(params);
      expect(getQuoteV2).toHaveBeenCalledWith(
        'https://chainflip-swap.staging/',
        { ...params, brokerCommissionBps: 0, dcaEnabled: false },
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
      vi.mocked(getQuoteV2).mockResolvedValueOnce({ quote: 1234 } as any);

      const result = await sdk.getQuoteV2(params);
      expect(getQuoteV2).toHaveBeenCalledWith(
        'https://chainflip-swap.staging/',
        {
          srcChain: 'Ethereum',
          srcAsset: 'ETH',
          destChain: 'Ethereum',
          destAsset: 'USDC',
          amount: '1',
          brokerCommissionBps: 130,
          dcaEnabled: false,
        },
        {},
      );
      expect(result).toEqual({ quote: 1234 });
    });
  });

  describe(SwapSDK.prototype.getStatus, () => {
    it('calls api', async () => {
      vi.mocked(getStatus).mockResolvedValueOnce({ status: 1234 } as any);

      const result = await sdk.getStatus({ id: '1234' });
      expect(getStatus).toHaveBeenCalledWith('https://chainflip-swap.staging/', { id: '1234' }, {});
      expect(result).toEqual({ status: 1234 });
    });
  });

  describe(SwapSDK.prototype.getStatusV2, () => {
    it('calls api', async () => {
      vi.mocked(getStatusV2).mockResolvedValueOnce({ status: 1234 } as any);

      const result = await sdk.getStatusV2({ id: '1234' });
      expect(getStatusV2).toHaveBeenCalledWith(
        'https://chainflip-swap.staging/',
        { id: '1234' },
        {},
      );
      expect(result).toEqual({ status: 1234 });
    });
  });

  describe(SwapSDK.prototype.executeSwap, () => {
    it('calls executeSwap', async () => {
      const params = { amount: '1', srcAsset: 'ETH', srcChain: 'Ethereum' };
      vi.mocked(executeSwap).mockResolvedValueOnce({ hash: 'hello world' } as any);

      const result = await sdk.executeSwap(params as any);
      expect(executeSwap).toHaveBeenCalledWith(params, { network: 'sisyphos', signer }, {});
      expect(result).toEqual('hello world');
    });

    it('calls executeSwap with the given signer', async () => {
      const params = { amount: '1', srcAsset: 'ETH', srcChain: 'Ethereum' };
      const otherSigner = new VoidSigner('0x1');
      vi.mocked(executeSwap).mockResolvedValueOnce({ hash: 'hello world' } as any);

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
      vi.mocked(approveVault).mockResolvedValueOnce({ hash: 'hello world' } as any);

      const result = await sdk.approveVault(params as any);
      expect(approveVault).toHaveBeenCalledWith(params, { network: 'sisyphos', signer }, {});
      expect(result).toEqual('hello world');
    });

    it('calls approveVault with given signer', async () => {
      const params = { amount: '1', srcAsset: 'ETH', srcChain: 'Ethereum' };
      const otherSigner = new VoidSigner('0x1');
      vi.mocked(approveVault).mockResolvedValueOnce({ hash: 'hello world' } as any);

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

  describe(SwapSDK.prototype.approveAndExecuteSwap, () => {
    it('approves token allowance before calling executeSwap with the given signer', async () => {
      const params = { amount: '1', srcAsset: 'FLIP', srcChain: 'Ethereum' };
      vi.mocked(executeSwap).mockResolvedValueOnce({ hash: 'hello world' } as any);
      vi.mocked(approveVault).mockResolvedValueOnce({ hash: 'hello world 2' } as any);

      const result = await sdk.approveAndExecuteSwap(params as any, {
        signer,
      });

      expect(approveVault).toHaveBeenCalledWith(params, { network: 'sisyphos', signer }, {});
      expect(executeSwap).toHaveBeenCalledWith(params, { network: 'sisyphos', signer }, {});
      expect(result).toEqual({
        swapTxRef: 'hello world',
        approveTxRef: 'hello world 2',
      });
    });
  });

  describe(SwapSDK.prototype.requestDepositAddress, () => {
    it('calls openSwapDepositChannel with refund parameters', async () => {
      // @ts-expect-error - private method
      const rpcSpy = vi.spyOn(sdk.trpc.openSwapDepositChannel, 'mutate').mockResolvedValueOnce({
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
        affiliateBrokers: [],
        fillOrKillParams: {
          retryDurationBlocks: 500,
          refundAddress: '0xa56A6be23b6Cf39D9448FF6e897C29c41c8fbDFF',
          minPrice: '10000000000000',
        },
      });
    });

    it('calls openSwapDepositChannel with dca and refund parameters', async () => {
      // @ts-expect-error - private method
      const rpcSpy = vi.spyOn(sdk.trpc.openSwapDepositChannel, 'mutate').mockResolvedValueOnce({
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
        dcaParams: {
          numberOfChunks: 100,
          chunkIntervalBlocks: 5,
        },
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
        dcaParams: {
          numberOfChunks: 100,
          chunkIntervalBlocks: 5,
        },
        fillOrKillParams: {
          minPrice: '10000000000000',
          minPriceX128: '34028236692093846346337460743176821145600000000000000000000000',
          refundAddress: '0xa56A6be23b6Cf39D9448FF6e897C29c41c8fbDFF',
          retryDurationBlocks: 500,
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
        affiliateBrokers: [],
        dcaParams: {
          numberOfChunks: 100,
          chunkIntervalBlocks: 5,
        },
        fillOrKillParams: {
          minPrice: '10000000000000',
          refundAddress: '0xa56A6be23b6Cf39D9448FF6e897C29c41c8fbDFF',
          retryDurationBlocks: 500,
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

      expect(postSpy).toHaveBeenCalledWith('https://chainflap.org/broker', [
        {
          id: expect.any(String),
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
            null,
          ],
        },
      ]);
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

      expect(postSpy).toHaveBeenCalledWith('https://chainflap.org/broker', [
        {
          id: expect.any(String),
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
            null,
          ],
        },
      ]);
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

      expect(postSpy).toHaveBeenCalledWith('https://chainflap.org/broker', [
        {
          id: expect.any(String),
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
            null,
          ],
        },
      ]);
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
        affiliateBrokers: [
          { account: 'cFHyJEHEQ1YkT9xuFnxnPWVkihpYEGjBg4WbF6vCPtSPQoE8n', commissionBps: 10 },
        ],
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

      expect(postSpy).toHaveBeenCalledWith('https://chainflap.org/broker', [
        {
          id: expect.any(String),
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
            null,
          ],
        },
      ]);
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
        affiliateBrokers: [],
        fillOrKillParams: {
          retryDurationBlocks: 500,
          refundAddress: '0xa56A6be23b6Cf39D9448FF6e897C29c41c8fbDFF',
          minPrice: '2458.206',
        },
      });
    });

    it('calls the configured broker api with the given dca parameters', async () => {
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
        dcaParams: {
          numberOfChunks: 100,
          chunkIntervalBlocks: 5,
        },
        fillOrKillParams: {
          retryDurationBlocks: 500,
          refundAddress: '0xa56A6be23b6Cf39D9448FF6e897C29c41c8fbDFF',
          minPrice: '10000000000000',
        },
      });

      expect(postSpy).toHaveBeenCalledWith('https://chainflap.org/broker', [
        {
          id: expect.any(String),
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
              min_price: '0x152d02c7e14af680000000000000000000000000000000000000',
              refund_address: '0xa56A6be23b6Cf39D9448FF6e897C29c41c8fbDFF',
              retry_duration: 500,
            },
            {
              number_of_chunks: 100,
              chunk_interval: 5,
            },
          ],
        },
      ]);
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
        fillOrKillParams: {
          minPrice: '10000000000000',
          refundAddress: '0xa56A6be23b6Cf39D9448FF6e897C29c41c8fbDFF',
          retryDurationBlocks: 500,
        },
        maxBoostFeeBps: 0,
        channelOpeningFee: 0n,
        affiliateBrokers: [],
        dcaParams: {
          numberOfChunks: 100,
          chunkIntervalBlocks: 5,
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

      expect(postSpy).toHaveBeenCalledWith('https://chainflap.org/broker', [
        {
          id: expect.any(String),
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
            null,
          ],
        },
      ]);
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
        affiliateBrokers: [],
      });
    });
  });

  describe(SwapSDK.prototype.requestDepositAddressV2, () => {
    it('calls openSwapDepositChannel with refund parameters', async () => {
      // @ts-expect-error - private method
      const rpcSpy = vi.spyOn(sdk.trpc.openSwapDepositChannel, 'mutate').mockResolvedValueOnce({
        id: 'channel id',
        depositAddress: 'deposit address',
        brokerCommissionBps: 0,
        srcChainExpiryBlock: 123n,
        estimatedExpiryTime: 1698334470000,
        channelOpeningFee: 0n,
        issuedBlock: 1,
        maxBoostFeeBps: 0,
      });

      const quote = {
        srcAsset: { asset: Assets.BTC, chain: Chains.Bitcoin },
        destAsset: { asset: Assets.FLIP, chain: Chains.Ethereum },
        depositAmount: BigInt(1e18).toString(),
        type: 'REGULAR',
      } as Quote;
      const response = await sdk.requestDepositAddressV2({
        quote,
        destAddress: '0xcafebabe',
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
        srcAddress: undefined,
        destAddress: '0xcafebabe',
        dcaParams: undefined,
        amount: BigInt(1e18).toString(),
        maxBoostFeeBps: undefined,
        fillOrKillParams: {
          retryDurationBlocks: 500,
          refundAddress: '0xa56A6be23b6Cf39D9448FF6e897C29c41c8fbDFF',
          minPriceX128: '34028236692093846346337460743176821145600000000000000000000000',
        },
        quote,
      });
      expect(response).toStrictEqual({
        depositChannelId: 'channel id',
        depositAddress: 'deposit address',
        brokerCommissionBps: 0,
        ccmParams: undefined,
        depositChannelExpiryBlock: 123n,
        estimatedDepositChannelExpiryTime: 1698334470000,
        amount: '1000000000000000000',
        srcAddress: undefined,
        destAddress: '0xcafebabe',
        destAsset: 'FLIP',
        destChain: 'Ethereum',
        srcAsset: 'BTC',
        srcChain: 'Bitcoin',
        maxBoostFeeBps: 0,
        channelOpeningFee: 0n,
        dcaParams: undefined,
        affiliateBrokers: [],
        fillOrKillParams: {
          retryDurationBlocks: 500,
          refundAddress: '0xa56A6be23b6Cf39D9448FF6e897C29c41c8fbDFF',
          minPrice: '10000000000000',
        },
      });
    });

    it('calls openSwapDepositChannel with refund parameters', async () => {
      // @ts-expect-error - private method
      const rpcSpy = vi.spyOn(sdk.trpc.openSwapDepositChannel, 'mutate').mockResolvedValueOnce({
        id: 'channel id',
        depositAddress: 'deposit address',
        brokerCommissionBps: 0,
        srcChainExpiryBlock: 123n,
        estimatedExpiryTime: 1698334470000,
        channelOpeningFee: 0n,
        issuedBlock: 1,
        maxBoostFeeBps: 0,
      });

      const quote = {
        srcAsset: { asset: Assets.BTC, chain: Chains.Bitcoin },
        destAsset: { asset: Assets.FLIP, chain: Chains.Ethereum },
        depositAmount: BigInt(1e18).toString(),
        type: 'REGULAR',
        estimatedPrice: '10000000000000',
      } as Quote;
      const response = await sdk.requestDepositAddressV2({
        quote,
        destAddress: '0xcafebabe',
        fillOrKillParams: {
          retryDurationBlocks: 500,
          refundAddress: '0xa56A6be23b6Cf39D9448FF6e897C29c41c8fbDFF',
          slippageTolerancePercent: '0',
        },
      });
      expect(rpcSpy).toHaveBeenLastCalledWith({
        srcChain: Chains.Bitcoin,
        srcAsset: Assets.BTC,
        destChain: Chains.Ethereum,
        destAsset: Assets.FLIP,
        srcAddress: undefined,
        destAddress: '0xcafebabe',
        dcaParams: undefined,
        amount: BigInt(1e18).toString(),
        maxBoostFeeBps: undefined,
        fillOrKillParams: {
          retryDurationBlocks: 500,
          refundAddress: '0xa56A6be23b6Cf39D9448FF6e897C29c41c8fbDFF',
          minPriceX128: '34028236692093846346337460743176821145600000000000000000000000',
        },
        quote,
      });
      expect(response).toStrictEqual({
        depositChannelId: 'channel id',
        depositAddress: 'deposit address',
        brokerCommissionBps: 0,
        ccmParams: undefined,
        depositChannelExpiryBlock: 123n,
        estimatedDepositChannelExpiryTime: 1698334470000,
        amount: '1000000000000000000',
        srcAddress: undefined,
        destAddress: '0xcafebabe',
        destAsset: 'FLIP',
        destChain: 'Ethereum',
        srcAsset: 'BTC',
        srcChain: 'Bitcoin',
        maxBoostFeeBps: 0,
        channelOpeningFee: 0n,
        dcaParams: undefined,
        affiliateBrokers: [],
        fillOrKillParams: {
          retryDurationBlocks: 500,
          refundAddress: '0xa56A6be23b6Cf39D9448FF6e897C29c41c8fbDFF',
          slippageTolerancePercent: '0',
        },
      });
    });

    it('calls openSwapDepositChannel with dca parameters', async () => {
      // @ts-expect-error - private method
      const rpcSpy = vi.spyOn(sdk.trpc.openSwapDepositChannel, 'mutate').mockResolvedValueOnce({
        id: 'channel id',
        depositAddress: 'deposit address',
        brokerCommissionBps: 0,
        srcChainExpiryBlock: 123n,
        estimatedExpiryTime: 1698334470000,
        channelOpeningFee: 0n,
        issuedBlock: 1,
        maxBoostFeeBps: 0,
      });

      const quote = {
        srcAsset: { asset: Assets.BTC, chain: Chains.Bitcoin },
        destAsset: { asset: Assets.FLIP, chain: Chains.Ethereum },
        depositAmount: BigInt(1e18).toString(),
        dcaParams: {
          numberOfChunks: 100,
          chunkIntervalBlocks: 5,
        },
        type: 'DCA',
      } as Quote;
      const response = await sdk.requestDepositAddressV2({
        quote,
        destAddress: '0xcafebabe',
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
        srcAddress: undefined,
        destAddress: '0xcafebabe',
        amount: BigInt(1e18).toString(),
        dcaParams: {
          numberOfChunks: 100,
          chunkIntervalBlocks: 5,
        },
        maxBoostFeeBps: undefined,
        fillOrKillParams: {
          retryDurationBlocks: 500,
          refundAddress: '0xa56A6be23b6Cf39D9448FF6e897C29c41c8fbDFF',
          minPriceX128: '34028236692093846346337460743176821145600000000000000000000000',
        },
        quote,
      });
      expect(response).toStrictEqual({
        depositChannelId: 'channel id',
        depositAddress: 'deposit address',
        brokerCommissionBps: 0,
        ccmParams: undefined,
        depositChannelExpiryBlock: 123n,
        estimatedDepositChannelExpiryTime: 1698334470000,
        amount: '1000000000000000000',
        srcAddress: undefined,
        destAddress: '0xcafebabe',
        destAsset: 'FLIP',
        destChain: 'Ethereum',
        srcAsset: 'BTC',
        srcChain: 'Bitcoin',
        maxBoostFeeBps: 0,
        channelOpeningFee: 0n,
        affiliateBrokers: [],
        dcaParams: {
          numberOfChunks: 100,
          chunkIntervalBlocks: 5,
        },
        fillOrKillParams: {
          minPrice: '10000000000000',
          refundAddress: '0xa56A6be23b6Cf39D9448FF6e897C29c41c8fbDFF',
          retryDurationBlocks: 500,
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
      }).requestDepositAddressV2({
        quote: {
          srcAsset: { asset: Assets.BTC, chain: Chains.Bitcoin },
          destAsset: { asset: Assets.FLIP, chain: Chains.Ethereum },
          depositAmount: BigInt(1e18).toString(),
          type: 'REGULAR',
        } as Quote,
        srcAddress: 'mrV3ee4J3jipspCNPofzB2UbaVu7qgf9Ex',
        destAddress: '0x717e15853fd5f2ac6123e844c3a7c75976eaec9b',
      });

      expect(postSpy).toHaveBeenCalledWith('https://chainflap.org/broker', [
        {
          id: expect.any(String),
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
            null,
          ],
        },
      ]);
      expect(result).toStrictEqual({
        srcChain: 'Bitcoin',
        srcAsset: 'BTC',
        destChain: 'Ethereum',
        destAsset: 'FLIP',
        srcAddress: 'mrV3ee4J3jipspCNPofzB2UbaVu7qgf9Ex',
        destAddress: '0x717e15853fd5f2ac6123e844c3a7c75976eaec9b',
        brokerCommissionBps: 15,
        ccmParams: undefined,
        amount: '1000000000000000000',
        depositChannelId: '123-Bitcoin-15',
        depositAddress: '0x717e15853fd5f2ac6123e844c3a7c75976eaec9a',
        depositChannelExpiryBlock: 1234n,
        estimatedDepositChannelExpiryTime: undefined,
        maxBoostFeeBps: 0,
        channelOpeningFee: 0n,
        affiliateBrokers: [],
        dcaParams: undefined,
        fillOrKillParams: undefined,
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
      }).requestDepositAddressV2({
        quote: {
          srcAsset: { asset: Assets.BTC, chain: Chains.Bitcoin },
          destAsset: { asset: Assets.FLIP, chain: Chains.Ethereum },
          depositAmount: BigInt(1e18).toString(),
          type: 'REGULAR',
        } as Quote,
        destAddress: '0x717e15853fd5f2ac6123e844c3a7c75976eaec9b',
        brokerCommissionBps: 125,
      });

      expect(postSpy).toHaveBeenCalledWith('https://chainflap.org/broker', [
        {
          id: expect.any(String),
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
            null,
          ],
        },
      ]);
      expect(result).toStrictEqual({
        srcChain: 'Bitcoin',
        srcAsset: 'BTC',
        destChain: 'Ethereum',
        destAsset: 'FLIP',
        srcAddress: undefined,
        destAddress: '0x717e15853fd5f2ac6123e844c3a7c75976eaec9b',
        brokerCommissionBps: 15,
        ccmParams: undefined,
        amount: '1000000000000000000',
        depositChannelId: '123-Bitcoin-15',
        depositAddress: '0x717e15853fd5f2ac6123e844c3a7c75976eaec9a',
        depositChannelExpiryBlock: 1234n,
        estimatedDepositChannelExpiryTime: undefined,
        maxBoostFeeBps: 0,
        channelOpeningFee: 0n,
        affiliateBrokers: [],
        dcaParams: undefined,
        fillOrKillParams: undefined,
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
      }).requestDepositAddressV2({
        quote: {
          srcAsset: { asset: Assets.BTC, chain: Chains.Bitcoin },
          destAsset: { asset: Assets.FLIP, chain: Chains.Ethereum },
          depositAmount: BigInt(1e18).toString(),
          type: 'REGULAR',
        } as Quote,
        destAddress: '0x717e15853fd5f2ac6123e844c3a7c75976eaec9b',
        affiliateBrokers: [
          { account: 'cFHyJEHEQ1YkT9xuFnxnPWVkihpYEGjBg4WbF6vCPtSPQoE8n', commissionBps: 10 },
        ],
      });

      expect(postSpy).toHaveBeenCalledWith('https://chainflap.org/broker', [
        {
          id: expect.any(String),
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
            null,
          ],
        },
      ]);
      expect(result).toStrictEqual({
        srcChain: 'Bitcoin',
        srcAsset: 'BTC',
        destChain: 'Ethereum',
        destAsset: 'FLIP',
        srcAddress: undefined,
        destAddress: '0x717e15853fd5f2ac6123e844c3a7c75976eaec9b',
        brokerCommissionBps: 15,
        ccmParams: undefined,
        amount: '1000000000000000000',
        depositChannelId: '123-Bitcoin-15',
        depositAddress: '0x717e15853fd5f2ac6123e844c3a7c75976eaec9a',
        depositChannelExpiryBlock: 1234n,
        estimatedDepositChannelExpiryTime: undefined,
        maxBoostFeeBps: 0,
        channelOpeningFee: 0n,
        affiliateBrokers: [
          { account: 'cFHyJEHEQ1YkT9xuFnxnPWVkihpYEGjBg4WbF6vCPtSPQoE8n', commissionBps: 10 },
        ],
        dcaParams: undefined,
        fillOrKillParams: undefined,
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
      }).requestDepositAddressV2({
        quote: {
          srcAsset: { asset: Assets.BTC, chain: Chains.Bitcoin },
          destAsset: { asset: Assets.FLIP, chain: Chains.Ethereum },
          depositAmount: BigInt(1e18).toString(),
          type: 'REGULAR',
        } as Quote,
        destAddress: '0x717e15853fd5f2ac6123e844c3a7c75976eaec9b',
        fillOrKillParams: {
          retryDurationBlocks: 500,
          refundAddress: '0xa56A6be23b6Cf39D9448FF6e897C29c41c8fbDFF',
          minPrice: '2458.206',
        },
      });

      expect(postSpy).toHaveBeenCalledWith('https://chainflap.org/broker', [
        {
          id: expect.any(String),
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
            null,
          ],
        },
      ]);
      expect(result).toStrictEqual({
        srcChain: 'Bitcoin',
        srcAsset: 'BTC',
        destChain: 'Ethereum',
        destAsset: 'FLIP',
        srcAddress: undefined,
        destAddress: '0x717e15853fd5f2ac6123e844c3a7c75976eaec9b',
        brokerCommissionBps: 15,
        ccmParams: undefined,
        amount: '1000000000000000000',
        depositChannelId: '123-Bitcoin-15',
        depositAddress: '0x717e15853fd5f2ac6123e844c3a7c75976eaec9a',
        depositChannelExpiryBlock: 1234n,
        estimatedDepositChannelExpiryTime: undefined,
        maxBoostFeeBps: 0,
        channelOpeningFee: 0n,
        affiliateBrokers: [],
        fillOrKillParams: {
          retryDurationBlocks: 500,
          refundAddress: '0xa56A6be23b6Cf39D9448FF6e897C29c41c8fbDFF',
          minPrice: '2458.206',
        },
        dcaParams: undefined,
      });
    });

    it('calls the configured broker api with the given dca parameters', async () => {
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
      }).requestDepositAddressV2({
        quote: {
          srcAsset: { asset: Assets.BTC, chain: Chains.Bitcoin },
          destAsset: { asset: Assets.FLIP, chain: Chains.Ethereum },
          depositAmount: BigInt(1e18).toString(),
          dcaParams: {
            numberOfChunks: 100,
            chunkIntervalBlocks: 5,
          },
          type: 'DCA',
        } as Quote,
        destAddress: '0x717e15853fd5f2ac6123e844c3a7c75976eaec9b',
        fillOrKillParams: {
          retryDurationBlocks: 500,
          refundAddress: '0xa56A6be23b6Cf39D9448FF6e897C29c41c8fbDFF',
          minPrice: '10000000000000',
        },
      });

      expect(postSpy).toHaveBeenCalledWith('https://chainflap.org/broker', [
        {
          id: expect.any(String),
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
              min_price: '0x152d02c7e14af680000000000000000000000000000000000000',
              refund_address: '0xa56A6be23b6Cf39D9448FF6e897C29c41c8fbDFF',
              retry_duration: 500,
            },
            {
              number_of_chunks: 100,
              chunk_interval: 5,
            },
          ],
        },
      ]);
      expect(result).toStrictEqual({
        srcChain: 'Bitcoin',
        srcAsset: 'BTC',
        destChain: 'Ethereum',
        destAsset: 'FLIP',
        srcAddress: undefined,
        destAddress: '0x717e15853fd5f2ac6123e844c3a7c75976eaec9b',
        brokerCommissionBps: 15,
        ccmParams: undefined,
        amount: '1000000000000000000',
        depositChannelId: '123-Bitcoin-15',
        depositAddress: '0x717e15853fd5f2ac6123e844c3a7c75976eaec9a',
        depositChannelExpiryBlock: 1234n,
        estimatedDepositChannelExpiryTime: undefined,
        fillOrKillParams: {
          minPrice: '10000000000000',
          refundAddress: '0xa56A6be23b6Cf39D9448FF6e897C29c41c8fbDFF',
          retryDurationBlocks: 500,
        },
        maxBoostFeeBps: 0,
        channelOpeningFee: 0n,
        affiliateBrokers: [],
        dcaParams: {
          numberOfChunks: 100,
          chunkIntervalBlocks: 5,
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
      }).requestDepositAddressV2({
        quote: {
          srcAsset: { asset: Assets.BTC, chain: Chains.Bitcoin },
          destAsset: { asset: Assets.FLIP, chain: Chains.Ethereum },
          depositAmount: BigInt(1e18).toString(),
          maxBoostFeeBps: MAX_BOOST_FEE_BPS,
          type: 'REGULAR',
        } as BoostQuote,
        destAddress: '0x717e15853fd5f2ac6123e844c3a7c75976eaec9b',
      });

      expect(postSpy).toHaveBeenCalledWith('https://chainflap.org/broker', [
        {
          id: expect.any(String),
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
            null,
          ],
        },
      ]);
      expect(result).toStrictEqual({
        srcChain: 'Bitcoin',
        srcAsset: 'BTC',
        destChain: 'Ethereum',
        destAsset: 'FLIP',
        srcAddress: undefined,
        destAddress: '0x717e15853fd5f2ac6123e844c3a7c75976eaec9b',
        brokerCommissionBps: 15,
        ccmParams: undefined,
        amount: '1000000000000000000',
        depositChannelId: '123-Bitcoin-15',
        depositAddress: '0x717e15853fd5f2ac6123e844c3a7c75976eaec9a',
        depositChannelExpiryBlock: 1234n,
        estimatedDepositChannelExpiryTime: undefined,
        maxBoostFeeBps: MAX_BOOST_FEE_BPS,
        channelOpeningFee: 0n,
        affiliateBrokers: [],
        dcaParams: undefined,
        fillOrKillParams: undefined,
      });
    });

    it("throws for quotes that aren't DCA or REGULAR", async () => {
      await expect(
        new SwapSDK({
          broker: { url: 'https://chainflap.org/broker', commissionBps: 15 },
        }).requestDepositAddressV2({
          quote: {
            srcAsset: { asset: Assets.BTC, chain: Chains.Bitcoin },
            destAsset: { asset: Assets.FLIP, chain: Chains.Ethereum },
            depositAmount: BigInt(1e18).toString(),
            dcaParams: {
              numberOfChunks: 100,
              chunkIntervalBlocks: 5,
            },
          } as Quote,
          destAddress: '0x717e15853fd5f2ac6123e844c3a7c75976eaec9b',
        }),
      ).rejects.toThrow('Invalid quote type');
    });

    it('throws for missing DCA params', async () => {
      await expect(
        new SwapSDK({
          broker: { url: 'https://chainflap.org/broker', commissionBps: 15 },
        }).requestDepositAddressV2({
          quote: {
            srcAsset: { asset: Assets.BTC, chain: Chains.Bitcoin },
            destAsset: { asset: Assets.FLIP, chain: Chains.Ethereum },
            depositAmount: BigInt(1e18).toString(),
            type: 'DCA',
          } as Quote,
          destAddress: '0x717e15853fd5f2ac6123e844c3a7c75976eaec9b',
        }),
      ).rejects.toThrow('Failed to find DCA parameters from quote');
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
    it('returns the correct fees', async () => {
      expect(await sdk.getChannelOpeningFees()).toEqual({
        Arbitrum: 0x0n,
        Bitcoin: 0x0n,
        Ethereum: 0x10n,
        Polkadot: 0x0n,
        Solana: 0x0n,
      });
    });
  });

  describe(SwapSDK.prototype.getBoostLiquidity, () => {
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
});

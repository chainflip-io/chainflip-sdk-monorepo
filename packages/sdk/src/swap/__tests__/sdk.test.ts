/* eslint-disable dot-notation */
import { chainflipAssets, ChainflipChain, chainflipNetworks } from '@chainflip/utils/chainflip';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { BoostQuote, Quote } from '@/shared/schemas.js';
import { boostPoolsDepth, environment, mockRpcResponse } from '@/shared/tests/fixtures.js';
import { SwapSDK } from '../sdk.js';
import { getQuoteV2, getStatusV2 } from '../services/ApiService.js';
import { QuoteRequest } from '../types.js';

vi.mock('../services/ApiService', () => ({
  getQuoteV2: vi.fn(),
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
      encodeVaultSwapData: {
        mutate: vi.fn(),
      },
      networkStatus: {
        query: vi.fn(() =>
          Promise.resolve({
            assets: {
              all: chainflipAssets,
              deposit: chainflipAssets,
              destination: chainflipAssets,
            },
            boostDepositsEnabled: true,
          }),
        ),
      },
    }),
  };
});

global.fetch = vi.fn();

const mockNetworkStatus = (boostDepositsEnabled = true, cfBrokerCommissionBps = 0) => {
  const sdk = new SwapSDK({ network: 'sisyphos' });
  vi.mocked(sdk['trpc'].networkStatus.query).mockResolvedValueOnce({
    assets: {
      all: ['Eth', 'Btc', 'Flip', 'Usdc', 'Sol', 'SolUsdc'],
      deposit: ['Eth', 'Flip', 'Usdc', 'Sol', 'SolUsdc'],
      destination: ['Eth', 'Btc', 'Flip', 'Usdc'],
    },
    boostDepositsEnabled,
    cfBrokerCommissionBps,
  });
  return sdk;
};

describe(SwapSDK, () => {
  let sdk: SwapSDK;

  const defaultRpcMocks = (url: string, data: any) => {
    if (data.method === 'cf_environment') {
      return Promise.resolve({
        data: environment({ maxSwapAmount: '0x1000000000000000' }),
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
    sdk = new SwapSDK({ network: 'sisyphos' });
    vi.resetAllMocks();
    vi.mocked(sdk['trpc'].networkStatus.query).mockResolvedValueOnce({
      assets: {
        all: [...chainflipAssets],
        deposit: [...chainflipAssets],
        destination: [...chainflipAssets],
      },
      boostDepositsEnabled: true,
      cfBrokerCommissionBps: 0,
    });
    mockRpcResponse(defaultRpcMocks);
  });

  describe(SwapSDK.prototype.getChains, () => {
    it('returns the chains based on the supportedAsset tRPC endpoint', async () => {
      sdk = mockNetworkStatus();
      expect(await sdk.getChains()).toMatchSnapshot();
    });

    it('returns the deposit chains based on the supportedAsset tRPC endpoint', async () => {
      sdk = mockNetworkStatus();
      expect(await sdk.getChains(undefined, 'deposit')).toMatchSnapshot();
    });

    it('returns the destination chains based on the supportedAsset tRPC endpoint', async () => {
      sdk = mockNetworkStatus();
      expect(await sdk.getChains(undefined, 'destination')).toMatchSnapshot();
    });

    it('returns all filtered destination chains for the chain', async () => {
      sdk = mockNetworkStatus();
      expect(await sdk.getChains('Ethereum', 'all')).toMatchSnapshot();
    });

    it('returns filtered destination destination chains for the chain', async () => {
      sdk = mockNetworkStatus();
      expect(await sdk.getChains('Ethereum', 'destination')).toMatchSnapshot();
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
      await expect(sdk.getChains('Dogecoin' as ChainflipChain)).rejects.toMatchSnapshot();
    });

    it.each(chainflipNetworks)('returns the correct values for %s', async (network) => {
      const networkSdk = new SwapSDK({ network });
      expect(await networkSdk.getChains()).toMatchSnapshot();
    });
  });

  describe(SwapSDK.prototype.getAssets, () => {
    it('returns the assets based on the networkStatus tRPC method', async () => {
      sdk = mockNetworkStatus();
      expect(await sdk.getAssets()).toMatchSnapshot();
    });

    it('returns the deposit assets based on the networkStatus tRPC method', async () => {
      sdk = mockNetworkStatus();
      expect(await sdk.getAssets(undefined, 'deposit')).toMatchSnapshot();
    });

    it('returns the destination assets based on the networkStatus tRPC method', async () => {
      sdk = mockNetworkStatus();
      expect(await sdk.getAssets(undefined, 'destination')).toMatchSnapshot();
    });

    it('returns the filtered assets for the chain', async () => {
      sdk = mockNetworkStatus();
      expect(await sdk.getAssets('Bitcoin')).toMatchSnapshot();
    });

    it('returns the filtered deposit assets for the chain', async () => {
      sdk = mockNetworkStatus();
      expect(await sdk.getAssets('Bitcoin', 'deposit')).toEqual([]);
    });

    it('returns the filtered destination assets for the chain', async () => {
      sdk = mockNetworkStatus();
      expect(await sdk.getAssets('Bitcoin', 'destination')).toMatchSnapshot();
    });

    it('returns empty array if no assets are available', async () => {
      sdk = mockNetworkStatus();
      expect(await sdk.getAssets('Solana', 'destination')).toEqual([]);
    });

    it('throws when requesting an unsupported chain', async () => {
      await expect(sdk.getChains('Dogecoin' as ChainflipChain)).rejects.toMatchSnapshot();
    });

    it.each(chainflipNetworks)('returns the correct values for %s', async (network) => {
      const networkSdk = new SwapSDK({ network });
      expect(await networkSdk.getAssets()).toMatchSnapshot();
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
        isVaultSwap: true,
      };
      vi.mocked(getQuoteV2).mockResolvedValueOnce([{ quote: 1234 }] as any);

      const result = await sdk.getQuoteV2(params);
      expect(getQuoteV2).toHaveBeenCalledWith(
        'https://chainflip-swap.staging/',
        { ...params, brokerCommissionBps: 0, dcaEnabled: false },
        {},
      );
      expect(result).toStrictEqual([{ quote: 1234 }]);
    });

    it('calls api with commission', async () => {
      sdk = mockNetworkStatus(true, 15);
      const params: QuoteRequest = {
        srcChain: 'Ethereum',
        srcAsset: 'ETH',
        destChain: 'Ethereum',
        destAsset: 'USDC',
        amount: '1',
        isVaultSwap: true,
      };
      vi.mocked(getQuoteV2).mockResolvedValueOnce([{ quote: 1234 }] as any);

      const result = await sdk.getQuoteV2(params);
      expect(getQuoteV2).toHaveBeenCalledWith(
        'https://chainflip-swap.staging/',
        { ...params, brokerCommissionBps: 15, dcaEnabled: false },
        {},
      );
      expect(result).toStrictEqual([{ quote: 1234 }]);
    });

    it('calls api with broker commission', async () => {
      sdk = new SwapSDK({ broker: { url: 'https://other.broker' }, network: 'sisyphos' });
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
      vi.mocked(getQuoteV2).mockResolvedValueOnce([{ quote: 1234 }] as any);

      const result = await sdk.getQuoteV2(params);
      expect(getQuoteV2).toHaveBeenCalledWith(
        'https://chainflip-swap.staging/',
        {
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
          dcaEnabled: false,
        },
        {},
      );
      expect(result).toStrictEqual([{ quote: 1234 }]);
    });

    it('calls api with ccm params', async () => {
      const params: QuoteRequest = {
        srcChain: 'Ethereum',
        srcAsset: 'ETH',
        destChain: 'Ethereum',
        destAsset: 'USDC',
        amount: '1',
        ccmParams: {
          gasBudget: '12345',
          messageLengthBytes: 100,
        },
      };
      vi.mocked(getQuoteV2).mockResolvedValueOnce([{ quote: 1234 }] as any);

      const result = await sdk.getQuoteV2(params);
      expect(getQuoteV2).toHaveBeenCalledWith(
        'https://chainflip-swap.staging/',
        {
          srcChain: 'Ethereum',
          srcAsset: 'ETH',
          destChain: 'Ethereum',
          destAsset: 'USDC',
          amount: '1',
          brokerCommissionBps: 0,
          ccmParams: {
            gasBudget: '12345',
            messageLengthBytes: 100,
          },
          dcaEnabled: false,
        },
        {},
      );
      expect(result).toStrictEqual([{ quote: 1234 }]);
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
      expect(result).toStrictEqual({ status: 1234 });
    });
  });

  describe(SwapSDK.prototype.requestDepositAddressV2, () => {
    it('calls openSwapDepositChannel with refund parameters', async () => {
      const rpcSpy = vi.spyOn(sdk['trpc'].openSwapDepositChannel, 'mutate').mockResolvedValueOnce({
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
        srcAsset: { asset: 'BTC', chain: 'Bitcoin' },
        destAsset: { asset: 'FLIP', chain: 'Ethereum' },
        depositAmount: BigInt(1e18).toString(),
        type: 'REGULAR',
        isVaultSwap: false,
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
        srcChain: 'Bitcoin',
        srcAsset: 'BTC',
        destChain: 'Ethereum',
        destAsset: 'FLIP',
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

    it('calls openSwapDepositChannel with dca parameters', async () => {
      const rpcSpy = vi.spyOn(sdk['trpc'].openSwapDepositChannel, 'mutate').mockResolvedValueOnce({
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
        srcAsset: { asset: 'BTC', chain: 'Bitcoin' },
        destAsset: { asset: 'FLIP', chain: 'Ethereum' },
        depositAmount: BigInt(1e18).toString(),
        dcaParams: {
          numberOfChunks: 100,
          chunkIntervalBlocks: 5,
        },
        type: 'DCA',
        isVaultSwap: false,
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
        srcChain: 'Bitcoin',
        srcAsset: 'BTC',
        destChain: 'Ethereum',
        destAsset: 'FLIP',
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
        if (data.method === 'broker_request_swap_deposit_address') {
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
          srcAsset: { asset: 'BTC', chain: 'Bitcoin' },
          destAsset: { asset: 'FLIP', chain: 'Ethereum' },
          depositAmount: BigInt(1e18).toString(),
          type: 'REGULAR',
          isVaultSwap: false,
        } as Quote,
        srcAddress: 'mrV3ee4J3jipspCNPofzB2UbaVu7qgf9Ex',
        destAddress: '0x717e15853fd5f2ac6123e844c3a7c75976eaec9b',
        fillOrKillParams: {
          minPrice: '10000000000000',
          refundAddress: 'tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx',
          retryDurationBlocks: 500,
        },
      });

      expect(postSpy).toHaveBeenCalledWith('https://chainflap.org/broker', [
        {
          id: expect.any(String),
          jsonrpc: '2.0',
          method: 'broker_request_swap_deposit_address',
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
              refund_address: 'tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx',
              retry_duration: 500,
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
        srcAddress: 'mrV3ee4J3jipspCNPofzB2UbaVu7qgf9Ex',
        destAddress: '0x717e15853fd5f2ac6123e844c3a7c75976eaec9b',
        fillOrKillParams: {
          minPrice: '10000000000000',
          refundAddress: 'tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx',
          retryDurationBlocks: 500,
        },
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
      });
    });

    it('calls the configured broker api with the given broker commission', async () => {
      const postSpy = mockRpcResponse((url, data: any) => {
        if (data.method === 'broker_request_swap_deposit_address') {
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
          srcAsset: { asset: 'BTC', chain: 'Bitcoin' },
          destAsset: { asset: 'FLIP', chain: 'Ethereum' },
          depositAmount: BigInt(1e18).toString(),
          type: 'REGULAR',
          isVaultSwap: false,
        } as Quote,
        destAddress: '0x717e15853fd5f2ac6123e844c3a7c75976eaec9b',
        fillOrKillParams: {
          minPrice: '10000000000000',
          refundAddress: 'tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx',
          retryDurationBlocks: 500,
        },
        brokerCommissionBps: 125,
      });

      expect(postSpy).toHaveBeenCalledWith('https://chainflap.org/broker', [
        {
          id: expect.any(String),
          jsonrpc: '2.0',
          method: 'broker_request_swap_deposit_address',
          params: [
            { asset: 'BTC', chain: 'Bitcoin' },
            { asset: 'FLIP', chain: 'Ethereum' },
            '0x717e15853fd5f2ac6123e844c3a7c75976eaec9b',
            125,
            null,
            null,
            null,
            {
              min_price: '0x152d02c7e14af680000000000000000000000000000000000000',
              refund_address: 'tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx',
              retry_duration: 500,
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
        fillOrKillParams: {
          minPrice: '10000000000000',
          refundAddress: 'tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx',
          retryDurationBlocks: 500,
        },
        brokerCommissionBps: 125,
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
      });
    });

    it('calls the configured broker api with the given affiliate brokers', async () => {
      const postSpy = mockRpcResponse((url, data: any) => {
        if (data.method === 'broker_request_swap_deposit_address') {
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
          srcAsset: { asset: 'BTC', chain: 'Bitcoin' },
          destAsset: { asset: 'FLIP', chain: 'Ethereum' },
          depositAmount: BigInt(1e18).toString(),
          type: 'REGULAR',
          isVaultSwap: false,
        } as Quote,
        destAddress: '0x717e15853fd5f2ac6123e844c3a7c75976eaec9b',
        fillOrKillParams: {
          minPrice: '10000000000000',
          refundAddress: 'tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx',
          retryDurationBlocks: 500,
        },
        affiliateBrokers: [
          { account: 'cFHyJEHEQ1YkT9xuFnxnPWVkihpYEGjBg4WbF6vCPtSPQoE8n', commissionBps: 10 },
        ],
      });

      expect(postSpy).toHaveBeenCalledWith('https://chainflap.org/broker', [
        {
          id: expect.any(String),
          jsonrpc: '2.0',
          method: 'broker_request_swap_deposit_address',
          params: [
            { asset: 'BTC', chain: 'Bitcoin' },
            { asset: 'FLIP', chain: 'Ethereum' },
            '0x717e15853fd5f2ac6123e844c3a7c75976eaec9b',
            15,
            null,
            null,
            [{ account: 'cFHyJEHEQ1YkT9xuFnxnPWVkihpYEGjBg4WbF6vCPtSPQoE8n', bps: 10 }],
            {
              min_price: '0x152d02c7e14af680000000000000000000000000000000000000',
              refund_address: 'tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx',
              retry_duration: 500,
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
        fillOrKillParams: {
          minPrice: '10000000000000',
          refundAddress: 'tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx',
          retryDurationBlocks: 500,
        },
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
      });
    });

    it('calls the configured broker api with the given dca parameters', async () => {
      const postSpy = mockRpcResponse((url, data: any) => {
        if (data.method === 'broker_request_swap_deposit_address') {
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
          srcAsset: { asset: 'BTC', chain: 'Bitcoin' },
          destAsset: { asset: 'FLIP', chain: 'Ethereum' },
          depositAmount: BigInt(1e18).toString(),
          dcaParams: {
            numberOfChunks: 100,
            chunkIntervalBlocks: 5,
          },
          type: 'DCA',
          isVaultSwap: false,
        } as Quote,
        destAddress: '0x717e15853fd5f2ac6123e844c3a7c75976eaec9b',
        fillOrKillParams: {
          retryDurationBlocks: 500,
          refundAddress: 'tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx',
          minPrice: '10000000000000',
        },
      });

      expect(postSpy).toHaveBeenCalledWith('https://chainflap.org/broker', [
        {
          id: expect.any(String),
          jsonrpc: '2.0',
          method: 'broker_request_swap_deposit_address',
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
              refund_address: 'tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx',
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
          refundAddress: 'tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx',
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

    it('calls the configured broker api with the given ccm parameters', async () => {
      const postSpy = mockRpcResponse((url, data: any) => {
        if (data.method === 'broker_request_swap_deposit_address') {
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
          srcAsset: { asset: 'BTC', chain: 'Bitcoin' },
          destAsset: { asset: 'FLIP', chain: 'Ethereum' },
          depositAmount: BigInt(1e18).toString(),
          type: 'REGULAR',
          ccmParams: {
            gasBudget: '123456789',
            messageLengthBytes: 10,
          },
        } as Quote,
        destAddress: '0x717e15853fd5f2ac6123e844c3a7c75976eaec9b',
        fillOrKillParams: {
          minPrice: '10000000000000',
          refundAddress: 'tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx',
          retryDurationBlocks: 500,
        },
        ccmParams: {
          gasBudget: '123456789',
          message: '0xdeadc0de',
          ccmAdditionalData: '0xc0ffee',
        },
      });

      expect(postSpy).toHaveBeenCalledWith('https://chainflap.org/broker', [
        {
          id: expect.any(String),
          jsonrpc: '2.0',
          method: 'broker_request_swap_deposit_address',
          params: [
            { asset: 'BTC', chain: 'Bitcoin' },
            { asset: 'FLIP', chain: 'Ethereum' },
            '0x717e15853fd5f2ac6123e844c3a7c75976eaec9b',
            15,
            {
              ccm_additional_data: '0xc0ffee',
              cf_parameters: '0xc0ffee',
              gas_budget: '0x75bcd15',
              message: '0xdeadc0de',
            },
            null,
            null,
            {
              min_price: '0x152d02c7e14af680000000000000000000000000000000000000',
              refund_address: 'tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx',
              retry_duration: 500,
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
        fillOrKillParams: {
          minPrice: '10000000000000',
          refundAddress: 'tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx',
          retryDurationBlocks: 500,
        },
        brokerCommissionBps: 15,
        ccmParams: {
          gasBudget: '123456789',
          message: '0xdeadc0de',
          ccmAdditionalData: '0xc0ffee',
        },
        amount: '1000000000000000000',
        depositChannelId: '123-Bitcoin-15',
        depositAddress: '0x717e15853fd5f2ac6123e844c3a7c75976eaec9a',
        depositChannelExpiryBlock: 1234n,
        estimatedDepositChannelExpiryTime: undefined,
        maxBoostFeeBps: 0,
        channelOpeningFee: 0n,
        affiliateBrokers: [],
        dcaParams: undefined,
      });
    });

    it('calls the configured broker api with the given boost fee', async () => {
      const postSpy = mockRpcResponse((url, data: any) => {
        if (data.method === 'broker_request_swap_deposit_address') {
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
          srcAsset: { asset: 'BTC', chain: 'Bitcoin' },
          destAsset: { asset: 'FLIP', chain: 'Ethereum' },
          depositAmount: BigInt(1e18).toString(),
          maxBoostFeeBps: MAX_BOOST_FEE_BPS,
          type: 'REGULAR',
          isVaultSwap: false,
        } as BoostQuote,
        destAddress: '0x717e15853fd5f2ac6123e844c3a7c75976eaec9b',
        fillOrKillParams: {
          minPrice: '10000000000000',
          refundAddress: 'tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx',
          retryDurationBlocks: 500,
        },
      });

      expect(postSpy).toHaveBeenCalledWith('https://chainflap.org/broker', [
        {
          id: expect.any(String),
          jsonrpc: '2.0',
          method: 'broker_request_swap_deposit_address',
          params: [
            { asset: 'BTC', chain: 'Bitcoin' },
            { asset: 'FLIP', chain: 'Ethereum' },
            '0x717e15853fd5f2ac6123e844c3a7c75976eaec9b',
            15,
            null,
            MAX_BOOST_FEE_BPS,
            null,
            {
              min_price: '0x152d02c7e14af680000000000000000000000000000000000000',
              refund_address: 'tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx',
              retry_duration: 500,
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
        fillOrKillParams: {
          minPrice: '10000000000000',
          refundAddress: 'tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx',
          retryDurationBlocks: 500,
        },
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
      });
    });

    it("throws for quotes that aren't DCA or REGULAR", async () => {
      await expect(
        new SwapSDK({
          broker: { url: 'https://chainflap.org/broker', commissionBps: 15 },
        }).requestDepositAddressV2({
          quote: {
            srcAsset: { asset: 'BTC', chain: 'Bitcoin' },
            destAsset: { asset: 'FLIP', chain: 'Ethereum' },
            depositAmount: BigInt(1e18).toString(),
            dcaParams: {
              numberOfChunks: 100,
              chunkIntervalBlocks: 5,
            },
            isVaultSwap: false,
          } as Quote,
          destAddress: '0x717e15853fd5f2ac6123e844c3a7c75976eaec9b',
          fillOrKillParams: {
            minPrice: '10000000000000',
            refundAddress: 'tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx',
            retryDurationBlocks: 500,
          },
        }),
      ).rejects.toThrow('Invalid quote type');
    });

    it('throws for missing DCA params', async () => {
      await expect(
        new SwapSDK({
          broker: { url: 'https://chainflap.org/broker', commissionBps: 15 },
        }).requestDepositAddressV2({
          quote: {
            srcAsset: { asset: 'BTC', chain: 'Bitcoin' },
            destAsset: { asset: 'FLIP', chain: 'Ethereum' },
            depositAmount: BigInt(1e18).toString(),
            type: 'DCA',
            isVaultSwap: false,
          } as Quote,
          destAddress: '0x717e15853fd5f2ac6123e844c3a7c75976eaec9b',
          fillOrKillParams: {
            minPrice: '10000000000000',
            refundAddress: 'tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx',
            retryDurationBlocks: 500,
          },
        }),
      ).rejects.toThrow('Failed to find DCA parameters from quote');
    });

    it('throws for vault swap quote', async () => {
      await expect(
        new SwapSDK({
          broker: { url: 'https://chainflap.org/broker', commissionBps: 15 },
        }).requestDepositAddressV2({
          quote: {
            srcAsset: { asset: 'BTC', chain: 'Bitcoin' },
            destAsset: { asset: 'FLIP', chain: 'Ethereum' },
            depositAmount: BigInt(1e18).toString(),
            type: 'REGULAR',
            isVaultSwap: true,
          } as Quote,
          destAddress: '0x717e15853fd5f2ac6123e844c3a7c75976eaec9b',
          fillOrKillParams: {
            minPrice: '10000000000000',
            refundAddress: 'tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx',
            retryDurationBlocks: 500,
          },
        }),
      ).rejects.toThrow('Cannot open a deposit channel for a vault swap quote');
    });

    it('throws for ccm params with regular quote', async () => {
      await expect(
        new SwapSDK({
          broker: { url: 'https://chainflap.org/broker', commissionBps: 15 },
        }).requestDepositAddressV2({
          quote: {
            srcAsset: { asset: 'BTC', chain: 'Bitcoin' },
            destAsset: { asset: 'FLIP', chain: 'Ethereum' },
            depositAmount: BigInt(1e18).toString(),
            type: 'REGULAR',
            isVaultSwap: false,
          } as Quote,
          destAddress: '0x717e15853fd5f2ac6123e844c3a7c75976eaec9b',
          fillOrKillParams: {
            minPrice: '10000000000000',
            refundAddress: 'tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx',
            retryDurationBlocks: 500,
          },
          ccmParams: {
            gasBudget: '123456789',
            message: '0xdeadc0de',
            ccmAdditionalData: '0xc0ffee',
          },
        }),
      ).rejects.toThrow('Cannot open CCM channel for quote without CCM params');
    });

    it('throws if ccm params are missing for ccm quote', async () => {
      await expect(
        new SwapSDK({
          broker: { url: 'https://chainflap.org/broker', commissionBps: 15 },
        }).requestDepositAddressV2({
          quote: {
            srcAsset: { asset: 'BTC', chain: 'Bitcoin' },
            destAsset: { asset: 'FLIP', chain: 'Ethereum' },
            depositAmount: BigInt(1e18).toString(),
            type: 'REGULAR',
            ccmParams: {
              gasBudget: '123456789',
              messageLengthBytes: 10,
            },
            isVaultSwap: false,
          } as Quote,
          destAddress: '0x717e15853fd5f2ac6123e844c3a7c75976eaec9b',
          fillOrKillParams: {
            minPrice: '10000000000000',
            refundAddress: 'tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx',
            retryDurationBlocks: 500,
          },
        }),
      ).rejects.toThrow('Cannot open regular channel for quote with CCM params');
    });
  });

  describe(SwapSDK.prototype.encodeVaultSwapData, () => {
    it('calls encodeVaultSwapData with refund parameters for slippage', async () => {
      const rpcSpy = vi.spyOn(sdk['trpc'].encodeVaultSwapData, 'mutate').mockResolvedValueOnce({
        chain: 'Bitcoin',
        nulldataPayload:
          '0x0003656623d865425c0a4955ef7e7a39d09f58554d0800000000000000000000000000000000000001000200000100',
        depositAddress: 'bcrt1pmrhjpvq2w7cgesrcrvuhqw6n6j487l6uc7tmwtx9jen7ezesunhqllvzxx',
      });

      const quote = {
        srcAsset: { asset: 'BTC', chain: 'Bitcoin' },
        destAsset: { asset: 'FLIP', chain: 'Ethereum' },
        depositAmount: BigInt(1e18).toString(),
        estimatedPrice: '2500',
        type: 'REGULAR',
        isVaultSwap: true,
      } as Quote;
      const response = await sdk.encodeVaultSwapData({
        quote,
        destAddress: '0xcafebabe',
        fillOrKillParams: {
          retryDurationBlocks: 500,
          refundAddress: '0xa56A6be23b6Cf39D9448FF6e897C29c41c8fbDFF',
          slippageTolerancePercent: '1.5',
        },
      });
      expect(rpcSpy).toHaveBeenLastCalledWith({
        srcAsset: { asset: 'BTC', chain: 'Bitcoin' },
        destAsset: { asset: 'FLIP', chain: 'Ethereum' },
        srcAddress: undefined,
        destAddress: '0xcafebabe',
        dcaParams: undefined,
        amount: BigInt(1e18).toString(),
        maxBoostFeeBps: undefined,
        fillOrKillParams: {
          retryDurationBlocks: 500,
          refundAddress: '0xa56A6be23b6Cf39D9448FF6e897C29c41c8fbDFF',
          minPriceX128: '8379453285428109662785599708007292207104000000000000',
        },
      });
      expect(response).toStrictEqual({
        chain: 'Bitcoin',
        nulldataPayload:
          '0x0003656623d865425c0a4955ef7e7a39d09f58554d0800000000000000000000000000000000000001000200000100',
        depositAddress: 'bcrt1pmrhjpvq2w7cgesrcrvuhqw6n6j487l6uc7tmwtx9jen7ezesunhqllvzxx',
      });
    });

    it('calls encodeVaultSwapData with commission and dca parameters', async () => {
      const rpcSpy = vi.spyOn(sdk['trpc'].encodeVaultSwapData, 'mutate').mockResolvedValueOnce({
        chain: 'Bitcoin',
        nulldataPayload:
          '0x0003656623d865425c0a4955ef7e7a39d09f58554d0800000000000000000000000000000000000001000200000100',
        depositAddress: 'bcrt1pmrhjpvq2w7cgesrcrvuhqw6n6j487l6uc7tmwtx9jen7ezesunhqllvzxx',
      });

      const quote = {
        srcAsset: { asset: 'BTC', chain: 'Bitcoin' },
        destAsset: { asset: 'FLIP', chain: 'Ethereum' },
        depositAmount: BigInt(1e18).toString(),
        dcaParams: {
          numberOfChunks: 100,
          chunkIntervalBlocks: 5,
        },
        type: 'DCA',
        isVaultSwap: true,
      } as Quote;
      const response = await sdk.encodeVaultSwapData({
        quote,
        destAddress: '0xcafebabe',
        brokerAccount: 'cFLdocJo3bjT7JbT7R46cA89QfvoitrKr9P3TsMcdkVWeeVLa',
        brokerCommissionBps: 15,
        affiliateBrokers: [
          { account: 'cFLdocJo3bjT7JbT7R46cA89QfvoitrKr9P3TsMcdkVWeeVLa', commissionBps: 10 },
        ],
        fillOrKillParams: {
          retryDurationBlocks: 500,
          refundAddress: '0xa56A6be23b6Cf39D9448FF6e897C29c41c8fbDFF',
          minPrice: '10000000000000',
        },
      });
      expect(rpcSpy).toHaveBeenLastCalledWith({
        srcAsset: { asset: 'BTC', chain: 'Bitcoin' },
        destAsset: { asset: 'FLIP', chain: 'Ethereum' },
        srcAddress: undefined,
        destAddress: '0xcafebabe',
        amount: BigInt(1e18).toString(),
        dcaParams: {
          numberOfChunks: 100,
          chunkIntervalBlocks: 5,
        },
        brokerAccount: 'cFLdocJo3bjT7JbT7R46cA89QfvoitrKr9P3TsMcdkVWeeVLa',
        commissionBps: 15,
        affiliates: [
          { account: 'cFLdocJo3bjT7JbT7R46cA89QfvoitrKr9P3TsMcdkVWeeVLa', commissionBps: 10 },
        ],
        fillOrKillParams: {
          retryDurationBlocks: 500,
          refundAddress: '0xa56A6be23b6Cf39D9448FF6e897C29c41c8fbDFF',
          minPriceX128: '34028236692093846346337460743176821145600000000000000000000000',
        },
      });
      expect(response).toStrictEqual({
        chain: 'Bitcoin',
        nulldataPayload:
          '0x0003656623d865425c0a4955ef7e7a39d09f58554d0800000000000000000000000000000000000001000200000100',
        depositAddress: 'bcrt1pmrhjpvq2w7cgesrcrvuhqw6n6j487l6uc7tmwtx9jen7ezesunhqllvzxx',
      });
    });

    it('rejects commission if no broker account is given and no broker url is configured', async () => {
      const quote = {
        srcAsset: { asset: 'BTC', chain: 'Bitcoin' },
        destAsset: { asset: 'FLIP', chain: 'Ethereum' },
        depositAmount: BigInt(1e18).toString(),
        dcaParams: {
          numberOfChunks: 100,
          chunkIntervalBlocks: 5,
        },
        type: 'DCA',
        isVaultSwap: true,
      } as Quote;

      await expect(
        sdk.encodeVaultSwapData({
          quote,
          destAddress: '0xcafebabe',
          fillOrKillParams: {
            retryDurationBlocks: 500,
            refundAddress: '0xa56A6be23b6Cf39D9448FF6e897C29c41c8fbDFF',
            minPrice: '10000000000000',
          },
          brokerCommissionBps: 10,
        }),
      ).rejects.toThrow('Broker commission is supported only when setting a broker account');
    });

    it('rejects affiliates if no broker account is given and no broker url is configured', async () => {
      const quote = {
        srcAsset: { asset: 'BTC', chain: 'Bitcoin' },
        destAsset: { asset: 'FLIP', chain: 'Ethereum' },
        depositAmount: BigInt(1e18).toString(),
        dcaParams: {
          numberOfChunks: 100,
          chunkIntervalBlocks: 5,
        },
        type: 'DCA',
        isVaultSwap: true,
      } as Quote;

      await expect(
        sdk.encodeVaultSwapData({
          quote,
          destAddress: '0xcafebabe',
          fillOrKillParams: {
            retryDurationBlocks: 500,
            refundAddress: '0xa56A6be23b6Cf39D9448FF6e897C29c41c8fbDFF',
            minPrice: '10000000000000',
          },
          affiliateBrokers: [
            { account: 'cFLdocJo3bjT7JbT7R46cA89QfvoitrKr9P3TsMcdkVWeeVLa', commissionBps: 10 },
          ],
        }),
      ).rejects.toThrow('Affiliate brokers are supported only when setting a broker account');
    });

    it('calls the configured broker api with the given affiliate brokers', async () => {
      const postSpy = mockRpcResponse((url, data: any) => {
        if (data.method === 'broker_request_swap_parameter_encoding') {
          return Promise.resolve({
            data: {
              id: '1',
              jsonrpc: '2.0',
              result: {
                chain: 'Bitcoin',
                nulldata_payload:
                  '0x0003656623d865425c0a4955ef7e7a39d09f58554d0800000000000000000000000000000000000001000200000100',
                deposit_address: 'bcrt1pmrhjpvq2w7cgesrcrvuhqw6n6j487l6uc7tmwtx9jen7ezesunhqllvzxx',
              },
            },
          });
        }

        return defaultRpcMocks(url, data);
      });

      const result = await new SwapSDK({
        broker: { url: 'https://chainflap.org/broker', commissionBps: 15 },
      }).encodeVaultSwapData({
        quote: {
          srcAsset: { asset: 'BTC', chain: 'Bitcoin' },
          destAsset: { asset: 'FLIP', chain: 'Ethereum' },
          depositAmount: BigInt(1e18).toString(),
          type: 'REGULAR',
          isVaultSwap: true,
        } as Quote,
        destAddress: '0x717e15853fd5f2ac6123e844c3a7c75976eaec9b',
        fillOrKillParams: {
          retryDurationBlocks: 500,
          refundAddress: 'tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx',
          minPrice: '10000000000000',
        },
        affiliateBrokers: [
          { account: 'cFHyJEHEQ1YkT9xuFnxnPWVkihpYEGjBg4WbF6vCPtSPQoE8n', commissionBps: 10 },
        ],
      });

      expect(postSpy).toHaveBeenCalledWith('https://chainflap.org/broker', [
        {
          id: expect.any(String),
          jsonrpc: '2.0',
          method: 'broker_request_swap_parameter_encoding',
          params: [
            { asset: 'BTC', chain: 'Bitcoin' },
            { asset: 'FLIP', chain: 'Ethereum' },
            '0x717e15853fd5f2ac6123e844c3a7c75976eaec9b',
            15,
            {
              chain: 'Bitcoin',
              min_output_amount: '0x125dfa371a19e6f7cb54395ca0000000000',
              retry_duration: 500,
            },
            null,
            null,
            [{ account: 'cFHyJEHEQ1YkT9xuFnxnPWVkihpYEGjBg4WbF6vCPtSPQoE8n', bps: 10 }],
            null,
          ],
        },
      ]);
      expect(result).toStrictEqual({
        chain: 'Bitcoin',
        nulldataPayload:
          '0x0003656623d865425c0a4955ef7e7a39d09f58554d0800000000000000000000000000000000000001000200000100',
        depositAddress: 'bcrt1pmrhjpvq2w7cgesrcrvuhqw6n6j487l6uc7tmwtx9jen7ezesunhqllvzxx',
      });
    });

    it('calls the configured broker api with the given dca parameters', async () => {
      const postSpy = mockRpcResponse((url, data: any) => {
        if (data.method === 'broker_request_swap_parameter_encoding') {
          return Promise.resolve({
            data: {
              id: '1',
              jsonrpc: '2.0',
              result: {
                chain: 'Bitcoin',
                nulldata_payload:
                  '0x0003656623d865425c0a4955ef7e7a39d09f58554d0800000000000000000000000000000000000001000200000100',
                deposit_address: 'bcrt1pmrhjpvq2w7cgesrcrvuhqw6n6j487l6uc7tmwtx9jen7ezesunhqllvzxx',
              },
            },
          });
        }

        return defaultRpcMocks(url, data);
      });

      const result = await new SwapSDK({
        broker: { url: 'https://chainflap.org/broker', commissionBps: 15 },
      }).encodeVaultSwapData({
        quote: {
          srcAsset: { asset: 'BTC', chain: 'Bitcoin' },
          destAsset: { asset: 'FLIP', chain: 'Ethereum' },
          depositAmount: BigInt(1e18).toString(),
          dcaParams: {
            numberOfChunks: 100,
            chunkIntervalBlocks: 5,
          },
          type: 'DCA',
          isVaultSwap: true,
        } as Quote,
        destAddress: '0x717e15853fd5f2ac6123e844c3a7c75976eaec9b',
        fillOrKillParams: {
          retryDurationBlocks: 500,
          refundAddress: 'tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx',
          minPrice: '10000000000000',
        },
      });

      expect(postSpy).toHaveBeenCalledWith('https://chainflap.org/broker', [
        {
          id: expect.any(String),
          jsonrpc: '2.0',
          method: 'broker_request_swap_parameter_encoding',
          params: [
            { asset: 'BTC', chain: 'Bitcoin' },
            { asset: 'FLIP', chain: 'Ethereum' },
            '0x717e15853fd5f2ac6123e844c3a7c75976eaec9b',
            15,
            {
              chain: 'Bitcoin',
              min_output_amount: '0x125dfa371a19e6f7cb54395ca0000000000',
              retry_duration: 500,
            },
            null,
            null,
            null,
            {
              number_of_chunks: 100,
              chunk_interval: 5,
            },
          ],
        },
      ]);
      expect(result).toStrictEqual({
        chain: 'Bitcoin',
        nulldataPayload:
          '0x0003656623d865425c0a4955ef7e7a39d09f58554d0800000000000000000000000000000000000001000200000100',
        depositAddress: 'bcrt1pmrhjpvq2w7cgesrcrvuhqw6n6j487l6uc7tmwtx9jen7ezesunhqllvzxx',
      });
    });

    it('calls the configured broker api with the given ccm parameters', async () => {
      const postSpy = mockRpcResponse((url, data: any) => {
        if (data.method === 'broker_request_swap_parameter_encoding') {
          return Promise.resolve({
            data: {
              id: '1',
              jsonrpc: '2.0',
              result: {
                chain: 'Bitcoin',
                nulldata_payload:
                  '0x0003656623d865425c0a4955ef7e7a39d09f58554d0800000000000000000000000000000000000001000200000100',
                deposit_address: 'bcrt1pmrhjpvq2w7cgesrcrvuhqw6n6j487l6uc7tmwtx9jen7ezesunhqllvzxx',
              },
            },
          });
        }

        return defaultRpcMocks(url, data);
      });

      const result = await new SwapSDK({
        broker: { url: 'https://chainflap.org/broker', commissionBps: 15 },
      }).encodeVaultSwapData({
        quote: {
          srcAsset: { asset: 'BTC', chain: 'Bitcoin' },
          destAsset: { asset: 'FLIP', chain: 'Ethereum' },
          depositAmount: BigInt(1e18).toString(),
          type: 'REGULAR',
          ccmParams: {
            gasBudget: '123456789',
            messageLengthBytes: 10,
          },
          isVaultSwap: true,
        } as Quote,
        destAddress: '0x717e15853fd5f2ac6123e844c3a7c75976eaec9b',
        fillOrKillParams: {
          retryDurationBlocks: 500,
          refundAddress: 'tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx',
          minPrice: '10000000000000',
        },
        ccmParams: {
          gasBudget: '123456789',
          message: '0xdeadc0de',
          ccmAdditionalData: '0xc0ffee',
        },
      });

      expect(postSpy).toHaveBeenCalledWith('https://chainflap.org/broker', [
        {
          id: expect.any(String),
          jsonrpc: '2.0',
          method: 'broker_request_swap_parameter_encoding',
          params: [
            { asset: 'BTC', chain: 'Bitcoin' },
            { asset: 'FLIP', chain: 'Ethereum' },
            '0x717e15853fd5f2ac6123e844c3a7c75976eaec9b',
            15,
            {
              chain: 'Bitcoin',
              min_output_amount: '0x125dfa371a19e6f7cb54395ca0000000000',
              retry_duration: 500,
            },
            {
              gas_budget: '0x75bcd15',
              message: '0xdeadc0de',
              ccm_additional_data: '0xc0ffee',
              cf_parameters: '0xc0ffee',
            },
            null,
            null,
            null,
          ],
        },
      ]);
      expect(result).toStrictEqual({
        chain: 'Bitcoin',
        nulldataPayload:
          '0x0003656623d865425c0a4955ef7e7a39d09f58554d0800000000000000000000000000000000000001000200000100',
        depositAddress: 'bcrt1pmrhjpvq2w7cgesrcrvuhqw6n6j487l6uc7tmwtx9jen7ezesunhqllvzxx',
      });
    });

    it('calls the configured broker api with the given boost fee', async () => {
      const postSpy = mockRpcResponse((url, data: any) => {
        if (data.method === 'broker_request_swap_parameter_encoding') {
          return Promise.resolve({
            data: {
              id: '1',
              jsonrpc: '2.0',
              result: {
                chain: 'Bitcoin',
                nulldata_payload:
                  '0x0003656623d865425c0a4955ef7e7a39d09f58554d0800000000000000000000000000000000000001000200000100',
                deposit_address: 'bcrt1pmrhjpvq2w7cgesrcrvuhqw6n6j487l6uc7tmwtx9jen7ezesunhqllvzxx',
              },
            },
          });
        }

        return defaultRpcMocks(url, data);
      });
      const MAX_BOOST_FEE_BPS = 100;

      const result = await new SwapSDK({
        broker: { url: 'https://chainflap.org/broker', commissionBps: 15 },
      }).encodeVaultSwapData({
        quote: {
          srcAsset: { asset: 'BTC', chain: 'Bitcoin' },
          destAsset: { asset: 'FLIP', chain: 'Ethereum' },
          depositAmount: BigInt(1e18).toString(),
          maxBoostFeeBps: MAX_BOOST_FEE_BPS,
          type: 'REGULAR',
          isVaultSwap: true,
        } as BoostQuote,
        destAddress: '0x717e15853fd5f2ac6123e844c3a7c75976eaec9b',
        fillOrKillParams: {
          retryDurationBlocks: 500,
          refundAddress: 'tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx',
          minPrice: '10000000000000',
        },
      });

      expect(postSpy).toHaveBeenCalledWith('https://chainflap.org/broker', [
        {
          id: expect.any(String),
          jsonrpc: '2.0',
          method: 'broker_request_swap_parameter_encoding',
          params: [
            { asset: 'BTC', chain: 'Bitcoin' },
            { asset: 'FLIP', chain: 'Ethereum' },
            '0x717e15853fd5f2ac6123e844c3a7c75976eaec9b',
            15,
            {
              chain: 'Bitcoin',
              min_output_amount: '0x125dfa371a19e6f7cb54395ca0000000000',
              retry_duration: 500,
            },
            null,
            MAX_BOOST_FEE_BPS,
            null,
            null,
          ],
        },
      ]);
      expect(result).toStrictEqual({
        chain: 'Bitcoin',
        nulldataPayload:
          '0x0003656623d865425c0a4955ef7e7a39d09f58554d0800000000000000000000000000000000000001000200000100',
        depositAddress: 'bcrt1pmrhjpvq2w7cgesrcrvuhqw6n6j487l6uc7tmwtx9jen7ezesunhqllvzxx',
      });
    });

    it('rejects request with broker account if broker url is configured', async () => {
      const quote = {
        srcAsset: { asset: 'BTC', chain: 'Bitcoin' },
        destAsset: { asset: 'FLIP', chain: 'Ethereum' },
        depositAmount: BigInt(1e18).toString(),
        dcaParams: {
          numberOfChunks: 100,
          chunkIntervalBlocks: 5,
        },
        type: 'DCA',
        isVaultSwap: true,
      } as Quote;

      await expect(
        new SwapSDK({
          broker: { url: 'https://chainflap.org/broker', commissionBps: 15 },
        }).encodeVaultSwapData({
          quote,
          destAddress: '0xcafebabe',
          fillOrKillParams: {
            retryDurationBlocks: 500,
            refundAddress: '0xa56A6be23b6Cf39D9448FF6e897C29c41c8fbDFF',
            minPrice: '10000000000000',
          },
          brokerAccount: 'cFLdocJo3bjT7JbT7R46cA89QfvoitrKr9P3TsMcdkVWeeVLa',
          brokerCommissionBps: 15,
        }),
      ).rejects.toThrow(
        'Cannot overwrite broker account when initializing the SDK with a brokerUrl',
      );
    });

    it("throws for quotes that aren't DCA or REGULAR", async () => {
      await expect(
        new SwapSDK({
          broker: { url: 'https://chainflap.org/broker', commissionBps: 15 },
        }).encodeVaultSwapData({
          quote: {
            srcAsset: { asset: 'BTC', chain: 'Bitcoin' },
            destAsset: { asset: 'FLIP', chain: 'Ethereum' },
            depositAmount: BigInt(1e18).toString(),
            dcaParams: {
              numberOfChunks: 100,
              chunkIntervalBlocks: 5,
            },
            isVaultSwap: true,
          } as Quote,
          destAddress: '0x717e15853fd5f2ac6123e844c3a7c75976eaec9b',
          fillOrKillParams: {
            retryDurationBlocks: 500,
            refundAddress: 'tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx',
            minPrice: '10000000000000',
          },
        }),
      ).rejects.toThrow('Invalid quote type');
    });

    it('throws for missing DCA params', async () => {
      await expect(
        new SwapSDK({
          broker: { url: 'https://chainflap.org/broker', commissionBps: 15 },
        }).encodeVaultSwapData({
          quote: {
            srcAsset: { asset: 'BTC', chain: 'Bitcoin' },
            destAsset: { asset: 'FLIP', chain: 'Ethereum' },
            depositAmount: BigInt(1e18).toString(),
            type: 'DCA',
            isVaultSwap: true,
          } as Quote,
          destAddress: '0x717e15853fd5f2ac6123e844c3a7c75976eaec9b',
          fillOrKillParams: {
            retryDurationBlocks: 500,
            refundAddress: 'tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx',
            minPrice: '10000000000000',
          },
        }),
      ).rejects.toThrow('Failed to find DCA parameters from quote');
    });

    it('throws for deposit channel quote', async () => {
      await expect(
        new SwapSDK({
          broker: { url: 'https://chainflap.org/broker', commissionBps: 15 },
        }).encodeVaultSwapData({
          quote: {
            srcAsset: { asset: 'BTC', chain: 'Bitcoin' },
            destAsset: { asset: 'FLIP', chain: 'Ethereum' },
            depositAmount: BigInt(1e18).toString(),
            type: 'REGULAR',
            isVaultSwap: false,
          } as Quote,
          destAddress: '0x717e15853fd5f2ac6123e844c3a7c75976eaec9b',
          fillOrKillParams: {
            retryDurationBlocks: 500,
            refundAddress: 'tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx',
            minPrice: '10000000000000',
          },
        }),
      ).rejects.toThrow('Cannot encode vault swap data for a deposit channel quote');
    });

    it('throws for ccm params with regular quote', async () => {
      await expect(
        new SwapSDK({
          broker: { url: 'https://chainflap.org/broker', commissionBps: 15 },
        }).encodeVaultSwapData({
          quote: {
            srcAsset: { asset: 'BTC', chain: 'Bitcoin' },
            destAsset: { asset: 'FLIP', chain: 'Ethereum' },
            depositAmount: BigInt(1e18).toString(),
            type: 'REGULAR',
            isVaultSwap: true,
          } as Quote,
          destAddress: '0x717e15853fd5f2ac6123e844c3a7c75976eaec9b',
          fillOrKillParams: {
            retryDurationBlocks: 500,
            refundAddress: 'tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx',
            minPrice: '10000000000000',
          },
          ccmParams: {
            gasBudget: '123456789',
            message: '0xdeadc0de',
            ccmAdditionalData: '0xc0ffee',
          },
        }),
      ).rejects.toThrow('Cannot encode CCM swap for quote without CCM params');
    });

    it('throws if ccm params are missing for ccm quote', async () => {
      await expect(
        new SwapSDK({
          broker: { url: 'https://chainflap.org/broker', commissionBps: 15 },
        }).encodeVaultSwapData({
          quote: {
            srcAsset: { asset: 'BTC', chain: 'Bitcoin' },
            destAsset: { asset: 'FLIP', chain: 'Ethereum' },
            depositAmount: BigInt(1e18).toString(),
            type: 'REGULAR',
            ccmParams: {
              gasBudget: '123456789',
              messageLengthBytes: 10,
            },
            isVaultSwap: true,
          } as Quote,
          destAddress: '0x717e15853fd5f2ac6123e844c3a7c75976eaec9b',
          fillOrKillParams: {
            retryDurationBlocks: 500,
            refundAddress: 'tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx',
            minPrice: '10000000000000',
          },
        }),
      ).rejects.toThrow('Cannot encode regular swap for quote with CCM params');
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
      expect(await sdk.getChannelOpeningFees()).toMatchInlineSnapshot(`
        {
          "Arbitrum": 0n,
          "Assethub": 0n,
          "Bitcoin": 0n,
          "Ethereum": 16n,
          "Polkadot": 0n,
          "Solana": 0n,
        }
      `);
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

      const freshSdk = new SwapSDK({ network: 'sisyphos' });
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

      const freshSdk = new SwapSDK({ network: 'sisyphos' });
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

      const freshSdk = new SwapSDK({ network: 'sisyphos' });
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

      const freshSdk = new SwapSDK({ network: 'sisyphos' });
      expect(
        await freshSdk.getBoostLiquidity({
          asset: 'BTC',
          chain: 'Bitcoin',
        }),
      ).toMatchSnapshot();
    });
  });

  describe(SwapSDK.prototype.getSwapLimits, () => {
    it('returns the swap limits based on the environment rpc', async () => {
      expect(await sdk.getSwapLimits()).toMatchSnapshot();
    });
  });

  describe(SwapSDK.prototype.checkBoostEnabled, () => {
    it('returns that boost is enabled', async () => {
      sdk = mockNetworkStatus();
      expect(await sdk.checkBoostEnabled()).toBe(true);
    });

    it('returns that boost is disabled', async () => {
      sdk = mockNetworkStatus(false);
      expect(await sdk.checkBoostEnabled()).toBe(false);
    });
  });
});

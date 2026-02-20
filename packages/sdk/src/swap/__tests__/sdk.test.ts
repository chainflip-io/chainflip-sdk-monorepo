/* eslint-disable dot-notation */
import { chainflipAssets, ChainflipChain, chainflipNetworks } from '@chainflip/utils/chainflip';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { BoostQuote, FillOrKillParams, Quote } from '@/shared/schemas.js';
import { boostPoolsDepth, environment, mockRpcResponse } from '@/shared/tests/fixtures.js';
import { SwapSDK } from '../sdk.js';
import { getQuoteV2, getStatusV2 } from '../services/ApiService.js';
import { QuoteRequest } from '../types.js';

vi.mock('../services/ApiService', () => ({
  getQuoteV2: vi.fn(),
  getStatusV2: vi.fn(),
}));

vi.mock('@ts-rest/core', async (importOriginal) => ({
  ...(await importOriginal()),
  initClient: () => ({
    openSwapDepositChannel: vi.fn(),
    encodeVaultSwapData: vi.fn(),
    encodeCfParameters: vi.fn(),
    networkInfo: vi.fn(() =>
      Promise.resolve({
        status: 200,
        body: {
          assets: chainflipAssets.map((asset) => ({
            asset,
            depositChannelCreationEnabled: true,
            depositChannelDepositsEnabled: true,
            egressEnabled: true,
            boostDepositsEnabled: true,
            vaultSwapDepositsEnabled: true,
            livePriceProtectionEnabled: /eth|usd|btc|sol/i.test(asset),
          })),
          boostDepositsEnabled: true,
        },
      }),
    ),
  }),
}));

global.fetch = vi.fn();

const mockNetworkStatus = (
  boostDepositsEnabled = true,
  cfBrokerCommissionBps = 0,
  SwapSDKClass = SwapSDK,
) => {
  const sdk = new SwapSDKClass({ network: 'sisyphos' });
  vi.mocked(sdk['apiClient'].networkInfo).mockResolvedValueOnce({
    status: 200,
    body: {
      assets: [
        {
          asset: 'Eth',
          depositChannelCreationEnabled: true,
          depositChannelDepositsEnabled: true,
          egressEnabled: true,
          boostDepositsEnabled,
          vaultSwapDepositsEnabled: true,
          livePriceProtectionEnabled: true,
        },
        {
          asset: 'Btc',
          depositChannelCreationEnabled: false,
          depositChannelDepositsEnabled: false,
          egressEnabled: true,
          boostDepositsEnabled,
          vaultSwapDepositsEnabled: false,
          livePriceProtectionEnabled: true,
        },
        {
          asset: 'Flip',
          depositChannelCreationEnabled: true,
          depositChannelDepositsEnabled: true,
          egressEnabled: true,
          boostDepositsEnabled,
          vaultSwapDepositsEnabled: true,
          livePriceProtectionEnabled: false,
        },
        {
          asset: 'Usdc',
          depositChannelCreationEnabled: true,
          depositChannelDepositsEnabled: true,
          egressEnabled: true,
          boostDepositsEnabled,
          vaultSwapDepositsEnabled: true,
          livePriceProtectionEnabled: true,
        },
        {
          asset: 'Sol',
          depositChannelCreationEnabled: true,
          depositChannelDepositsEnabled: true,
          egressEnabled: false,
          boostDepositsEnabled,
          vaultSwapDepositsEnabled: true,
          livePriceProtectionEnabled: false,
        },
        {
          asset: 'SolUsdc',
          depositChannelCreationEnabled: true,
          depositChannelDepositsEnabled: true,
          egressEnabled: false,
          boostDepositsEnabled,
          vaultSwapDepositsEnabled: true,
          livePriceProtectionEnabled: true,
        },
      ],
      cfBrokerCommissionBps,
    },
    headers: new Headers(),
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

    throw new Error(`unexpected axios call to ${url}: ${JSON.stringify(data)}`);
  };

  beforeEach(() => {
    sdk = new SwapSDK({ network: 'sisyphos' });
    vi.resetAllMocks();
    vi.mocked(sdk['apiClient'].networkInfo).mockResolvedValueOnce({
      status: 200,
      body: {
        assets: chainflipAssets.map((asset) => ({
          asset,
          depositChannelCreationEnabled: true,
          depositChannelDepositsEnabled: true,
          egressEnabled: true,
          boostDepositsEnabled: true,
          vaultSwapDepositsEnabled: true,
          livePriceProtectionEnabled: /eth|usd|btc|sol/i.test(asset),
        })),
        cfBrokerCommissionBps: 0,
      },
      headers: new Headers(),
    });
    mockRpcResponse(defaultRpcMocks);
  });

  describe(SwapSDK.prototype.getChains, () => {
    it('returns the chains based on the supportedAsset API endpoint', async () => {
      sdk = mockNetworkStatus();
      expect(await sdk.getChains()).toMatchSnapshot();
    });

    it('returns the deposit chains based on the supportedAsset API endpoint', async () => {
      sdk = mockNetworkStatus();
      expect(await sdk.getChains(undefined, 'deposit')).toMatchSnapshot();
    });

    it('returns the destination chains based on the supportedAsset API endpoint', async () => {
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
    it('returns the assets based on the networkStatus API method', async () => {
      sdk = mockNetworkStatus();
      expect(await sdk.getAssets()).toMatchSnapshot();
    });

    it('returns the deposit assets based on the networkStatus API method', async () => {
      sdk = mockNetworkStatus();
      expect(await sdk.getAssets(undefined, 'deposit')).toMatchSnapshot();
    });

    it('returns the destination assets based on the networkStatus API method', async () => {
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
        { ...params, brokerCommissionBps: 0, dcaEnabled: false, dcaV2Enabled: false },
        {},
      );
      expect(result).toStrictEqual([{ quote: 1234 }]);
    });

    it('calls the api with dca v2 enabled', async () => {
      sdk = new SwapSDK({ network: 'sisyphos', enabledFeatures: { dcaV2: true } });

      const params: QuoteRequest = {
        srcChain: 'Ethereum',
        srcAsset: 'ETH',
        destChain: 'Ethereum',
        destAsset: 'USDC',
        amount: '1',
      };
      vi.mocked(getQuoteV2).mockResolvedValueOnce([{ quote: 1234 }] as any);

      const result = await sdk.getQuoteV2(params);
      expect(getQuoteV2).toHaveBeenCalledWith(
        'https://chainflip-swap.staging/',
        { ...params, brokerCommissionBps: 0, dcaEnabled: true, dcaV2Enabled: true },
        {},
      );
      expect(result).toStrictEqual([{ quote: 1234 }]);
    });

    it('calls api with commission', async () => {
      sdk = mockNetworkStatus(
        true,
        15,
        class extends SwapSDK {
          protected override shouldTakeCommission(): boolean {
            return true;
          }
        },
      );
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
        { ...params, brokerCommissionBps: 15, dcaEnabled: false, dcaV2Enabled: false },
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
          dcaV2Enabled: false,
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
          dcaV2Enabled: false,
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
      const rpcSpy = vi.mocked(sdk['apiClient'].openSwapDepositChannel).mockResolvedValueOnce({
        status: 201,
        body: {
          id: 'channel id',
          depositAddress: 'deposit address',
          brokerCommissionBps: 0,
          srcChainExpiryBlock: '123',
          estimatedExpiryTime: 1698334470000,
          channelOpeningFee: '0',
          issuedBlock: 1,
          maxBoostFeeBps: 0,
        },
        headers: new Headers(),
      });

      const quote = {
        srcAsset: { asset: 'BTC', chain: 'Bitcoin' },
        destAsset: { asset: 'FLIP', chain: 'Ethereum' },
        depositAmount: BigInt(1e18).toString(),
        type: 'REGULAR',
        isVaultSwap: false,
        recommendedLivePriceSlippageTolerancePercent: 1,
      } as Quote;
      const response = await sdk.requestDepositAddressV2({
        quote,
        destAddress: '0xcafebabe',
        fillOrKillParams: {
          retryDurationBlocks: 500,
          refundAddress: '0xa56A6be23b6Cf39D9448FF6e897C29c41c8fbDFF',
          minPrice: '10000000000000',
          livePriceSlippageTolerancePercent: 1,
        },
      });
      expect(rpcSpy.mock.lastCall).toMatchInlineSnapshot(`
        [
          {
            "body": {
              "amount": "1000000000000000000",
              "ccmParams": undefined,
              "dcaParams": undefined,
              "destAddress": "0xcafebabe",
              "destAsset": {
                "asset": "FLIP",
                "chain": "Ethereum",
              },
              "fillOrKillParams": {
                "maxOraclePriceSlippage": 100,
                "minPriceX128": "34028236692093846346337460743176821145600000000000000000000000",
                "refundAddress": "0xa56A6be23b6Cf39D9448FF6e897C29c41c8fbDFF",
                "refundCcmMetadata": null,
                "retryDurationBlocks": 500,
              },
              "maxBoostFeeBps": undefined,
              "quote": {
                "depositAmount": "1000000000000000000",
                "destAsset": {
                  "asset": "FLIP",
                  "chain": "Ethereum",
                },
                "isVaultSwap": false,
                "recommendedLivePriceSlippageTolerancePercent": 1,
                "srcAsset": {
                  "asset": "BTC",
                  "chain": "Bitcoin",
                },
                "type": "REGULAR",
              },
              "srcAddress": undefined,
              "srcAsset": {
                "asset": "BTC",
                "chain": "Bitcoin",
              },
              "takeCommission": false,
            },
          },
        ]
      `);
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
          livePriceSlippageTolerancePercent: 1,
        },
      });
    });

    it('calls openSwapDepositChannel with refund parameters (retryDurationMinutes)', async () => {
      const rpcSpy = vi.mocked(sdk['apiClient'].openSwapDepositChannel).mockResolvedValueOnce({
        status: 201,
        body: {
          id: 'channel id',
          depositAddress: 'deposit address',
          brokerCommissionBps: 0,
          srcChainExpiryBlock: '123',
          estimatedExpiryTime: 1698334470000,
          channelOpeningFee: '0',
          issuedBlock: 1,
          maxBoostFeeBps: 0,
        },
        headers: new Headers(),
      });

      const quote = {
        srcAsset: { asset: 'BTC', chain: 'Bitcoin' },
        destAsset: { asset: 'FLIP', chain: 'Ethereum' },
        depositAmount: BigInt(1e18).toString(),
        type: 'REGULAR',
        isVaultSwap: false,
        recommendedLivePriceSlippageTolerancePercent: 1,
      } as Quote;
      const response = await sdk.requestDepositAddressV2({
        quote,
        destAddress: '0xcafebabe',
        fillOrKillParams: {
          retryDurationMinutes: 50,
          refundAddress: '0xa56A6be23b6Cf39D9448FF6e897C29c41c8fbDFF',
          minPrice: '10000000000000',
          livePriceSlippageTolerancePercent: 1,
        },
      });
      expect(rpcSpy.mock.lastCall).toMatchInlineSnapshot(`
        [
          {
            "body": {
              "amount": "1000000000000000000",
              "ccmParams": undefined,
              "dcaParams": undefined,
              "destAddress": "0xcafebabe",
              "destAsset": {
                "asset": "FLIP",
                "chain": "Ethereum",
              },
              "fillOrKillParams": {
                "maxOraclePriceSlippage": 100,
                "minPriceX128": "34028236692093846346337460743176821145600000000000000000000000",
                "refundAddress": "0xa56A6be23b6Cf39D9448FF6e897C29c41c8fbDFF",
                "refundCcmMetadata": null,
                "retryDurationBlocks": 500,
              },
              "maxBoostFeeBps": undefined,
              "quote": {
                "depositAmount": "1000000000000000000",
                "destAsset": {
                  "asset": "FLIP",
                  "chain": "Ethereum",
                },
                "isVaultSwap": false,
                "recommendedLivePriceSlippageTolerancePercent": 1,
                "srcAsset": {
                  "asset": "BTC",
                  "chain": "Bitcoin",
                },
                "type": "REGULAR",
              },
              "srcAddress": undefined,
              "srcAsset": {
                "asset": "BTC",
                "chain": "Bitcoin",
              },
              "takeCommission": false,
            },
          },
        ]
      `);
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
          retryDurationMinutes: 50,
          refundAddress: '0xa56A6be23b6Cf39D9448FF6e897C29c41c8fbDFF',
          minPrice: '10000000000000',
          livePriceSlippageTolerancePercent: 1,
        },
      });
    });

    it('calls openSwapDepositChannel with dca parameters', async () => {
      const rpcSpy = vi.mocked(sdk['apiClient'].openSwapDepositChannel).mockResolvedValueOnce({
        status: 201,
        body: {
          id: 'channel id',
          depositAddress: 'deposit address',
          brokerCommissionBps: 0,
          srcChainExpiryBlock: '123',
          estimatedExpiryTime: 1698334470000,
          channelOpeningFee: '0',
          issuedBlock: 1,
          maxBoostFeeBps: 0,
        },
        headers: new Headers(),
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
        recommendedLivePriceSlippageTolerancePercent: 1,
      } as Quote;
      const response = await sdk.requestDepositAddressV2({
        quote,
        destAddress: '0xcafebabe',
        fillOrKillParams: {
          retryDurationBlocks: 500,
          refundAddress: '0xa56A6be23b6Cf39D9448FF6e897C29c41c8fbDFF',
          minPrice: '10000000000000',
          livePriceSlippageTolerancePercent: 1,
        },
      });
      expect(rpcSpy.mock.lastCall).toMatchInlineSnapshot(`
        [
          {
            "body": {
              "amount": "1000000000000000000",
              "ccmParams": undefined,
              "dcaParams": {
                "chunkIntervalBlocks": 5,
                "numberOfChunks": 100,
              },
              "destAddress": "0xcafebabe",
              "destAsset": {
                "asset": "FLIP",
                "chain": "Ethereum",
              },
              "fillOrKillParams": {
                "maxOraclePriceSlippage": 100,
                "minPriceX128": "34028236692093846346337460743176821145600000000000000000000000",
                "refundAddress": "0xa56A6be23b6Cf39D9448FF6e897C29c41c8fbDFF",
                "refundCcmMetadata": null,
                "retryDurationBlocks": 500,
              },
              "maxBoostFeeBps": undefined,
              "quote": {
                "dcaParams": {
                  "chunkIntervalBlocks": 5,
                  "numberOfChunks": 100,
                },
                "depositAmount": "1000000000000000000",
                "destAsset": {
                  "asset": "FLIP",
                  "chain": "Ethereum",
                },
                "isVaultSwap": false,
                "recommendedLivePriceSlippageTolerancePercent": 1,
                "srcAsset": {
                  "asset": "BTC",
                  "chain": "Bitcoin",
                },
                "type": "DCA",
              },
              "srcAddress": undefined,
              "srcAsset": {
                "asset": "BTC",
                "chain": "Bitcoin",
              },
              "takeCommission": false,
            },
          },
        ]
      `);
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
          livePriceSlippageTolerancePercent: 1,
        },
      });
    });

    it('calls openSwapDepositChannel with max oracle slippage', async () => {
      const rpcSpy = vi.mocked(sdk['apiClient'].openSwapDepositChannel).mockResolvedValueOnce({
        status: 201,
        body: {
          id: 'channel id',
          depositAddress: 'deposit address',
          brokerCommissionBps: 0,
          srcChainExpiryBlock: '123',
          estimatedExpiryTime: 1698334470000,
          channelOpeningFee: '0',
          issuedBlock: 1,
          maxBoostFeeBps: 0,
        },
        headers: new Headers(),
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
        recommendedLivePriceSlippageTolerancePercent: 1,
      } as Quote;
      const response = await sdk.requestDepositAddressV2({
        quote,
        destAddress: '0xcafebabe',
        fillOrKillParams: {
          retryDurationBlocks: 500,
          refundAddress: '0xa56A6be23b6Cf39D9448FF6e897C29c41c8fbDFF',
          minPrice: '10000000000000',
          livePriceSlippageTolerancePercent: 1,
        },
      });
      expect(rpcSpy.mock.lastCall).toMatchInlineSnapshot(`
        [
          {
            "body": {
              "amount": "1000000000000000000",
              "ccmParams": undefined,
              "dcaParams": {
                "chunkIntervalBlocks": 5,
                "numberOfChunks": 100,
              },
              "destAddress": "0xcafebabe",
              "destAsset": {
                "asset": "FLIP",
                "chain": "Ethereum",
              },
              "fillOrKillParams": {
                "maxOraclePriceSlippage": 100,
                "minPriceX128": "34028236692093846346337460743176821145600000000000000000000000",
                "refundAddress": "0xa56A6be23b6Cf39D9448FF6e897C29c41c8fbDFF",
                "refundCcmMetadata": null,
                "retryDurationBlocks": 500,
              },
              "maxBoostFeeBps": undefined,
              "quote": {
                "dcaParams": {
                  "chunkIntervalBlocks": 5,
                  "numberOfChunks": 100,
                },
                "depositAmount": "1000000000000000000",
                "destAsset": {
                  "asset": "FLIP",
                  "chain": "Ethereum",
                },
                "isVaultSwap": false,
                "recommendedLivePriceSlippageTolerancePercent": 1,
                "srcAsset": {
                  "asset": "BTC",
                  "chain": "Bitcoin",
                },
                "type": "DCA",
              },
              "srcAddress": undefined,
              "srcAsset": {
                "asset": "BTC",
                "chain": "Bitcoin",
              },
              "takeCommission": false,
            },
          },
        ]
      `);
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
          livePriceSlippageTolerancePercent: 1,
        },
      });
    });

    it('calls openSwapDepositChannel with the correct custom max oracle slippage value', async () => {
      const rpcSpy = vi.mocked(sdk['apiClient'].openSwapDepositChannel).mockResolvedValueOnce({
        status: 201,
        body: {
          id: 'channel id',
          depositAddress: 'deposit address',
          brokerCommissionBps: 0,
          srcChainExpiryBlock: '123',
          estimatedExpiryTime: 1698334470000,
          channelOpeningFee: '0',
          issuedBlock: 1,
          maxBoostFeeBps: 0,
        },
        headers: new Headers(),
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
        recommendedLivePriceSlippageTolerancePercent: 1,
      } as Quote;
      const response = await sdk.requestDepositAddressV2({
        quote,
        destAddress: '0xcafebabe',
        fillOrKillParams: {
          retryDurationBlocks: 500,
          refundAddress: '0xa56A6be23b6Cf39D9448FF6e897C29c41c8fbDFF',
          minPrice: '10000000000000',
          livePriceSlippageTolerancePercent: 2,
        },
      });
      expect(rpcSpy.mock.lastCall).toMatchInlineSnapshot(`
        [
          {
            "body": {
              "amount": "1000000000000000000",
              "ccmParams": undefined,
              "dcaParams": {
                "chunkIntervalBlocks": 5,
                "numberOfChunks": 100,
              },
              "destAddress": "0xcafebabe",
              "destAsset": {
                "asset": "FLIP",
                "chain": "Ethereum",
              },
              "fillOrKillParams": {
                "maxOraclePriceSlippage": 200,
                "minPriceX128": "34028236692093846346337460743176821145600000000000000000000000",
                "refundAddress": "0xa56A6be23b6Cf39D9448FF6e897C29c41c8fbDFF",
                "refundCcmMetadata": null,
                "retryDurationBlocks": 500,
              },
              "maxBoostFeeBps": undefined,
              "quote": {
                "dcaParams": {
                  "chunkIntervalBlocks": 5,
                  "numberOfChunks": 100,
                },
                "depositAmount": "1000000000000000000",
                "destAsset": {
                  "asset": "FLIP",
                  "chain": "Ethereum",
                },
                "isVaultSwap": false,
                "recommendedLivePriceSlippageTolerancePercent": 1,
                "srcAsset": {
                  "asset": "BTC",
                  "chain": "Bitcoin",
                },
                "type": "DCA",
              },
              "srcAddress": undefined,
              "srcAsset": {
                "asset": "BTC",
                "chain": "Bitcoin",
              },
              "takeCommission": false,
            },
          },
        ]
      `);
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
          livePriceSlippageTolerancePercent: 2,
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
        broker: { url: 'https://chainflap.org/broker' },
      }).requestDepositAddressV2({
        quote: {
          srcAsset: { asset: 'BTC', chain: 'Bitcoin' },
          destAsset: { asset: 'FLIP', chain: 'Ethereum' },
          depositAmount: BigInt(1e18).toString(),
          type: 'REGULAR',
          isVaultSwap: false,
          recommendedLivePriceSlippageTolerancePercent: 1,
        } as Quote,
        srcAddress: 'mrV3ee4J3jipspCNPofzB2UbaVu7qgf9Ex',
        destAddress: '0x717e15853fd5f2ac6123e844c3a7c75976eaec9b',
        fillOrKillParams: {
          minPrice: '10000000000000',
          refundAddress: 'tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx',
          retryDurationBlocks: 500,
          livePriceSlippageTolerancePercent: 1,
        },
        brokerCommissionBps: 15,
      });

      expect(postSpy).toHaveBeenNthCalledWith(2, 'https://chainflap.org/broker', [
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
              max_oracle_price_slippage: 100,
              min_price: '0x152d02c7e14af680000000000000000000000000000000000000',
              refund_address: 'tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx',
              refund_ccm_metadata: null,
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
          livePriceSlippageTolerancePercent: 1,
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
        broker: { url: 'https://chainflap.org/broker' },
      }).requestDepositAddressV2({
        quote: {
          srcAsset: { asset: 'BTC', chain: 'Bitcoin' },
          destAsset: { asset: 'FLIP', chain: 'Ethereum' },
          depositAmount: BigInt(1e18).toString(),
          type: 'REGULAR',
          isVaultSwap: false,
          recommendedLivePriceSlippageTolerancePercent: 1,
        } as Quote,
        destAddress: '0x717e15853fd5f2ac6123e844c3a7c75976eaec9b',
        fillOrKillParams: {
          minPrice: '10000000000000',
          refundAddress: 'tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx',
          retryDurationBlocks: 500,
          livePriceSlippageTolerancePercent: 1,
        },
        brokerCommissionBps: 125,
      });

      expect(postSpy).toHaveBeenNthCalledWith(2, 'https://chainflap.org/broker', [
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
              max_oracle_price_slippage: 100,
              min_price: '0x152d02c7e14af680000000000000000000000000000000000000',
              refund_address: 'tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx',
              refund_ccm_metadata: null,
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
          livePriceSlippageTolerancePercent: 1,
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
        broker: { url: 'https://chainflap.org/broker' },
      }).requestDepositAddressV2({
        quote: {
          srcAsset: { asset: 'BTC', chain: 'Bitcoin' },
          destAsset: { asset: 'FLIP', chain: 'Ethereum' },
          depositAmount: BigInt(1e18).toString(),
          type: 'REGULAR',
          isVaultSwap: false,
          recommendedLivePriceSlippageTolerancePercent: 1,
        } as Quote,
        destAddress: '0x717e15853fd5f2ac6123e844c3a7c75976eaec9b',
        fillOrKillParams: {
          minPrice: '10000000000000',
          refundAddress: 'tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx',
          retryDurationBlocks: 500,
          livePriceSlippageTolerancePercent: 1,
        },
        affiliateBrokers: [
          { account: 'cFHyJEHEQ1YkT9xuFnxnPWVkihpYEGjBg4WbF6vCPtSPQoE8n', commissionBps: 10 },
        ],
        brokerCommissionBps: 15,
      });

      expect(postSpy).toHaveBeenNthCalledWith(2, 'https://chainflap.org/broker', [
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
              refund_ccm_metadata: null,
              retry_duration: 500,
              max_oracle_price_slippage: 100,
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
          livePriceSlippageTolerancePercent: 1,
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
        broker: { url: 'https://chainflap.org/broker' },
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
          recommendedLivePriceSlippageTolerancePercent: 1,
        } as Quote,
        destAddress: '0x717e15853fd5f2ac6123e844c3a7c75976eaec9b',
        fillOrKillParams: {
          retryDurationBlocks: 500,
          refundAddress: 'tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx',
          minPrice: '10000000000000',
          livePriceSlippageTolerancePercent: 1,
        },
        brokerCommissionBps: 15,
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
              max_oracle_price_slippage: 100,
              min_price: '0x152d02c7e14af680000000000000000000000000000000000000',
              refund_address: 'tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx',
              refund_ccm_metadata: null,
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
          livePriceSlippageTolerancePercent: 1,
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
        broker: { url: 'https://chainflap.org/broker' },
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
          recommendedLivePriceSlippageTolerancePercent: 1,
        } as Quote,
        destAddress: '0x717e15853fd5f2ac6123e844c3a7c75976eaec9b',
        fillOrKillParams: {
          minPrice: '10000000000000',
          refundAddress: 'tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx',
          retryDurationBlocks: 500,
          livePriceSlippageTolerancePercent: 1,
        },
        ccmParams: {
          gasBudget: '123456789',
          message: '0xdeadc0de',
          ccmAdditionalData: '0xc0ffee',
        },
        brokerCommissionBps: 15,
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
              gas_budget: '0x75bcd15',
              message: '0xdeadc0de',
            },
            null,
            null,
            {
              max_oracle_price_slippage: 100,
              min_price: '0x152d02c7e14af680000000000000000000000000000000000000',
              refund_address: 'tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx',
              refund_ccm_metadata: null,
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
          livePriceSlippageTolerancePercent: 1,
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
        broker: { url: 'https://chainflap.org/broker' },
      }).requestDepositAddressV2({
        quote: {
          srcAsset: { asset: 'BTC', chain: 'Bitcoin' },
          destAsset: { asset: 'FLIP', chain: 'Ethereum' },
          depositAmount: BigInt(1e18).toString(),
          maxBoostFeeBps: MAX_BOOST_FEE_BPS,
          type: 'REGULAR',
          isVaultSwap: false,
          recommendedLivePriceSlippageTolerancePercent: 1,
        } as BoostQuote,
        destAddress: '0x717e15853fd5f2ac6123e844c3a7c75976eaec9b',
        fillOrKillParams: {
          minPrice: '10000000000000',
          refundAddress: 'tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx',
          retryDurationBlocks: 500,
          livePriceSlippageTolerancePercent: 1,
        },
        brokerCommissionBps: 15,
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
              max_oracle_price_slippage: 100,
              min_price: '0x152d02c7e14af680000000000000000000000000000000000000',
              refund_address: 'tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx',
              refund_ccm_metadata: null,
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
          livePriceSlippageTolerancePercent: 1,
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

    it('calls the configured broker api with the correct live price slippage', async () => {
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
        broker: { url: 'https://chainflap.org/broker' },
      }).requestDepositAddressV2({
        quote: {
          srcAsset: { asset: 'BTC', chain: 'Bitcoin' },
          destAsset: { asset: 'FLIP', chain: 'Ethereum' },
          depositAmount: BigInt(1e18).toString(),
          maxBoostFeeBps: MAX_BOOST_FEE_BPS,
          type: 'REGULAR',
          isVaultSwap: false,
          recommendedLivePriceSlippageTolerancePercent: 1,
        } as BoostQuote,
        destAddress: '0x717e15853fd5f2ac6123e844c3a7c75976eaec9b',
        fillOrKillParams: {
          minPrice: '10000000000000',
          refundAddress: 'tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx',
          retryDurationBlocks: 500,
          livePriceSlippageTolerancePercent: 0.5,
        },
        brokerCommissionBps: 15,
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
              max_oracle_price_slippage: 50,
              min_price: '0x152d02c7e14af680000000000000000000000000000000000000',
              refund_address: 'tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx',
              refund_ccm_metadata: null,
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
          livePriceSlippageTolerancePercent: 0.5,
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
          broker: { url: 'https://chainflap.org/broker' },
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
            recommendedLivePriceSlippageTolerancePercent: 1,
          } as Quote,
          destAddress: '0x717e15853fd5f2ac6123e844c3a7c75976eaec9b',
          fillOrKillParams: {
            minPrice: '10000000000000',
            refundAddress: 'tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx',
            retryDurationBlocks: 500,
            livePriceSlippageTolerancePercent: 1,
          },
        }),
      ).rejects.toThrow('Invalid quote type');
    });

    it('throws for missing DCA params', async () => {
      await expect(
        new SwapSDK({
          broker: { url: 'https://chainflap.org/broker' },
        }).requestDepositAddressV2({
          quote: {
            srcAsset: { asset: 'BTC', chain: 'Bitcoin' },
            destAsset: { asset: 'FLIP', chain: 'Ethereum' },
            depositAmount: BigInt(1e18).toString(),
            type: 'DCA',
            isVaultSwap: false,
            recommendedLivePriceSlippageTolerancePercent: 1,
          } as Quote,
          destAddress: '0x717e15853fd5f2ac6123e844c3a7c75976eaec9b',
          fillOrKillParams: {
            minPrice: '10000000000000',
            refundAddress: 'tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx',
            retryDurationBlocks: 500,
            livePriceSlippageTolerancePercent: 1,
          },
        }),
      ).rejects.toThrow('Failed to find DCA parameters from quote');
    });

    it('throws for vault swap quote', async () => {
      await expect(
        new SwapSDK({
          broker: { url: 'https://chainflap.org/broker' },
        }).requestDepositAddressV2({
          quote: {
            srcAsset: { asset: 'BTC', chain: 'Bitcoin' },
            destAsset: { asset: 'FLIP', chain: 'Ethereum' },
            depositAmount: BigInt(1e18).toString(),
            type: 'REGULAR',
            isVaultSwap: true,
            recommendedLivePriceSlippageTolerancePercent: 1,
          } as Quote,
          destAddress: '0x717e15853fd5f2ac6123e844c3a7c75976eaec9b',
          fillOrKillParams: {
            minPrice: '10000000000000',
            refundAddress: 'tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx',
            retryDurationBlocks: 500,
            livePriceSlippageTolerancePercent: 1,
          },
        }),
      ).rejects.toThrow('Cannot open a deposit channel for a vault swap quote');
    });

    it('throws for ccm params with regular quote', async () => {
      await expect(
        new SwapSDK({
          broker: { url: 'https://chainflap.org/broker' },
        }).requestDepositAddressV2({
          quote: {
            srcAsset: { asset: 'BTC', chain: 'Bitcoin' },
            destAsset: { asset: 'FLIP', chain: 'Ethereum' },
            depositAmount: BigInt(1e18).toString(),
            type: 'REGULAR',
            isVaultSwap: false,
            recommendedLivePriceSlippageTolerancePercent: 1,
          } as Quote,
          destAddress: '0x717e15853fd5f2ac6123e844c3a7c75976eaec9b',
          fillOrKillParams: {
            minPrice: '10000000000000',
            refundAddress: 'tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx',
            retryDurationBlocks: 500,
            livePriceSlippageTolerancePercent: 1,
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
          broker: { url: 'https://chainflap.org/broker' },
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
            recommendedLivePriceSlippageTolerancePercent: 1,
          } as Quote,
          destAddress: '0x717e15853fd5f2ac6123e844c3a7c75976eaec9b',
          fillOrKillParams: {
            minPrice: '10000000000000',
            refundAddress: 'tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx',
            retryDurationBlocks: 500,
            livePriceSlippageTolerancePercent: 1,
          },
        }),
      ).rejects.toThrow('Cannot open regular channel for quote with CCM params');
    });

    it('throws if live price slippage tolerance is set but quote does not return it', async () => {
      await expect(
        new SwapSDK({
          broker: { url: 'https://chainflap.org/broker' },
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
            livePriceSlippageTolerancePercent: 1,
          } as FillOrKillParams,
        }),
      ).rejects.toThrow('Live price protection is not available for this asset pair');
    });

    it('does not throw if live price slippage tolerance is neither returned from quote nor set', async () => {
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
        broker: { url: 'https://chainflap.org/broker' },
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
        brokerCommissionBps: 15,
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
              max_oracle_price_slippage: null,
              min_price: '0x152d02c7e14af680000000000000000000000000000000000000',
              refund_address: 'tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx',
              refund_ccm_metadata: null,
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

    describe('checkLivePriceProtectionRequirement', () => {
      it('throws when live price protection is required but disabled for DCA quote', async () => {
        const dcaSdk = new SwapSDK({ network: 'sisyphos', enabledFeatures: { dcaV2: true } });

        await expect(
          dcaSdk.requestDepositAddressV2({
            quote: {
              srcAsset: { asset: 'ETH', chain: 'Ethereum' },
              destAsset: { asset: 'USDC', chain: 'Ethereum' },
              depositAmount: BigInt(1e18).toString(),
              type: 'DCA',
              dcaParams: {
                numberOfChunks: 100,
                chunkIntervalBlocks: 5,
              },
              isVaultSwap: false,
              recommendedLivePriceSlippageTolerancePercent: 1,
            } as Quote,
            destAddress: '0xcafebabe',
            fillOrKillParams: {
              retryDurationBlocks: 500,
              refundAddress: '0xa56A6be23b6Cf39D9448FF6e897C29c41c8fbDFF',
              minPrice: '10000000000000',
              livePriceSlippageTolerancePercent: false,
            },
          }),
        ).rejects.toThrow(
          'Max oracle price slippage must be set in FillOrKillParams when live price protection is enabled for both assets in DCA V2',
        );
      });

      it('does not throw for non-DCA quotes', async () => {
        const dcaSdk = new SwapSDK({ network: 'sisyphos', enabledFeatures: { dcaV2: true } });
        vi.mocked(dcaSdk['apiClient'].openSwapDepositChannel).mockResolvedValueOnce({
          status: 201,
          body: {
            id: 'channel id',
            depositAddress: 'deposit address',
            brokerCommissionBps: 0,
            srcChainExpiryBlock: '123',
            estimatedExpiryTime: 1698334470000,
            channelOpeningFee: '0',
            issuedBlock: 1,
            maxBoostFeeBps: 0,
          },
          headers: new Headers(),
        });

        await expect(
          dcaSdk.requestDepositAddressV2({
            quote: {
              srcAsset: { asset: 'ETH', chain: 'Ethereum' },
              destAsset: { asset: 'USDC', chain: 'Ethereum' },
              depositAmount: BigInt(1e18).toString(),
              type: 'REGULAR',
              isVaultSwap: false,
              recommendedLivePriceSlippageTolerancePercent: 1,
            } as Quote,
            destAddress: '0xcafebabe',
            fillOrKillParams: {
              retryDurationBlocks: 500,
              refundAddress: '0xa56A6be23b6Cf39D9448FF6e897C29c41c8fbDFF',
              minPrice: '10000000000000',
              livePriceSlippageTolerancePercent: false,
            },
          }),
        ).resolves.toBeDefined();
      });

      it('does not throw when dcaV2 is disabled', async () => {
        const nonDcaSdk = new SwapSDK({ network: 'sisyphos', enabledFeatures: { dcaV2: false } });
        vi.mocked(nonDcaSdk['apiClient'].openSwapDepositChannel).mockResolvedValueOnce({
          status: 201,
          body: {
            id: 'channel id',
            depositAddress: 'deposit address',
            brokerCommissionBps: 0,
            srcChainExpiryBlock: '123',
            estimatedExpiryTime: 1698334470000,
            channelOpeningFee: '0',
            issuedBlock: 1,
            maxBoostFeeBps: 0,
          },
          headers: new Headers(),
        });

        await expect(
          nonDcaSdk.requestDepositAddressV2({
            quote: {
              srcAsset: { asset: 'ETH', chain: 'Ethereum' },
              destAsset: { asset: 'USDC', chain: 'Ethereum' },
              depositAmount: BigInt(1e18).toString(),
              type: 'REGULAR',
              isVaultSwap: false,
              recommendedLivePriceSlippageTolerancePercent: 1,
            } as Quote,
            destAddress: '0xcafebabe',
            fillOrKillParams: {
              retryDurationBlocks: 500,
              refundAddress: '0xa56A6be23b6Cf39D9448FF6e897C29c41c8fbDFF',
              minPrice: '10000000000000',
              livePriceSlippageTolerancePercent: false,
            },
          }),
        ).resolves.toBeDefined();
      });

      it('does not throw when one asset lacks live price protection', async () => {
        const dcaSdk = new SwapSDK({ network: 'sisyphos', enabledFeatures: { dcaV2: true } });
        vi.mocked(dcaSdk['apiClient'].openSwapDepositChannel).mockResolvedValueOnce({
          status: 201,
          body: {
            id: 'channel id',
            depositAddress: 'deposit address',
            brokerCommissionBps: 0,
            srcChainExpiryBlock: '123',
            estimatedExpiryTime: 1698334470000,
            channelOpeningFee: '0',
            issuedBlock: 1,
            maxBoostFeeBps: 0,
          },
          headers: new Headers(),
        });

        await expect(
          dcaSdk.requestDepositAddressV2({
            quote: {
              srcAsset: { asset: 'ETH', chain: 'Ethereum' },
              destAsset: { asset: 'FLIP', chain: 'Ethereum' },
              depositAmount: BigInt(1e18).toString(),
              type: 'REGULAR',
              isVaultSwap: false,
              recommendedLivePriceSlippageTolerancePercent: 1,
            } as Quote,
            destAddress: '0xcafebabe',
            fillOrKillParams: {
              retryDurationBlocks: 500,
              refundAddress: '0xa56A6be23b6Cf39D9448FF6e897C29c41c8fbDFF',
              minPrice: '10000000000000',
              livePriceSlippageTolerancePercent: false,
            },
          }),
        ).resolves.toBeDefined();
      });

      it('does not throw when livePriceSlippageTolerancePercent is set', async () => {
        const dcaSdk = new SwapSDK({ network: 'sisyphos', enabledFeatures: { dcaV2: true } });
        vi.mocked(dcaSdk['apiClient'].openSwapDepositChannel).mockResolvedValueOnce({
          status: 201,
          body: {
            id: 'channel id',
            depositAddress: 'deposit address',
            brokerCommissionBps: 0,
            srcChainExpiryBlock: '123',
            estimatedExpiryTime: 1698334470000,
            channelOpeningFee: '0',
            issuedBlock: 1,
            maxBoostFeeBps: 0,
          },
          headers: new Headers(),
        });

        await expect(
          dcaSdk.requestDepositAddressV2({
            quote: {
              srcAsset: { asset: 'ETH', chain: 'Ethereum' },
              destAsset: { asset: 'USDC', chain: 'Ethereum' },
              depositAmount: BigInt(1e18).toString(),
              type: 'REGULAR',
              isVaultSwap: false,
              recommendedLivePriceSlippageTolerancePercent: 1,
            } as Quote,
            destAddress: '0xcafebabe',
            fillOrKillParams: {
              retryDurationBlocks: 500,
              refundAddress: '0xa56A6be23b6Cf39D9448FF6e897C29c41c8fbDFF',
              minPrice: '10000000000000',
              livePriceSlippageTolerancePercent: 1,
            },
          }),
        ).resolves.toBeDefined();
      });
    });
  });

  describe(SwapSDK.prototype.encodeVaultSwapData, () => {
    it('calls encodeVaultSwapData with refund parameters for slippage', async () => {
      const rpcSpy = vi.mocked(sdk['apiClient'].encodeVaultSwapData).mockResolvedValueOnce({
        status: 200,
        body: {
          chain: 'Bitcoin',
          nulldataPayload:
            '0x0003656623d865425c0a4955ef7e7a39d09f58554d0800000000000000000000000000000000000001000200000100',
          depositAddress: 'bcrt1pmrhjpvq2w7cgesrcrvuhqw6n6j487l6uc7tmwtx9jen7ezesunhqllvzxx',
        },
        headers: new Headers(),
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
      expect(rpcSpy.mock.lastCall).toMatchInlineSnapshot(`
        [
          {
            "body": {
              "affiliates": undefined,
              "amount": "1000000000000000000",
              "brokerAccount": undefined,
              "ccmParams": undefined,
              "commissionBps": 0,
              "dcaParams": undefined,
              "destAddress": "0xcafebabe",
              "destAsset": {
                "asset": "FLIP",
                "chain": "Ethereum",
              },
              "extraParams": undefined,
              "fillOrKillParams": {
                "maxOraclePriceSlippage": null,
                "minPriceX128": "8379453285428109662785599708007292207104000000000000",
                "refundAddress": "0xa56A6be23b6Cf39D9448FF6e897C29c41c8fbDFF",
                "refundCcmMetadata": null,
                "retryDurationBlocks": 500,
              },
              "maxBoostFeeBps": undefined,
              "srcAddress": undefined,
              "srcAsset": {
                "asset": "BTC",
                "chain": "Bitcoin",
              },
            },
          },
        ]
      `);
      expect(response).toStrictEqual({
        chain: 'Bitcoin',
        nulldataPayload:
          '0x0003656623d865425c0a4955ef7e7a39d09f58554d0800000000000000000000000000000000000001000200000100',
        depositAddress: 'bcrt1pmrhjpvq2w7cgesrcrvuhqw6n6j487l6uc7tmwtx9jen7ezesunhqllvzxx',
      });
    });

    it('calls encodeVaultSwapData with commission and dca parameters', async () => {
      const rpcSpy = vi.mocked(sdk['apiClient'].encodeVaultSwapData).mockResolvedValueOnce({
        status: 200,
        body: {
          chain: 'Bitcoin',
          nulldataPayload:
            '0x0003656623d865425c0a4955ef7e7a39d09f58554d0800000000000000000000000000000000000001000200000100',
          depositAddress: 'bcrt1pmrhjpvq2w7cgesrcrvuhqw6n6j487l6uc7tmwtx9jen7ezesunhqllvzxx',
        },
        headers: new Headers(),
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
      expect(rpcSpy.mock.lastCall).toMatchInlineSnapshot(`
        [
          {
            "body": {
              "affiliates": [
                {
                  "account": "cFLdocJo3bjT7JbT7R46cA89QfvoitrKr9P3TsMcdkVWeeVLa",
                  "commissionBps": 10,
                },
              ],
              "amount": "1000000000000000000",
              "brokerAccount": "cFLdocJo3bjT7JbT7R46cA89QfvoitrKr9P3TsMcdkVWeeVLa",
              "ccmParams": undefined,
              "commissionBps": 15,
              "dcaParams": {
                "chunkIntervalBlocks": 5,
                "numberOfChunks": 100,
              },
              "destAddress": "0xcafebabe",
              "destAsset": {
                "asset": "FLIP",
                "chain": "Ethereum",
              },
              "extraParams": undefined,
              "fillOrKillParams": {
                "maxOraclePriceSlippage": null,
                "minPriceX128": "34028236692093846346337460743176821145600000000000000000000000",
                "refundAddress": "0xa56A6be23b6Cf39D9448FF6e897C29c41c8fbDFF",
                "refundCcmMetadata": null,
                "retryDurationBlocks": 500,
              },
              "maxBoostFeeBps": undefined,
              "srcAddress": undefined,
              "srcAsset": {
                "asset": "BTC",
                "chain": "Bitcoin",
              },
            },
          },
        ]
      `);
      expect(response).toStrictEqual({
        chain: 'Bitcoin',
        nulldataPayload:
          '0x0003656623d865425c0a4955ef7e7a39d09f58554d0800000000000000000000000000000000000001000200000100',
        depositAddress: 'bcrt1pmrhjpvq2w7cgesrcrvuhqw6n6j487l6uc7tmwtx9jen7ezesunhqllvzxx',
      });
    });

    it('calls encodeVaultSwapData with max oracle slippage', async () => {
      const rpcSpy = vi.mocked(sdk['apiClient'].encodeVaultSwapData).mockResolvedValueOnce({
        status: 200,
        body: {
          chain: 'Bitcoin',
          nulldataPayload:
            '0x0003656623d865425c0a4955ef7e7a39d09f58554d0800000000000000000000000000000000000001000200000100',
          depositAddress: 'bcrt1pmrhjpvq2w7cgesrcrvuhqw6n6j487l6uc7tmwtx9jen7ezesunhqllvzxx',
        },
        headers: new Headers(),
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
        recommendedLivePriceSlippageTolerancePercent: 1,
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
      expect(rpcSpy.mock.lastCall).toMatchInlineSnapshot(`
        [
          {
            "body": {
              "affiliates": [
                {
                  "account": "cFLdocJo3bjT7JbT7R46cA89QfvoitrKr9P3TsMcdkVWeeVLa",
                  "commissionBps": 10,
                },
              ],
              "amount": "1000000000000000000",
              "brokerAccount": "cFLdocJo3bjT7JbT7R46cA89QfvoitrKr9P3TsMcdkVWeeVLa",
              "ccmParams": undefined,
              "commissionBps": 15,
              "dcaParams": {
                "chunkIntervalBlocks": 5,
                "numberOfChunks": 100,
              },
              "destAddress": "0xcafebabe",
              "destAsset": {
                "asset": "FLIP",
                "chain": "Ethereum",
              },
              "extraParams": undefined,
              "fillOrKillParams": {
                "maxOraclePriceSlippage": 100,
                "minPriceX128": "34028236692093846346337460743176821145600000000000000000000000",
                "refundAddress": "0xa56A6be23b6Cf39D9448FF6e897C29c41c8fbDFF",
                "refundCcmMetadata": null,
                "retryDurationBlocks": 500,
              },
              "maxBoostFeeBps": undefined,
              "srcAddress": undefined,
              "srcAsset": {
                "asset": "BTC",
                "chain": "Bitcoin",
              },
            },
          },
        ]
      `);
      expect(response).toStrictEqual({
        chain: 'Bitcoin',
        nulldataPayload:
          '0x0003656623d865425c0a4955ef7e7a39d09f58554d0800000000000000000000000000000000000001000200000100',
        depositAddress: 'bcrt1pmrhjpvq2w7cgesrcrvuhqw6n6j487l6uc7tmwtx9jen7ezesunhqllvzxx',
      });
    });

    it('calls encodeVaultSwapData with the correct custom max oracle slippage value', async () => {
      const rpcSpy = vi.mocked(sdk['apiClient'].encodeVaultSwapData).mockResolvedValueOnce({
        status: 200,
        body: {
          chain: 'Bitcoin',
          nulldataPayload:
            '0x0003656623d865425c0a4955ef7e7a39d09f58554d0800000000000000000000000000000000000001000200000100',
          depositAddress: 'bcrt1pmrhjpvq2w7cgesrcrvuhqw6n6j487l6uc7tmwtx9jen7ezesunhqllvzxx',
        },
        headers: new Headers(),
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
        recommendedLivePriceSlippageTolerancePercent: 1,
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
          livePriceSlippageTolerancePercent: 2,
        },
      });
      expect(rpcSpy.mock.lastCall).toMatchInlineSnapshot(`
        [
          {
            "body": {
              "affiliates": [
                {
                  "account": "cFLdocJo3bjT7JbT7R46cA89QfvoitrKr9P3TsMcdkVWeeVLa",
                  "commissionBps": 10,
                },
              ],
              "amount": "1000000000000000000",
              "brokerAccount": "cFLdocJo3bjT7JbT7R46cA89QfvoitrKr9P3TsMcdkVWeeVLa",
              "ccmParams": undefined,
              "commissionBps": 15,
              "dcaParams": {
                "chunkIntervalBlocks": 5,
                "numberOfChunks": 100,
              },
              "destAddress": "0xcafebabe",
              "destAsset": {
                "asset": "FLIP",
                "chain": "Ethereum",
              },
              "extraParams": undefined,
              "fillOrKillParams": {
                "maxOraclePriceSlippage": 200,
                "minPriceX128": "34028236692093846346337460743176821145600000000000000000000000",
                "refundAddress": "0xa56A6be23b6Cf39D9448FF6e897C29c41c8fbDFF",
                "refundCcmMetadata": null,
                "retryDurationBlocks": 500,
              },
              "maxBoostFeeBps": undefined,
              "srcAddress": undefined,
              "srcAsset": {
                "asset": "BTC",
                "chain": "Bitcoin",
              },
            },
          },
        ]
      `);
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
        broker: { url: 'https://chainflap.org/broker' },
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
        brokerCommissionBps: 15,
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
              max_oracle_price_slippage: null,
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
        broker: { url: 'https://chainflap.org/broker' },
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
        brokerCommissionBps: 15,
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
              max_oracle_price_slippage: null,
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
        broker: { url: 'https://chainflap.org/broker' },
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
        brokerCommissionBps: 15,
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
              max_oracle_price_slippage: null,
            },
            {
              gas_budget: '0x75bcd15',
              message: '0xdeadc0de',
              ccm_additional_data: '0xc0ffee',
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
        broker: { url: 'https://chainflap.org/broker' },
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
        brokerCommissionBps: 15,
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
              max_oracle_price_slippage: null,
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
          broker: { url: 'https://chainflap.org/broker' },
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
          broker: { url: 'https://chainflap.org/broker' },
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
          broker: { url: 'https://chainflap.org/broker' },
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
          broker: { url: 'https://chainflap.org/broker' },
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
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `[Error: Cannot encode vault swap data for non-vault swap quotes]`,
      );
    });

    it('throws for ccm params with regular quote', async () => {
      await expect(
        new SwapSDK({
          broker: { url: 'https://chainflap.org/broker' },
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
          broker: { url: 'https://chainflap.org/broker' },
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

    it('throws if live price slippage tolerance is set but quote does not return it', async () => {
      await expect(
        new SwapSDK({
          broker: { url: 'https://chainflap.org/broker' },
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
            livePriceSlippageTolerancePercent: 1,
          } as FillOrKillParams,
        }),
      ).rejects.toThrow('Live price protection is not available for this asset pair');
    });

    describe('checkLivePriceProtectionRequirement', () => {
      it('throws when live price protection is required but disabled for DCA quote', async () => {
        const dcaSdk = new SwapSDK({ network: 'sisyphos', enabledFeatures: { dcaV2: true } });

        await expect(
          dcaSdk.encodeVaultSwapData({
            quote: {
              srcAsset: { asset: 'ETH', chain: 'Ethereum' },
              destAsset: { asset: 'USDC', chain: 'Ethereum' },
              depositAmount: BigInt(1e18).toString(),
              type: 'DCA',
              dcaParams: {
                numberOfChunks: 100,
                chunkIntervalBlocks: 5,
              },
              isVaultSwap: true,
              recommendedLivePriceSlippageTolerancePercent: 1,
            } as Quote,
            destAddress: '0xcafebabe',
            fillOrKillParams: {
              retryDurationBlocks: 500,
              refundAddress: '0xa56A6be23b6Cf39D9448FF6e897C29c41c8fbDFF',
              minPrice: '10000000000000',
              livePriceSlippageTolerancePercent: false,
            },
          }),
        ).rejects.toThrow(
          'Max oracle price slippage must be set in FillOrKillParams when live price protection is enabled for both assets in DCA V2',
        );
      });

      it('does not throw for non-DCA quotes', async () => {
        const dcaSdk = new SwapSDK({ network: 'sisyphos', enabledFeatures: { dcaV2: true } });
        vi.mocked(dcaSdk['apiClient'].encodeVaultSwapData).mockResolvedValueOnce({
          status: 200,
          body: {
            chain: 'Ethereum',
            calldata: '0x1234',
            to: '0xabc',
            value: '0',
          },
          headers: new Headers(),
        });

        await expect(
          dcaSdk.encodeVaultSwapData({
            quote: {
              srcAsset: { asset: 'ETH', chain: 'Ethereum' },
              destAsset: { asset: 'USDC', chain: 'Ethereum' },
              depositAmount: BigInt(1e18).toString(),
              type: 'REGULAR',
              isVaultSwap: true,
              recommendedLivePriceSlippageTolerancePercent: 1,
            } as Quote,
            destAddress: '0xcafebabe',
            fillOrKillParams: {
              retryDurationBlocks: 500,
              refundAddress: '0xa56A6be23b6Cf39D9448FF6e897C29c41c8fbDFF',
              minPrice: '10000000000000',
              livePriceSlippageTolerancePercent: false,
            },
          }),
        ).resolves.toBeDefined();
      });

      it('does not throw when dcaV2 is disabled', async () => {
        const nonDcaSdk = new SwapSDK({ network: 'sisyphos', enabledFeatures: { dcaV2: false } });
        vi.mocked(nonDcaSdk['apiClient'].encodeVaultSwapData).mockResolvedValueOnce({
          status: 200,
          body: {
            chain: 'Ethereum',
            calldata: '0x',
            to: '0x',
            sourceTokenAddress: '0x',
            value: '0',
          },
          headers: new Headers(),
        });

        await expect(
          nonDcaSdk.encodeVaultSwapData({
            quote: {
              srcAsset: { asset: 'ETH', chain: 'Ethereum' },
              destAsset: { asset: 'USDC', chain: 'Ethereum' },
              depositAmount: BigInt(1e18).toString(),
              type: 'REGULAR',
              isVaultSwap: true,
              recommendedLivePriceSlippageTolerancePercent: 1,
            } as Quote,
            destAddress: '0xcafebabe',
            fillOrKillParams: {
              retryDurationBlocks: 500,
              refundAddress: '0xa56A6be23b6Cf39D9448FF6e897C29c41c8fbDFF',
              minPrice: '10000000000000',
              livePriceSlippageTolerancePercent: false,
            },
          }),
        ).resolves.toBeDefined();
      });

      it('does not throw when one asset lacks live price protection', async () => {
        const dcaSdk = new SwapSDK({ network: 'sisyphos', enabledFeatures: { dcaV2: true } });
        vi.mocked(dcaSdk['apiClient'].encodeVaultSwapData).mockResolvedValueOnce({
          status: 200,
          body: {
            chain: 'Ethereum',
            calldata: '0x1234',
            to: '0xabc',
            value: '0',
          },
          headers: new Headers(),
        });

        await expect(
          dcaSdk.encodeVaultSwapData({
            quote: {
              srcAsset: { asset: 'ETH', chain: 'Ethereum' },
              destAsset: { asset: 'FLIP', chain: 'Ethereum' },
              depositAmount: BigInt(1e18).toString(),
              type: 'REGULAR',
              isVaultSwap: true,
              recommendedLivePriceSlippageTolerancePercent: 1,
            } as Quote,
            destAddress: '0xcafebabe',
            fillOrKillParams: {
              retryDurationBlocks: 500,
              refundAddress: '0xa56A6be23b6Cf39D9448FF6e897C29c41c8fbDFF',
              minPrice: '10000000000000',
              livePriceSlippageTolerancePercent: false,
            },
          }),
        ).resolves.toBeDefined();
      });

      it('does not throw when livePriceSlippageTolerancePercent is set', async () => {
        const dcaSdk = new SwapSDK({ network: 'sisyphos', enabledFeatures: { dcaV2: true } });
        vi.mocked(dcaSdk['apiClient'].encodeVaultSwapData).mockResolvedValueOnce({
          status: 200,
          body: {
            chain: 'Ethereum',
            calldata: '0x1234',
            to: '0xabc',
            value: '0',
          },
          headers: new Headers(),
        });

        await expect(
          dcaSdk.encodeVaultSwapData({
            quote: {
              srcAsset: { asset: 'ETH', chain: 'Ethereum' },
              destAsset: { asset: 'USDC', chain: 'Ethereum' },
              depositAmount: BigInt(1e18).toString(),
              type: 'REGULAR',
              isVaultSwap: true,
              recommendedLivePriceSlippageTolerancePercent: 1,
            } as Quote,
            destAddress: '0xcafebabe',
            fillOrKillParams: {
              retryDurationBlocks: 500,
              refundAddress: '0xa56A6be23b6Cf39D9448FF6e897C29c41c8fbDFF',
              minPrice: '10000000000000',
              livePriceSlippageTolerancePercent: 1,
            },
          }),
        ).resolves.toBeDefined();
      });
    });
  });

  describe(SwapSDK.prototype.encodeCfParameters, () => {
    it('calls encodeCfParameters with refund parameters for slippage', async () => {
      const rpcSpy = vi.mocked(sdk['apiClient'].encodeCfParameters).mockResolvedValueOnce({
        status: 200,
        body: '0x1234',
        headers: new Headers(),
      });

      const quote = {
        srcAsset: { asset: 'BTC', chain: 'Bitcoin' },
        destAsset: { asset: 'FLIP', chain: 'Ethereum' },
        depositAmount: BigInt(1e18).toString(),
        estimatedPrice: '2500',
        type: 'REGULAR',
        isVaultSwap: true,
      } as Quote;
      const response = await sdk.encodeCfParameters({
        quote,
        destAddress: '0xcafebabe',
        fillOrKillParams: {
          retryDurationBlocks: 500,
          refundAddress: '0xa56A6be23b6Cf39D9448FF6e897C29c41c8fbDFF',
          slippageTolerancePercent: '1.5',
        },
      });
      expect(rpcSpy.mock.lastCall).toMatchInlineSnapshot(`
        [
          {
            "body": {
              "affiliates": undefined,
              "amount": "1000000000000000000",
              "brokerAccount": undefined,
              "ccmParams": undefined,
              "commissionBps": 0,
              "dcaParams": undefined,
              "destAddress": "0xcafebabe",
              "destAsset": {
                "asset": "FLIP",
                "chain": "Ethereum",
              },
              "fillOrKillParams": {
                "maxOraclePriceSlippage": null,
                "minPriceX128": "8379453285428109662785599708007292207104000000000000",
                "refundAddress": "0xa56A6be23b6Cf39D9448FF6e897C29c41c8fbDFF",
                "refundCcmMetadata": null,
                "retryDurationBlocks": 500,
              },
              "maxBoostFeeBps": undefined,
              "srcAddress": undefined,
              "srcAsset": {
                "asset": "BTC",
                "chain": "Bitcoin",
              },
            },
          },
        ]
      `);
      expect(response).toStrictEqual('0x1234');
    });

    it('calls encodeCfParameters with commission and dca parameters', async () => {
      const rpcSpy = vi.mocked(sdk['apiClient'].encodeCfParameters).mockResolvedValueOnce({
        status: 200,
        body: '0x1234',
        headers: new Headers(),
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
      const response = await sdk.encodeCfParameters({
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
      expect(rpcSpy.mock.lastCall).toMatchInlineSnapshot(`
        [
          {
            "body": {
              "affiliates": [
                {
                  "account": "cFLdocJo3bjT7JbT7R46cA89QfvoitrKr9P3TsMcdkVWeeVLa",
                  "commissionBps": 10,
                },
              ],
              "amount": "1000000000000000000",
              "brokerAccount": "cFLdocJo3bjT7JbT7R46cA89QfvoitrKr9P3TsMcdkVWeeVLa",
              "ccmParams": undefined,
              "commissionBps": 15,
              "dcaParams": {
                "chunkIntervalBlocks": 5,
                "numberOfChunks": 100,
              },
              "destAddress": "0xcafebabe",
              "destAsset": {
                "asset": "FLIP",
                "chain": "Ethereum",
              },
              "fillOrKillParams": {
                "maxOraclePriceSlippage": null,
                "minPriceX128": "34028236692093846346337460743176821145600000000000000000000000",
                "refundAddress": "0xa56A6be23b6Cf39D9448FF6e897C29c41c8fbDFF",
                "refundCcmMetadata": null,
                "retryDurationBlocks": 500,
              },
              "maxBoostFeeBps": undefined,
              "srcAddress": undefined,
              "srcAsset": {
                "asset": "BTC",
                "chain": "Bitcoin",
              },
            },
          },
        ]
      `);
      expect(response).toStrictEqual('0x1234');
    });

    it('calls encodeCfParameters with max oracle slippage', async () => {
      const rpcSpy = vi.mocked(sdk['apiClient'].encodeCfParameters).mockResolvedValueOnce({
        status: 200,
        body: '0x1234',
        headers: new Headers(),
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
        recommendedLivePriceSlippageTolerancePercent: 0.5,
      } as Quote;
      const response = await sdk.encodeCfParameters({
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
          livePriceSlippageTolerancePercent: 0.5,
        },
      });
      expect(rpcSpy.mock.lastCall).toMatchInlineSnapshot(`
        [
          {
            "body": {
              "affiliates": [
                {
                  "account": "cFLdocJo3bjT7JbT7R46cA89QfvoitrKr9P3TsMcdkVWeeVLa",
                  "commissionBps": 10,
                },
              ],
              "amount": "1000000000000000000",
              "brokerAccount": "cFLdocJo3bjT7JbT7R46cA89QfvoitrKr9P3TsMcdkVWeeVLa",
              "ccmParams": undefined,
              "commissionBps": 15,
              "dcaParams": {
                "chunkIntervalBlocks": 5,
                "numberOfChunks": 100,
              },
              "destAddress": "0xcafebabe",
              "destAsset": {
                "asset": "FLIP",
                "chain": "Ethereum",
              },
              "fillOrKillParams": {
                "maxOraclePriceSlippage": 50,
                "minPriceX128": "34028236692093846346337460743176821145600000000000000000000000",
                "refundAddress": "0xa56A6be23b6Cf39D9448FF6e897C29c41c8fbDFF",
                "refundCcmMetadata": null,
                "retryDurationBlocks": 500,
              },
              "maxBoostFeeBps": undefined,
              "srcAddress": undefined,
              "srcAsset": {
                "asset": "BTC",
                "chain": "Bitcoin",
              },
            },
          },
        ]
      `);
      expect(response).toStrictEqual('0x1234');
    });

    it('calls encodeCfParameters with the correct custom max oracle slippage value', async () => {
      const rpcSpy = vi.mocked(sdk['apiClient'].encodeCfParameters).mockResolvedValueOnce({
        status: 200,
        body: '0x1234',
        headers: new Headers(),
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
        recommendedLivePriceSlippageTolerancePercent: 0.5,
      } as Quote;
      const response = await sdk.encodeCfParameters({
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
          livePriceSlippageTolerancePercent: 2,
        },
      });
      expect(rpcSpy.mock.lastCall).toMatchInlineSnapshot(`
        [
          {
            "body": {
              "affiliates": [
                {
                  "account": "cFLdocJo3bjT7JbT7R46cA89QfvoitrKr9P3TsMcdkVWeeVLa",
                  "commissionBps": 10,
                },
              ],
              "amount": "1000000000000000000",
              "brokerAccount": "cFLdocJo3bjT7JbT7R46cA89QfvoitrKr9P3TsMcdkVWeeVLa",
              "ccmParams": undefined,
              "commissionBps": 15,
              "dcaParams": {
                "chunkIntervalBlocks": 5,
                "numberOfChunks": 100,
              },
              "destAddress": "0xcafebabe",
              "destAsset": {
                "asset": "FLIP",
                "chain": "Ethereum",
              },
              "fillOrKillParams": {
                "maxOraclePriceSlippage": 200,
                "minPriceX128": "34028236692093846346337460743176821145600000000000000000000000",
                "refundAddress": "0xa56A6be23b6Cf39D9448FF6e897C29c41c8fbDFF",
                "refundCcmMetadata": null,
                "retryDurationBlocks": 500,
              },
              "maxBoostFeeBps": undefined,
              "srcAddress": undefined,
              "srcAsset": {
                "asset": "BTC",
                "chain": "Bitcoin",
              },
            },
          },
        ]
      `);
      expect(response).toStrictEqual('0x1234');
    });

    it('calls encodeCfParameters with default live price protection from quote', async () => {
      const rpcSpy = vi.mocked(sdk['apiClient'].encodeCfParameters).mockResolvedValueOnce({
        status: 200,
        body: '0x1234',
        headers: new Headers(),
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
        recommendedLivePriceSlippageTolerancePercent: 0.5,
      } as Quote;
      const response = await sdk.encodeCfParameters({
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
        } as FillOrKillParams,
      });
      expect(rpcSpy.mock.lastCall).toMatchInlineSnapshot(`
        [
          {
            "body": {
              "affiliates": [
                {
                  "account": "cFLdocJo3bjT7JbT7R46cA89QfvoitrKr9P3TsMcdkVWeeVLa",
                  "commissionBps": 10,
                },
              ],
              "amount": "1000000000000000000",
              "brokerAccount": "cFLdocJo3bjT7JbT7R46cA89QfvoitrKr9P3TsMcdkVWeeVLa",
              "ccmParams": undefined,
              "commissionBps": 15,
              "dcaParams": {
                "chunkIntervalBlocks": 5,
                "numberOfChunks": 100,
              },
              "destAddress": "0xcafebabe",
              "destAsset": {
                "asset": "FLIP",
                "chain": "Ethereum",
              },
              "fillOrKillParams": {
                "maxOraclePriceSlippage": 50,
                "minPriceX128": "34028236692093846346337460743176821145600000000000000000000000",
                "refundAddress": "0xa56A6be23b6Cf39D9448FF6e897C29c41c8fbDFF",
                "refundCcmMetadata": null,
                "retryDurationBlocks": 500,
              },
              "maxBoostFeeBps": undefined,
              "srcAddress": undefined,
              "srcAsset": {
                "asset": "BTC",
                "chain": "Bitcoin",
              },
            },
          },
        ]
      `);
      expect(response).toStrictEqual('0x1234');
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
        sdk.encodeCfParameters({
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
        sdk.encodeCfParameters({
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
        if (data.method === 'broker_encode_cf_parameters') {
          return Promise.resolve({
            data: { id: '1', jsonrpc: '2.0', result: '0x1234' },
          });
        }

        return defaultRpcMocks(url, data);
      });

      const result = await new SwapSDK({
        broker: { url: 'https://chainflap.org/broker' },
      }).encodeCfParameters({
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
        brokerCommissionBps: 15,
      });

      expect(postSpy.mock.lastCall![0]).toStrictEqual('https://chainflap.org/broker');
      expect(postSpy.mock.lastCall![1][0]).toMatchInlineSnapshot(
        { id: expect.any(String) },
        `
        {
          "id": Any<String>,
          "jsonrpc": "2.0",
          "method": "broker_encode_cf_parameters",
          "params": [
            {
              "asset": "BTC",
              "chain": "Bitcoin",
            },
            {
              "asset": "FLIP",
              "chain": "Ethereum",
            },
            "0x717e15853fd5f2ac6123e844c3a7c75976eaec9b",
            15,
            {
              "max_oracle_price_slippage": null,
              "min_price": "0x152d02c7e14af680000000000000000000000000000000000000",
              "refund_address": "tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx",
              "refund_ccm_metadata": null,
              "retry_duration": 500,
            },
            null,
            null,
            [
              {
                "account": "cFHyJEHEQ1YkT9xuFnxnPWVkihpYEGjBg4WbF6vCPtSPQoE8n",
                "bps": 10,
              },
            ],
            null,
          ],
        }
      `,
      );
      expect(result).toStrictEqual('0x1234');
    });

    it('calls the configured broker api with the given dca parameters', async () => {
      const postSpy = mockRpcResponse((url, data: any) => {
        if (data.method === 'broker_encode_cf_parameters') {
          return Promise.resolve({
            data: { id: '1', jsonrpc: '2.0', result: '0x1234' },
          });
        }

        return defaultRpcMocks(url, data);
      });

      const result = await new SwapSDK({
        broker: { url: 'https://chainflap.org/broker' },
      }).encodeCfParameters({
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
        brokerCommissionBps: 15,
      });

      expect(postSpy.mock.lastCall![0]).toStrictEqual('https://chainflap.org/broker');
      expect(postSpy.mock.lastCall![1][0]).toMatchInlineSnapshot(
        { id: expect.any(String) },
        `
        {
          "id": Any<String>,
          "jsonrpc": "2.0",
          "method": "broker_encode_cf_parameters",
          "params": [
            {
              "asset": "BTC",
              "chain": "Bitcoin",
            },
            {
              "asset": "FLIP",
              "chain": "Ethereum",
            },
            "0x717e15853fd5f2ac6123e844c3a7c75976eaec9b",
            15,
            {
              "max_oracle_price_slippage": null,
              "min_price": "0x152d02c7e14af680000000000000000000000000000000000000",
              "refund_address": "tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx",
              "refund_ccm_metadata": null,
              "retry_duration": 500,
            },
            null,
            null,
            null,
            {
              "chunk_interval": 5,
              "number_of_chunks": 100,
            },
          ],
        }
      `,
      );
      expect(result).toStrictEqual('0x1234');
    });

    it('calls the configured broker api with the given ccm parameters', async () => {
      const postSpy = mockRpcResponse((url, data: any) => {
        if (data.method === 'broker_encode_cf_parameters') {
          return Promise.resolve({
            data: { id: '1', jsonrpc: '2.0', result: '0x1234' },
          });
        }

        return defaultRpcMocks(url, data);
      });

      const result = await new SwapSDK({
        broker: { url: 'https://chainflap.org/broker' },
      }).encodeCfParameters({
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
        brokerCommissionBps: 15,
      });

      expect(postSpy.mock.lastCall![0]).toStrictEqual('https://chainflap.org/broker');
      expect(postSpy.mock.lastCall![1][0]).toMatchInlineSnapshot(
        { id: expect.any(String) },
        `
        {
          "id": Any<String>,
          "jsonrpc": "2.0",
          "method": "broker_encode_cf_parameters",
          "params": [
            {
              "asset": "BTC",
              "chain": "Bitcoin",
            },
            {
              "asset": "FLIP",
              "chain": "Ethereum",
            },
            "0x717e15853fd5f2ac6123e844c3a7c75976eaec9b",
            15,
            {
              "max_oracle_price_slippage": null,
              "min_price": "0x152d02c7e14af680000000000000000000000000000000000000",
              "refund_address": "tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx",
              "refund_ccm_metadata": null,
              "retry_duration": 500,
            },
            {
              "ccm_additional_data": "0xc0ffee",
              "gas_budget": "0x75bcd15",
              "message": "0xdeadc0de",
            },
            null,
            null,
            null,
          ],
        }
      `,
      );
      expect(result).toStrictEqual('0x1234');
    });

    it('calls the configured broker api with the given boost fee', async () => {
      const postSpy = mockRpcResponse((url, data: any) => {
        if (data.method === 'broker_encode_cf_parameters') {
          return Promise.resolve({
            data: { id: '1', jsonrpc: '2.0', result: '0x1234' },
          });
        }

        return defaultRpcMocks(url, data);
      });
      const MAX_BOOST_FEE_BPS = 100;

      const result = await new SwapSDK({
        broker: { url: 'https://chainflap.org/broker' },
      }).encodeCfParameters({
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
        brokerCommissionBps: 15,
      });

      expect(postSpy.mock.lastCall![0]).toStrictEqual('https://chainflap.org/broker');
      expect(postSpy.mock.lastCall![1][0]).toMatchInlineSnapshot(
        { id: expect.any(String) },
        `
        {
          "id": Any<String>,
          "jsonrpc": "2.0",
          "method": "broker_encode_cf_parameters",
          "params": [
            {
              "asset": "BTC",
              "chain": "Bitcoin",
            },
            {
              "asset": "FLIP",
              "chain": "Ethereum",
            },
            "0x717e15853fd5f2ac6123e844c3a7c75976eaec9b",
            15,
            {
              "max_oracle_price_slippage": null,
              "min_price": "0x152d02c7e14af680000000000000000000000000000000000000",
              "refund_address": "tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx",
              "refund_ccm_metadata": null,
              "retry_duration": 500,
            },
            null,
            100,
            null,
            null,
          ],
        }
      `,
      );
      expect(result).toStrictEqual('0x1234');
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
          broker: { url: 'https://chainflap.org/broker' },
        }).encodeCfParameters({
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
          broker: { url: 'https://chainflap.org/broker' },
        }).encodeCfParameters({
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
            livePriceSlippageTolerancePercent: 1,
          },
        }),
      ).rejects.toThrow('Invalid quote type');
    });

    it('throws for missing DCA params', async () => {
      await expect(
        new SwapSDK({
          broker: { url: 'https://chainflap.org/broker' },
        }).encodeCfParameters({
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
            livePriceSlippageTolerancePercent: 1,
          },
        }),
      ).rejects.toThrow('Failed to find DCA parameters from quote');
    });

    it('throws if live price slippage tolerance is set but quote does not return it', async () => {
      await expect(
        new SwapSDK({
          broker: { url: 'https://chainflap.org/broker' },
        }).encodeCfParameters({
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
            livePriceSlippageTolerancePercent: 1,
          } as FillOrKillParams,
        }),
      ).rejects.toThrow('Live price protection is not available for this asset pair');
    });

    it('throws for ccm params with regular quote', async () => {
      await expect(
        new SwapSDK({
          broker: { url: 'https://chainflap.org/broker' },
        }).encodeCfParameters({
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
            livePriceSlippageTolerancePercent: 1,
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
          broker: { url: 'https://chainflap.org/broker' },
        }).encodeCfParameters({
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

    describe('checkLivePriceProtectionRequirement', () => {
      it('throws when live price protection is required but disabled for DCA quote', async () => {
        const dcaSdk = new SwapSDK({ network: 'sisyphos', enabledFeatures: { dcaV2: true } });

        await expect(
          dcaSdk.encodeCfParameters({
            quote: {
              srcAsset: { asset: 'ETH', chain: 'Ethereum' },
              destAsset: { asset: 'USDC', chain: 'Ethereum' },
              depositAmount: BigInt(1e18).toString(),
              type: 'DCA',
              dcaParams: {
                numberOfChunks: 100,
                chunkIntervalBlocks: 5,
              },
              isVaultSwap: true,
              recommendedLivePriceSlippageTolerancePercent: 1,
            } as Quote,
            destAddress: '0xcafebabe',
            fillOrKillParams: {
              retryDurationBlocks: 500,
              refundAddress: '0xa56A6be23b6Cf39D9448FF6e897C29c41c8fbDFF',
              minPrice: '10000000000000',
              livePriceSlippageTolerancePercent: false,
            },
          }),
        ).rejects.toThrow(
          'Max oracle price slippage must be set in FillOrKillParams when live price protection is enabled for both assets in DCA V2',
        );
      });

      it('does not throw for non-DCA quotes', async () => {
        const dcaSdk = new SwapSDK({ network: 'sisyphos', enabledFeatures: { dcaV2: true } });
        vi.mocked(dcaSdk['apiClient'].encodeCfParameters).mockResolvedValueOnce({
          status: 200,
          body: '0x1234',
          headers: new Headers(),
        });

        await expect(
          dcaSdk.encodeCfParameters({
            quote: {
              srcAsset: { asset: 'ETH', chain: 'Ethereum' },
              destAsset: { asset: 'USDC', chain: 'Ethereum' },
              depositAmount: BigInt(1e18).toString(),
              type: 'REGULAR',
              isVaultSwap: true,
              recommendedLivePriceSlippageTolerancePercent: 1,
            } as Quote,
            destAddress: '0xcafebabe',
            fillOrKillParams: {
              retryDurationBlocks: 500,
              refundAddress: '0xa56A6be23b6Cf39D9448FF6e897C29c41c8fbDFF',
              minPrice: '10000000000000',
              livePriceSlippageTolerancePercent: false,
            },
          }),
        ).resolves.toBeDefined();
      });

      it('does not throw when dcaV2 is disabled', async () => {
        const nonDcaSdk = new SwapSDK({ network: 'sisyphos', enabledFeatures: { dcaV2: false } });
        vi.mocked(nonDcaSdk['apiClient'].encodeCfParameters).mockResolvedValueOnce({
          status: 200,
          body: '0x1234',
          headers: new Headers(),
        });

        await expect(
          nonDcaSdk.encodeCfParameters({
            quote: {
              srcAsset: { asset: 'ETH', chain: 'Ethereum' },
              destAsset: { asset: 'USDC', chain: 'Ethereum' },
              depositAmount: BigInt(1e18).toString(),
              type: 'REGULAR',
              isVaultSwap: true,
              recommendedLivePriceSlippageTolerancePercent: 1,
            } as Quote,
            destAddress: '0xcafebabe',
            fillOrKillParams: {
              retryDurationBlocks: 500,
              refundAddress: '0xa56A6be23b6Cf39D9448FF6e897C29c41c8fbDFF',
              minPrice: '10000000000000',
              livePriceSlippageTolerancePercent: false,
            },
          }),
        ).resolves.toBeDefined();
      });

      it('does not throw when one asset lacks live price protection', async () => {
        const dcaSdk = new SwapSDK({ network: 'sisyphos', enabledFeatures: { dcaV2: true } });
        vi.mocked(dcaSdk['apiClient'].encodeCfParameters).mockResolvedValueOnce({
          status: 200,
          body: '0x1234',
          headers: new Headers(),
        });

        await expect(
          dcaSdk.encodeCfParameters({
            quote: {
              srcAsset: { asset: 'ETH', chain: 'Ethereum' },
              destAsset: { asset: 'FLIP', chain: 'Ethereum' },
              depositAmount: BigInt(1e18).toString(),
              type: 'REGULAR',
              isVaultSwap: true,
              recommendedLivePriceSlippageTolerancePercent: 1,
            } as Quote,
            destAddress: '0xcafebabe',
            fillOrKillParams: {
              retryDurationBlocks: 500,
              refundAddress: '0xa56A6be23b6Cf39D9448FF6e897C29c41c8fbDFF',
              minPrice: '10000000000000',
              livePriceSlippageTolerancePercent: false,
            },
          }),
        ).resolves.toBeDefined();
      });

      it('does not throw when livePriceSlippageTolerancePercent is set', async () => {
        const dcaSdk = new SwapSDK({ network: 'sisyphos', enabledFeatures: { dcaV2: true } });
        vi.mocked(dcaSdk['apiClient'].encodeCfParameters).mockResolvedValueOnce({
          status: 200,
          body: '0x1234',
          headers: new Headers(),
        });

        await expect(
          dcaSdk.encodeCfParameters({
            quote: {
              srcAsset: { asset: 'ETH', chain: 'Ethereum' },
              destAsset: { asset: 'USDC', chain: 'Ethereum' },
              depositAmount: BigInt(1e18).toString(),
              type: 'REGULAR',
              isVaultSwap: true,
              recommendedLivePriceSlippageTolerancePercent: 1,
            } as Quote,
            destAddress: '0xcafebabe',
            fillOrKillParams: {
              retryDurationBlocks: 500,
              refundAddress: '0xa56A6be23b6Cf39D9448FF6e897C29c41c8fbDFF',
              minPrice: '10000000000000',
              livePriceSlippageTolerancePercent: 1,
            },
          }),
        ).resolves.toBeDefined();
      });
    });
  });

  describe(SwapSDK.prototype.getRequiredBlockConfirmations, () => {
    it('should return correct value for each chain', async () => {
      expect((await sdk.getRequiredBlockConfirmations()).Ethereum).toStrictEqual(2);
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

  describe(SwapSDK.prototype.calculateLivePriceSlippageTolerancePercent, () => {
    const slippageTolerancePercent = 1;
    const brokerCommissionBps = 75;

    it('calculates the live price slippage tolerance percent correctly', async () => {
      expect(
        await sdk.calculateLivePriceSlippageTolerancePercent(
          slippageTolerancePercent,
          brokerCommissionBps,
          {
            srcAsset: { asset: 'BTC', chain: 'Bitcoin' },
            destAsset: { asset: 'ETH', chain: 'Ethereum' },
            isOnChain: false,
          },
        ),
      ).toBe(1.85);
    });

    it('calculates the live price slippage tolerance percent correctly (internal)', async () => {
      expect(
        await sdk.calculateLivePriceSlippageTolerancePercent(
          slippageTolerancePercent,
          brokerCommissionBps,
          {
            srcAsset: { asset: 'BTC', chain: 'Bitcoin' },
            destAsset: { asset: 'ETH', chain: 'Ethereum' },
            isOnChain: true,
          },
        ),
      ).toBe(1.76);
    });

    it('returns false if LPP is not supported', async () => {
      expect(
        await sdk.calculateLivePriceSlippageTolerancePercent(
          slippageTolerancePercent,
          brokerCommissionBps,
          {
            srcAsset: { asset: 'BTC', chain: 'Bitcoin' },
            destAsset: { asset: 'FLIP', chain: 'Ethereum' },
            isOnChain: false,
          },
        ),
      ).toBe(false);
    });
  });
});

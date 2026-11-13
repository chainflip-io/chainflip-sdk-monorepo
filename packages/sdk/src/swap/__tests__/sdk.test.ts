/* eslint-disable dot-notation */
import { chainflipAssets, ChainflipChain, chainflipNetworks } from '@chainflip/utils/chainflip';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { BoostQuote, FillOrKillParams, Quote } from '@/shared/schemas.js';
import {
  boostPoolsDepth,
  defaultLendingPoolConfig,
  environment,
  mockRpcResponse,
  supplyPoolsDepth,
} from '@/shared/tests/fixtures.js';
import { DEFAULT_BROKER, SwapSDK, SwapSDKOptions } from '../sdk.js';
import { getQuoteV2, getStatusV2 } from '../services/ApiService.js';
import { QuoteRequest } from '../types.js';

vi.mock('../services/ApiService', () => ({
  getQuoteV2: vi.fn(),
  getStatusV2: vi.fn(),
}));

vi.mock('@ts-rest/core', async (importOriginal) => ({
  ...(await importOriginal()),
  initClient: () => ({
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
    openSwapDepositChannel: vi.fn(),
    encodeVaultSwapData: vi.fn(),
    encodeCfParameters: vi.fn(),
    openAccountCreationDepositChannel: vi.fn(),
  }),
}));

global.fetch = vi.fn();

const mockNetworkStatus = (
  boostDepositsEnabled = true,
  cfBrokerCommissionBps = 0,
  options: Omit<SwapSDKOptions, 'network'> = {},
) => {
  const sdk = new SwapSDK({ network: 'sisyphos', ...options });
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

  describe('forwards compatibility with unknown assets', () => {
    const mockNetworkInfoWithUnknownAsset = () => {
      const freshSdk = new SwapSDK({ network: 'sisyphos' });
      vi.mocked(freshSdk['apiClient'].networkInfo).mockResolvedValue({
        status: 200,
        body: {
          assets: [
            {
              asset: 'Eth',
              depositChannelCreationEnabled: true,
              depositChannelDepositsEnabled: true,
              egressEnabled: true,
              boostDepositsEnabled: true,
              vaultSwapDepositsEnabled: true,
              livePriceProtectionEnabled: true,
            },
            // an asset added to the backend after this SDK version was published
            {
              asset: 'NewCoin',
              chain: 'Newchain',
              depositChannelCreationEnabled: true,
              depositChannelDepositsEnabled: true,
              egressEnabled: true,
              boostDepositsEnabled: true,
              vaultSwapDepositsEnabled: true,
              livePriceProtectionEnabled: true,
            } as any,
          ],
          cfBrokerCommissionBps: 0,
        },
        headers: new Headers(),
      });
      return freshSdk;
    };

    it('getAssets skips assets this SDK version does not know about', async () => {
      const freshSdk = mockNetworkInfoWithUnknownAsset();
      const assets = await freshSdk.getAssets();
      expect(assets.map((a) => a.chainflipId)).toEqual(['Eth']);
    });

    it('getChains skips chains belonging only to unknown assets', async () => {
      const freshSdk = mockNetworkInfoWithUnknownAsset();
      const chains = await freshSdk.getChains();
      expect(chains.map((c) => c.chain)).toEqual(['Ethereum']);
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
        { ...params, brokerCommissionBps: 0, dcaV2Enabled: false },
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
        { ...params, brokerCommissionBps: 0, dcaV2Enabled: true },
        {},
      );
      expect(result).toStrictEqual([{ quote: 1234 }]);
    });

    it('calls api with commission', async () => {
      sdk = mockNetworkStatus(true, 15, { broker: { name: DEFAULT_BROKER } });
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
        { ...params, brokerCommissionBps: 15, dcaV2Enabled: false },
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
          dcaV2Enabled: false,
        },
        {},
      );
      expect(result).toStrictEqual([{ quote: 1234 }]);
    });

    it.each([
      { brokerCommissionBps: 0 },
      {
        affiliateBrokers: [
          { account: 'cFLdocJo3bjT7JbT7R46cA89QfvoitrKr9P3TsMcdkVWeeVLa', commissionBps: 10 },
        ] as QuoteRequest['affiliateBrokers'],
      },
    ])('rejects %o with the default broker', async (fees) => {
      sdk = new SwapSDK({ broker: { name: DEFAULT_BROKER }, network: 'sisyphos' });

      await expect(
        sdk.getQuoteV2({
          srcChain: 'Ethereum',
          srcAsset: 'ETH',
          destChain: 'Ethereum',
          destAsset: 'USDC',
          amount: '1',
          ...fees,
        }),
      ).rejects.toThrow(
        'Broker commission and affiliates are not supported with the swap.chainflip.io broker',
      );
      expect(getQuoteV2).not.toHaveBeenCalled();
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
    it('throws without a broker url', async () => {
      await expect(
        sdk.requestDepositAddressV2({
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
        }),
      ).rejects.toThrow('A broker url or name is required to open channels or encode swaps');
    });

    it('throws with an unsupported broker name', async () => {
      const brokerSdk = new SwapSDK({ broker: { name: 'other.broker' as typeof DEFAULT_BROKER } });

      await expect(
        brokerSdk.requestDepositAddressV2({
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
        }),
      ).rejects.toThrow('Broker name "other.broker" is not supported');
    });

    describe('with the default broker', () => {
      const quote = {
        srcAsset: { asset: 'BTC', chain: 'Bitcoin' },
        destAsset: { asset: 'FLIP', chain: 'Ethereum' },
        depositAmount: BigInt(1e18).toString(),
        type: 'REGULAR',
        isVaultSwap: false,
      } as Quote;
      const request = {
        quote,
        destAddress: '0x717e15853fd5f2ac6123e844c3a7c75976eaec9b',
        fillOrKillParams: {
          minPrice: '10000000000000',
          refundAddress: 'tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx',
          retryDurationBlocks: 500,
        },
      };

      it('opens the channel through the swap server', async () => {
        const brokerSdk = new SwapSDK({ broker: { name: DEFAULT_BROKER } });
        vi.mocked(brokerSdk['apiClient'].openSwapDepositChannel).mockResolvedValueOnce({
          status: 201,
          body: {
            id: '123-Bitcoin-15',
            depositAddress: 'tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx',
            brokerCommissionBps: 15,
            maxBoostFeeBps: 0,
            issuedBlock: 123,
            srcChainExpiryBlock: '1234',
            estimatedExpiryTime: 1794564000000,
            channelOpeningFee: '100',
          },
          headers: new Headers(),
        });

        const result = await brokerSdk.requestDepositAddressV2(request);

        expect(vi.mocked(brokerSdk['apiClient'].openSwapDepositChannel).mock.calls)
          .toMatchInlineSnapshot(`
            [
              [
                {
                  "body": {
                    "amount": "1000000000000000000",
                    "ccmParams": undefined,
                    "dcaParams": undefined,
                    "destAddress": "0x717e15853fd5f2ac6123e844c3a7c75976eaec9b",
                    "destAsset": {
                      "asset": "FLIP",
                      "chain": "Ethereum",
                    },
                    "fillOrKillParams": {
                      "maxOraclePriceSlippage": null,
                      "minPriceX128": "34028236692093846346337460743176821145600000000000000000000000",
                      "refundAddress": "tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx",
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
                  },
                },
              ],
            ]
          `);
        expect(result).toMatchInlineSnapshot(`
          {
            "affiliateBrokers": [],
            "amount": "1000000000000000000",
            "brokerCommissionBps": 15,
            "ccmParams": undefined,
            "channelOpeningFee": 100n,
            "dcaParams": undefined,
            "depositAddress": "tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx",
            "depositChannelExpiryBlock": 1234n,
            "depositChannelId": "123-Bitcoin-15",
            "destAddress": "0x717e15853fd5f2ac6123e844c3a7c75976eaec9b",
            "destAsset": "FLIP",
            "destChain": "Ethereum",
            "estimatedDepositChannelExpiryTime": 1794564000000,
            "fillOrKillParams": {
              "minPrice": "10000000000000",
              "refundAddress": "tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx",
              "retryDurationBlocks": 500,
            },
            "maxBoostFeeBps": 0,
            "srcAddress": undefined,
            "srcAsset": "BTC",
            "srcChain": "Bitcoin",
          }
        `);
      });

      it('rejects broker commission', async () => {
        const brokerSdk = new SwapSDK({ broker: { name: DEFAULT_BROKER } });

        await expect(
          brokerSdk.requestDepositAddressV2({ ...request, brokerCommissionBps: 0 }),
        ).rejects.toThrow(
          'Broker commission and affiliates are not supported with the swap.chainflip.io broker',
        );
        expect(brokerSdk['apiClient'].openSwapDepositChannel).not.toHaveBeenCalled();
      });

      it('throws with the message of the swap server', async () => {
        const brokerSdk = new SwapSDK({ broker: { name: DEFAULT_BROKER } });
        vi.mocked(brokerSdk['apiClient'].openSwapDepositChannel).mockResolvedValueOnce({
          status: 400,
          body: { message: 'too many channels' },
          headers: new Headers(),
        } as any);

        await expect(brokerSdk.requestDepositAddressV2(request)).rejects.toThrow(
          'Failed to open swap deposit channel (400): too many channels',
        );
      });
    });

    it('returns the deposit channel if the network info cannot be fetched', async () => {
      mockRpcResponse((url, data: any) => {
        if (data.method === 'broker_request_swap_deposit_address') {
          return Promise.resolve({
            data: {
              id: '1',
              jsonrpc: '2.0',
              result: {
                address: '0x717e15853fd5f2ac6123e844c3a7c75976eaec9a',
                issued_block: 123,
                channel_id: 15,
                source_chain_expiry_block: 1234,
                channel_opening_fee: '0x0',
              },
            },
          });
        }

        return defaultRpcMocks(url, data);
      });
      const brokerSdk = new SwapSDK({ broker: { url: 'https://chainflap.org/broker' } });
      vi.mocked(brokerSdk['apiClient'].networkInfo).mockRejectedValueOnce(new Error('down'));

      const result = await brokerSdk.requestDepositAddressV2({
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
      });

      expect(result.depositAddress).toBe('0x717e15853fd5f2ac6123e844c3a7c75976eaec9a');
      expect(result.estimatedDepositChannelExpiryTime).toBeUndefined();
    });

    it('estimates the deposit channel expiry time from the chain tracking', async () => {
      mockRpcResponse((url, data: any) => {
        if (data.method === 'broker_request_swap_deposit_address') {
          return Promise.resolve({
            data: {
              id: '1',
              jsonrpc: '2.0',
              result: {
                address: '0x717e15853fd5f2ac6123e844c3a7c75976eaec9a',
                issued_block: 123,
                channel_id: 15,
                source_chain_expiry_block: 1234,
                channel_opening_fee: '0x0',
              },
            },
          });
        }

        return defaultRpcMocks(url, data);
      });
      const brokerSdk = new SwapSDK({ broker: { url: 'https://chainflap.org/broker' } });
      vi.mocked(brokerSdk['apiClient'].networkInfo).mockResolvedValueOnce({
        status: 200,
        body: {
          assets: [],
          cfBrokerCommissionBps: 0,
          chainTracking: [{ chain: 'Bitcoin', height: 1000, blockTrackedAt: 1794564000000 }],
        },
        headers: new Headers(),
      });

      const result = await brokerSdk.requestDepositAddressV2({
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
      });

      // 234 Bitcoin blocks of 600 seconds after the tracked height
      expect(result.estimatedDepositChannelExpiryTime).toBe(1794564000000 + 234 * 600 * 1000);
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
  });

  describe(SwapSDK.prototype.encodeVaultSwapData, () => {
    it('throws without a broker url', async () => {
      await expect(
        sdk.encodeVaultSwapData({
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
      ).rejects.toThrow('A broker url or name is required to open channels or encode swaps');
    });

    describe('with the default broker', () => {
      const request = {
        quote: {
          srcAsset: { asset: 'ETH', chain: 'Ethereum' },
          destAsset: { asset: 'FLIP', chain: 'Ethereum' },
          depositAmount: BigInt(1e18).toString(),
          type: 'REGULAR',
          isVaultSwap: true,
        } as Quote,
        destAddress: '0x717e15853fd5f2ac6123e844c3a7c75976eaec9b',
        fillOrKillParams: {
          minPrice: '10000000000000',
          refundAddress: '0x717e15853fd5f2ac6123e844c3a7c75976eaec9b',
          retryDurationBlocks: 500,
        },
      };

      it('encodes through the swap server', async () => {
        const brokerSdk = new SwapSDK({ broker: { name: DEFAULT_BROKER } });
        vi.mocked(brokerSdk['apiClient'].encodeVaultSwapData).mockResolvedValueOnce({
          status: 200,
          body: {
            chain: 'Ethereum',
            calldata: '0x1234',
            value: '1000000000000000000',
            to: '0xb7a5bd0345ef1cc5e66bf61bdec17d2461fbd968',
            sourceTokenAddress: undefined,
          },
          headers: new Headers(),
        } as any);

        const result = await brokerSdk.encodeVaultSwapData(request);

        expect(vi.mocked(brokerSdk['apiClient'].encodeVaultSwapData).mock.calls)
          .toMatchInlineSnapshot(`
            [
              [
                {
                  "body": {
                    "affiliates": undefined,
                    "amount": "1000000000000000000",
                    "ccmParams": undefined,
                    "commissionBps": undefined,
                    "dcaParams": undefined,
                    "destAddress": "0x717e15853fd5f2ac6123e844c3a7c75976eaec9b",
                    "destAsset": {
                      "asset": "FLIP",
                      "chain": "Ethereum",
                    },
                    "extraParams": undefined,
                    "fillOrKillParams": {
                      "maxOraclePriceSlippage": null,
                      "minPriceX128": "3402823669209384634633746074317682114560000000000000",
                      "refundAddress": "0x717e15853fd5f2ac6123e844c3a7c75976eaec9b",
                      "refundCcmMetadata": null,
                      "retryDurationBlocks": 500,
                    },
                    "maxBoostFeeBps": undefined,
                    "srcAddress": undefined,
                    "srcAsset": {
                      "asset": "ETH",
                      "chain": "Ethereum",
                    },
                  },
                },
              ],
            ]
          `);
        expect(result).toMatchInlineSnapshot(`
          {
            "calldata": "0x1234",
            "chain": "Ethereum",
            "sourceTokenAddress": undefined,
            "to": "0xb7a5bd0345ef1cc5e66bf61bdec17d2461fbd968",
            "value": 1000000000000000000n,
          }
        `);
      });

      it('rejects affiliates', async () => {
        const brokerSdk = new SwapSDK({ broker: { name: DEFAULT_BROKER } });

        await expect(
          brokerSdk.encodeVaultSwapData({
            ...request,
            affiliateBrokers: [
              { account: 'cFHyJEHEQ1YkT9xuFnxnPWVkihpYEGjBg4WbF6vCPtSPQoE8n', commissionBps: 10 },
            ],
          }),
        ).rejects.toThrow(
          'Broker commission and affiliates are not supported with the swap.chainflip.io broker',
        );
        expect(brokerSdk['apiClient'].encodeVaultSwapData).not.toHaveBeenCalled();
      });

      it('throws with the message of the swap server', async () => {
        const brokerSdk = new SwapSDK({ broker: { name: DEFAULT_BROKER } });
        vi.mocked(brokerSdk['apiClient'].encodeVaultSwapData).mockResolvedValueOnce({
          status: 400,
          body: { message: 'setting brokerAccount is not supported' },
          headers: new Headers(),
        } as any);

        await expect(brokerSdk.encodeVaultSwapData(request)).rejects.toThrow(
          'Failed to encode vault swap data (400): setting brokerAccount is not supported',
        );
      });
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
  });

  describe(SwapSDK.prototype.encodeCfParameters, () => {
    it('throws without a broker url', async () => {
      await expect(
        sdk.encodeCfParameters({
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
      ).rejects.toThrow('A broker url or name is required to open channels or encode swaps');
    });

    describe('with the default broker', () => {
      const request = {
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
      };

      it('encodes through the swap server', async () => {
        const brokerSdk = new SwapSDK({ broker: { name: DEFAULT_BROKER } });
        vi.mocked(brokerSdk['apiClient'].encodeCfParameters).mockResolvedValueOnce({
          status: 200,
          body: '0x1234',
          headers: new Headers(),
        });

        const result = await brokerSdk.encodeCfParameters(request);

        expect(vi.mocked(brokerSdk['apiClient'].encodeCfParameters).mock.calls)
          .toMatchInlineSnapshot(`
            [
              [
                {
                  "body": {
                    "affiliates": undefined,
                    "amount": "1000000000000000000",
                    "ccmParams": undefined,
                    "commissionBps": undefined,
                    "dcaParams": undefined,
                    "destAddress": "0x717e15853fd5f2ac6123e844c3a7c75976eaec9b",
                    "destAsset": {
                      "asset": "FLIP",
                      "chain": "Ethereum",
                    },
                    "fillOrKillParams": {
                      "maxOraclePriceSlippage": null,
                      "minPriceX128": "34028236692093846346337460743176821145600000000000000000000000",
                      "refundAddress": "tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx",
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
              ],
            ]
          `);
        expect(result).toBe('0x1234');
      });

      it('rejects broker commission', async () => {
        const brokerSdk = new SwapSDK({ broker: { name: DEFAULT_BROKER } });

        await expect(
          brokerSdk.encodeCfParameters({ ...request, brokerCommissionBps: 15 }),
        ).rejects.toThrow(
          'Broker commission and affiliates are not supported with the swap.chainflip.io broker',
        );
        expect(brokerSdk['apiClient'].encodeCfParameters).not.toHaveBeenCalled();
      });

      it('throws with the message of the swap server', async () => {
        const brokerSdk = new SwapSDK({ broker: { name: DEFAULT_BROKER } });
        vi.mocked(brokerSdk['apiClient'].encodeCfParameters).mockResolvedValueOnce({
          status: 400,
          body: { message: 'route disabled' },
          headers: new Headers(),
        } as any);

        await expect(brokerSdk.encodeCfParameters(request)).rejects.toThrow(
          'Failed to encode cf parameters (400): route disabled',
        );
      });
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
  });

  describe(SwapSDK.prototype.requestAccountCreationDepositAddress, () => {
    const signatureData = {
      Ethereum: { signature: '0x1234', signer: '0x5678', sigType: 'Eip712' },
    } as const;
    const transactionMetadata = { nonce: 1, expiryBlock: 1000 };

    it('throws without a broker url', async () => {
      await expect(
        sdk.requestAccountCreationDepositAddress(
          'Btc',
          'tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx',
          signatureData,
          transactionMetadata,
        ),
      ).rejects.toThrow('A broker url or name is required to open channels or encode swaps');
    });

    it('calls the configured broker api', async () => {
      const postSpy = mockRpcResponse((url, data: any) => {
        if (data.method === 'broker_request_account_creation_deposit_address') {
          return Promise.resolve({
            data: {
              id: '1',
              jsonrpc: '2.0',
              result: {
                address: 'tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx',
                issued_block: 123,
                channel_id: 15,
                deposit_chain_expiry_block: 1234,
                channel_opening_fee: '0x0',
                requested_for: 'cFLRQDfEdmnv6d2XfHJNRBQHi4fruPMReLSfvB8WWD2ENbqj7',
                refund_address: 'tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx',
              },
            },
          });
        }

        return defaultRpcMocks(url, data);
      });

      const result = await new SwapSDK({
        broker: { url: 'https://chainflap.org/broker' },
      }).requestAccountCreationDepositAddress(
        'Btc',
        'tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx',
        signatureData,
        transactionMetadata,
        5,
      );

      expect(postSpy).toHaveBeenCalledWith('https://chainflap.org/broker', [
        {
          id: expect.any(String),
          jsonrpc: '2.0',
          method: 'broker_request_account_creation_deposit_address',
          params: [
            { Ethereum: { signature: '0x1234', signer: '0x5678', sig_type: 'Eip712' } },
            { nonce: 1, expiry_block: 1000 },
            { asset: 'BTC', chain: 'Bitcoin' },
            5,
            'tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx',
          ],
        },
      ]);
      expect(result).toStrictEqual({
        id: '123-Bitcoin-15',
        depositAddress: 'tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx',
        brokerCommissionBps: 0,
        maxBoostFeeBps: 5,
        issuedBlock: 123,
        srcChainExpiryBlock: '1234',
        estimatedExpiryTime: undefined,
        channelOpeningFee: '0',
      });
    });

    it('opens the channel through the swap server with the default broker', async () => {
      const brokerSdk = new SwapSDK({ broker: { name: DEFAULT_BROKER } });
      const channel = {
        id: '123-Bitcoin-15',
        depositAddress: 'tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx',
        brokerCommissionBps: 0,
        maxBoostFeeBps: 5,
        issuedBlock: 123,
        srcChainExpiryBlock: '1234',
        estimatedExpiryTime: 1794564000000,
        channelOpeningFee: '0',
      };
      vi.mocked(brokerSdk['apiClient'].openAccountCreationDepositChannel).mockResolvedValueOnce({
        status: 201,
        body: channel,
        headers: new Headers(),
      });

      const result = await brokerSdk.requestAccountCreationDepositAddress(
        'Btc',
        'tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx',
        signatureData,
        transactionMetadata,
        5,
      );

      expect(brokerSdk['apiClient'].openAccountCreationDepositChannel).toHaveBeenCalledWith({
        body: {
          asset: { asset: 'BTC', chain: 'Bitcoin' },
          refundAddress: 'tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx',
          signatureData,
          transactionMetadata,
          boostFeeBps: 5,
        },
      });
      expect(result).toStrictEqual(channel);
    });

    it('throws with the message of the swap server with the default broker', async () => {
      const brokerSdk = new SwapSDK({ broker: { name: DEFAULT_BROKER } });
      vi.mocked(brokerSdk['apiClient'].openAccountCreationDepositChannel).mockResolvedValueOnce({
        status: 400,
        body: { message: 'AccountAlreadyExists: account already exists' },
        headers: new Headers(),
      } as any);

      await expect(
        brokerSdk.requestAccountCreationDepositAddress(
          'Btc',
          'tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx',
          signatureData,
          transactionMetadata,
        ),
      ).rejects.toThrow(
        'Failed to open account creation deposit channel (400): AccountAlreadyExists: account already exists',
      );
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
          "Bsc": 0n,
          "Ethereum": 16n,
          "Solana": 0n,
          "Tron": 0n,
        }
      `);
    });
  });

  describe(SwapSDK.prototype.getBoostLiquidity, () => {
    it('throws error for unsupported feeTierBps values', async () => {
      await expect(sdk.getBoostLiquidity({ feeTierBps: 30 })).rejects.toThrow(
        'Unsupported fee tier. Only 5 bps is supported starting from version 2.2.',
      );
    });

    it('accepts feeTierBps: 5 without throwing', async () => {
      mockRpcResponse((url, data: any) => {
        if (data.method === 'cf_boost_pools_depth') {
          return Promise.resolve({ data: boostPoolsDepth([]) });
        }
        if (data.method === 'cf_lending_pools') {
          return Promise.resolve({ data: supplyPoolsDepth([]) });
        }
        return defaultRpcMocks(url, data);
      });
      const freshSdk = new SwapSDK({ network: 'sisyphos' });
      await expect(freshSdk.getBoostLiquidity({ feeTierBps: 5 })).resolves.not.toThrow();
    });

    it('does not fetch BTC supply pool when filtering by non-BTC asset', async () => {
      mockRpcResponse((url, data: any) => {
        if (data.method === 'cf_boost_pools_depth') {
          return Promise.resolve({ data: boostPoolsDepth([]) });
        }
        if (data.method === 'cf_lending_pools') {
          throw new Error('Should not fetch supply pool for non-BTC asset');
        }
        return defaultRpcMocks(url, data);
      });
      const freshSdk = new SwapSDK({ network: 'sisyphos' });
      await expect(
        freshSdk.getBoostLiquidity({ chain: 'Ethereum', asset: 'ETH' }),
      ).resolves.not.toThrow();
    });

    it('returns the boost pools liquidity depth', async () => {
      mockRpcResponse((url, data: any) => {
        if (data.method === 'cf_boost_pools_depth') {
          return Promise.resolve({
            data: boostPoolsDepth([
              {
                chain: 'Bitcoin',
                asset: 'BTC',
                tier: 5,
                available_amount: '0x186a0',
              },
              {
                chain: 'Ethereum',
                asset: 'ETH',
                tier: 5,
                available_amount: '0x186a0',
              },
            ]),
          });
        }

        if (data.method === 'cf_lending_pools') {
          return Promise.resolve({
            data: supplyPoolsDepth([
              {
                asset: { chain: 'Bitcoin', asset: 'BTC' },
                total_amount: '0x186a0',
                available_amount: '0x186a0',
                ...defaultLendingPoolConfig,
              },
            ]),
          });
        }

        return defaultRpcMocks(url, data);
      });

      const freshSdk = new SwapSDK({ network: 'sisyphos' });
      expect(await freshSdk.getBoostLiquidity()).toMatchSnapshot();
    });

    it('returns the boost pools liquidity filtered by asset and sorted descending', async () => {
      mockRpcResponse((url, data: any) => {
        if (data.method === 'cf_boost_pools_depth') {
          return Promise.resolve({
            data: boostPoolsDepth([
              {
                chain: 'Bitcoin',
                asset: 'BTC',
                tier: 5,
                available_amount: '0x186a0',
              },
              {
                chain: 'Ethereum',
                asset: 'ETH',
                tier: 5,
                available_amount: '0x186a0',
              },
            ]),
          });
        }

        if (data.method === 'cf_lending_pools') {
          return Promise.resolve({
            data: supplyPoolsDepth([
              {
                asset: { chain: 'Bitcoin', asset: 'BTC' },
                total_amount: '0x186a0',
                available_amount: '0x186a0',
                ...defaultLendingPoolConfig,
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

import axios from 'axios';
import { VoidSigner } from 'ethers';
import { Assets, Chain, ChainflipNetworks, Chains, InternalAssets } from '@/shared/enums';
import { environment, supportedAssets } from '@/shared/tests/fixtures';
import { approveVault, executeSwap } from '@/shared/vault';
import { SwapSDK } from '../sdk';
import { getQuote, getStatus } from '../services/ApiService';
import { QuoteRequest } from '../types';

jest.mock('axios');

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

  const defaultAxiosMock = (url: string, data: any) => {
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

    throw new Error(`unexpected axios call to ${url}: ${JSON.stringify(data)}`);
  };

  beforeEach(() => {
    jest.mocked(axios.post).mockImplementation(defaultAxiosMock);
  });

  describe(SwapSDK.prototype.getChains, () => {
    it('returns the chains based on the cf_supported_assets rpc', async () => {
      jest.mocked(axios.post).mockImplementation((url, data: any) => {
        if (data.method === 'cf_supported_assets') {
          return Promise.resolve({
            data: supportedAssets({ assets: ['Btc', 'ArbUsdc'] }),
          });
        }

        return defaultAxiosMock(url, data);
      });

      const freshSdk = new SwapSDK({ network: ChainflipNetworks.sisyphos, signer });
      expect(await freshSdk.getAssets()).toMatchSnapshot();
    });

    it('supports the previous version of the cf_supported_assets rpc', async () => {
      jest.mocked(axios.post).mockImplementation((url, data: any) => {
        if (data.method === 'cf_supported_assets') {
          return Promise.resolve({
            data: {
              jsonrpc: '2.0',
              result: {
                Ethereum: ['ETH', 'FLIP', 'USDC'],
                Bitcoin: ['BTC'],
                Polkadot: ['DOT'],
              },
              id: 1,
            },
          });
        }

        return defaultAxiosMock(url, data);
      });

      const freshSdk = new SwapSDK({ network: ChainflipNetworks.sisyphos, signer });
      expect(await freshSdk.getAssets()).toMatchSnapshot();
    });

    it('returns the filtered destination chains for the chain', async () => {
      expect(await sdk.getChains('Ethereum')).toMatchSnapshot();
    });

    it('throws when requesting an unsupported chain', async () => {
      await expect(sdk.getChains('Dogecoin' as Chain)).rejects.toMatchSnapshot();
    });

    it.each(Object.values(ChainflipNetworks))(
      'returns the correct values for %s',
      async (network) => {
        const networkSdk = new SwapSDK({ network });
        await expect(await networkSdk.getChains()).toMatchSnapshot();
      },
    );
  });

  describe(SwapSDK.prototype.getAssets, () => {
    it('returns the assets based on the cf_supported_assets rpc', async () => {
      jest.mocked(axios.post).mockImplementation((url, data: any) => {
        if (data.method === 'cf_supported_assets') {
          return Promise.resolve({
            data: supportedAssets({ assets: ['Btc', 'ArbUsdc'] }),
          });
        }

        return defaultAxiosMock(url, data);
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
          boostFeeBps: 0,
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
        boostFeeBps: 0,
        channelOpeningFee: 0n,
        affiliateBrokers: [],
      });
    });

    it('calls the configured broker api', async () => {
      const postSpy = jest.mocked(axios.post).mockImplementation((url, data: any) => {
        if (data.method === 'broker_requestSwapDepositAddress') {
          return Promise.resolve({
            data: {
              result: {
                address: '0x717e15853fd5f2ac6123e844c3a7c75976eaec9a',
                issued_block: 123,
                channel_id: 15,
                source_chain_expiry_block: '1234',
              },
            },
          });
        }

        return defaultAxiosMock(url, data);
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
        channelOpeningFee: 0n,
        affiliateBrokers: [],
      });
    });

    it('calls the configured broker api with the given broker commission', async () => {
      const postSpy = jest.mocked(axios.post).mockImplementation((url, data: any) => {
        if (data.method === 'broker_requestSwapDepositAddress') {
          return Promise.resolve({
            data: {
              result: {
                address: '0x717e15853fd5f2ac6123e844c3a7c75976eaec9a',
                issued_block: 123,
                channel_id: 15,
                source_chain_expiry_block: '1234',
              },
            },
          });
        }

        return defaultAxiosMock(url, data);
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
        id: 1,
        jsonrpc: '2.0',
        method: 'broker_requestSwapDepositAddress',
        params: [
          { asset: 'BTC', chain: 'Bitcoin' },
          { asset: 'FLIP', chain: 'Ethereum' },
          '0x717e15853fd5f2ac6123e844c3a7c75976eaec9b',
          125,
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
        channelOpeningFee: 0n,
        affiliateBrokers: [],
      });
    });

    it('calls the configured broker api with the given affiliate brokers', async () => {
      const postSpy = jest.mocked(axios.post).mockImplementation((url, data: any) => {
        if (data.method === 'broker_requestSwapDepositAddress') {
          return Promise.resolve({
            data: {
              result: {
                address: '0x717e15853fd5f2ac6123e844c3a7c75976eaec9a',
                issued_block: 123,
                channel_id: 15,
                source_chain_expiry_block: '1234',
              },
            },
          });
        }

        return defaultAxiosMock(url, data);
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
          [{ account: 'cFHyJEHEQ1YkT9xuFnxnPWVkihpYEGjBg4WbF6vCPtSPQoE8n', bps: 10 }],
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
        channelOpeningFee: 0n,
        affiliateBrokers: [
          { account: 'cFHyJEHEQ1YkT9xuFnxnPWVkihpYEGjBg4WbF6vCPtSPQoE8n', commissionBps: 10 },
        ],
      });
    });
  });

  it('allows defining boost fee when opening a deposit channel', async () => {
    const postSpy = jest.mocked(axios.post).mockImplementation((url, data: any) => {
      if (data.method === 'broker_requestSwapDepositAddress') {
        return Promise.resolve({
          data: {
            result: {
              address: '0x717e15853fd5f2ac6123e844c3a7c75976eaec9a',
              issued_block: 123,
              channel_id: 15,
              source_chain_expiry_block: '1234',
            },
          },
        });
      }

      return defaultAxiosMock(url, data);
    });
    const BOOST_FEE_BPS = 100;

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
      channelOpeningFee: 0n,
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
});

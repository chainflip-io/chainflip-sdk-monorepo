import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import superjson from 'superjson';
import { requestSwapDepositAddress, requestSwapParameterEncoding } from '@/shared/broker';
import {
  ChainflipNetwork,
  Chain,
  ChainflipNetworks,
  UncheckedAssetAndChain,
  ChainAssetMap,
  Chains,
  ChainMap,
  InternalAsset,
  assetConstants,
  getInternalAsset,
  getAssetAndChain,
  Asset,
} from '@/shared/enums';
import { getPriceX128FromPrice, parseFoKParams } from '@/shared/functions';
import { assert, isNotNullish } from '@/shared/guards';
import {
  BoostPoolsDepth,
  Environment,
  RpcConfig,
  getAllBoostPoolsDepth,
  getEnvironment,
  getSupportedAssets,
} from '@/shared/rpc';
import { validateSwapAmount } from '@/shared/rpc/utils';
import { BoostQuote, Quote } from '@/shared/schemas';
import { Required } from '@/shared/types';
import type { AppRouter } from '@/swap/server';
import { AsyncCacheMap } from '@/swap/utils/dataStructures';
import { getAssetData } from './assets';
import { getChainData } from './chains';
import { BACKEND_SERVICE_URLS, CF_SDK_VERSION_HEADERS } from './consts';
import * as ApiService from './services/ApiService';
import {
  ChainData,
  AssetData,
  QuoteRequest,
  DepositAddressResponse,
  QuoteResponse,
  SwapStatusRequest,
  DepositAddressRequest,
  BoostPoolDepth,
  SwapStatusResponse,
  QuoteResponseV2,
} from './types';
import {
  type SwapStatusResponseV2,
  type DepositAddressRequestV2,
  type VaultSwapRequest,
  DepositAddressResponseV2,
  VaultSwapResponse,
} from './v2/types';

export type SwapSDKOptions = {
  network?: ChainflipNetwork;
  backendUrl?: string;
  broker?: {
    url: string;
    /** @deprecated DEPRECATED(1.8) set the brokerCommissionBps param of the requestDepositAddress and encodeVaultSwapData method instead */
    commissionBps?: number;
  };
  rpcUrl?: string;
  enabledFeatures?: {
    dca?: boolean;
  };
};

const assertQuoteValid = (quote: Quote | BoostQuote) => {
  switch (quote.type) {
    case 'REGULAR':
      break;
    case 'DCA':
      if (quote.dcaParams == null) throw new Error('Failed to find DCA parameters from quote');
      break;
    default:
      throw new Error('Invalid quote type');
  }
};

export class SwapSDK {
  private readonly options: Required<SwapSDKOptions, 'network' | 'backendUrl'>;

  private readonly rpcConfig: RpcConfig;

  private readonly trpc;

  private stateChainEnvironmentCache: AsyncCacheMap<
    'cf_environment',
    Awaited<ReturnType<typeof getEnvironment>>
  >;

  private supportedAssets?: InternalAsset[];

  private dcaEnabled = false;

  constructor(options: SwapSDKOptions = {}) {
    const network = options.network ?? ChainflipNetworks.perseverance;
    this.options = {
      ...options,
      network,
      backendUrl: options.backendUrl ?? BACKEND_SERVICE_URLS[network],
    };
    this.rpcConfig = options.rpcUrl ? { rpcUrl: options.rpcUrl } : { network };
    this.trpc = createTRPCProxyClient<AppRouter>({
      transformer: superjson,
      links: [
        httpBatchLink({
          url: new URL('/trpc', this.options.backendUrl),
          headers: CF_SDK_VERSION_HEADERS,
        }),
      ],
    });
    this.dcaEnabled = options.enabledFeatures?.dca ?? false;
    this.stateChainEnvironmentCache = new AsyncCacheMap({
      fetch: (_key) => getEnvironment(this.rpcConfig),
      ttl: 60_000 * 10,
      resetExpiryOnLookup: false,
    });
  }

  async getChains(sourceChain?: Chain): Promise<ChainData[]> {
    if (sourceChain && !(sourceChain in Chains))
      throw new Error(`unsupported source chain "${sourceChain}"`);

    const [env, supportedAssets] = await Promise.all([
      this.getStateChainEnvironment(),
      this.getSupportedAssets(),
    ]);
    const supportedChains = [...new Set(supportedAssets.map((a) => assetConstants[a].chain))];

    return supportedChains
      .map((chain) => getChainData(chain, this.options.network, env))
      .filter((chain) => chain.chain !== sourceChain);
  }

  private async getStateChainEnvironment(): Promise<Environment> {
    return this.stateChainEnvironmentCache.get('cf_environment');
  }

  private async getSupportedAssets(): Promise<InternalAsset[]> {
    this.supportedAssets ??= (await getSupportedAssets(this.rpcConfig))
      .map((asset) => getInternalAsset(asset as UncheckedAssetAndChain, false))
      .filter(isNotNullish);

    return this.supportedAssets;
  }

  private async getBoostPoolsDepth(): Promise<BoostPoolsDepth> {
    return getAllBoostPoolsDepth(this.rpcConfig);
  }

  async getAssets(chain?: Chain): Promise<AssetData[]> {
    if (chain && !(chain in Chains)) throw new Error(`unsupported chain "${chain}"`);

    const [env, supportedAssets] = await Promise.all([
      this.getStateChainEnvironment(),
      this.getSupportedAssets(),
    ]);

    return supportedAssets
      .map((asset) => getAssetData(asset, this.options.network, env))
      .filter((asset) => !chain || asset.chain === chain);
  }

  /** @deprecated DEPRECATED(1.6) use getQuoteV2() */
  getQuote(
    quoteRequest: QuoteRequest,
    options: ApiService.RequestOptions = {},
  ): Promise<QuoteResponse> {
    const { brokerCommissionBps, affiliateBrokers, ...remainingRequest } = quoteRequest;
    const submitterBrokerCommissionBps =
      brokerCommissionBps ?? this.options.broker?.commissionBps ?? 0;
    const affiliateBrokerCommissionBps =
      affiliateBrokers?.reduce((acc, affiliate) => acc + affiliate.commissionBps, 0) ?? 0;

    return ApiService.getQuote(
      this.options.backendUrl,
      {
        ...remainingRequest,
        brokerCommissionBps: submitterBrokerCommissionBps + affiliateBrokerCommissionBps,
      },
      options,
    );
  }

  getQuoteV2(
    quoteRequest: QuoteRequest,
    options: ApiService.RequestOptions = {},
  ): Promise<QuoteResponseV2> {
    const { brokerCommissionBps, affiliateBrokers, ...remainingRequest } = quoteRequest;
    const submitterBrokerCommissionBps =
      brokerCommissionBps ?? this.options.broker?.commissionBps ?? 0;
    const affiliateBrokerCommissionBps =
      affiliateBrokers?.reduce((acc, affiliate) => acc + affiliate.commissionBps, 0) ?? 0;

    return ApiService.getQuoteV2(
      this.options.backendUrl,
      {
        ...remainingRequest,
        brokerCommissionBps: submitterBrokerCommissionBps + affiliateBrokerCommissionBps,
        dcaEnabled: this.dcaEnabled,
      },
      options,
    );
  }

  /** @deprecated DEPRECATED(1.6) use requestDepositAddressV2() */
  async requestDepositAddress(
    depositAddressRequest: DepositAddressRequest,
  ): Promise<DepositAddressResponse> {
    const {
      srcChain,
      srcAsset,
      amount,
      destChain,
      destAsset,
      brokerCommissionBps,
      affiliateBrokers,
    } = depositAddressRequest;

    await this.validateSwapAmount({ chain: srcChain, asset: srcAsset }, BigInt(amount));

    const fillOrKillParams = depositAddressRequest.fillOrKillParams
      ? {
          ...depositAddressRequest.fillOrKillParams,
          minPriceX128: getPriceX128FromPrice(
            depositAddressRequest.fillOrKillParams.minPrice,
            getInternalAsset({ chain: srcChain, asset: srcAsset }),
            getInternalAsset({ chain: destChain, asset: destAsset }),
          ),
        }
      : undefined;

    let response;

    if (this.options.broker) {
      const result = await requestSwapDepositAddress(
        {
          ...depositAddressRequest,
          commissionBps: brokerCommissionBps ?? this.options.broker.commissionBps,
          affiliates: affiliateBrokers,
          fillOrKillParams,
        },
        { url: this.options.broker.url },
        this.options.network,
      );

      response = {
        id: `${result.issuedBlock}-${depositAddressRequest.srcChain}-${result.channelId}`,
        depositAddress: result.address,
        brokerCommissionBps: brokerCommissionBps ?? this.options.broker.commissionBps ?? 0,
        srcChainExpiryBlock: result.sourceChainExpiryBlock,
        maxBoostFeeBps: depositAddressRequest.maxBoostFeeBps,
        channelOpeningFee: result.channelOpeningFee,
      };
    } else {
      assert(
        !depositAddressRequest.brokerCommissionBps,
        'Broker commission is supported only when initializing the SDK with a brokerUrl',
      );
      assert(
        !depositAddressRequest.affiliateBrokers?.length,
        'Affiliate brokers are supported only when initializing the SDK with a brokerUrl',
      );
      assert(fillOrKillParams, 'Fill or kill parameters are required');
      response = await this.trpc.openSwapDepositChannel.mutate({
        ...depositAddressRequest,
        fillOrKillParams,
      });
    }

    return {
      ...depositAddressRequest,
      depositChannelId: response.id,
      depositAddress: response.depositAddress,
      brokerCommissionBps: response.brokerCommissionBps,
      affiliateBrokers: depositAddressRequest.affiliateBrokers ?? [],
      maxBoostFeeBps: Number(response.maxBoostFeeBps) || 0,
      depositChannelExpiryBlock: response.srcChainExpiryBlock as bigint,
      estimatedDepositChannelExpiryTime: response.estimatedExpiryTime,
      channelOpeningFee: response.channelOpeningFee,
    };
  }

  /** @deprecated DEPRECATED(1.6) use getStatusV2() */
  getStatus(
    swapStatusRequest: SwapStatusRequest,
    options: ApiService.RequestOptions = {},
  ): Promise<SwapStatusResponse> {
    return ApiService.getStatus(this.options.backendUrl, swapStatusRequest, options);
  }

  getStatusV2(
    swapStatusRequest: SwapStatusRequest,
    options: ApiService.RequestOptions = {},
  ): Promise<SwapStatusResponseV2> {
    return ApiService.getStatusV2(this.options.backendUrl, swapStatusRequest, options);
  }

  private async validateSwapAmount(asset: UncheckedAssetAndChain, amount: bigint): Promise<void> {
    const stateChainEnv = await this.getStateChainEnvironment();

    const internalAsset = getInternalAsset(asset);

    const result = validateSwapAmount(stateChainEnv, internalAsset, amount);

    if (!result.success) throw new Error(result.reason);
  }

  async getSwapLimits(): Promise<{
    minimumSwapAmounts: ChainAssetMap<bigint>;
    maximumSwapAmounts: ChainAssetMap<bigint | null>;
  }> {
    const {
      swapping: { maximumSwapAmounts },
      ingressEgress: { minimumDepositAmounts },
    } = await this.getStateChainEnvironment();

    return { minimumSwapAmounts: minimumDepositAmounts, maximumSwapAmounts };
  }

  async getRequiredBlockConfirmations(): Promise<ChainMap<number | null>> {
    const {
      ingressEgress: { witnessSafetyMargins },
    } = await this.getStateChainEnvironment();

    return Object.keys(Chains).reduce(
      (acc, chain) => {
        acc[chain as Chain] = witnessSafetyMargins[chain as Chain]
          ? Number(witnessSafetyMargins[chain as Chain]) + 1
          : null;
        return acc;
      },
      {} as ChainMap<number | null>,
    );
  }

  async getChannelOpeningFees(): Promise<ChainMap<bigint>> {
    const {
      ingressEgress: { channelOpeningFees },
    } = await this.getStateChainEnvironment();

    return channelOpeningFees;
  }

  async getBoostLiquidity(
    params:
      | { feeTierBps?: number }
      | {
          feeTierBps?: number;
          asset: Asset;
          chain: Chain;
        } = {},
  ): Promise<BoostPoolDepth[]> {
    let poolsDepth = await this.getBoostPoolsDepth();

    if ('chain' in params && 'asset' in params) {
      const { chain, asset } = params;
      const internalAsset = getInternalAsset({ chain, asset });
      poolsDepth = poolsDepth
        .filter((boostPoolDepth) => boostPoolDepth.asset === internalAsset)
        .sort((a, b) => b.tier - a.tier);
    }

    if ('feeTierBps' in params && params.feeTierBps !== undefined) {
      poolsDepth = poolsDepth.filter((boostPoolDepth) => boostPoolDepth.tier === params.feeTierBps);
    }

    return poolsDepth.map((depth) => ({
      availableAmount: depth.availableAmount,
      feeTierBps: depth.tier,
      ...getAssetAndChain(depth.asset),
    }));
  }

  async requestDepositAddressV2({
    quote,
    srcAddress,
    destAddress,
    fillOrKillParams: inputFoKParams,
    affiliateBrokers: affiliates,
    ccmParams,
    brokerCommissionBps,
  }: DepositAddressRequestV2): Promise<DepositAddressResponseV2> {
    await this.validateSwapAmount(quote.srcAsset, BigInt(quote.depositAmount));
    assertQuoteValid(quote);
    assert(!quote.isVaultSwap, 'Cannot open a deposit channel for a vault swap quote');

    const depositAddressRequest = {
      srcAsset: quote.srcAsset.asset,
      srcChain: quote.srcAsset.chain,
      destAsset: quote.destAsset.asset,
      destChain: quote.destAsset.chain,
      srcAddress,
      destAddress,
      dcaParams: quote.type === 'DCA' ? quote.dcaParams : undefined,
      fillOrKillParams: parseFoKParams(inputFoKParams, quote),
      maxBoostFeeBps: 'maxBoostFeeBps' in quote ? quote.maxBoostFeeBps : undefined,
      ccmParams,
      amount: quote.depositAmount,
    };
    let response;

    if (this.options.broker) {
      const result = await requestSwapDepositAddress(
        {
          ...depositAddressRequest,
          commissionBps: brokerCommissionBps ?? this.options.broker.commissionBps,
          affiliates,
        },
        { url: this.options.broker.url },
        this.options.network,
      );

      response = {
        id: `${result.issuedBlock}-${quote.srcAsset.chain}-${result.channelId}`,
        depositAddress: result.address,
        brokerCommissionBps: brokerCommissionBps ?? this.options.broker.commissionBps ?? 0,
        srcChainExpiryBlock: result.sourceChainExpiryBlock,
        maxBoostFeeBps: depositAddressRequest.maxBoostFeeBps,
        channelOpeningFee: result.channelOpeningFee,
      };
    } else {
      assert(depositAddressRequest.fillOrKillParams, 'fill or kill params are required');
      assert(
        !brokerCommissionBps,
        'Broker commission is supported only when initializing the SDK with a brokerUrl',
      );
      assert(
        !affiliates?.length,
        'Affiliate brokers are supported only when initializing the SDK with a brokerUrl',
      );

      response = await this.trpc.openSwapDepositChannel.mutate({
        ...depositAddressRequest,
        fillOrKillParams: depositAddressRequest.fillOrKillParams,
        quote,
      });
    }

    return {
      ...depositAddressRequest,
      depositChannelId: response.id,
      depositAddress: response.depositAddress,
      brokerCommissionBps: response.brokerCommissionBps,
      affiliateBrokers: affiliates ?? [],
      maxBoostFeeBps: Number(response.maxBoostFeeBps) || 0,
      depositChannelExpiryBlock: response.srcChainExpiryBlock as bigint,
      estimatedDepositChannelExpiryTime: response.estimatedExpiryTime,
      channelOpeningFee: response.channelOpeningFee,
      fillOrKillParams: inputFoKParams,
    };
  }

  async encodeVaultSwapData({
    quote,
    srcAddress,
    destAddress,
    fillOrKillParams: inputFoKParams,
    affiliateBrokers: affiliates,
    ccmParams,
    brokerAccount,
    brokerCommissionBps,
    extraParams,
  }: VaultSwapRequest): Promise<VaultSwapResponse> {
    await this.validateSwapAmount(quote.srcAsset, BigInt(quote.depositAmount));
    assertQuoteValid(quote);
    assert(quote.isVaultSwap, 'Cannot encode vault swap data for a deposit channel quote');

    const vaultSwapRequest = {
      srcAsset: quote.srcAsset,
      destAsset: quote.destAsset,
      srcAddress,
      destAddress,
      amount: quote.depositAmount,
      ccmParams,
      maxBoostFeeBps: 'maxBoostFeeBps' in quote ? quote.maxBoostFeeBps : undefined,
      fillOrKillParams: parseFoKParams(inputFoKParams, quote)!,
      dcaParams: quote.type === 'DCA' ? quote.dcaParams : undefined,
      extraParams,
      brokerAccount,
      brokerCommissionBps,
      affiliates,
    };

    if (this.options.broker) {
      assert(
        !vaultSwapRequest.brokerAccount,
        'Cannot overwrite broker account when initializing the SDK with a brokerUrl',
      );

      return requestSwapParameterEncoding(
        {
          ...vaultSwapRequest,
          commissionBps: vaultSwapRequest.brokerCommissionBps ?? this.options.broker.commissionBps,
        },
        { url: this.options.broker.url },
        this.options.network,
      );
    }

    assert(
      !vaultSwapRequest.brokerCommissionBps || vaultSwapRequest.brokerAccount,
      'Broker commission is supported only when setting a broker account',
    );
    assert(
      !vaultSwapRequest.affiliates?.length || vaultSwapRequest.brokerAccount,
      'Affiliate brokers are supported only when setting a broker account',
    );

    return this.trpc.encodeVaultSwapData.mutate(vaultSwapRequest);
  }
}

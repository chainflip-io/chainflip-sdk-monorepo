import { unreachable } from '@chainflip/utils/assertion';
import {
  assetConstants,
  getInternalAsset,
  type ChainflipAsset,
  type ChainAssetMap,
  type ChainflipNetwork,
  type UncheckedAssetAndChain,
  ChainflipChain,
  chainflipChains,
  internalAssetToRpcAsset,
  ChainMap,
} from '@chainflip/utils/chainflip';
import { HexString } from '@chainflip/utils/types';
import { initClient } from '@ts-rest/core';
import { apiContract } from '@/shared/api/contract.js';
import {
  CfParametersEncodingRequest,
  requestCfParametersEncoding,
  requestSwapDepositAddress,
  requestSwapParameterEncoding,
} from '@/shared/broker.js';
import { MultiCache } from '@/shared/dataStructures.js';
import { parseFoKParams } from '@/shared/functions.js';
import { assert } from '@/shared/guards.js';
import {
  BoostPoolsDepth,
  Environment,
  RpcConfig,
  getAllBoostPoolsDepth,
  getEnvironment,
} from '@/shared/rpc/index.js';
import { validateSwapAmount } from '@/shared/rpc/utils.js';
import { BoostQuote, FillOrKillParamsWithMinPrice, Quote } from '@/shared/schemas.js';
import { Required } from '@/shared/types.js';
import { getAssetData } from './assets.js';
import { getChainData } from './chains.js';
import { BACKEND_SERVICE_URLS, CF_SDK_VERSION_HEADERS } from './consts.js';
import * as ApiService from './services/ApiService.js';
import {
  ChainData,
  AssetData,
  QuoteRequest,
  SwapStatusRequest,
  BoostPoolDepth,
  QuoteResponseV2,
  FillOrKillParamsWithSlippage,
} from './types.js';
import {
  type SwapStatusResponseV2,
  type DepositAddressRequestV2,
  type VaultSwapRequest,
  DepositAddressResponseV2,
  VaultSwapResponse,
  EncodeCfParametersRequest,
} from './v2/types.js';

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

type AssetState = 'all' | 'deposit' | 'destination' | 'depositChannel' | 'vaultSwap';

export class SwapSDK {
  private readonly options: Required<SwapSDKOptions, 'network' | 'backendUrl'>;

  private readonly rpcConfig: RpcConfig;

  private readonly apiClient;

  private cache;

  private dcaEnabled = false;

  constructor(options: SwapSDKOptions = {}) {
    const network = options.network ?? 'perseverance';
    this.options = {
      ...options,
      network,
      backendUrl: options.backendUrl ?? BACKEND_SERVICE_URLS[network],
    };
    this.rpcConfig = options.rpcUrl ? { rpcUrl: options.rpcUrl } : { network };
    this.apiClient = initClient(apiContract, {
      baseUrl: this.options.backendUrl,
      baseHeaders: CF_SDK_VERSION_HEADERS,
    });
    this.dcaEnabled = options.enabledFeatures?.dca ?? false;
    this.cache = new MultiCache({
      environment: {
        fetch: () => getEnvironment(this.rpcConfig),
        ttl: 60_000,
      },
      networkInfo: {
        fetch: async () => {
          const res = await this.apiClient.networkInfo();
          assert(res.status === 200, 'Failed to fetch network status');
          return res.body;
        },
        ttl: 60_000,
      },
    });
  }

  async getChains(sourceChain?: ChainflipChain, type: AssetState = 'all'): Promise<ChainData[]> {
    if (sourceChain && !chainflipChains.includes(sourceChain)) {
      throw new Error(`unsupported source chain "${sourceChain}"`);
    }

    const [env, supportedAssets] = await Promise.all([
      this.getStateChainEnvironment(),
      this.getSupportedAssets(type),
    ]);

    const supportedChains = new Set(supportedAssets.map((a) => assetConstants[a].chain));
    if (sourceChain && !supportedChains.has(sourceChain)) return [];

    return [...supportedChains]
      .map((chain) => getChainData(chain, this.options.network, env))
      .filter((chain) => chain.chain !== sourceChain);
  }

  private async getStateChainEnvironment(): Promise<Environment> {
    return this.cache.read('environment');
  }

  private async getSupportedAssets(type: AssetState): Promise<ChainflipAsset[]> {
    const assets = await this.cache.read('networkInfo');

    return assets.assets
      .filter((a) => {
        switch (type) {
          case 'all':
            return true;
          case 'deposit':
            return (
              a.depositChannelCreationEnabled &&
              a.depositChannelDepositsEnabled &&
              a.vaultSwapDepositsEnabled
            );
          case 'destination':
            return a.egressEnabled;
          case 'depositChannel':
            return a.depositChannelCreationEnabled && a.depositChannelDepositsEnabled;
          case 'vaultSwap':
            return a.vaultSwapDepositsEnabled;
          default:
            return unreachable(type, 'unexpected type');
        }
      })
      .map((a) => a.asset);
  }

  private async getBoostPoolsDepth(): Promise<BoostPoolsDepth> {
    return getAllBoostPoolsDepth(this.rpcConfig);
  }

  async getAssets(chain?: ChainflipChain, type: AssetState = 'all'): Promise<AssetData[]> {
    if (chain && !chainflipChains.includes(chain)) throw new Error(`unsupported chain "${chain}"`);

    const [env, supportedAssets] = await Promise.all([
      this.getStateChainEnvironment(),
      this.getSupportedAssets(type),
    ]);

    return supportedAssets
      .map((asset) => getAssetData(asset, this.options.network, env))
      .filter((asset) => !chain || asset.chain === chain);
  }

  // eslint-disable-next-line class-methods-use-this
  protected shouldTakeCommission(): boolean {
    return false;
  }

  private async getCommissionBps(brokerCommissionBps: number | undefined): Promise<number> {
    if (this.shouldTakeCommission()) {
      return (await this.cache.read('networkInfo')).cfBrokerCommissionBps;
    }
    return brokerCommissionBps ?? this.options.broker?.commissionBps ?? 0;
  }

  async getQuoteV2(
    quoteRequest: QuoteRequest,
    options: ApiService.RequestOptions = {},
  ): Promise<QuoteResponseV2> {
    const submitterBrokerCommissionBps = await this.getCommissionBps(
      quoteRequest.brokerCommissionBps,
    );

    return ApiService.getQuoteV2(
      this.options.backendUrl,
      {
        ...quoteRequest,
        brokerCommissionBps: submitterBrokerCommissionBps,
        dcaEnabled: this.dcaEnabled,
      },
      options,
    );
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

    return chainflipChains.reduce(
      (acc, chain) => {
        acc[chain] = witnessSafetyMargins[chain] ? Number(witnessSafetyMargins[chain]) + 1 : null;
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
    params: { feeTierBps?: number } | ({ feeTierBps?: number } & UncheckedAssetAndChain) = {},
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
      ...internalAssetToRpcAsset[depth.asset],
    }));
  }

  async requestDepositAddressV2({
    quote,
    srcAddress,
    destAddress,
    fillOrKillParams: inputFoKParams,
    affiliateBrokers: affiliates,
    ccmParams,
    brokerCommissionBps: brokerCommissionBpsParam,
  }: DepositAddressRequestV2): Promise<DepositAddressResponseV2> {
    await this.validateSwapAmount(quote.srcAsset, BigInt(quote.depositAmount));
    assertQuoteValid(quote);
    assert(!quote.isVaultSwap, 'Cannot open a deposit channel for a vault swap quote');
    assert(!quote.isOnChain, 'Cannot open a deposit channel for an on-chain quote');

    if (ccmParams) {
      assert(quote.ccmParams, 'Cannot open CCM channel for quote without CCM params');
    } else {
      assert(!quote.ccmParams, 'Cannot open regular channel for quote with CCM params');
    }

    const brokerCommissionBps = await this.getCommissionBps(brokerCommissionBpsParam);

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
          commissionBps: brokerCommissionBps,
          affiliates,
        },
        { url: this.options.broker.url },
        this.options.network,
      );

      response = {
        id: `${result.issuedBlock}-${quote.srcAsset.chain}-${result.channelId}`,
        depositAddress: result.address,
        brokerCommissionBps,
        srcChainExpiryBlock: result.sourceChainExpiryBlock,
        maxBoostFeeBps: depositAddressRequest.maxBoostFeeBps,
        channelOpeningFee: result.channelOpeningFee,
      };
    } else {
      assert(
        !brokerCommissionBps || this.shouldTakeCommission(),
        'Broker commission is supported only when initializing the SDK with a brokerUrl',
      );
      assert(
        !affiliates?.length,
        'Affiliate brokers are supported only when initializing the SDK with a brokerUrl',
      );

      const res = await this.apiClient.openSwapDepositChannel({
        body: {
          ...depositAddressRequest,
          quote,
          takeCommission: this.shouldTakeCommission(),
        },
      });

      assert(res.status === 201, 'Failed to open swap deposit channel');

      response = res.body;
    }

    return {
      ...depositAddressRequest,
      depositChannelId: response.id,
      depositAddress: response.depositAddress,
      brokerCommissionBps: response.brokerCommissionBps,
      affiliateBrokers: affiliates ?? [],
      maxBoostFeeBps: Number(response.maxBoostFeeBps) || 0,
      depositChannelExpiryBlock: BigInt(response.srcChainExpiryBlock),
      estimatedDepositChannelExpiryTime: response.estimatedExpiryTime,
      channelOpeningFee: BigInt(response.channelOpeningFee),
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
    brokerCommissionBps: brokerCommissionBpsParam,
    extraParams,
  }: VaultSwapRequest): Promise<VaultSwapResponse> {
    await this.validateSwapAmount(quote.srcAsset, BigInt(quote.depositAmount));
    assertQuoteValid(quote);
    assert(quote.isVaultSwap, 'Cannot encode vault swap data for non-vault swap quotes');

    if (ccmParams) {
      assert(quote.ccmParams, 'Cannot encode CCM swap for quote without CCM params');
    } else {
      assert(!quote.ccmParams, 'Cannot encode regular swap for quote with CCM params');
    }

    const brokerCommissionBps = await this.getCommissionBps(brokerCommissionBpsParam);

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
      commissionBps: brokerCommissionBps,
      affiliates,
    };

    if (this.options.broker) {
      assert(
        !vaultSwapRequest.brokerAccount,
        'Cannot overwrite broker account when initializing the SDK with a brokerUrl',
      );

      return requestSwapParameterEncoding(
        vaultSwapRequest,
        { url: this.options.broker.url },
        this.options.network,
      );
    }

    assert(
      !vaultSwapRequest.commissionBps ||
        vaultSwapRequest.brokerAccount ||
        this.shouldTakeCommission(),
      'Broker commission is supported only when setting a broker account',
    );
    assert(
      !vaultSwapRequest.affiliates?.length || vaultSwapRequest.brokerAccount,
      'Affiliate brokers are supported only when setting a broker account',
    );

    const res = await this.apiClient.encodeVaultSwapData({
      body: { ...vaultSwapRequest, network: this.options.network },
    });

    if (res.status !== 200) {
      throw new Error('Failed to encode vault swap data', { cause: res });
    }

    switch (res.body.chain) {
      case 'Arbitrum':
      case 'Ethereum':
        return { ...res.body, value: BigInt(res.body.value) };
      default:
        return res.body;
    }
  }

  async encodeCfParameters({
    quote,
    srcAddress,
    destAddress,
    fillOrKillParams,
    affiliateBrokers: affiliates,
    ccmParams,
    brokerAccount,
    brokerCommissionBps,
  }: EncodeCfParametersRequest): Promise<HexString> {
    await this.validateSwapAmount(quote.srcAsset, BigInt(quote.depositAmount));
    assertQuoteValid(quote);

    if (ccmParams) {
      assert(quote.ccmParams, 'Cannot encode CCM swap for quote without CCM params');
    } else {
      assert(!quote.ccmParams, 'Cannot encode regular swap for quote with CCM params');
    }

    const requestParams: CfParametersEncodingRequest = {
      srcAsset: quote.srcAsset,
      destAsset: quote.destAsset,
      srcAddress,
      destAddress,
      amount: quote.depositAmount,
      ccmParams,
      maxBoostFeeBps: 'maxBoostFeeBps' in quote ? quote.maxBoostFeeBps : undefined,
      fillOrKillParams: parseFoKParams(fillOrKillParams, quote)!,
      dcaParams: quote.type === 'DCA' ? quote.dcaParams : undefined,
      commissionBps: await this.getCommissionBps(brokerCommissionBps),
      affiliates,
      network: this.options.network,
    };

    if (this.options.broker) {
      assert(
        !brokerAccount,
        'Cannot overwrite broker account when initializing the SDK with a brokerUrl',
      );

      return requestCfParametersEncoding(requestParams, { url: this.options.broker.url });
    }

    assert(
      !requestParams.commissionBps || brokerAccount || this.shouldTakeCommission(),
      'Broker commission is supported only when setting a broker account',
    );
    assert(
      !requestParams.affiliates?.length || brokerAccount,
      'Affiliate brokers are supported only when setting a broker account',
    );

    const res = await this.apiClient.encodeCfParameters({
      body: { ...requestParams, brokerAccount },
    });

    if (res.status !== 200) {
      throw new Error('Failed to encode cf parameters', { cause: res });
    }

    return res.body;
  }

  // eslint-disable-next-line class-methods-use-this
  getOnChainSwapExtrinsicArgs({
    quote,
    fillOrKillParams,
  }: {
    quote: Quote;
    fillOrKillParams:
      | Omit<FillOrKillParamsWithMinPrice, 'refundAddress'>
      | Omit<FillOrKillParamsWithSlippage, 'refundAddress'>;
  }): [
    amount: string,
    inputAsset: ChainflipAsset,
    outputAsset: ChainflipAsset,
    retryDuration: number,
    minPrice: string,
    dcaParams: { number_of_chunks: number; chunk_interval: number } | null,
  ] {
    assert(quote.isOnChain, 'Cannot get extrinsic args for non-on-chain quotes');

    const { retryDurationBlocks, minPriceX128 } = parseFoKParams(fillOrKillParams, quote);

    return [
      quote.depositAmount,
      getInternalAsset(quote.srcAsset),
      getInternalAsset(quote.destAsset),
      retryDurationBlocks,
      minPriceX128,
      quote.type === 'DCA'
        ? {
            number_of_chunks: quote.dcaParams.numberOfChunks,
            chunk_interval: quote.dcaParams.chunkIntervalBlocks,
          }
        : null,
    ];
  }

  async checkBoostEnabled(): Promise<boolean> {
    const { assets } = await this.cache.read('networkInfo');
    return assets.find((a) => a.asset === 'Btc')?.boostDepositsEnabled ?? true;
  }
}

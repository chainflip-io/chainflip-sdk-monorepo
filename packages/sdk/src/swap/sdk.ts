import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import { Signer } from 'ethers';
import superjson from 'superjson';
import { requestSwapDepositAddress } from '@/shared/broker';
import { TransactionOptions } from '@/shared/contracts';
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
import { approveVault, executeSwap, ExecuteSwapParams } from '@/shared/vault';
import type { AppRouter } from '@/swap/server';
import { AsyncCacheMap } from '@/swap/utils/dataStructures';
import { getAssetData, isGasAsset } from './assets';
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
import { type SwapStatusResponseV2, type DepositAddressRequestV2 } from './v2/types';

type TransactionHash = `0x${string}`;

export type SwapSDKOptions = {
  network?: ChainflipNetwork;
  backendUrl?: string;
  signer?: Signer;
  broker?: {
    url: string;
    commissionBps: number;
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

    if (this.options.broker !== undefined) {
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
        brokerCommissionBps: this.options.broker.commissionBps,
        srcChainExpiryBlock: result.sourceChainExpiryBlock,
        maxBoostFeeBps: depositAddressRequest.maxBoostFeeBps,
        channelOpeningFee: result.channelOpeningFee,
      };
    } else {
      assert(
        !depositAddressRequest.brokerCommissionBps,
        'Broker commission is only supported only when initializing the SDK with a brokerUrl',
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

  async executeSwap(
    params: ExecuteSwapParams,
    txOpts: TransactionOptions & { signer?: Signer } = {},
  ): Promise<TransactionHash> {
    const { srcChain, srcAsset, amount } = params;

    const { signer: optsSigner, ...remainingTxOpts } = txOpts;
    const signer = optsSigner ?? this.options.signer;
    assert(signer, 'No signer provided');

    await this.validateSwapAmount({ chain: srcChain, asset: srcAsset }, BigInt(amount));

    const tx = await executeSwap(
      params,
      {
        network: this.options.network,
        signer,
      },
      remainingTxOpts,
    );
    return tx.hash as `0x${string}`;
  }

  async approveVault(
    params: Pick<ExecuteSwapParams, 'srcChain' | 'srcAsset' | 'amount'>,
    txOpts: TransactionOptions & { signer?: Signer } = {},
  ): Promise<TransactionHash | null> {
    const { signer: optsSigner, ...remainingTxOpts } = txOpts;
    const signer = optsSigner ?? this.options.signer;
    assert(signer, 'No signer provided');

    const tx = await approveVault(
      params,
      {
        signer,
        network: this.options.network,
      },
      remainingTxOpts,
    );
    return tx ? (tx.hash as `0x${string}`) : null;
  }

  private async validateSwapAmount(asset: UncheckedAssetAndChain, amount: bigint): Promise<void> {
    const stateChainEnv = await this.getStateChainEnvironment();

    const internalAsset = getInternalAsset(asset);

    const result = validateSwapAmount(stateChainEnv, internalAsset, amount);

    if (!result.success) throw new Error(result.reason);
  }

  async approveAndExecuteSwap(
    params: ExecuteSwapParams,
    txOpts: Omit<TransactionOptions, 'nonce'> & { signer?: Signer } = {},
  ): Promise<{
    approveTxRef: TransactionHash | null;
    swapTxRef: TransactionHash | null;
  }> {
    const { srcChain, srcAsset } = params;
    const signer = txOpts.signer ?? this.options.signer;
    assert(signer, 'No signer provided');

    const internalAsset = getInternalAsset({ chain: srcChain, asset: srcAsset });

    let approveTxRef = null;
    if (!isGasAsset(internalAsset)) {
      approveTxRef = await this.approveVault(params, { ...txOpts, nonce: undefined });
    }

    const swapTxRef = await this.executeSwap(params, { ...txOpts, nonce: undefined });

    return {
      approveTxRef,
      swapTxRef,
    };
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
  }: DepositAddressRequestV2) {
    await this.validateSwapAmount(quote.srcAsset, BigInt(quote.depositAmount));
    assertQuoteValid(quote);

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

    if (this.options.broker !== undefined) {
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
        brokerCommissionBps: this.options.broker.commissionBps,
        srcChainExpiryBlock: result.sourceChainExpiryBlock,
        maxBoostFeeBps: depositAddressRequest.maxBoostFeeBps,
        channelOpeningFee: result.channelOpeningFee,
      };
    } else {
      assert(depositAddressRequest.fillOrKillParams, 'fill or kill params are required');
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
}

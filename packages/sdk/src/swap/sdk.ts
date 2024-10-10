import { SwappingRequestSwapDepositAddressWithAffiliates } from '@chainflip/extrinsics/160/swapping/requestSwapDepositAddressWithAffiliates';
import { HexString } from '@chainflip/utils/types';
import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import { Signer } from 'ethers';
import superjson from 'superjson';
import { requestSwapDepositAddress, buildExtrinsicPayload } from '@/shared/broker';
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
import { getPriceX128FromPrice } from '@/shared/functions';
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
import type { CcmParams, QuoteQueryResponse } from '@/shared/schemas';
import { Required } from '@/shared/types';
import { approveVault, executeSwap, ExecuteSwapParams } from '@/shared/vault';
import type { AppRouter } from '@/swap/server';
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
import { type SwapStatusResponseV2 } from './v2/types';

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

export class SwapSDK {
  private readonly options: Required<SwapSDKOptions, 'network' | 'backendUrl'>;

  private readonly rpcConfig: RpcConfig;

  private readonly trpc;

  private stateChainEnvironment?: Environment;

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
    this.stateChainEnvironment ??= await getEnvironment(this.rpcConfig);

    return this.stateChainEnvironment;
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

    // DEPRECATED(1.5): use ccmParams instead of ccmMetadata
    depositAddressRequest.ccmParams ??= depositAddressRequest.ccmMetadata; // eslint-disable-line no-param-reassign

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

    // DEPRECATED(1.5): use ccmParams instead of ccmMetadata
    params.ccmParams ??= params.ccmMetadata; // eslint-disable-line no-param-reassign

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

  buildRequestSwapDepositAddressWithAffiliatesParams({
    quote,
    destAddress,
    boost,
    fillOrKillParams: inputFoKParams,
    affiliates: inputAffiliates,
    ccmParams,
    brokerCommissionBps,
  }: {
    quote: QuoteQueryResponse;
    destAddress: string;
    boost?: boolean;
    fillOrKillParams?: {
      minPrice: string;
      refundAddress: string;
      retryDurationBlocks: number;
    };
    affiliates?: { account: `cF${string}` | HexString; commissionBps: number }[];
    ccmParams?: CcmParams;
    brokerCommissionBps?: number;
  }): SwappingRequestSwapDepositAddressWithAffiliates {
    let dcaParams = null;
    let fillOrKillParams = null;

    if (quote.type === 'DCA') dcaParams = quote.dcaParams;

    assert(
      quote.type === 'REGULAR' || dcaParams !== null,
      'failed to find DCA parameters from quote',
    );

    if (inputFoKParams) {
      fillOrKillParams = {
        minPriceX128: getPriceX128FromPrice(
          inputFoKParams.minPrice,
          getInternalAsset(quote.srcAsset),
          getInternalAsset(quote.destAsset),
        ),
        refundAddress: inputFoKParams.refundAddress,
        retryDurationBlocks: inputFoKParams.retryDurationBlocks,
      };
    }

    return buildExtrinsicPayload(
      {
        srcAsset: quote.srcAsset.asset,
        srcChain: quote.srcAsset.chain,
        destAsset: quote.destAsset.asset,
        destChain: quote.destAsset.chain,
        destAddress,
        dcaParams,
        fillOrKillParams,
        maxBoostFeeBps: boost ? 30 : 0,
        commissionBps: brokerCommissionBps ?? this.options.broker?.commissionBps ?? 0,
        ccmParams: ccmParams ?? null,
        affiliates: inputAffiliates ?? [],
      },
      this.options.network,
    );
  }
}

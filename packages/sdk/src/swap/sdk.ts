import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import { Signer } from 'ethers';
import superjson from 'superjson';
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
} from '@/shared/enums';
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
import { Required } from '@/shared/types';
import { approveVault, executeSwap, ExecuteSwapParams } from '@/shared/vault';
import type { AppRouter } from '@/swap/server';
import { getAssetData } from './assets';
import { getChainData } from './chains';
import { BACKEND_SERVICE_URLS } from './consts';
import * as ApiService from './services/ApiService';
import {
  ChainData,
  AssetData,
  QuoteRequest,
  DepositAddressResponse,
  QuoteResponse,
  SwapStatusRequest,
  SwapStatusResponse,
  DepositAddressRequest,
  BoostPoolDepth,
} from './types';

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
};

export class SwapSDK {
  private readonly options: Required<SwapSDKOptions, 'network' | 'backendUrl'>;

  private readonly rpcConfig: RpcConfig;

  private readonly trpc;

  private stateChainEnvironment?: Environment;

  private supportedAssets?: InternalAsset[];

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
      links: [httpBatchLink({ url: new URL('/trpc', this.options.backendUrl) })],
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

  async requestDepositAddress(
    depositAddressRequest: DepositAddressRequest,
  ): Promise<DepositAddressResponse> {
    const { srcChain, srcAsset, amount, brokerCommissionBps, affiliateBrokers } =
      depositAddressRequest;

    await this.validateSwapAmount({ chain: srcChain, asset: srcAsset }, BigInt(amount));

    let response;

    if (this.options.broker !== undefined) {
      const { requestSwapDepositAddress } = await import('@/shared/broker.js');

      const result = await requestSwapDepositAddress(
        depositAddressRequest,
        {
          ...this.options.broker,
          commissionBps: brokerCommissionBps ?? this.options.broker.commissionBps,
          affiliates: affiliateBrokers,
        },
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
      response = await this.trpc.openSwapDepositChannel.mutate(depositAddressRequest);
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

  getStatus(
    swapStatusRequest: SwapStatusRequest,
    options: ApiService.RequestOptions = {},
  ): Promise<SwapStatusResponse> {
    return ApiService.getStatus(this.options.backendUrl, swapStatusRequest, options);
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

  async getBoostLiquidity({
    chainAsset,
    tier,
  }: {
    chainAsset?: UncheckedAssetAndChain;
    tier?: number;
  } = {}): Promise<BoostPoolDepth[]> {
    let poolsDepth = await this.getBoostPoolsDepth();

    if (chainAsset) {
      const internalAsset = getInternalAsset(chainAsset);
      poolsDepth = poolsDepth
        .filter((boostPoolDepth) => boostPoolDepth.asset === internalAsset)
        .sort((a, b) => (a.tier < b.tier ? -1 : 1));
    }

    if (tier) {
      poolsDepth = poolsDepth.filter((boostPoolDepth) => boostPoolDepth.tier === tier);
    }

    return poolsDepth.map((depth) => ({
      ...depth,
      ...getAssetAndChain(depth.asset),
    }));
  }
}

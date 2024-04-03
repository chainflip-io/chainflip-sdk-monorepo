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
  getInternalAsset,
  isValidAssetAndChain,
  assetConstants,
} from '@/shared/enums';
import { assert, isNotNullish } from '@/shared/guards';
import { Environment, RpcConfig, getEnvironment, getSupportedAssets } from '@/shared/rpc';
import { validateSwapAmount } from '@/shared/rpc/utils';
import { Required } from '@/shared/types';
import { approveVault, executeSwap, ExecuteSwapParams } from '@/shared/vault';
import type { AppRouter } from '@/swap/server';
import { getAssetData } from './assets';
import { getChainData } from './chains';
import { BACKEND_SERVICE_URLS } from './consts';
import ApiService, { RequestOptions } from './services/ApiService';
import {
  ChainData,
  AssetData,
  QuoteRequest,
  DepositAddressResponse,
  QuoteResponse,
  SwapStatusRequest,
  SwapStatusResponse,
  DepositAddressRequest,
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
      .map((asset) => (isValidAssetAndChain(asset) ? getInternalAsset(asset) : undefined))
      .filter(isNotNullish);

    return this.supportedAssets;
  }

  async getAssets(chain?: Chain): Promise<AssetData[]> {
    const [env, supportedAssets] = await Promise.all([
      this.getStateChainEnvironment(),
      this.getSupportedAssets(),
    ]);

    return supportedAssets
      .map((asset) => getAssetData(asset, this.options.network, env))
      .filter((asset) => !chain || asset.chain === chain);
  }

  getQuote(quoteRequest: QuoteRequest, options: RequestOptions = {}): Promise<QuoteResponse> {
    return ApiService.getQuote(
      this.options.backendUrl,
      {
        ...quoteRequest,
        brokerCommissionBps: this.options.broker?.commissionBps,
      },
      options,
    );
  }

  async requestDepositAddress(
    depositAddressRequest: DepositAddressRequest,
  ): Promise<DepositAddressResponse> {
    const { srcChain, srcAsset, amount } = depositAddressRequest;

    await this.validateSwapAmount({ chain: srcChain, asset: srcAsset }, BigInt(amount));

    let response;

    if (this.options.broker !== undefined) {
      const { requestSwapDepositAddress } = await import('@/shared/broker');

      const result = await requestSwapDepositAddress(
        depositAddressRequest,
        this.options.broker,
        this.options.network,
      );

      response = {
        id: `${result.issuedBlock}-${depositAddressRequest.srcChain}-${result.channelId}`,
        depositAddress: result.address,
        brokerCommissionBps: this.options.broker.commissionBps,
        srcChainExpiryBlock: result.sourceChainExpiryBlock,
        boostFeeBps: depositAddressRequest.boostFeeBps,
        channelOpeningFee: result.channelOpeningFee,
      };
    } else {
      response = await this.trpc.openSwapDepositChannel.mutate(depositAddressRequest);
    }

    return {
      ...depositAddressRequest,
      depositChannelId: response.id,
      depositAddress: response.depositAddress,
      brokerCommissionBps: response.brokerCommissionBps,
      boostFeeBps: Number(response.boostFeeBps) || 0,
      depositChannelExpiryBlock: response.srcChainExpiryBlock as bigint,
      estimatedDepositChannelExpiryTime: response.estimatedExpiryTime,
      channelOpeningFee: response.channelOpeningFee,
    };
  }

  getStatus(
    swapStatusRequest: SwapStatusRequest,
    options: RequestOptions = {},
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

    const receipt = await executeSwap(
      params,
      {
        network: this.options.network,
        signer,
      },
      remainingTxOpts,
    );
    return receipt.hash as `0x${string}`;
  }

  async approveVault(
    params: Pick<ExecuteSwapParams, 'srcChain' | 'srcAsset' | 'amount'>,
    txOpts: TransactionOptions & { signer?: Signer } = {},
  ): Promise<TransactionHash | null> {
    const { signer: optsSigner, ...remainingTxOpts } = txOpts;
    const signer = optsSigner ?? this.options.signer;
    assert(signer, 'No signer provided');

    const receipt = await approveVault(
      params,
      {
        signer,
        network: this.options.network,
      },
      remainingTxOpts,
    );
    return receipt ? (receipt.hash as `0x${string}`) : null;
  }

  private async validateSwapAmount(asset: UncheckedAssetAndChain, amount: bigint): Promise<void> {
    const stateChainEnv = await this.getStateChainEnvironment();

    const result = validateSwapAmount(stateChainEnv, asset, amount);

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
}

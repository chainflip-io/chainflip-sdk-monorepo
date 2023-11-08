import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import type { inferRouterOutputs } from '@trpc/server';
import { Signer } from 'ethers';
import superjson from 'superjson';
import { TransactionOptions } from '@/shared/contracts';
import { ChainflipNetwork, Chain, ChainflipNetworks } from '@/shared/enums';
import { assert } from '@/shared/guards';
import { ExecuteSwapParams, approveVault, executeSwap } from '@/shared/vault';
import type { TokenSwapParams } from '@/shared/vault/schemas';
import type { AppRouter } from '@/swap/server';
import { BACKEND_SERVICE_URLS } from './consts';
import ApiService, { RequestOptions } from './services/ApiService';
import type {
  ChainData,
  AssetData,
  QuoteRequest,
  DepositAddressResponse,
  QuoteResponse,
  SwapStatusRequest,
  DepositAddressRequest,
} from './types';

type RouterOutput = inferRouterOutputs<AppRouter>;
type TransactionHash = `0x${string}`;

export type SwapSDKOptions = {
  network?: Exclude<ChainflipNetwork, 'mainnet'>;
  signer?: Signer;
  backendUrl?: string;
  broker?: {
    url: string;
    commissionBps: number;
  };
};

export class SwapSDK {
  private readonly baseUrl: string;

  private readonly network: Exclude<ChainflipNetwork, 'mainnet'>;

  private readonly signer?: Signer;

  private readonly trpc;

  private readonly brokerConfig?;

  constructor(options: SwapSDKOptions = {}) {
    this.network = options.network ?? ChainflipNetworks.perseverance;
    this.baseUrl = options.backendUrl ?? BACKEND_SERVICE_URLS[this.network];
    this.signer = options.signer;
    this.brokerConfig = options.broker;
    this.trpc = createTRPCProxyClient<AppRouter>({
      transformer: superjson,
      links: [httpBatchLink({ url: new URL('/trpc', this.baseUrl) })],
    });
  }

  getChains(sourceChain?: Chain): Promise<ChainData[]> {
    if (sourceChain !== undefined) {
      return ApiService.getPossibleDestinationChains(sourceChain, this.network);
    }
    return ApiService.getChains(this.network);
  }

  getAssets(chain: Chain): Promise<AssetData[]> {
    return ApiService.getAssets(chain, this.network);
  }

  getQuote(
    quoteRequest: QuoteRequest,
    options: RequestOptions = {},
  ): Promise<QuoteResponse> {
    return ApiService.getQuote(this.baseUrl, quoteRequest, options);
  }

  async requestDepositAddress(
    depositAddressRequest: DepositAddressRequest,
  ): Promise<DepositAddressResponse> {
    let response;

    if (this.brokerConfig !== undefined) {
      const { requestSwapDepositAddress } = await import('@/shared/broker');

      const result = await requestSwapDepositAddress(
        depositAddressRequest,
        this.brokerConfig,
      );

      response = {
        id: `${result.issuedBlock}-${depositAddressRequest.srcChain}-${result.channelId}`,
        depositAddress: result.address,
        srcChainExpiryBlock: result.sourceChainExpiryBlock,
      };
    } else {
      response = await this.trpc.openSwapDepositChannel.mutate(
        depositAddressRequest,
      );
    }

    return {
      ...depositAddressRequest,
      depositChannelId: response.id,
      depositAddress: response.depositAddress,
      depositChannelExpiryBlock: response.srcChainExpiryBlock as bigint,
      estimatedDepositChannelExpiryTime: response.estimatedExpiryTime,
    };
  }

  getStatus(
    swapStatusRequest: SwapStatusRequest,
    options: RequestOptions = {},
  ): Promise<RouterOutput['getStatus']> {
    return this.trpc.getStatus.query(swapStatusRequest, {
      signal: options.signal,
    });
  }

  async executeSwap(
    params: ExecuteSwapParams,
    txOpts: TransactionOptions = {},
  ): Promise<TransactionHash> {
    assert(this.signer, 'No signer provided');
    const receipt = await executeSwap(
      params,
      {
        network: this.network,
        signer: this.signer,
      },
      txOpts,
    );
    return receipt.hash as `0x${string}`;
  }

  async approveVault(
    params: Pick<TokenSwapParams, 'srcAsset' | 'amount'>,
    txOpts: TransactionOptions = {},
  ): Promise<TransactionHash | null> {
    if (!('srcAsset' in params)) return null;
    assert(this.signer, 'No signer provided');

    const receipt = await approveVault(
      params,
      {
        signer: this.signer,
        network: this.network,
      },
      txOpts,
    );
    return receipt ? (receipt.hash as `0x${string}`) : null;
  }
}

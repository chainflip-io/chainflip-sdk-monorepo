import { Signer } from 'ethers';
import { TransactionOptions } from '@/shared/contracts';
import { ChainflipNetwork, Chain, ChainflipNetworks } from '@/shared/enums';
import { assert } from '@/shared/guards';
import { ExecuteSwapParams, approveVault, executeSwap } from '@/shared/vault';
import type { TokenSwapParams } from '@/shared/vault/schemas';
import { BACKEND_SERVICE_URLS } from './consts';
import ApiService, { RequestOptions } from './services/ApiService';
import type {
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
  network?: Exclude<ChainflipNetwork, 'mainnet'>;
  signer?: Signer;
  backendUrl?: string;
};

export class SwapSDK {
  private readonly baseUrl: string;

  private readonly network: Exclude<ChainflipNetwork, 'mainnet'>;

  private readonly signer?: Signer;

  constructor(options: SwapSDKOptions = {}) {
    this.network = options.network ?? ChainflipNetworks.perseverance;
    this.baseUrl = options.backendUrl ?? BACKEND_SERVICE_URLS[this.network];
    this.signer = options.signer;
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

  requestDepositAddress(
    depositAddressRequest: DepositAddressRequest,
    options: RequestOptions = {},
  ): Promise<DepositAddressResponse> {
    return ApiService.requestDepositAddress(
      this.baseUrl,
      depositAddressRequest,
      options,
    );
  }

  getStatus(
    swapStatusRequest: SwapStatusRequest,
    options: RequestOptions = {},
  ): Promise<SwapStatusResponse> {
    return ApiService.getStatus(this.baseUrl, swapStatusRequest, options);
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

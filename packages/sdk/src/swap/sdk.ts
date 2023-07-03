import { ContractReceipt, Signer } from 'ethers';
import { ChainflipNetwork, Chain, ChainflipNetworks } from '@/shared/enums';
import { assert } from '@/shared/guards';
import { ExecuteSwapParams, executeSwap } from '@/shared/vault';
import { BACKEND_SERVICE_URLS } from './consts';
import ApiService, { RequestOptions } from './services/ApiService';
import type {
  ChainData,
  AssetData,
  QuoteRequest,
  SwapResponse,
  QuoteResponse,
  SwapStatusRequest,
  SwapStatusResponse,
  SwapRequest,
} from './types';

export type SDKOptions = {
  network?: Exclude<ChainflipNetwork, 'mainnet'>;
  signer?: Signer;
  backendUrl?: string;
};

export class SwapSDK {
  private readonly baseUrl: string;

  private readonly network: Exclude<ChainflipNetwork, 'mainnet'>;

  private readonly signer?: Signer;

  constructor(options: SDKOptions = {}) {
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
    swapRequest: SwapRequest,
    options: RequestOptions = {},
  ): Promise<SwapResponse> {
    return ApiService.requestDepositAddress(this.baseUrl, swapRequest, options);
  }

  getStatus(
    swapStatusRequest: SwapStatusRequest,
    options: RequestOptions = {},
  ): Promise<SwapStatusResponse> {
    return ApiService.getStatus(this.baseUrl, swapStatusRequest, options);
  }

  executeSwap(params: ExecuteSwapParams): Promise<ContractReceipt> {
    assert(this.signer, 'No signer provided');
    return executeSwap(params, {
      network: this.network,
      signer: this.signer,
    });
  }
}

import { ContractReceipt, Signer } from 'ethers';
import { ChainflipNetwork, SupportedChain } from '@/shared/enums';
import { assert } from '@/shared/guards';
import { ExecuteSwapParams, executeSwap } from '@/shared/vault';
import { BACKEND_SERVICE_URL } from './consts';
import ApiService, { RequestOptions } from './services/ApiService';
import type {
  Chain,
  Token,
  RouteRequest,
  SwapResponse,
  RouteResponse,
  SwapStatusRequest,
  SwapStatusResponse,
  SwapRequest,
} from './types';

export * from './types';

export type SDKOptions = {
  backendServiceUrl?: string;
  network?: ChainflipNetwork;
  signer?: Signer;
};

export class SwapSDK {
  private readonly baseUrl: string;

  private readonly network: ChainflipNetwork;

  private readonly signer?: Signer;

  constructor(options: SDKOptions = {}) {
    this.baseUrl = options.backendServiceUrl ?? BACKEND_SERVICE_URL;
    this.network = options.network ?? 'sisyphos';
    this.signer = options.signer;
  }

  getChains(): Promise<Chain[]>;
  getChains(sourceChain: SupportedChain): Promise<Chain[] | undefined>;
  getChains(sourceChain?: SupportedChain): Promise<Chain[] | undefined> {
    if (sourceChain !== undefined) {
      return ApiService.getPossibleDestinationChains(sourceChain, this.network);
    }
    return ApiService.getChains(this.network);
  }

  getTokens(chain: SupportedChain): Promise<Token[] | undefined> {
    return ApiService.getTokens(chain, this.network);
  }

  getRoute(
    routeRequest: RouteRequest,
    options: RequestOptions = {},
  ): Promise<RouteResponse> {
    return ApiService.getRoute(this.baseUrl, routeRequest, options);
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

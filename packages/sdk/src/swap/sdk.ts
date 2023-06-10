import { ContractReceipt, Signer } from 'ethers';
import { ChainflipNetwork } from '@/shared/enums';
import { assert } from '@/shared/guards';
import { ExecuteSwapParams, executeSwap } from '@/shared/vault';
import { BACKEND_SERVICE_URL, ChainId } from './consts';
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

export { ChainId };
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
  getChains(chainId: ChainId): Promise<Chain[] | undefined>;
  getChains(chainId?: ChainId): Promise<Chain[] | undefined> {
    if (chainId !== undefined) {
      return ApiService.getPossibleDestinationChains(chainId, this.network);
    }
    return ApiService.getChains(this.network);
  }

  getTokens(chainId: ChainId): Promise<Token[] | undefined> {
    return ApiService.getTokens(chainId, this.network);
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

  executeSwap(
    params: ExecuteSwapParams,
    signer?: Signer,
  ): Promise<ContractReceipt> {
    const s = signer ?? this.signer;
    assert(s, 'No signer provided');
    return executeSwap(params, { cfNetwork: this.network, signer: s });
  }
}

import type { ApiPromise } from '@polkadot/api';
import type { IKeyringPair } from '@polkadot/types/types';

import { getLendingPools, getLendingConfig, getLendingPoolSupplyBalances } from './rpc.js';
import type {
  LendingSDKOptions,
  RpcConfig,
  LendingPool,
  LendingConfig,
  PoolSupplyBalance,
} from './types.js';

export { encodeAsset, encodeOptionalAsset, encodeCollateral } from './encoding.js';

export class LendingSDKBase {
  protected readonly rpcConfig: RpcConfig;

  protected readonly api: ApiPromise | undefined;

  protected readonly signer: IKeyringPair | undefined;

  constructor(options: LendingSDKOptions = {}, api?: ApiPromise, signer?: IKeyringPair) {
    const network = options.network ?? 'mainnet';
    this.rpcConfig = options.rpcUrl ? { rpcUrl: options.rpcUrl } : { network };
    this.api = api;
    this.signer = signer;
  }

  protected ensureApi(): ApiPromise {
    if (!this.api) {
      throw new Error('ApiPromise is required for write operations. Pass one to the constructor.');
    }
    return this.api;
  }

  protected ensureSigner(): IKeyringPair {
    if (!this.signer) {
      throw new Error('A signer is required for write operations. Pass one to the constructor.');
    }
    return this.signer;
  }

  /**
   * Sign and submit an extrinsic, resolving with the block hash when the tx is
   * included in a block. Rejects on dispatch error.
   *
   * Note: resolves at `isInBlock` for responsiveness. Production callers that
   * require finality should wait for `isFinalized` instead.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected signAndSend(extrinsic: any): Promise<string> {
    const signer = this.ensureSigner();
    return new Promise<string>((resolve, reject) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      extrinsic.signAndSend(signer, ({ status, dispatchError }: any) => {
        if (dispatchError) {
          reject(
            new Error(
              `Transaction failed: ${
                dispatchError.isModule
                  ? dispatchError.asModule.toString()
                  : dispatchError.toString()
              }`,
            ),
          );
          return;
        }
        if (status.isInBlock) {
          resolve(status.asInBlock.toString() as string);
        }
      });
    });
  }

  // RPC Read Methods 

  /**
   * Returns pool metrics for all lending pools (asset, amounts, rates, fees,
   * interest curve).
   */
  getLendingPools(): Promise<LendingPool[]> {
    return getLendingPools(this.rpcConfig);
  }

  /**
   * Returns global protocol config — LTV thresholds, fee contributions,
   * interest intervals, slippage limits.
   */
  getLendingConfig(): Promise<LendingConfig> {
    return getLendingConfig(this.rpcConfig);
  }

  /**
   * Returns per-pool supply positions. Scope to a single LP by passing their
   * SS58 account address, or omit to get all positions.
   */
  getLendingPoolSupplyBalances(lpAccount?: string): Promise<PoolSupplyBalance[]> {
    return getLendingPoolSupplyBalances(this.rpcConfig, lpAccount);
  }
}

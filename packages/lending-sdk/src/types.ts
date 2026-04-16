import type { ChainflipAsset, ChainflipNetwork } from '@chainflip/utils/chainflip';

export type { ChainflipAsset, ChainflipNetwork };


export type RpcConfig = { rpcUrl: string } | { network: ChainflipNetwork };

/** Hex-encoded u128, e.g. "0x1000" */
export type AssetAmount = `0x${string}`;

/** u64 loan identifier returned by request_loan */
export type LoanId = number;

export type RepaymentAmount = { type: 'Full' } | { type: 'Exact'; amount: AssetAmount };

/** [asset, amount] pairs for collateral operations */
export type CollateralEntries = [ChainflipAsset, AssetAmount][];

export interface InterestCurve {
  rateAtZeroUtilisation: string;
  junctionUtilisation: string;
  rateAtJunction: string;
  rateAtMaxUtilisation: string;
}

export interface LendingPoolFees {
  originationFeeBps: number;
  liquidationFeeBps: number;
}

/** Response shape for a single entry in cf_lending_pools */
export interface LendingPool {
  asset: ChainflipAsset;
  totalAmount: AssetAmount;
  availableAmount: AssetAmount;
  borrowedAmount: AssetAmount;
  supplyApy: string;
  borrowApy: string;
  fees: LendingPoolFees;
  interestCurve: InterestCurve;
}

export interface LtvThresholds {
  target: string;
  topup: string;
  softLiquidation: string;
  hardLiquidation: string;
  lowLtv: string;
}

/** Response shape for cf_lending_config */
export interface LendingConfig {
  ltvThresholds: LtvThresholds;
  feeContributions: {
    networkBps: number;
    lenderBps: number;
    brokerBps: number;
  };
  intervals: {
    interestIntervalBlocks: number;
    liquidationIntervalBlocks: number;
  };
  maxSlippageBps: number;
}

export interface PoolSupplyPosition {
  lpId: string;
  amount: AssetAmount;
}

/** Response shape for a single entry in cf_lending_pool_supply_balances */
export interface PoolSupplyBalance {
  asset: ChainflipAsset;
  positions: PoolSupplyPosition[];
}

 
export interface LendingSDKOptions {
  network?: ChainflipNetwork;
  rpcUrl?: string;
}

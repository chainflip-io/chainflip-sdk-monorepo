import { LendingSDKBase } from './base.js';
import { encodeAsset, encodeOptionalAsset, encodeCollateral } from './encoding.js';
import type { ChainflipAsset, AssetAmount, LoanId, RepaymentAmount, CollateralEntries } from './types.js';

export class LendingFlows extends LendingSDKBase {
  /**
   * Supply assets to one or more lending pools in a single atomic batch.
   * Calls addLenderFunds for each asset.
   */
  supplyMultiple(params: { assets: { asset: ChainflipAsset; amount: AssetAmount }[] }): Promise<string> {
    const api = this.ensureApi();
    const txs = params.assets.map(({ asset, amount }) =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (api.tx as any).lendingPools.addLenderFunds(encodeAsset(asset), amount),
    );
    return this.signAndSend(api.tx.utility.batchAll(txs));
  }

  /**
   * Withdraw supply from one or more lending pools in a single atomic batch.
   * Omit `amount` on any entry for a full withdrawal from that pool.
   */
  withdrawSupply(params: {
    assets: { asset: ChainflipAsset; amount?: AssetAmount }[];
  }): Promise<string> {
    const api = this.ensureApi();
    const txs = params.assets.map(({ asset, amount }) =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (api.tx as any).lendingPools.removeLenderFunds(encodeAsset(asset), amount ?? null),
    );
    return this.signAndSend(api.tx.utility.batchAll(txs));
  }

  /**
   * Add collateral for one or more assets. Convenience wrapper around the
   * addCollateral extrinsic with a flatter interface — handy when the caller
   * doesn't need to change the topup asset at the same time.
   */
  topUpCollateral(params: {
    collateral: { asset: ChainflipAsset; amount: AssetAmount }[];
    collateralTopupAsset?: ChainflipAsset;
  }): Promise<string> {
    const api = this.ensureApi();
    const entries: CollateralEntries = params.collateral.map(({ asset, amount }) => [asset, amount]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return this.signAndSend((api.tx as any).lendingPools.addCollateral(
      encodeOptionalAsset(params.collateralTopupAsset),
      encodeCollateral(entries),
    ));
  }

  /**
   * Fully repay one or more loans and withdraw all collateral in one atomic
   * batch: makeRepayment(Full) × n, then removeCollateral.
   *
   * After this call the borrowed funds are in free balance; use a separate
   * withdraw_asset (LiquidityPools pallet) to move them off-chain if needed.
   */
  repayAndClose(params: {
    loanIds: LoanId[];
    collateralToRemove: CollateralEntries;
  }): Promise<string> {
    const api = this.ensureApi();
    const repayTxs = params.loanIds.map((loanId) =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (api.tx as any).lendingPools.makeRepayment(loanId, { Full: null }),
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const removeCollateralTx = (api.tx as any).lendingPools.removeCollateral(
      encodeCollateral(params.collateralToRemove),
    );
    return this.signAndSend(api.tx.utility.batchAll([...repayTxs, removeCollateralTx]));
  }

  /**
   * Partially or fully repay loans and release excess collateral in one atomic
   * batch. Useful for reducing position size while freeing up locked funds.
   */
  deleverage(params: {
    repayments: { loanId: LoanId; amount: RepaymentAmount }[];
    collateralRemovals: CollateralEntries;
  }): Promise<string> {
    const api = this.ensureApi();
    const repayTxs = params.repayments.map(({ loanId, amount }) => {
      const encodedAmount = amount.type === 'Full' ? { Full: null } : { Exact: amount.amount };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (api.tx as any).lendingPools.makeRepayment(loanId, encodedAmount);
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const removeCollateralTx = (api.tx as any).lendingPools.removeCollateral(
      encodeCollateral(params.collateralRemovals),
    );
    return this.signAndSend(api.tx.utility.batchAll([...repayTxs, removeCollateralTx]));
  }

  /**
   * Replace one collateral type with another in a single atomic batch.
   * The new collateral is added first so LTV stays healthy during the swap.
   */
  swapCollateral(params: {
    add: { asset: ChainflipAsset; amount: AssetAmount };
    remove: { asset: ChainflipAsset; amount: AssetAmount };
  }): Promise<string> {
    const api = this.ensureApi();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const addTx = (api.tx as any).lendingPools.addCollateral(
      null,
      encodeCollateral([[params.add.asset, params.add.amount]]),
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const removeTx = (api.tx as any).lendingPools.removeCollateral(
      encodeCollateral([[params.remove.asset, params.remove.amount]]),
    );
    return this.signAndSend(api.tx.utility.batchAll([addTx, removeTx]));
  }

  /**
   * Close existing loans and open new ones in a single atomic batch:
   * makeRepayment(Full) × old loans, then requestLoan × new loans.
   *
   * Useful for changing borrow asset, adjusting collateral mix, or restarting
   * at a different LTV tier.
   */
  refinance(params: {
    loanIdsToClose: LoanId[];
    newLoans: {
      loanAsset: ChainflipAsset;
      loanAmount: AssetAmount;
      collateralTopupAsset?: ChainflipAsset;
      extraCollateral: CollateralEntries;
    }[];
  }): Promise<string> {
    const api = this.ensureApi();
    const repayTxs = params.loanIdsToClose.map((loanId) =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (api.tx as any).lendingPools.makeRepayment(loanId, { Full: null }),
    );
    const newLoanTxs = params.newLoans.map(
      ({ loanAsset, loanAmount, collateralTopupAsset, extraCollateral }) =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (api.tx as any).lendingPools.requestLoan(
          encodeAsset(loanAsset),
          loanAmount,
          encodeOptionalAsset(collateralTopupAsset),
          encodeCollateral(extraCollateral),
        ),
    );
    return this.signAndSend(api.tx.utility.batchAll([...repayTxs, ...newLoanTxs]));
  }
}

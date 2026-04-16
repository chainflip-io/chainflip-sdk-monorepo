import { encodeAsset, encodeOptionalAsset, encodeCollateral } from './encoding.js';
import { LendingFlows } from './flows.js';
import type { ChainflipAsset, AssetAmount, LoanId, RepaymentAmount, CollateralEntries } from './types.js';


export class LendingSDK extends LendingFlows {
  /**
   * Lender supplies liquidity to a lending pool. Debits from free balance and
   * records a proportional pool share. Requires a whitelisted LP account.
   */
  addLenderFunds(params: { asset: ChainflipAsset; amount: AssetAmount }): Promise<string> {
    const api = this.ensureApi();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return this.signAndSend((api.tx as any).lendingPools.addLenderFunds(
      encodeAsset(params.asset),
      params.amount,
    ));
  }

  /**
   * Withdraws liquidity from a pool back to free balance. Omit `amount` for a
   * full withdrawal.
   */
  removeLenderFunds(params: { asset: ChainflipAsset; amount?: AssetAmount }): Promise<string> {
    const api = this.ensureApi();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return this.signAndSend((api.tx as any).lendingPools.removeLenderFunds(
      encodeAsset(params.asset),
      params.amount ?? null,
    ));
  }

  /**
   * Deposits additional collateral from free balance into the borrower's loan
   * account. Optionally sets (or updates) the auto top-up asset.
   */
  addCollateral(params: {
    collateral: CollateralEntries;
    collateralTopupAsset?: ChainflipAsset;
  }): Promise<string> {
    const api = this.ensureApi();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return this.signAndSend((api.tx as any).lendingPools.addCollateral(
      encodeOptionalAsset(params.collateralTopupAsset),
      encodeCollateral(params.collateral),
    ));
  }

  /**
   * Withdraws excess collateral back to free balance. Only allowed when not in
   * liquidation and the resulting LTV remains safe.
   */
  removeCollateral(params: { collateral: CollateralEntries }): Promise<string> {
    const api = this.ensureApi();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return this.signAndSend((api.tx as any).lendingPools.removeCollateral(
      encodeCollateral(params.collateral),
    ));
  }

  /**
   * Creates a new loan. Atomically debits `extraCollateral` from free balance
   * and credits borrowed funds to free balance. Returns a LoanId via events.
   */
  requestLoan(params: {
    loanAsset: ChainflipAsset;
    loanAmount: AssetAmount;
    collateralTopupAsset?: ChainflipAsset;
    extraCollateral: CollateralEntries;
  }): Promise<string> {
    const api = this.ensureApi();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return this.signAndSend((api.tx as any).lendingPools.requestLoan(
      encodeAsset(params.loanAsset),
      params.loanAmount,
      encodeOptionalAsset(params.collateralTopupAsset),
      encodeCollateral(params.extraCollateral),
    ));
  }

  /**
   * Changes which asset is used for automatic collateral top-ups when LTV
   * exceeds the topup threshold. Pass undefined to disable auto top-up.
   */
  updateCollateralTopupAsset(params: { collateralTopupAsset?: ChainflipAsset }): Promise<string> {
    const api = this.ensureApi();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return this.signAndSend((api.tx as any).lendingPools.updateCollateralTopupAsset(
      encodeOptionalAsset(params.collateralTopupAsset),
    ));
  }

  /**
   * Increases an existing loan's principal. Extra collateral is debited from
   * free balance; the extra borrowed amount is credited to free balance.
   */
  expandLoan(params: {
    loanId: LoanId;
    extraAmountToBorrow: AssetAmount;
    extraCollateral: CollateralEntries;
  }): Promise<string> {
    const api = this.ensureApi();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return this.signAndSend((api.tx as any).lendingPools.expandLoan(
      params.loanId,
      params.extraAmountToBorrow,
      encodeCollateral(params.extraCollateral),
    ));
  }

  /**
   * Repays a loan fully or partially. Repayment amount is debited from the
   * borrower's free balance.
   */
  makeRepayment(params: { loanId: LoanId; amount: RepaymentAmount }): Promise<string> {
    const api = this.ensureApi();
    const encodedAmount =
      params.amount.type === 'Full' ? { Full: null } : { Exact: params.amount.amount };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return this.signAndSend((api.tx as any).lendingPools.makeRepayment(
      params.loanId,
      encodedAmount,
    ));
  }

  /**
   * Borrower opts into voluntary liquidation. Sets a flag that triggers the
   * liquidation process on the next interval.
   */
  initiateVoluntaryLiquidation(): Promise<string> {
    const api = this.ensureApi();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return this.signAndSend((api.tx as any).lendingPools.initiateVoluntaryLiquidation());
  }

  /**
   * Cancels a previously initiated voluntary liquidation before it completes.
   */
  stopVoluntaryLiquidation(): Promise<string> {
    const api = this.ensureApi();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return this.signAndSend((api.tx as any).lendingPools.stopVoluntaryLiquidation());
  }
}

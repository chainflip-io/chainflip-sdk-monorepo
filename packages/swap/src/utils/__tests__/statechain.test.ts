import exp from 'constants';
import { getDeductedBrokerFeeOutput } from '../statechain';

describe(getDeductedBrokerFeeOutput, () => {
  it('should return correct values for USDC->BTC', () => {
    const { egressAmount, intermediateAmount, brokerFee } = getDeductedBrokerFeeOutput({
      inputAmount: BigInt(50_000 * 1e6),
      destAsset: 'Btc',
      intermediateAmount: null,
      egressAmount: BigInt(1e8),
      brokerCommissionBps: 10,
      egressFee: 100n,
    });

    expect(brokerFee).toBe(BigInt(50 * 1e6));
    expect(egressAmount).toBe(BigInt(0.999 * 1e8));
    expect(intermediateAmount).toBe(undefined);
  });

  it('should return correct values for BTC->USDC', () => {
    const { egressAmount, intermediateAmount, brokerFee } = getDeductedBrokerFeeOutput({
      inputAmount: BigInt(1e8),
      destAsset: 'Usdc',
      intermediateAmount: null,
      egressAmount: BigInt(50_000 * 1e6),
      brokerCommissionBps: 10,
      egressFee: 100n,
    });

    expect(brokerFee).toBe(BigInt(50 * 1e6));
    expect(egressAmount).toBe(BigInt(49950 * 1e6));
    expect(intermediateAmount).toBe(undefined);
  });

  it('should return correct values for BTC->ETH', () => {
    const { egressAmount, intermediateAmount, brokerFee } = getDeductedBrokerFeeOutput({
      inputAmount: BigInt(1e8),
      destAsset: 'Eth',
      intermediateAmount: BigInt(50_000 * 1e6),
      egressAmount: BigInt(25 * 1e18),
      brokerCommissionBps: 10,
      egressFee: 100n,
    });

    expect(brokerFee).toBe(50_000_000n);
    expect(egressAmount).toBe(BigInt(24.975 * 1e18));
    expect(intermediateAmount).toBe(BigInt(49950 * 1e6));
  });
});

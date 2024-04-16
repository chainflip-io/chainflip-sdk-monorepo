import BigNumber from 'bignumber.js';
import { Side, swap } from '@/amm-addon';
import { InternalAsset, assetConstants } from '@/shared/enums';

const toAtomicUnits = (amount: number, asset: InternalAsset) =>
  BigInt(new BigNumber(amount).shiftedBy(assetConstants[asset].decimals).toFixed(0));

describe(swap, () => {
  it('gets the price for expected price (USDC => USDT)', async () => {
    const { remainingAmount, swappedAmount } = await swap({
      amount: toAtomicUnits(1000, 'Usdc'),
      limitOrders: [
        {
          tick: 0,
          amount: toAtomicUnits(1000, 'Usdt'),
        },
      ],
      side: Side.Buy,
    });
    expect(remainingAmount).toEqual(0n);
    expect(swappedAmount).toEqual(toAtomicUnits(1000, 'Usdt'));
  });

  it('gets the price for expected price (USDT => USDC)', async () => {
    const { remainingAmount, swappedAmount } = await swap({
      amount: toAtomicUnits(1000, 'Usdt'),
      limitOrders: [
        {
          tick: 0,
          amount: toAtomicUnits(1000, 'Usdc'),
        },
      ],
      side: Side.Sell,
    });
    expect(remainingAmount).toEqual(0n);
    expect(swappedAmount).toEqual(toAtomicUnits(1000, 'Usdc'));
  });

  it('gets the price for expected price (BTC => USDC)', async () => {
    const { remainingAmount, swappedAmount } = await swap({
      amount: toAtomicUnits(1, 'Btc'),
      limitOrders: [
        {
          tick: 64288,
          amount: toAtomicUnits(62_000, 'Usdc'),
        },
      ],
      side: Side.Sell,
    });
    expect(remainingAmount).toEqual(0n);
    // just under 62k USDC
    expect(swappedAmount).toEqual(61923112123n);
  });

  it('gets the price for expected price (USDC => BTC)', async () => {
    const { remainingAmount, swappedAmount } = await swap({
      amount: toAtomicUnits(61_923.112123, 'Usdc'),
      limitOrders: [
        {
          tick: 64288,
          amount: toAtomicUnits(1, 'Btc'),
        },
      ],
      side: Side.Buy,
    });
    expect(remainingAmount).toEqual(0n);
    // around 1 BTC
    expect(swappedAmount).toEqual(99999998n);
  });
});

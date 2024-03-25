import assert from 'assert';
// import BigNumber from 'bignumber.js';
import BigNumber from 'bignumber.js';
import { sorter } from '@/shared/arrays';
import { InternalAsset } from '@/shared/enums';
import { liquidityToTokenAmounts, tickToRate } from './tickMath';
import { PoolOrders, PoolPrice } from '../utils/statechain';

const tuple = <T extends unknown[]>(...args: T) => args;

type BaseAsset = Exclude<InternalAsset, 'Usdc'>;

const rangeIncludes = (range: { start: number; end: number }, tick: number) =>
  range.start <= tick && tick <= range.end;

export const convertPoolRangeOrders = (
  orders: PoolOrders,
  price: PoolPrice,
  baseAsset: BaseAsset,
): LimitOrder[] =>
  orders.limit_orders.bids
    .map((order) => tuple(order.tick, String(order.sell_amount)))
    .concat(
      orders.range_orders
        .filter((order) => rangeIncludes(order.range, price.tick))
        .map((order) => {
          const { quoteAsset } = liquidityToTokenAmounts({
            baseAsset,
            liquidity: order.liquidity,
            lowerTick: order.range.start,
            upperTick: order.range.end,
            currentRate: tickToRate(price.tick, baseAsset, 'Usdc'),
          });

          console.log({ quoteAsset });

          return tuple(price.tick, quoteAsset);
        }),
    );

type Tick = number;

type LimitOrder = [Tick, string];
type RangeOrder = [Tick, Tick, string];

type Orders = {
  limitOrders: [Tick, string][];
  rangeOrders: [Tick, Tick, string][];
};

const sortByTick = sorter<LimitOrder | RangeOrder>(0);

export default function calculatePrice(
  lpOrders: Orders[],
  amount: string,
  baseAsset: InternalAsset,
  quoteAsset: InternalAsset,
  poolOrders: PoolOrders,
  poolPrice: PoolPrice,
) {
  assert(
    baseAsset === 'Usdc' || quoteAsset === 'Usdc',
    'One asset must be USDC',
  );
  assert(baseAsset !== quoteAsset, 'Assets must be different');

  let receivedAmount = new BigNumber(0);
  let remainingAmount = new BigNumber(amount);

  // const limitOrders = lpOrders
  //   .flatMap((order) => order.limitOrders)
  //   .sort(sortByTick);

  const orders = convertPoolRangeOrders(
    poolOrders,
    poolPrice,
    baseAsset as BaseAsset,
  ).sort(sortByTick);

  console.log(orders);

  // const rangeOrders = orders
  //   .flatMap((order) => order.rangeOrders)
  //   .sort(sortByTick);

  for (let i = 0; i < orders.length && remainingAmount.gt(0); i += 1) {
    const [tick, sellAmount] = orders[i];
    const price = tickToRate(tick, baseAsset, quoteAsset);

    const amountToSell = BigNumber.minimum(sellAmount, remainingAmount);
    remainingAmount = remainingAmount.minus(amountToSell);
    const boughtAmount = new BigNumber(amountToSell).dividedBy(price);
    receivedAmount = receivedAmount.plus(boughtAmount);
  }

  return {
    receivedAmount: receivedAmount.toFixed(0),
    remainingAmount: remainingAmount.toFixed(0),
  };
}

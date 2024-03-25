import BigNumber from 'bignumber.js';
import calculatePrice, { convertPoolRangeOrders } from '../calculatePrice';

const price = {
  price: '0xeff1896da5456e5fb06e62a2a2af9f591',
  sqrt_price: '0x3df5df5b6e0f3d8aea8480df0',
  tick: 27079,
};

const orders = {
  limit_orders: {
    asks: [],
    bids: [
      {
        lp: 'cFJ4ELogY7gXLueJGZaQUyTC8582ntbKtNw1V7arieyv1Wk5Z',
        id: '0x18e65c6e090',
        tick: -1,
        sell_amount: '0x13158',
        fees_earned: '0x4',
        original_sell_amount: '0xf4240',
      },
      {
        lp: 'cFJ4ELogY7gXLueJGZaQUyTC8582ntbKtNw1V7arieyv1Wk5Z',
        id: '0x18e65cace8a',
        tick: -1,
        sell_amount: '0x68f659',
        fees_earned: '0x195',
        original_sell_amount: '0x53ec600',
      },
    ],
  },
  range_orders: [
    {
      lp: 'cFJ4ELogY7gXLueJGZaQUyTC8582ntbKtNw1V7arieyv1Wk5Z',
      id: '0x18e6625d346',
      range: { start: -887272, end: 887272 },
      liquidity: 999950003,
      fees_earned: { base: '0x673', quote: '0x4124' },
    },
    {
      lp: 'cFK2B5cJzL3admAMkmEsfko9nJeWmgm7CC4zNQnM2EySVqJ6Y',
      id: '0x18e666d2f91',
      range: { start: -513, end: 487 },
      liquidity: 6305857307,
      fees_earned: { base: '0x17e', quote: '0x28f' },
    },
    {
      lp: 'cFK2B5cJzL3admAMkmEsfko9nJeWmgm7CC4zNQnM2EySVqJ6Y',
      id: '0x18e66706ed6',
      range: { start: -887272, end: 887272 },
      liquidity: 103331369,
      fees_earned: { base: '0x3c', quote: '0x61a' },
    },
    {
      lp: 'cFK2B5cJzL3admAMkmEsfko9nJeWmgm7CC4zNQnM2EySVqJ6Y',
      id: '0x18e667471d8',
      range: { start: -6932, end: 4054 },
      liquidity: 66124932,
      fees_earned: { base: '0x9', quote: '0x49' },
    },
  ],
};

const output = { intermediary: null, output: '0xe3cc64' };

const toBaseUnit = (amount: number, decimals: number) =>
  new BigNumber(amount).shiftedBy(decimals).toFixed();

describe(calculatePrice, () => {
  it('gets the best price', () => {
    console.log(convertPoolRangeOrders(orders, price, 'Usdt'));

    const result = calculatePrice(
      [
        // {
        //   limitOrders: [[rateToTick(2, 'Usdt', 'Usdc'), toBaseUnit(100, 6)]],
        //   rangeOrders: [],
        // },
        // {
        //   limitOrders: [[rateToTick(1, 'Usdt', 'Usdc'), toBaseUnit(50, 6)]],
        //   rangeOrders: [],
        // },
        // {
        //   limitOrders: [[rateToTick(1, 'Usdt', 'Usdc'), toBaseUnit(50, 6)]],
        //   rangeOrders: [],
        // },
      ],
      toBaseUnit(1, 6),
      'Usdt',
      'Usdc',
      orders,
      price,
    );

    expect(result).toMatchObject({
      receivedAmount: BigInt(output.output).toString(),
      remainingAmount: '0',
    });
  });
});

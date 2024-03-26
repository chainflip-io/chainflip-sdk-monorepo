const { findPrice } = require('.');

findPrice({
  amount: 100n,
  limitOrders: [{ tick: 0, amount: 100n }],
  poolFee: 0,
}).then(console.log);

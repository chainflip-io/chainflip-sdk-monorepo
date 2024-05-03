use crate::{
    common::{Amount, PoolPairsMap, Side, Tick},
    range_orders::Liquidity,
};
use serde::{Deserialize, Serialize};
use std::ops::Range;

#[derive(Deserialize, Serialize, Clone, Debug)]
pub struct Rpc<T> {
    result: T,
}

#[derive(Deserialize, Serialize, Clone, Debug)]
pub struct AskBidMap<S> {
    pub asks: S,
    pub bids: S,
}

#[derive(Deserialize, Serialize, Clone, Debug)]
pub struct RangeOrder {
    pub lp: String,
    pub id: Amount,
    pub range: Range<Tick>,
    pub liquidity: Liquidity,
    pub fees_earned: PoolPairsMap<Amount>,
}

#[derive(Deserialize, Serialize, Clone, Debug)]
pub struct LimitOrder {
    pub lp: String,
    pub id: Amount,
    pub tick: Tick,
    pub sell_amount: Amount,
    pub fees_earned: Amount,
    pub original_sell_amount: Amount,
}

#[derive(Deserialize, Serialize, Clone, Debug)]
pub struct PoolOrders {
    /// Limit orders are groups by which asset they are selling.
    pub limit_orders: AskBidMap<Vec<LimitOrder>>,
    /// Range orders can be both buy and/or sell therefore they not split. The current range order
    /// price determines if they are buy and/or sell.
    pub range_orders: Vec<RangeOrder>,
}

pub type PoolOrdersRpc = Rpc<PoolOrders>;

impl PoolOrdersRpc {
    pub fn into_pool_orders(self, side: &Side) -> (Vec<(Tick, Amount)>, Vec<(Range<Tick>, u128)>) {
        let limit_orders = match side {
            Side::Buy => self.result.limit_orders.asks,
            Side::Sell => self.result.limit_orders.bids,
        }
        .into_iter()
        .map(|order| (order.tick, order.sell_amount))
        .collect();

        let range_orders = self
            .result
            .range_orders
            .into_iter()
            .map(|order| (order.range, order.liquidity))
            .collect();

        (limit_orders, range_orders)
    }
}

use crate::common::{
    self, Amount, BaseToQuote, LiquidityProvider, Pairs, PoolPairsMap, QuoteToBase, Side,
    SqrtPriceQ64F96, Tick,
};
use crate::limit_orders;
use crate::range_orders;

#[derive(Clone, Debug)]
pub struct PoolState {
    pub limit_orders: limit_orders::PoolState,
    pub range_orders: range_orders::PoolState,
}

impl PoolState {
    /// Performs a swap to sell or buy an amount of either side/asset.
    ///
    /// This function never panics.
    pub fn swap(
        &mut self,
        order: Side,
        sold_amount: Amount,
        sqrt_price_limit: Option<SqrtPriceQ64F96>,
    ) -> (Amount, Amount) {
        match order.to_sold_pair() {
            Pairs::Base => self.inner_swap::<BaseToQuote>(sold_amount, sqrt_price_limit),
            Pairs::Quote => self.inner_swap::<QuoteToBase>(sold_amount, sqrt_price_limit),
        }
    }

    fn inner_swap<
        SD: common::SwapDirection + limit_orders::SwapDirection + range_orders::SwapDirection,
    >(
        &mut self,
        mut amount: Amount,
        sqrt_price_limit: Option<SqrtPriceQ64F96>,
    ) -> (Amount, Amount) {
        let mut total_output_amount = Amount::zero();

        while !amount.is_zero() {
            let (output_amount, remaining_amount) = match (
                self.limit_orders
                    .current_sqrt_price::<SD>()
                    .filter(|sqrt_price| {
                        sqrt_price_limit.map_or(true, |sqrt_price_limit| {
                            !SD::sqrt_price_op_more_than(*sqrt_price, sqrt_price_limit)
                        })
                    }),
                self.range_orders
                    .current_sqrt_price::<SD>()
                    .filter(|sqrt_price| {
                        sqrt_price_limit.map_or(true, |sqrt_price_limit| {
                            SD::sqrt_price_op_more_than(sqrt_price_limit, *sqrt_price)
                        })
                    }),
            ) {
                (Some(limit_order_sqrt_price), Some(range_order_sqrt_price)) => {
                    if SD::sqrt_price_op_more_than(limit_order_sqrt_price, range_order_sqrt_price) {
                        self.range_orders
                            .swap::<SD>(amount, Some(limit_order_sqrt_price))
                    } else {
                        // Note it is important that in the equal price case we prefer to swap limit
                        // orders as if we do a swap with range_orders where the sqrt_price_limit is
                        // equal to the current sqrt_price then the swap will not change the current
                        // price or use any of the input amount, therefore we would loop forever

                        // Also we prefer limit orders as they don't immediately incur slippage
                        self.limit_orders
                            .swap::<SD>(amount, Some(range_order_sqrt_price))
                    }
                }
                (Some(_), None) => self.limit_orders.swap::<SD>(amount, sqrt_price_limit),
                (None, Some(_)) => self.range_orders.swap::<SD>(amount, sqrt_price_limit),
                (None, None) => break,
            };

            amount = remaining_amount;
            total_output_amount = total_output_amount.saturating_add(output_amount);
        }

        (total_output_amount, amount)
    }

    pub fn collect_and_mint_limit_order(
        &mut self,
        lp: &LiquidityProvider,
        order: Side,
        tick: Tick,
        sold_amount: Amount,
    ) -> Result<
        (limit_orders::Collected, limit_orders::PositionInfo),
        limit_orders::PositionError<limit_orders::MintError>,
    > {
        match order.to_sold_pair() {
            Pairs::Base => self
                .limit_orders
                .collect_and_mint::<QuoteToBase>(lp, tick, sold_amount),
            Pairs::Quote => {
                self.limit_orders
                    .collect_and_mint::<BaseToQuote>(lp, tick, sold_amount)
            }
        }
    }

    #[allow(dead_code)]
    pub fn collect_and_mint_range_order<
        T,
        E,
        TryDebit: FnOnce(PoolPairsMap<Amount>) -> Result<T, E>,
    >(
        &mut self,
        lp: &LiquidityProvider,
        tick_range: core::ops::Range<Tick>,
        size: range_orders::Size,
        try_debit: TryDebit,
    ) -> Result<
        (
            T,
            range_orders::Liquidity,
            range_orders::Collected,
            range_orders::PositionInfo,
        ),
        range_orders::PositionError<range_orders::MintError<E>>,
    > {
        self.range_orders
            .collect_and_mint(lp, tick_range.start, tick_range.end, size, try_debit)
    }
}

#![deny(clippy::all)]

use amm::PoolState;
use common::{Pairs, Side, MAX_SQRT_PRICE, MIN_SQRT_PRICE};
use napi::bindgen_prelude::*;
use primitive_types::U256;

mod amm;
mod common;
mod limit_orders;
mod range_orders;
mod rpc;

#[macro_use]
extern crate napi_derive;

fn try_bigint_to_u256(bigint: &BigInt) -> Result<U256> {
    if bigint.words.len() > 4 {
        return Err(napi::Error::from_reason(
            "BigInt value is too large".to_owned(),
        ));
    }

    let mut nums = [0u64; 4];

    for (num, word) in nums.iter_mut().zip(&bigint.words) {
        *num = *word;
    }

    Ok(U256(nums))
}

fn u256_to_bigint(u256: U256) -> BigInt {
    BigInt {
        sign_bit: false,
        words: u256.0.to_vec(),
    }
}

#[derive(Debug)]
#[napi(object)]
pub struct LimitOrder {
    pub tick: i32,
    pub amount: BigInt,
}

#[derive(Debug)]
#[napi(object)]
pub struct SwapInput {
    pub amount: BigInt,
    pub limit_orders: Vec<LimitOrder>,
    pub pool_fee: Option<u32>,
    pub side: Side,
    pub pool_state: Option<String>,
    pub range_order_price: Option<BigInt>,
}

fn to_napi_error<E: std::fmt::Debug>(e: E) -> napi::Error {
    napi::Error::from_reason(format!("{e:?}"))
}

pub struct AMM {
    init: SwapInput,
}

#[napi(object)]
pub struct SwapOutput {
    pub swapped_amount: BigInt,
    pub remaining_amount: BigInt,
}

#[napi]
impl Task for AMM {
    type Output = (U256, U256);
    type JsValue = SwapOutput;

    fn compute(&mut self) -> napi::Result<Self::Output> {
        let SwapInput {
            limit_orders,
            pool_fee,
            side,
            pool_state,
            amount,
            range_order_price,
        } = &self.init;

        let pool_fee = pool_fee.unwrap_or(0);

        if !limit_orders::PoolState::validate_fees(pool_fee)
            || !range_orders::PoolState::validate_fees(pool_fee)
        {
            return Err(to_napi_error("Invalid pool fee"));
        }

        let initial_sqrt_price = range_order_price
            .as_ref()
            .map(|price| try_bigint_to_u256(price))
            .transpose()?
            .unwrap_or(match side.to_sold_pair() {
                Pairs::Base => MAX_SQRT_PRICE,
                Pairs::Quote => MIN_SQRT_PRICE,
            });

        let rpc_response = pool_state
            .as_ref()
            .map(|string| {
                serde_json::from_str::<rpc::PoolOrdersRpc>(&string).map_err(to_napi_error)
            })
            .transpose()?
            .map(|rpc_response| rpc_response.into_pool_orders(side))
            .unwrap_or_default();

        let limit_orders = limit_orders
            .iter()
            .map(|order| (order.tick, try_bigint_to_u256(&order.amount)))
            .chain(
                rpc_response
                    .0
                    .into_iter()
                    .map(|(tick, amount)| (tick, Ok(amount))),
            )
            .enumerate();

        let mut pool_state = PoolState {
            limit_orders: limit_orders::PoolState::new(pool_fee).unwrap(),
            range_orders: range_orders::PoolState::new(pool_fee, initial_sqrt_price).unwrap(),
        };

        for (id, (tick, amount)) in limit_orders {
            pool_state
                .collect_and_mint_limit_order(
                    &(id as i32),
                    !*side,
                    tick,
                    amount.map_err(to_napi_error)?,
                )
                .map_err(to_napi_error)?;
        }

        for (id, (range, liquidity)) in rpc_response.1.into_iter().enumerate() {
            pool_state
                .collect_and_mint_range_order(
                    &(id as i32),
                    range,
                    range_orders::Size::Liquidity { liquidity },
                    Result::<_, &'static str>::Ok,
                )
                .map_err(to_napi_error)?;
        }

        let amount = try_bigint_to_u256(&amount)?;

        Ok(pool_state.swap(*side, amount, None))
    }

    fn resolve(
        &mut self,
        _env: napi::Env,
        (swapped_amount, remaining_amount): Self::Output,
    ) -> napi::Result<Self::JsValue> {
        Ok(SwapOutput {
            swapped_amount: u256_to_bigint(swapped_amount),
            remaining_amount: u256_to_bigint(remaining_amount),
        })
    }
}

#[napi]
pub fn swap(args: SwapInput) -> AsyncTask<AMM> {
    AsyncTask::new(AMM { init: args })
}

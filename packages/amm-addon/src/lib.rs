#![deny(clippy::all)]

use crate::common::Side;
use amm::PoolState;
use common::MIN_SQRT_PRICE;
use napi::bindgen_prelude::*;
use primitive_types::U256;

mod amm;
pub mod common;
pub mod limit_orders;
pub mod range_orders;

#[macro_use]
extern crate napi_derive;

fn bigint_to_u256(bigint: &BigInt) -> Result<U256> {
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
struct LimitOrder {
    pub tick: i32,
    pub amount: BigInt,
}

#[derive(Debug)]
#[napi(object)]
struct SwapInput {
    pub amount: BigInt,
    pub limit_orders: Vec<LimitOrder>,
    pub pool_fee: Option<u32>,
}

fn to_napi_error<E: std::fmt::Debug>(e: E) -> napi::Error {
    napi::Error::from_reason(format!("{e:?}"))
}

struct AMM {
    init: SwapInput,
}

#[napi(object)]
struct SwapOutput {
    pub swapped_amount: BigInt,
    pub remaining_amount: BigInt,
}

#[napi]
impl Task for AMM {
    type Output = (U256, U256);
    type JsValue = SwapOutput;

    fn compute(&mut self) -> napi::Result<Self::Output> {
        let args = &self.init;

        let pool_fee = args.pool_fee.unwrap_or(0);

        if !limit_orders::PoolState::validate_fees(pool_fee)
            || !range_orders::PoolState::validate_fees(pool_fee)
        {
            return Err(to_napi_error("Invalid pool fee"));
        }

        let mut pool_state = PoolState {
            limit_orders: limit_orders::PoolState::new(pool_fee).unwrap(),
            range_orders: range_orders::PoolState::new(pool_fee, MIN_SQRT_PRICE).unwrap(),
        };

        for (id, LimitOrder { tick, amount }) in args.limit_orders.iter().enumerate() {
            let amount = bigint_to_u256(amount)?;

            pool_state
                .collect_and_mint_limit_order(&(id as i32), Side::Buy, *tick, amount)
                .map_err(to_napi_error)?;
        }

        let amount = bigint_to_u256(&args.amount)?;

        Ok(pool_state.swap(Side::Sell, amount, None))
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
fn find_price(args: SwapInput) -> AsyncTask<AMM> {
    AsyncTask::new(AMM { init: args })
}
